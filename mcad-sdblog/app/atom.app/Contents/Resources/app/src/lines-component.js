(function() {
  var $$, AcceptFilter, CursorsComponent, DummyLineNode, HighlightsComponent, LinesComponent, WrapperDiv, cloneObject, toArray, _,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ = require('underscore-plus');

  toArray = require('underscore-plus').toArray;

  $$ = require('space-pen').$$;

  CursorsComponent = require('./cursors-component');

  HighlightsComponent = require('./highlights-component');

  DummyLineNode = $$(function() {
    return this.div({
      className: 'line',
      style: 'position: absolute; visibility: hidden;'
    }, (function(_this) {
      return function() {
        return _this.span('x');
      };
    })(this));
  })[0];

  AcceptFilter = {
    acceptNode: function() {
      return NodeFilter.FILTER_ACCEPT;
    }
  };

  WrapperDiv = document.createElement('div');

  cloneObject = function(object) {
    var clone, key, value;
    clone = {};
    for (key in object) {
      value = object[key];
      clone[key] = value;
    }
    return clone;
  };

  module.exports = LinesComponent = (function() {
    LinesComponent.prototype.placeholderTextDiv = null;

    function LinesComponent(_arg) {
      var insertionPoint, visible;
      this.presenter = _arg.presenter, this.hostElement = _arg.hostElement, this.useShadowDOM = _arg.useShadowDOM, visible = _arg.visible;
      this.measuredLines = new Set;
      this.lineNodesByLineId = {};
      this.screenRowsByLineId = {};
      this.lineIdsByScreenRow = {};
      this.renderedDecorationsByLineId = {};
      this.domNode = document.createElement('div');
      this.domNode.classList.add('lines');
      this.cursorsComponent = new CursorsComponent(this.presenter);
      this.domNode.appendChild(this.cursorsComponent.domNode);
      this.highlightsComponent = new HighlightsComponent(this.presenter);
      this.domNode.appendChild(this.highlightsComponent.domNode);
      if (this.useShadowDOM) {
        insertionPoint = document.createElement('content');
        insertionPoint.setAttribute('select', '.overlayer');
        this.domNode.appendChild(insertionPoint);
      }
    }

    LinesComponent.prototype.updateSync = function(state) {
      var _ref;
      this.newState = state.content;
      if (this.oldState == null) {
        this.oldState = {
          lines: {}
        };
      }
      if (this.newState.scrollHeight !== this.oldState.scrollHeight) {
        this.domNode.style.height = this.newState.scrollHeight + 'px';
        this.oldState.scrollHeight = this.newState.scrollHeight;
      }
      if (this.newState.scrollTop !== this.oldState.scrollTop || this.newState.scrollLeft !== this.oldState.scrollLeft) {
        this.domNode.style['-webkit-transform'] = "translate3d(" + (-this.newState.scrollLeft) + "px, " + (-this.newState.scrollTop) + "px, 0px)";
        this.oldState.scrollTop = this.newState.scrollTop;
        this.oldState.scrollLeft = this.newState.scrollLeft;
      }
      if (this.newState.backgroundColor !== this.oldState.backgroundColor) {
        this.domNode.style.backgroundColor = this.newState.backgroundColor;
        this.oldState.backgroundColor = this.newState.backgroundColor;
      }
      if (this.newState.placeholderText !== this.oldState.placeholderText) {
        if ((_ref = this.placeholderTextDiv) != null) {
          _ref.remove();
        }
        if (this.newState.placeholderText != null) {
          this.placeholderTextDiv = document.createElement('div');
          this.placeholderTextDiv.classList.add('placeholder-text');
          this.placeholderTextDiv.textContent = this.newState.placeholderText;
          this.domNode.appendChild(this.placeholderTextDiv);
        }
      }
      if (this.oldState.indentGuidesVisible !== this.newState.indentGuidesVisible) {
        this.removeLineNodes();
      }
      this.updateLineNodes();
      if (this.newState.scrollWidth !== this.oldState.scrollWidth) {
        this.domNode.style.width = this.newState.scrollWidth + 'px';
        this.oldState.scrollWidth = this.newState.scrollWidth;
      }
      this.cursorsComponent.updateSync(state);
      this.highlightsComponent.updateSync(state);
      this.oldState.indentGuidesVisible = this.newState.indentGuidesVisible;
      return this.oldState.scrollWidth = this.newState.scrollWidth;
    };

    LinesComponent.prototype.removeLineNodes = function() {
      var id;
      for (id in this.oldState.lines) {
        this.removeLineNode(id);
      }
    };

    LinesComponent.prototype.removeLineNode = function(id) {
      this.lineNodesByLineId[id].remove();
      delete this.lineNodesByLineId[id];
      delete this.lineIdsByScreenRow[this.screenRowsByLineId[id]];
      delete this.screenRowsByLineId[id];
      return delete this.oldState.lines[id];
    };

    LinesComponent.prototype.updateLineNodes = function() {
      var i, id, lineNode, lineState, newLineIds, newLineNodes, newLinesHTML, _i, _len, _ref;
      for (id in this.oldState.lines) {
        if (!this.newState.lines.hasOwnProperty(id)) {
          this.removeLineNode(id);
        }
      }
      newLineIds = null;
      newLinesHTML = null;
      _ref = this.newState.lines;
      for (id in _ref) {
        lineState = _ref[id];
        if (this.oldState.lines.hasOwnProperty(id)) {
          this.updateLineNode(id);
        } else {
          if (newLineIds == null) {
            newLineIds = [];
          }
          if (newLinesHTML == null) {
            newLinesHTML = "";
          }
          newLineIds.push(id);
          newLinesHTML += this.buildLineHTML(id);
          this.screenRowsByLineId[id] = lineState.screenRow;
          this.lineIdsByScreenRow[lineState.screenRow] = id;
          this.oldState.lines[id] = cloneObject(lineState);
        }
      }
      if (newLineIds == null) {
        return;
      }
      WrapperDiv.innerHTML = newLinesHTML;
      newLineNodes = _.toArray(WrapperDiv.children);
      for (i = _i = 0, _len = newLineIds.length; _i < _len; i = ++_i) {
        id = newLineIds[i];
        lineNode = newLineNodes[i];
        this.lineNodesByLineId[id] = lineNode;
        this.domNode.appendChild(lineNode);
      }
    };

    LinesComponent.prototype.buildLineHTML = function(id) {
      var classes, decorationClass, decorationClasses, fold, indentLevel, isSoftWrapped, lineEnding, lineHTML, screenRow, scrollWidth, text, tokens, top, _i, _len, _ref;
      scrollWidth = this.newState.scrollWidth;
      _ref = this.newState.lines[id], screenRow = _ref.screenRow, tokens = _ref.tokens, text = _ref.text, top = _ref.top, lineEnding = _ref.lineEnding, fold = _ref.fold, isSoftWrapped = _ref.isSoftWrapped, indentLevel = _ref.indentLevel, decorationClasses = _ref.decorationClasses;
      classes = '';
      if (decorationClasses != null) {
        for (_i = 0, _len = decorationClasses.length; _i < _len; _i++) {
          decorationClass = decorationClasses[_i];
          classes += decorationClass + ' ';
        }
      }
      classes += 'line';
      lineHTML = "<div class=\"" + classes + "\" style=\"position: absolute; top: " + top + "px; width: " + scrollWidth + "px;\" data-screen-row=\"" + screenRow + "\">";
      if (text === "") {
        lineHTML += this.buildEmptyLineInnerHTML(id);
      } else {
        lineHTML += this.buildLineInnerHTML(id);
      }
      if (fold) {
        lineHTML += '<span class="fold-marker"></span>';
      }
      lineHTML += "</div>";
      return lineHTML;
    };

    LinesComponent.prototype.buildEmptyLineInnerHTML = function(id) {
      var endOfLineInvisibles, i, indentGuidesVisible, indentLevel, invisible, invisibleIndex, j, lineHTML, tabLength, _i, _j, _ref;
      indentGuidesVisible = this.newState.indentGuidesVisible;
      _ref = this.newState.lines[id], indentLevel = _ref.indentLevel, tabLength = _ref.tabLength, endOfLineInvisibles = _ref.endOfLineInvisibles;
      if (indentGuidesVisible && indentLevel > 0) {
        invisibleIndex = 0;
        lineHTML = '';
        for (i = _i = 0; 0 <= indentLevel ? _i < indentLevel : _i > indentLevel; i = 0 <= indentLevel ? ++_i : --_i) {
          lineHTML += "<span class='indent-guide'>";
          for (j = _j = 0; 0 <= tabLength ? _j < tabLength : _j > tabLength; j = 0 <= tabLength ? ++_j : --_j) {
            if (invisible = endOfLineInvisibles != null ? endOfLineInvisibles[invisibleIndex++] : void 0) {
              lineHTML += "<span class='invisible-character'>" + invisible + "</span>";
            } else {
              lineHTML += ' ';
            }
          }
          lineHTML += "</span>";
        }
        while (invisibleIndex < (endOfLineInvisibles != null ? endOfLineInvisibles.length : void 0)) {
          lineHTML += "<span class='invisible-character'>" + endOfLineInvisibles[invisibleIndex++] + "</span>";
        }
        return lineHTML;
      } else {
        return this.buildEndOfLineHTML(id) || '&nbsp;';
      }
    };

    LinesComponent.prototype.buildLineInnerHTML = function(id) {
      var hasIndentGuide, indentGuidesVisible, innerHTML, isOnlyWhitespace, scopeStack, text, token, tokens, _i, _len, _ref;
      indentGuidesVisible = this.newState.indentGuidesVisible;
      _ref = this.newState.lines[id], tokens = _ref.tokens, text = _ref.text, isOnlyWhitespace = _ref.isOnlyWhitespace;
      innerHTML = "";
      scopeStack = [];
      for (_i = 0, _len = tokens.length; _i < _len; _i++) {
        token = tokens[_i];
        innerHTML += this.updateScopeStack(scopeStack, token.scopes);
        hasIndentGuide = indentGuidesVisible && (token.hasLeadingWhitespace() || (token.hasTrailingWhitespace() && isOnlyWhitespace));
        innerHTML += token.getValueAsHtml({
          hasIndentGuide: hasIndentGuide
        });
      }
      while (scopeStack.length > 0) {
        innerHTML += this.popScope(scopeStack);
      }
      innerHTML += this.buildEndOfLineHTML(id);
      return innerHTML;
    };

    LinesComponent.prototype.buildEndOfLineHTML = function(id) {
      var endOfLineInvisibles, html, invisible, _i, _len;
      endOfLineInvisibles = this.newState.lines[id].endOfLineInvisibles;
      html = '';
      if (endOfLineInvisibles != null) {
        for (_i = 0, _len = endOfLineInvisibles.length; _i < _len; _i++) {
          invisible = endOfLineInvisibles[_i];
          html += "<span class='invisible-character'>" + invisible + "</span>";
        }
      }
      return html;
    };

    LinesComponent.prototype.updateScopeStack = function(scopeStack, desiredScopeDescriptor) {
      var html, i, j, scope, _i, _j, _len, _ref;
      html = "";
      for (i = _i = 0, _len = desiredScopeDescriptor.length; _i < _len; i = ++_i) {
        scope = desiredScopeDescriptor[i];
        if (scopeStack[i] !== desiredScopeDescriptor[i]) {
          break;
        }
      }
      while (scopeStack.length !== i) {
        html += this.popScope(scopeStack);
      }
      for (j = _j = i, _ref = desiredScopeDescriptor.length; i <= _ref ? _j < _ref : _j > _ref; j = i <= _ref ? ++_j : --_j) {
        html += this.pushScope(scopeStack, desiredScopeDescriptor[j]);
      }
      return html;
    };

    LinesComponent.prototype.popScope = function(scopeStack) {
      scopeStack.pop();
      return "</span>";
    };

    LinesComponent.prototype.pushScope = function(scopeStack, scope) {
      scopeStack.push(scope);
      return "<span class=\"" + (scope.replace(/\.+/g, ' ')) + "\">";
    };

    LinesComponent.prototype.updateLineNode = function(id) {
      var decorationClass, lineNode, newDecorationClasses, newLineState, oldDecorationClasses, oldLineState, _i, _j, _len, _len1;
      oldLineState = this.oldState.lines[id];
      newLineState = this.newState.lines[id];
      lineNode = this.lineNodesByLineId[id];
      if (this.newState.scrollWidth !== this.oldState.scrollWidth) {
        lineNode.style.width = this.newState.scrollWidth + 'px';
      }
      newDecorationClasses = newLineState.decorationClasses;
      oldDecorationClasses = oldLineState.decorationClasses;
      if (oldDecorationClasses != null) {
        for (_i = 0, _len = oldDecorationClasses.length; _i < _len; _i++) {
          decorationClass = oldDecorationClasses[_i];
          if (!((newDecorationClasses != null) && __indexOf.call(newDecorationClasses, decorationClass) >= 0)) {
            lineNode.classList.remove(decorationClass);
          }
        }
      }
      if (newDecorationClasses != null) {
        for (_j = 0, _len1 = newDecorationClasses.length; _j < _len1; _j++) {
          decorationClass = newDecorationClasses[_j];
          if (!((oldDecorationClasses != null) && __indexOf.call(oldDecorationClasses, decorationClass) >= 0)) {
            lineNode.classList.add(decorationClass);
          }
        }
      }
      oldLineState.decorationClasses = newLineState.decorationClasses;
      if (newLineState.top !== oldLineState.top) {
        lineNode.style.top = newLineState.top + 'px';
        oldLineState.top = newLineState.cop;
      }
      if (newLineState.screenRow !== oldLineState.screenRow) {
        lineNode.dataset.screenRow = newLineState.screenRow;
        oldLineState.screenRow = newLineState.screenRow;
        return this.lineIdsByScreenRow[newLineState.screenRow] = id;
      }
    };

    LinesComponent.prototype.lineNodeForScreenRow = function(screenRow) {
      return this.lineNodesByLineId[this.lineIdsByScreenRow[screenRow]];
    };

    LinesComponent.prototype.measureLineHeightAndDefaultCharWidth = function() {
      var charWidth, lineHeightInPixels;
      this.domNode.appendChild(DummyLineNode);
      lineHeightInPixels = DummyLineNode.getBoundingClientRect().height;
      charWidth = DummyLineNode.firstChild.getBoundingClientRect().width;
      this.domNode.removeChild(DummyLineNode);
      this.presenter.setLineHeight(lineHeightInPixels);
      return this.presenter.setBaseCharacterWidth(charWidth);
    };

    LinesComponent.prototype.remeasureCharacterWidths = function() {
      if (!this.presenter.baseCharacterWidth) {
        return;
      }
      this.clearScopedCharWidths();
      return this.measureCharactersInNewLines();
    };

    LinesComponent.prototype.measureCharactersInNewLines = function() {
      return this.presenter.batchCharacterMeasurement((function(_this) {
        return function() {
          var id, lineNode, lineState, _ref;
          _ref = _this.oldState.lines;
          for (id in _ref) {
            lineState = _ref[id];
            if (!_this.measuredLines.has(id)) {
              lineNode = _this.lineNodesByLineId[id];
              _this.measureCharactersInLine(id, lineState, lineNode);
            }
          }
        };
      })(this));
    };

    LinesComponent.prototype.measureCharactersInLine = function(lineId, tokenizedLine, lineNode) {
      var char, charIndex, charLength, charWidth, charWidths, hasPairedCharacter, i, iterator, nextTextNodeIndex, rangeForMeasurement, scopes, textNode, textNodeIndex, value, valueIndex, _i, _len, _ref, _ref1;
      rangeForMeasurement = null;
      iterator = null;
      charIndex = 0;
      _ref = tokenizedLine.tokens;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        _ref1 = _ref[_i], value = _ref1.value, scopes = _ref1.scopes, hasPairedCharacter = _ref1.hasPairedCharacter;
        charWidths = this.presenter.getScopedCharacterWidths(scopes);
        valueIndex = 0;
        while (valueIndex < value.length) {
          if (hasPairedCharacter) {
            char = value.substr(valueIndex, 2);
            charLength = 2;
            valueIndex += 2;
          } else {
            char = value[valueIndex];
            charLength = 1;
            valueIndex++;
          }
          if (char === '\0') {
            continue;
          }
          if (charWidths[char] == null) {
            if (typeof textNode === "undefined" || textNode === null) {
              if (rangeForMeasurement == null) {
                rangeForMeasurement = document.createRange();
              }
              iterator = document.createNodeIterator(lineNode, NodeFilter.SHOW_TEXT, AcceptFilter);
              textNode = iterator.nextNode();
              textNodeIndex = 0;
              nextTextNodeIndex = textNode.textContent.length;
            }
            while (nextTextNodeIndex <= charIndex) {
              textNode = iterator.nextNode();
              textNodeIndex = nextTextNodeIndex;
              nextTextNodeIndex = textNodeIndex + textNode.textContent.length;
            }
            i = charIndex - textNodeIndex;
            rangeForMeasurement.setStart(textNode, i);
            rangeForMeasurement.setEnd(textNode, i + charLength);
            charWidth = rangeForMeasurement.getBoundingClientRect().width;
            this.presenter.setScopedCharacterWidth(scopes, char, charWidth);
          }
          charIndex += charLength;
        }
      }
      return this.measuredLines.add(lineId);
    };

    LinesComponent.prototype.clearScopedCharWidths = function() {
      this.measuredLines.clear();
      return this.presenter.clearScopedCharacterWidths();
    };

    return LinesComponent;

  })();

}).call(this);

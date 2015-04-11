(function() {
  var GutterComponent, WrapperDiv, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ = require('underscore-plus');

  WrapperDiv = document.createElement('div');

  module.exports = GutterComponent = (function() {
    GutterComponent.prototype.dummyLineNumberNode = null;

    function GutterComponent(_arg) {
      this.presenter = _arg.presenter, this.onMouseDown = _arg.onMouseDown, this.editor = _arg.editor;
      this.onClick = __bind(this.onClick, this);
      this.onMouseDown = __bind(this.onMouseDown, this);
      this.lineNumberNodesById = {};
      this.domNode = document.createElement('div');
      this.domNode.classList.add('gutter');
      this.lineNumbersNode = document.createElement('div');
      this.lineNumbersNode.classList.add('line-numbers');
      this.domNode.appendChild(this.lineNumbersNode);
      this.domNode.addEventListener('click', this.onClick);
      this.domNode.addEventListener('mousedown', this.onMouseDown);
    }

    GutterComponent.prototype.updateSync = function(state) {
      var id, node, _ref;
      this.newState = state.gutter;
      if (this.oldState == null) {
        this.oldState = {
          lineNumbers: {}
        };
      }
      if (this.dummyLineNumberNode == null) {
        this.appendDummyLineNumber();
      }
      if (this.newState.scrollHeight !== this.oldState.scrollHeight) {
        this.lineNumbersNode.style.height = this.newState.scrollHeight + 'px';
        this.oldState.scrollHeight = this.newState.scrollHeight;
      }
      if (this.newState.scrollTop !== this.oldState.scrollTop) {
        this.lineNumbersNode.style['-webkit-transform'] = "translate3d(0px, " + (-this.newState.scrollTop) + "px, 0px)";
        this.oldState.scrollTop = this.newState.scrollTop;
      }
      if (this.newState.backgroundColor !== this.oldState.backgroundColor) {
        this.lineNumbersNode.style.backgroundColor = this.newState.backgroundColor;
        this.oldState.backgroundColor = this.newState.backgroundColor;
      }
      if (this.newState.maxLineNumberDigits !== this.oldState.maxLineNumberDigits) {
        this.updateDummyLineNumber();
        _ref = this.lineNumberNodesById;
        for (id in _ref) {
          node = _ref[id];
          node.remove();
        }
        this.oldState = {
          maxLineNumberDigits: this.newState.maxLineNumberDigits,
          lineNumbers: {}
        };
        this.lineNumberNodesById = {};
      }
      return this.updateLineNumbers();
    };

    GutterComponent.prototype.appendDummyLineNumber = function() {
      WrapperDiv.innerHTML = this.buildLineNumberHTML({
        bufferRow: -1
      });
      this.dummyLineNumberNode = WrapperDiv.children[0];
      return this.lineNumbersNode.appendChild(this.dummyLineNumberNode);
    };

    GutterComponent.prototype.updateDummyLineNumber = function() {
      return this.dummyLineNumberNode.innerHTML = this.buildLineNumberInnerHTML(0, false);
    };

    GutterComponent.prototype.updateLineNumbers = function() {
      var i, id, lineNumberNode, lineNumberState, newLineNumberIds, newLineNumberNodes, newLineNumbersHTML, node, _i, _len, _ref, _ref1;
      newLineNumberIds = null;
      newLineNumbersHTML = null;
      _ref = this.newState.lineNumbers;
      for (id in _ref) {
        lineNumberState = _ref[id];
        if (this.oldState.lineNumbers.hasOwnProperty(id)) {
          this.updateLineNumberNode(id, lineNumberState);
        } else {
          if (newLineNumberIds == null) {
            newLineNumberIds = [];
          }
          if (newLineNumbersHTML == null) {
            newLineNumbersHTML = "";
          }
          newLineNumberIds.push(id);
          newLineNumbersHTML += this.buildLineNumberHTML(lineNumberState);
          this.oldState.lineNumbers[id] = _.clone(lineNumberState);
        }
      }
      if (newLineNumberIds != null) {
        WrapperDiv.innerHTML = newLineNumbersHTML;
        newLineNumberNodes = _.toArray(WrapperDiv.children);
        node = this.lineNumbersNode;
        for (i = _i = 0, _len = newLineNumberIds.length; _i < _len; i = ++_i) {
          id = newLineNumberIds[i];
          lineNumberNode = newLineNumberNodes[i];
          this.lineNumberNodesById[id] = lineNumberNode;
          node.appendChild(lineNumberNode);
        }
      }
      _ref1 = this.oldState.lineNumbers;
      for (id in _ref1) {
        lineNumberState = _ref1[id];
        if (!this.newState.lineNumbers.hasOwnProperty(id)) {
          this.lineNumberNodesById[id].remove();
          delete this.lineNumberNodesById[id];
          delete this.oldState.lineNumbers[id];
        }
      }
    };

    GutterComponent.prototype.buildLineNumberHTML = function(lineNumberState) {
      var bufferRow, className, decorationClasses, innerHTML, screenRow, softWrapped, style, top;
      screenRow = lineNumberState.screenRow, bufferRow = lineNumberState.bufferRow, softWrapped = lineNumberState.softWrapped, top = lineNumberState.top, decorationClasses = lineNumberState.decorationClasses;
      if (screenRow != null) {
        style = "position: absolute; top: " + top + "px;";
      } else {
        style = "visibility: hidden;";
      }
      className = this.buildLineNumberClassName(lineNumberState);
      innerHTML = this.buildLineNumberInnerHTML(bufferRow, softWrapped);
      return "<div class=\"" + className + "\" style=\"" + style + "\" data-buffer-row=\"" + bufferRow + "\" data-screen-row=\"" + screenRow + "\">" + innerHTML + "</div>";
    };

    GutterComponent.prototype.buildLineNumberInnerHTML = function(bufferRow, softWrapped) {
      var iconHTML, lineNumber, maxLineNumberDigits, padding;
      maxLineNumberDigits = this.newState.maxLineNumberDigits;
      if (softWrapped) {
        lineNumber = "•";
      } else {
        lineNumber = (bufferRow + 1).toString();
      }
      padding = _.multiplyString('&nbsp;', maxLineNumberDigits - lineNumber.length);
      iconHTML = '<div class="icon-right"></div>';
      return padding + lineNumber + iconHTML;
    };

    GutterComponent.prototype.updateLineNumberNode = function(lineNumberId, newLineNumberState) {
      var node, oldLineNumberState;
      oldLineNumberState = this.oldState.lineNumbers[lineNumberId];
      node = this.lineNumberNodesById[lineNumberId];
      if (!(oldLineNumberState.foldable === newLineNumberState.foldable && _.isEqual(oldLineNumberState.decorationClasses, newLineNumberState.decorationClasses))) {
        node.className = this.buildLineNumberClassName(newLineNumberState);
        oldLineNumberState.foldable = newLineNumberState.foldable;
        oldLineNumberState.decorationClasses = _.clone(newLineNumberState.decorationClasses);
      }
      if (oldLineNumberState.top !== newLineNumberState.top) {
        node.style.top = newLineNumberState.top + 'px';
        node.dataset.screenRow = newLineNumberState.screenRow;
        oldLineNumberState.top = newLineNumberState.top;
        return oldLineNumberState.screenRow = newLineNumberState.screenRow;
      }
    };

    GutterComponent.prototype.buildLineNumberClassName = function(_arg) {
      var bufferRow, className, decorationClasses, foldable, softWrapped;
      bufferRow = _arg.bufferRow, foldable = _arg.foldable, decorationClasses = _arg.decorationClasses, softWrapped = _arg.softWrapped;
      className = "line-number line-number-" + bufferRow;
      if (decorationClasses != null) {
        className += " " + decorationClasses.join(' ');
      }
      if (foldable && !softWrapped) {
        className += " foldable";
      }
      return className;
    };

    GutterComponent.prototype.lineNumberNodeForScreenRow = function(screenRow) {
      var id, lineNumberState, _ref;
      _ref = this.oldState.lineNumbers;
      for (id in _ref) {
        lineNumberState = _ref[id];
        if (lineNumberState.screenRow === screenRow) {
          return this.lineNumberNodesById[id];
        }
      }
      return null;
    };

    GutterComponent.prototype.onMouseDown = function(event) {
      var lineNumber, target;
      target = event.target;
      lineNumber = target.parentNode;
      if (!(target.classList.contains('icon-right') && lineNumber.classList.contains('foldable'))) {
        return this.onMouseDown(event);
      }
    };

    GutterComponent.prototype.onClick = function(event) {
      var bufferRow, lineNumber, target;
      target = event.target;
      lineNumber = target.parentNode;
      if (target.classList.contains('icon-right') && lineNumber.classList.contains('foldable')) {
        bufferRow = parseInt(lineNumber.getAttribute('data-buffer-row'));
        if (lineNumber.classList.contains('folded')) {
          return this.editor.unfoldBufferRow(bufferRow);
        } else {
          return this.editor.foldBufferRow(bufferRow);
        }
      }
    };

    return GutterComponent;

  })();

}).call(this);

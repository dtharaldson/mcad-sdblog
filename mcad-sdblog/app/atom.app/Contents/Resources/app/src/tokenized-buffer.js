(function() {
  var CompositeDisposable, Emitter, EmitterMixin, Grim, Model, Point, Range, ScopeDescriptor, Serializable, Token, TokenizedBuffer, TokenizedLine, _, _ref, _ref1,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore-plus');

  _ref = require('event-kit'), CompositeDisposable = _ref.CompositeDisposable, Emitter = _ref.Emitter;

  _ref1 = require('text-buffer'), Point = _ref1.Point, Range = _ref1.Range;

  Serializable = require('serializable');

  Model = require('./model');

  TokenizedLine = require('./tokenized-line');

  Token = require('./token');

  ScopeDescriptor = require('./scope-descriptor');

  Grim = require('grim');

  module.exports = TokenizedBuffer = (function(_super) {
    __extends(TokenizedBuffer, _super);

    Serializable.includeInto(TokenizedBuffer);

    TokenizedBuffer.prototype.grammar = null;

    TokenizedBuffer.prototype.currentGrammarScore = null;

    TokenizedBuffer.prototype.buffer = null;

    TokenizedBuffer.prototype.tabLength = null;

    TokenizedBuffer.prototype.tokenizedLines = null;

    TokenizedBuffer.prototype.chunkSize = 50;

    TokenizedBuffer.prototype.invalidRows = null;

    TokenizedBuffer.prototype.visible = false;

    function TokenizedBuffer(_arg) {
      this.buffer = _arg.buffer, this.tabLength = _arg.tabLength, this.invisibles = _arg.invisibles;
      this.grammarAddedOrUpdated = __bind(this.grammarAddedOrUpdated, this);
      this.emitter = new Emitter;
      this.disposables = new CompositeDisposable;
      this.disposables.add(atom.grammars.onDidAddGrammar(this.grammarAddedOrUpdated));
      this.disposables.add(atom.grammars.onDidUpdateGrammar(this.grammarAddedOrUpdated));
      this.disposables.add(this.buffer.preemptDidChange((function(_this) {
        return function(e) {
          return _this.handleBufferChange(e);
        };
      })(this)));
      this.disposables.add(this.buffer.onDidChangePath((function(_this) {
        return function(bufferPath) {
          _this.bufferPath = bufferPath;
          return _this.reloadGrammar();
        };
      })(this)));
      this.reloadGrammar();
    }

    TokenizedBuffer.prototype.destroyed = function() {
      return this.disposables.dispose();
    };

    TokenizedBuffer.prototype.serializeParams = function() {
      return {
        bufferPath: this.buffer.getPath(),
        tabLength: this.tabLength,
        invisibles: _.clone(this.invisibles)
      };
    };

    TokenizedBuffer.prototype.deserializeParams = function(params) {
      params.buffer = atom.project.bufferForPathSync(params.bufferPath);
      return params;
    };

    TokenizedBuffer.prototype.observeGrammar = function(callback) {
      callback(this.grammar);
      return this.onDidChangeGrammar(callback);
    };

    TokenizedBuffer.prototype.onDidChangeGrammar = function(callback) {
      return this.emitter.on('did-change-grammar', callback);
    };

    TokenizedBuffer.prototype.onDidChange = function(callback) {
      return this.emitter.on('did-change', callback);
    };

    TokenizedBuffer.prototype.onDidTokenize = function(callback) {
      return this.emitter.on('did-tokenize', callback);
    };

    TokenizedBuffer.prototype.grammarAddedOrUpdated = function(grammar) {
      var newScore;
      if (grammar.injectionSelector != null) {
        if (this.hasTokenForSelector(grammar.injectionSelector)) {
          return this.retokenizeLines();
        }
      } else {
        newScore = grammar.getScore(this.buffer.getPath(), this.buffer.getText());
        if (newScore > this.currentGrammarScore) {
          return this.setGrammar(grammar, newScore);
        }
      }
    };

    TokenizedBuffer.prototype.setGrammar = function(grammar, score) {
      var _ref2, _ref3;
      if (grammar === this.grammar) {
        return;
      }
      this.grammar = grammar;
      this.rootScopeDescriptor = new ScopeDescriptor({
        scopes: [this.grammar.scopeName]
      });
      this.currentGrammarScore = score != null ? score : grammar.getScore(this.buffer.getPath(), this.buffer.getText());
      if ((_ref2 = this.grammarUpdateDisposable) != null) {
        _ref2.dispose();
      }
      this.grammarUpdateDisposable = this.grammar.onDidUpdate((function(_this) {
        return function() {
          return _this.retokenizeLines();
        };
      })(this));
      this.disposables.add(this.grammarUpdateDisposable);
      this.configSettings = {
        tabLength: atom.config.get('editor.tabLength', {
          scope: this.rootScopeDescriptor
        })
      };
      if ((_ref3 = this.grammarTabLengthSubscription) != null) {
        _ref3.dispose();
      }
      this.grammarTabLengthSubscription = atom.config.onDidChange('editor.tabLength', {
        scope: this.rootScopeDescriptor
      }, (function(_this) {
        return function(_arg) {
          var newValue;
          newValue = _arg.newValue;
          _this.configSettings.tabLength = newValue;
          return _this.retokenizeLines();
        };
      })(this));
      this.disposables.add(this.grammarTabLengthSubscription);
      this.retokenizeLines();
      if (Grim.includeDeprecatedAPIs) {
        this.emit('grammar-changed', grammar);
      }
      return this.emitter.emit('did-change-grammar', grammar);
    };

    TokenizedBuffer.prototype.reloadGrammar = function() {
      var grammar;
      if (grammar = atom.grammars.selectGrammar(this.buffer.getPath(), this.buffer.getText())) {
        return this.setGrammar(grammar);
      } else {
        throw new Error("No grammar found for path: " + path);
      }
    };

    TokenizedBuffer.prototype.hasTokenForSelector = function(selector) {
      var token, tokens, _i, _j, _len, _len1, _ref2;
      _ref2 = this.tokenizedLines;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        tokens = _ref2[_i].tokens;
        for (_j = 0, _len1 = tokens.length; _j < _len1; _j++) {
          token = tokens[_j];
          if (selector.matches(token.scopes)) {
            return true;
          }
        }
      }
      return false;
    };

    TokenizedBuffer.prototype.retokenizeLines = function() {
      var event, lastRow;
      lastRow = this.buffer.getLastRow();
      this.tokenizedLines = this.buildPlaceholderTokenizedLinesForRows(0, lastRow);
      this.invalidRows = [];
      this.invalidateRow(0);
      this.fullyTokenized = false;
      event = {
        start: 0,
        end: lastRow,
        delta: 0
      };
      if (Grim.includeDeprecatedAPIs) {
        this.emit('changed', event);
      }
      return this.emitter.emit('did-change', event);
    };

    TokenizedBuffer.prototype.setVisible = function(visible) {
      this.visible = visible;
      if (this.visible) {
        return this.tokenizeInBackground();
      }
    };

    TokenizedBuffer.prototype.getTabLength = function() {
      var _ref2;
      return (_ref2 = this.tabLength) != null ? _ref2 : this.configSettings.tabLength;
    };

    TokenizedBuffer.prototype.setTabLength = function(tabLength) {
      if (tabLength === this.tabLength) {
        return;
      }
      this.tabLength = tabLength;
      return this.retokenizeLines();
    };

    TokenizedBuffer.prototype.setInvisibles = function(invisibles) {
      if (!_.isEqual(invisibles, this.invisibles)) {
        this.invisibles = invisibles;
        return this.retokenizeLines();
      }
    };

    TokenizedBuffer.prototype.tokenizeInBackground = function() {
      if (!this.visible || this.pendingChunk || !this.isAlive()) {
        return;
      }
      this.pendingChunk = true;
      return _.defer((function(_this) {
        return function() {
          _this.pendingChunk = false;
          if (_this.isAlive() && _this.buffer.isAlive()) {
            return _this.tokenizeNextChunk();
          }
        };
      })(this));
    };

    TokenizedBuffer.prototype.tokenizeNextChunk = function() {
      var endRow, event, filledRegion, lastRow, previousStack, row, rowsRemaining, startRow, _ref2;
      if (this.grammar === atom.grammars.nullGrammar && (this.firstInvalidRow() != null)) {
        this.invalidRows = [];
        this.markTokenizationComplete();
        return;
      }
      rowsRemaining = this.chunkSize;
      while ((this.firstInvalidRow() != null) && rowsRemaining > 0) {
        startRow = this.invalidRows.shift();
        lastRow = this.getLastRow();
        if (startRow > lastRow) {
          continue;
        }
        row = startRow;
        while (true) {
          previousStack = this.stackForRow(row);
          this.tokenizedLines[row] = this.buildTokenizedLineForRow(row, this.stackForRow(row - 1));
          if (--rowsRemaining === 0) {
            filledRegion = false;
            endRow = row;
            break;
          }
          if (row === lastRow || _.isEqual(this.stackForRow(row), previousStack)) {
            filledRegion = true;
            endRow = row;
            break;
          }
          row++;
        }
        this.validateRow(endRow);
        if (!filledRegion) {
          this.invalidateRow(endRow + 1);
        }
        _ref2 = this.updateFoldableStatus(startRow, endRow), startRow = _ref2[0], endRow = _ref2[1];
        event = {
          start: startRow,
          end: endRow,
          delta: 0
        };
        if (Grim.includeDeprecatedAPIs) {
          this.emit('changed', event);
        }
        this.emitter.emit('did-change', event);
      }
      if (this.firstInvalidRow() != null) {
        return this.tokenizeInBackground();
      } else {
        return this.markTokenizationComplete();
      }
    };

    TokenizedBuffer.prototype.markTokenizationComplete = function() {
      if (!this.fullyTokenized) {
        if (Grim.includeDeprecatedAPIs) {
          this.emit('tokenized');
        }
        this.emitter.emit('did-tokenize');
      }
      return this.fullyTokenized = true;
    };

    TokenizedBuffer.prototype.firstInvalidRow = function() {
      return this.invalidRows[0];
    };

    TokenizedBuffer.prototype.validateRow = function(row) {
      while (this.invalidRows[0] <= row) {
        this.invalidRows.shift();
      }
    };

    TokenizedBuffer.prototype.invalidateRow = function(row) {
      this.invalidRows.push(row);
      this.invalidRows.sort(function(a, b) {
        return a - b;
      });
      return this.tokenizeInBackground();
    };

    TokenizedBuffer.prototype.updateInvalidRows = function(start, end, delta) {
      return this.invalidRows = this.invalidRows.map(function(row) {
        if (row < start) {
          return row;
        } else if ((start <= row && row <= end)) {
          return end + delta + 1;
        } else if (row > end) {
          return row + delta;
        }
      });
    };

    TokenizedBuffer.prototype.handleBufferChange = function(e) {
      var delta, end, event, newEndStack, newRange, newTokenizedLines, oldRange, previousEndStack, start, _ref2;
      oldRange = e.oldRange, newRange = e.newRange;
      start = oldRange.start.row;
      end = oldRange.end.row;
      delta = newRange.end.row - oldRange.end.row;
      this.updateInvalidRows(start, end, delta);
      previousEndStack = this.stackForRow(end);
      newTokenizedLines = this.buildTokenizedLinesForRows(start, end + delta, this.stackForRow(start - 1));
      _.spliceWithArray(this.tokenizedLines, start, end - start + 1, newTokenizedLines);
      start = this.retokenizeWhitespaceRowsIfIndentLevelChanged(start - 1, -1);
      end = this.retokenizeWhitespaceRowsIfIndentLevelChanged(newRange.end.row + 1, 1) - delta;
      newEndStack = this.stackForRow(end + delta);
      if (newEndStack && !_.isEqual(newEndStack, previousEndStack)) {
        this.invalidateRow(end + delta + 1);
      }
      _ref2 = this.updateFoldableStatus(start, end + delta), start = _ref2[0], end = _ref2[1];
      end -= delta;
      event = {
        start: start,
        end: end,
        delta: delta,
        bufferChange: e
      };
      if (Grim.includeDeprecatedAPIs) {
        this.emit('changed', event);
      }
      return this.emitter.emit('did-change', event);
    };

    TokenizedBuffer.prototype.retokenizeWhitespaceRowsIfIndentLevelChanged = function(row, increment) {
      var line;
      line = this.tokenizedLines[row];
      if ((line != null ? line.isOnlyWhitespace() : void 0) && this.indentLevelForRow(row) !== line.indentLevel) {
        while (line != null ? line.isOnlyWhitespace() : void 0) {
          this.tokenizedLines[row] = this.buildTokenizedLineForRow(row, this.stackForRow(row - 1));
          row += increment;
          line = this.tokenizedLines[row];
        }
      }
      return row - increment;
    };

    TokenizedBuffer.prototype.updateFoldableStatus = function(startRow, endRow) {
      var foldable, line, row, scanEndRow, scanStartRow, _i, _ref2, _ref3;
      scanStartRow = (_ref2 = this.buffer.previousNonBlankRow(startRow)) != null ? _ref2 : startRow;
      while (scanStartRow > 0 && this.tokenizedLineForRow(scanStartRow).isComment()) {
        scanStartRow--;
      }
      scanEndRow = (_ref3 = this.buffer.nextNonBlankRow(endRow)) != null ? _ref3 : endRow;
      for (row = _i = scanStartRow; _i <= scanEndRow; row = _i += 1) {
        foldable = this.isFoldableAtRow(row);
        line = this.tokenizedLineForRow(row);
        if (line.foldable !== foldable) {
          line.foldable = foldable;
          startRow = Math.min(startRow, row);
          endRow = Math.max(endRow, row);
        }
      }
      return [startRow, endRow];
    };

    TokenizedBuffer.prototype.isFoldableAtRow = function(row) {
      return this.isFoldableCodeAtRow(row) || this.isFoldableCommentAtRow(row);
    };

    TokenizedBuffer.prototype.isFoldableCodeAtRow = function(row) {
      var nextRow;
      if (this.buffer.isRowBlank(row) || this.tokenizedLineForRow(row).isComment()) {
        return false;
      }
      nextRow = this.buffer.nextNonBlankRow(row);
      if (nextRow == null) {
        return false;
      }
      return this.indentLevelForRow(nextRow) > this.indentLevelForRow(row);
    };

    TokenizedBuffer.prototype.isFoldableCommentAtRow = function(row) {
      var nextRow, previousRow;
      previousRow = row - 1;
      nextRow = row + 1;
      if (nextRow > this.buffer.getLastRow()) {
        return false;
      }
      return (row === 0 || !this.tokenizedLineForRow(previousRow).isComment()) && this.tokenizedLineForRow(row).isComment() && this.tokenizedLineForRow(nextRow).isComment();
    };

    TokenizedBuffer.prototype.buildTokenizedLinesForRows = function(startRow, endRow, startingStack) {
      var row, ruleStack, screenLine, stopTokenizingAt, tokenizedLines;
      ruleStack = startingStack;
      stopTokenizingAt = startRow + this.chunkSize;
      tokenizedLines = (function() {
        var _i, _results;
        _results = [];
        for (row = _i = startRow; startRow <= endRow ? _i <= endRow : _i >= endRow; row = startRow <= endRow ? ++_i : --_i) {
          if ((ruleStack || row === 0) && row < stopTokenizingAt) {
            screenLine = this.buildTokenizedLineForRow(row, ruleStack);
            ruleStack = screenLine.ruleStack;
          } else {
            screenLine = this.buildPlaceholderTokenizedLineForRow(row);
          }
          _results.push(screenLine);
        }
        return _results;
      }).call(this);
      if (endRow >= stopTokenizingAt) {
        this.invalidateRow(stopTokenizingAt);
        this.tokenizeInBackground();
      }
      return tokenizedLines;
    };

    TokenizedBuffer.prototype.buildPlaceholderTokenizedLinesForRows = function(startRow, endRow) {
      var row, _i, _results;
      _results = [];
      for (row = _i = startRow; startRow <= endRow ? _i <= endRow : _i >= endRow; row = startRow <= endRow ? ++_i : --_i) {
        _results.push(this.buildPlaceholderTokenizedLineForRow(row));
      }
      return _results;
    };

    TokenizedBuffer.prototype.buildPlaceholderTokenizedLineForRow = function(row) {
      var indentLevel, line, lineEnding, tabLength, tokens;
      line = this.buffer.lineForRow(row);
      tokens = [
        new Token({
          value: line,
          scopes: [this.grammar.scopeName]
        })
      ];
      tabLength = this.getTabLength();
      indentLevel = this.indentLevelForRow(row);
      lineEnding = this.buffer.lineEndingForRow(row);
      return new TokenizedLine({
        tokens: tokens,
        tabLength: tabLength,
        indentLevel: indentLevel,
        invisibles: this.invisibles,
        lineEnding: lineEnding
      });
    };

    TokenizedBuffer.prototype.buildTokenizedLineForRow = function(row, ruleStack) {
      return this.buildTokenizedLineForRowWithText(row, this.buffer.lineForRow(row), ruleStack);
    };

    TokenizedBuffer.prototype.buildTokenizedLineForRowWithText = function(row, line, ruleStack) {
      var indentLevel, lineEnding, tabLength, tokens, _ref2;
      if (ruleStack == null) {
        ruleStack = this.stackForRow(row - 1);
      }
      lineEnding = this.buffer.lineEndingForRow(row);
      tabLength = this.getTabLength();
      indentLevel = this.indentLevelForRow(row);
      _ref2 = this.grammar.tokenizeLine(line, ruleStack, row === 0), tokens = _ref2.tokens, ruleStack = _ref2.ruleStack;
      return new TokenizedLine({
        tokens: tokens,
        ruleStack: ruleStack,
        tabLength: tabLength,
        lineEnding: lineEnding,
        indentLevel: indentLevel,
        invisibles: this.invisibles
      });
    };

    TokenizedBuffer.prototype.tokenizedLineForRow = function(bufferRow) {
      return this.tokenizedLines[bufferRow];
    };

    TokenizedBuffer.prototype.stackForRow = function(bufferRow) {
      var _ref2;
      return (_ref2 = this.tokenizedLines[bufferRow]) != null ? _ref2.ruleStack : void 0;
    };

    TokenizedBuffer.prototype.indentLevelForRow = function(bufferRow) {
      var indentLevel, line, lineCount, nextLine, nextRow, previousLine, previousRow;
      line = this.buffer.lineForRow(bufferRow);
      indentLevel = 0;
      if (line === '') {
        nextRow = bufferRow + 1;
        lineCount = this.getLineCount();
        while (nextRow < lineCount) {
          nextLine = this.buffer.lineForRow(nextRow);
          if (nextLine !== '') {
            indentLevel = Math.ceil(this.indentLevelForLine(nextLine));
            break;
          }
          nextRow++;
        }
        previousRow = bufferRow - 1;
        while (previousRow >= 0) {
          previousLine = this.buffer.lineForRow(previousRow);
          if (previousLine !== '') {
            indentLevel = Math.max(Math.ceil(this.indentLevelForLine(previousLine)), indentLevel);
            break;
          }
          previousRow--;
        }
        return indentLevel;
      } else {
        return this.indentLevelForLine(line);
      }
    };

    TokenizedBuffer.prototype.indentLevelForLine = function(line) {
      var leadingWhitespace, match, spaceCount, tabCount, _ref2, _ref3, _ref4, _ref5;
      if (match = line.match(/^[\t ]+/)) {
        leadingWhitespace = match[0];
        tabCount = (_ref2 = (_ref3 = leadingWhitespace.match(/\t/g)) != null ? _ref3.length : void 0) != null ? _ref2 : 0;
        spaceCount = (_ref4 = (_ref5 = leadingWhitespace.match(/[ ]/g)) != null ? _ref5.length : void 0) != null ? _ref4 : 0;
        return tabCount + (spaceCount / this.getTabLength());
      } else {
        return 0;
      }
    };

    TokenizedBuffer.prototype.scopeDescriptorForPosition = function(position) {
      return new ScopeDescriptor({
        scopes: this.tokenForPosition(position).scopes
      });
    };

    TokenizedBuffer.prototype.tokenForPosition = function(position) {
      var column, row, _ref2;
      _ref2 = Point.fromObject(position), row = _ref2.row, column = _ref2.column;
      return this.tokenizedLines[row].tokenAtBufferColumn(column);
    };

    TokenizedBuffer.prototype.tokenStartPositionForPosition = function(position) {
      var column, row, _ref2;
      _ref2 = Point.fromObject(position), row = _ref2.row, column = _ref2.column;
      column = this.tokenizedLines[row].tokenStartColumnForBufferColumn(column);
      return new Point(row, column);
    };

    TokenizedBuffer.prototype.bufferRangeForScopeAtPosition = function(selector, position) {
      var endColumn, firstToken, index, lastToken, startColumn, startIndex, token, tokenizedLine, _i, _j, _ref2;
      position = Point.fromObject(position);
      tokenizedLine = this.tokenizedLines[position.row];
      startIndex = tokenizedLine.tokenIndexAtBufferColumn(position.column);
      for (index = _i = startIndex; startIndex <= 0 ? _i <= 0 : _i >= 0; index = startIndex <= 0 ? ++_i : --_i) {
        token = tokenizedLine.tokenAtIndex(index);
        if (!token.matchesScopeSelector(selector)) {
          break;
        }
        firstToken = token;
      }
      for (index = _j = startIndex, _ref2 = tokenizedLine.getTokenCount(); startIndex <= _ref2 ? _j < _ref2 : _j > _ref2; index = startIndex <= _ref2 ? ++_j : --_j) {
        token = tokenizedLine.tokenAtIndex(index);
        if (!token.matchesScopeSelector(selector)) {
          break;
        }
        lastToken = token;
      }
      if (!((firstToken != null) && (lastToken != null))) {
        return;
      }
      startColumn = tokenizedLine.bufferColumnForToken(firstToken);
      endColumn = tokenizedLine.bufferColumnForToken(lastToken) + lastToken.bufferDelta;
      return new Range([position.row, startColumn], [position.row, endColumn]);
    };

    TokenizedBuffer.prototype.iterateTokensInBufferRange = function(bufferRange, iterator) {
      var bufferColumn, bufferRow, end, keepLooping, start, startOfToken, stop, token, _i, _j, _len, _ref2, _ref3, _ref4;
      bufferRange = Range.fromObject(bufferRange);
      start = bufferRange.start, end = bufferRange.end;
      keepLooping = true;
      stop = function() {
        return keepLooping = false;
      };
      for (bufferRow = _i = _ref2 = start.row, _ref3 = end.row; _ref2 <= _ref3 ? _i <= _ref3 : _i >= _ref3; bufferRow = _ref2 <= _ref3 ? ++_i : --_i) {
        bufferColumn = 0;
        _ref4 = this.tokenizedLines[bufferRow].tokens;
        for (_j = 0, _len = _ref4.length; _j < _len; _j++) {
          token = _ref4[_j];
          startOfToken = new Point(bufferRow, bufferColumn);
          if (bufferRange.containsPoint(startOfToken)) {
            iterator(token, startOfToken, {
              stop: stop
            });
          }
          if (!keepLooping) {
            return;
          }
          bufferColumn += token.bufferDelta;
        }
      }
    };

    TokenizedBuffer.prototype.backwardsIterateTokensInBufferRange = function(bufferRange, iterator) {
      var bufferColumn, bufferRow, end, keepLooping, start, startOfToken, stop, token, _i, _j, _len, _ref2, _ref3, _ref4;
      bufferRange = Range.fromObject(bufferRange);
      start = bufferRange.start, end = bufferRange.end;
      keepLooping = true;
      stop = function() {
        return keepLooping = false;
      };
      for (bufferRow = _i = _ref2 = end.row, _ref3 = start.row; _ref2 <= _ref3 ? _i <= _ref3 : _i >= _ref3; bufferRow = _ref2 <= _ref3 ? ++_i : --_i) {
        bufferColumn = this.buffer.lineLengthForRow(bufferRow);
        _ref4 = (function(func, args, ctor) {
          ctor.prototype = func.prototype;
          var child = new ctor, result = func.apply(child, args);
          return Object(result) === result ? result : child;
        })(Array, this.tokenizedLines[bufferRow].tokens, function(){}).reverse();
        for (_j = 0, _len = _ref4.length; _j < _len; _j++) {
          token = _ref4[_j];
          bufferColumn -= token.bufferDelta;
          startOfToken = new Point(bufferRow, bufferColumn);
          if (bufferRange.containsPoint(startOfToken)) {
            iterator(token, startOfToken, {
              stop: stop
            });
          }
          if (!keepLooping) {
            return;
          }
        }
      }
    };

    TokenizedBuffer.prototype.findOpeningBracket = function(startBufferPosition) {
      var depth, position, range;
      range = [[0, 0], startBufferPosition];
      position = null;
      depth = 0;
      this.backwardsIterateTokensInBufferRange(range, function(token, startPosition, _arg) {
        var stop;
        stop = _arg.stop;
        if (token.isBracket()) {
          if (token.value === '}') {
            return depth++;
          } else if (token.value === '{') {
            depth--;
            if (depth === 0) {
              position = startPosition;
              return stop();
            }
          }
        }
      });
      return position;
    };

    TokenizedBuffer.prototype.findClosingBracket = function(startBufferPosition) {
      var depth, position, range;
      range = [startBufferPosition, this.buffer.getEndPosition()];
      position = null;
      depth = 0;
      this.iterateTokensInBufferRange(range, function(token, startPosition, _arg) {
        var stop;
        stop = _arg.stop;
        if (token.isBracket()) {
          if (token.value === '{') {
            return depth++;
          } else if (token.value === '}') {
            depth--;
            if (depth === 0) {
              position = startPosition;
              return stop();
            }
          }
        }
      });
      return position;
    };

    TokenizedBuffer.prototype.getLastRow = function() {
      return this.buffer.getLastRow();
    };

    TokenizedBuffer.prototype.getLineCount = function() {
      return this.buffer.getLineCount();
    };

    TokenizedBuffer.prototype.logLines = function(start, end) {
      var line, row, _i;
      if (start == null) {
        start = 0;
      }
      if (end == null) {
        end = this.buffer.getLastRow();
      }
      for (row = _i = start; start <= end ? _i <= end : _i >= end; row = start <= end ? ++_i : --_i) {
        line = this.tokenizedLineForRow(row).text;
        console.log(row, line, line.length);
      }
    };

    return TokenizedBuffer;

  })(Model);

  if (Grim.includeDeprecatedAPIs) {
    EmitterMixin = require('emissary').Emitter;
    TokenizedBuffer.prototype.on = function(eventName) {
      switch (eventName) {
        case 'changed':
          Grim.deprecate("Use TokenizedBuffer::onDidChange instead");
          break;
        case 'grammar-changed':
          Grim.deprecate("Use TokenizedBuffer::onDidChangeGrammar instead");
          break;
        case 'tokenized':
          Grim.deprecate("Use TokenizedBuffer::onDidTokenize instead");
          break;
        default:
          Grim.deprecate("TokenizedBuffer::on is deprecated. Use event subscription methods instead.");
      }
      return EmitterMixin.prototype.on.apply(this, arguments);
    };
  }

}).call(this);

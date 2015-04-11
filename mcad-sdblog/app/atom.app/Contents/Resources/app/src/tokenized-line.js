(function() {
  var LeadingWhitespaceRegex, NonWhitespaceRegex, RepeatedSpaceRegex, Scope, TokenizedLine, TrailingWhitespaceRegex, idCounter, isPairedCharacter, _;

  _ = require('underscore-plus');

  isPairedCharacter = require('./text-utils').isPairedCharacter;

  NonWhitespaceRegex = /\S/;

  LeadingWhitespaceRegex = /^\s*/;

  TrailingWhitespaceRegex = /\s*$/;

  RepeatedSpaceRegex = /[ ]/g;

  idCounter = 1;

  module.exports = TokenizedLine = (function() {
    TokenizedLine.prototype.endOfLineInvisibles = null;

    TokenizedLine.prototype.lineIsWhitespaceOnly = false;

    TokenizedLine.prototype.firstNonWhitespaceIndex = 0;

    TokenizedLine.prototype.foldable = false;

    function TokenizedLine(_arg) {
      var tokens;
      tokens = _arg.tokens, this.lineEnding = _arg.lineEnding, this.ruleStack = _arg.ruleStack, this.startBufferColumn = _arg.startBufferColumn, this.fold = _arg.fold, this.tabLength = _arg.tabLength, this.indentLevel = _arg.indentLevel, this.invisibles = _arg.invisibles;
      if (this.startBufferColumn == null) {
        this.startBufferColumn = 0;
      }
      this.tokens = this.breakOutAtomicTokens(tokens);
      this.text = this.buildText();
      this.bufferDelta = this.buildBufferDelta();
      this.softWrapIndentationTokens = this.getSoftWrapIndentationTokens();
      this.softWrapIndentationDelta = this.buildSoftWrapIndentationDelta();
      this.id = idCounter++;
      this.markLeadingAndTrailingWhitespaceTokens();
      if (this.invisibles) {
        this.substituteInvisibleCharacters();
        if (this.lineEnding != null) {
          this.buildEndOfLineInvisibles();
        }
      }
    }

    TokenizedLine.prototype.buildText = function() {
      var text, token, _i, _len, _ref;
      text = "";
      _ref = this.tokens;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        token = _ref[_i];
        text += token.value;
      }
      return text;
    };

    TokenizedLine.prototype.buildBufferDelta = function() {
      var delta, token, _i, _len, _ref;
      delta = 0;
      _ref = this.tokens;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        token = _ref[_i];
        delta += token.bufferDelta;
      }
      return delta;
    };

    TokenizedLine.prototype.copy = function() {
      return new TokenizedLine({
        tokens: this.tokens,
        lineEnding: this.lineEnding,
        ruleStack: this.ruleStack,
        startBufferColumn: this.startBufferColumn,
        fold: this.fold
      });
    };

    TokenizedLine.prototype.clipScreenColumn = function(column, options) {
      var clip, token, tokenStartColumn, _i, _len, _ref;
      if (options == null) {
        options = {};
      }
      if (this.tokens.length === 0) {
        return 0;
      }
      clip = options.clip;
      column = Math.min(column, this.getMaxScreenColumn());
      tokenStartColumn = 0;
      _ref = this.tokens;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        token = _ref[_i];
        if (tokenStartColumn + token.screenDelta > column) {
          break;
        }
        tokenStartColumn += token.screenDelta;
      }
      if (this.isColumnInsideSoftWrapIndentation(tokenStartColumn)) {
        return this.softWrapIndentationDelta;
      } else if (token.isAtomic && tokenStartColumn < column) {
        if (clip === 'forward') {
          return tokenStartColumn + token.screenDelta;
        } else if (clip === 'backward') {
          return tokenStartColumn;
        } else {
          if (column > tokenStartColumn + (token.screenDelta / 2)) {
            return tokenStartColumn + token.screenDelta;
          } else {
            return tokenStartColumn;
          }
        }
      } else {
        return column;
      }
    };

    TokenizedLine.prototype.screenColumnForBufferColumn = function(bufferColumn, options) {
      var currentBufferColumn, screenColumn, token, _i, _len, _ref;
      bufferColumn = bufferColumn - this.startBufferColumn;
      screenColumn = 0;
      currentBufferColumn = 0;
      _ref = this.tokens;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        token = _ref[_i];
        if (currentBufferColumn + token.bufferDelta > bufferColumn) {
          break;
        }
        screenColumn += token.screenDelta;
        currentBufferColumn += token.bufferDelta;
      }
      return this.clipScreenColumn(screenColumn + (bufferColumn - currentBufferColumn));
    };

    TokenizedLine.prototype.bufferColumnForScreenColumn = function(screenColumn, options) {
      var bufferColumn, currentScreenColumn, token, _i, _len, _ref;
      bufferColumn = this.startBufferColumn;
      currentScreenColumn = 0;
      _ref = this.tokens;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        token = _ref[_i];
        if (currentScreenColumn + token.screenDelta > screenColumn) {
          break;
        }
        bufferColumn += token.bufferDelta;
        currentScreenColumn += token.screenDelta;
      }
      return bufferColumn + (screenColumn - currentScreenColumn);
    };

    TokenizedLine.prototype.getMaxScreenColumn = function() {
      if (this.fold) {
        return 0;
      } else {
        return this.text.length;
      }
    };

    TokenizedLine.prototype.getMaxBufferColumn = function() {
      return this.startBufferColumn + this.bufferDelta;
    };

    TokenizedLine.prototype.findWrapColumn = function(maxColumn) {
      var column, _i, _j, _ref, _ref1;
      if (maxColumn == null) {
        return;
      }
      if (!(this.text.length > maxColumn)) {
        return;
      }
      if (/\s/.test(this.text[maxColumn])) {
        for (column = _i = maxColumn, _ref = this.text.length; maxColumn <= _ref ? _i <= _ref : _i >= _ref; column = maxColumn <= _ref ? ++_i : --_i) {
          if (/\S/.test(this.text[column])) {
            return column;
          }
        }
        return this.text.length;
      } else {
        for (column = _j = maxColumn, _ref1 = this.firstNonWhitespaceIndex; maxColumn <= _ref1 ? _j <= _ref1 : _j >= _ref1; column = maxColumn <= _ref1 ? ++_j : --_j) {
          if (/\s/.test(this.text[column])) {
            return column + 1;
          }
        }
        return maxColumn;
      }
    };

    TokenizedLine.prototype.buildSoftWrapIndentationTokens = function(token, hangingIndent) {
      var indentToken, indentTokens, tokenLength, totalIndentSpaces;
      totalIndentSpaces = (this.indentLevel * this.tabLength) + hangingIndent;
      indentTokens = [];
      while (totalIndentSpaces > 0) {
        tokenLength = Math.min(this.tabLength, totalIndentSpaces);
        indentToken = token.buildSoftWrapIndentationToken(tokenLength);
        indentTokens.push(indentToken);
        totalIndentSpaces -= tokenLength;
      }
      return indentTokens;
    };

    TokenizedLine.prototype.softWrapAt = function(column, hangingIndent) {
      var indentationTokens, leftFragment, leftScreenColumn, leftTokens, nextToken, rightFragment, rightTokens, _ref;
      if (column === 0) {
        return [new TokenizedLine([], '', [0, 0], [0, 0]), this];
      }
      rightTokens = (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(Array, this.tokens, function(){});
      leftTokens = [];
      leftScreenColumn = 0;
      while (leftScreenColumn < column) {
        if (leftScreenColumn + rightTokens[0].screenDelta > column) {
          [].splice.apply(rightTokens, [0, 1].concat(_ref = rightTokens[0].splitAt(column - leftScreenColumn))), _ref;
        }
        nextToken = rightTokens.shift();
        leftScreenColumn += nextToken.screenDelta;
        leftTokens.push(nextToken);
      }
      indentationTokens = this.buildSoftWrapIndentationTokens(leftTokens[0], hangingIndent);
      leftFragment = new TokenizedLine({
        tokens: leftTokens,
        startBufferColumn: this.startBufferColumn,
        ruleStack: this.ruleStack,
        invisibles: this.invisibles,
        lineEnding: null,
        indentLevel: this.indentLevel,
        tabLength: this.tabLength
      });
      rightFragment = new TokenizedLine({
        tokens: indentationTokens.concat(rightTokens),
        startBufferColumn: this.bufferColumnForScreenColumn(column),
        ruleStack: this.ruleStack,
        invisibles: this.invisibles,
        lineEnding: this.lineEnding,
        indentLevel: this.indentLevel,
        tabLength: this.tabLength
      });
      return [leftFragment, rightFragment];
    };

    TokenizedLine.prototype.isSoftWrapped = function() {
      return this.lineEnding === null;
    };

    TokenizedLine.prototype.isColumnInsideSoftWrapIndentation = function(column) {
      if (this.softWrapIndentationTokens.length === 0) {
        return false;
      }
      return column < this.softWrapIndentationDelta;
    };

    TokenizedLine.prototype.getSoftWrapIndentationTokens = function() {
      return _.select(this.tokens, function(token) {
        return token.isSoftWrapIndentation;
      });
    };

    TokenizedLine.prototype.buildSoftWrapIndentationDelta = function() {
      return _.reduce(this.softWrapIndentationTokens, (function(acc, token) {
        return acc + token.screenDelta;
      }), 0);
    };

    TokenizedLine.prototype.hasOnlySoftWrapIndentation = function() {
      return this.tokens.length === this.softWrapIndentationTokens.length;
    };

    TokenizedLine.prototype.tokenAtBufferColumn = function(bufferColumn) {
      return this.tokens[this.tokenIndexAtBufferColumn(bufferColumn)];
    };

    TokenizedLine.prototype.tokenIndexAtBufferColumn = function(bufferColumn) {
      var delta, index, token, _i, _len, _ref;
      delta = 0;
      _ref = this.tokens;
      for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
        token = _ref[index];
        delta += token.bufferDelta;
        if (delta > bufferColumn) {
          return index;
        }
      }
      return index - 1;
    };

    TokenizedLine.prototype.tokenStartColumnForBufferColumn = function(bufferColumn) {
      var delta, nextDelta, token, _i, _len, _ref;
      delta = 0;
      _ref = this.tokens;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        token = _ref[_i];
        nextDelta = delta + token.bufferDelta;
        if (nextDelta > bufferColumn) {
          break;
        }
        delta = nextDelta;
      }
      return delta;
    };

    TokenizedLine.prototype.breakOutAtomicTokens = function(inputTokens) {
      var breakOutLeadingSoftTabs, column, newToken, newTokens, outputTokens, token, _i, _j, _len, _len1;
      outputTokens = [];
      breakOutLeadingSoftTabs = true;
      column = this.startBufferColumn;
      for (_i = 0, _len = inputTokens.length; _i < _len; _i++) {
        token = inputTokens[_i];
        newTokens = token.breakOutAtomicTokens(this.tabLength, breakOutLeadingSoftTabs, column);
        for (_j = 0, _len1 = newTokens.length; _j < _len1; _j++) {
          newToken = newTokens[_j];
          column += newToken.value.length;
        }
        outputTokens.push.apply(outputTokens, newTokens);
        if (breakOutLeadingSoftTabs) {
          breakOutLeadingSoftTabs = token.isOnlyWhitespace();
        }
      }
      return outputTokens;
    };

    TokenizedLine.prototype.markLeadingAndTrailingWhitespaceTokens = function() {
      var firstTrailingWhitespaceIndex, index, token, _i, _len, _ref;
      this.firstNonWhitespaceIndex = this.text.search(NonWhitespaceRegex);
      if (this.firstNonWhitespaceIndex > 0 && isPairedCharacter(this.text, this.firstNonWhitespaceIndex - 1)) {
        this.firstNonWhitespaceIndex--;
      }
      firstTrailingWhitespaceIndex = this.text.search(TrailingWhitespaceRegex);
      this.lineIsWhitespaceOnly = firstTrailingWhitespaceIndex === 0;
      index = 0;
      _ref = this.tokens;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        token = _ref[_i];
        if (index < this.firstNonWhitespaceIndex) {
          token.firstNonWhitespaceIndex = Math.min(index + token.value.length, this.firstNonWhitespaceIndex - index);
        }
        if ((this.lineEnding != null) && (index + token.value.length > firstTrailingWhitespaceIndex)) {
          token.firstTrailingWhitespaceIndex = Math.max(0, firstTrailingWhitespaceIndex - index);
        }
        index += token.value.length;
      }
    };

    TokenizedLine.prototype.substituteInvisibleCharacters = function() {
      var changedText, i, invisibles, token, _i, _len, _ref;
      invisibles = this.invisibles;
      changedText = false;
      _ref = this.tokens;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        token = _ref[i];
        if (token.isHardTab) {
          if (invisibles.tab) {
            token.value = invisibles.tab + token.value.substring(invisibles.tab.length);
            token.hasInvisibleCharacters = true;
            changedText = true;
          }
        } else {
          if (invisibles.space) {
            if (token.hasLeadingWhitespace() && !token.isSoftWrapIndentation) {
              token.value = token.value.replace(LeadingWhitespaceRegex, function(leadingWhitespace) {
                return leadingWhitespace.replace(RepeatedSpaceRegex, invisibles.space);
              });
              token.hasInvisibleCharacters = true;
              changedText = true;
            }
            if (token.hasTrailingWhitespace()) {
              token.value = token.value.replace(TrailingWhitespaceRegex, function(leadingWhitespace) {
                return leadingWhitespace.replace(RepeatedSpaceRegex, invisibles.space);
              });
              token.hasInvisibleCharacters = true;
              changedText = true;
            }
          }
        }
      }
      if (changedText) {
        return this.text = this.buildText();
      }
    };

    TokenizedLine.prototype.buildEndOfLineInvisibles = function() {
      var cr, eol, _ref;
      this.endOfLineInvisibles = [];
      _ref = this.invisibles, cr = _ref.cr, eol = _ref.eol;
      switch (this.lineEnding) {
        case '\r\n':
          if (cr) {
            this.endOfLineInvisibles.push(cr);
          }
          if (eol) {
            return this.endOfLineInvisibles.push(eol);
          }
          break;
        case '\n':
          if (eol) {
            return this.endOfLineInvisibles.push(eol);
          }
      }
    };

    TokenizedLine.prototype.isComment = function() {
      var scope, token, _i, _j, _len, _len1, _ref, _ref1;
      _ref = this.tokens;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        token = _ref[_i];
        if (token.scopes.length === 1) {
          continue;
        }
        if (token.isOnlyWhitespace()) {
          continue;
        }
        _ref1 = token.scopes;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          scope = _ref1[_j];
          if (_.contains(scope.split('.'), 'comment')) {
            return true;
          }
        }
        break;
      }
      return false;
    };

    TokenizedLine.prototype.isOnlyWhitespace = function() {
      return this.lineIsWhitespaceOnly;
    };

    TokenizedLine.prototype.tokenAtIndex = function(index) {
      return this.tokens[index];
    };

    TokenizedLine.prototype.getTokenCount = function() {
      return this.tokens.length;
    };

    TokenizedLine.prototype.bufferColumnForToken = function(targetToken) {
      var column, token, _i, _len, _ref;
      column = 0;
      _ref = this.tokens;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        token = _ref[_i];
        if (token === targetToken) {
          return column;
        }
        column += token.bufferDelta;
      }
    };

    TokenizedLine.prototype.getScopeTree = function() {
      var scopeStack, token, _i, _len, _ref;
      if (this.scopeTree != null) {
        return this.scopeTree;
      }
      scopeStack = [];
      _ref = this.tokens;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        token = _ref[_i];
        this.updateScopeStack(scopeStack, token.scopes);
        _.last(scopeStack).children.push(token);
      }
      this.scopeTree = scopeStack[0];
      this.updateScopeStack(scopeStack, []);
      return this.scopeTree;
    };

    TokenizedLine.prototype.updateScopeStack = function(scopeStack, desiredScopeDescriptor) {
      var i, j, poppedScope, scope, _i, _j, _len, _ref, _ref1, _ref2;
      for (i = _i = 0, _len = desiredScopeDescriptor.length; _i < _len; i = ++_i) {
        scope = desiredScopeDescriptor[i];
        if (((_ref = scopeStack[i]) != null ? _ref.scope : void 0) !== desiredScopeDescriptor[i]) {
          break;
        }
      }
      while (scopeStack.length !== i) {
        poppedScope = scopeStack.pop();
        if ((_ref1 = _.last(scopeStack)) != null) {
          _ref1.children.push(poppedScope);
        }
      }
      for (j = _j = i, _ref2 = desiredScopeDescriptor.length; i <= _ref2 ? _j < _ref2 : _j > _ref2; j = i <= _ref2 ? ++_j : --_j) {
        scopeStack.push(new Scope(desiredScopeDescriptor[j]));
      }
    };

    return TokenizedLine;

  })();

  Scope = (function() {
    function Scope(scope) {
      this.scope = scope;
      this.children = [];
    }

    return Scope;

  })();

}).call(this);

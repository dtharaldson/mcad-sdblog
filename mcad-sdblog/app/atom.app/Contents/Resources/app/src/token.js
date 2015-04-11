(function() {
  var EscapeRegex, MaxTokenLength, StartDotRegex, Token, WhitespaceRegex, WhitespaceRegexesByTabLength, textUtils, _;

  _ = require('underscore-plus');

  textUtils = require('./text-utils');

  WhitespaceRegexesByTabLength = {};

  EscapeRegex = /[&"'<>]/g;

  StartDotRegex = /^\.?/;

  WhitespaceRegex = /\S/;

  MaxTokenLength = 20000;

  module.exports = Token = (function() {
    Token.prototype.value = null;

    Token.prototype.hasPairedCharacter = false;

    Token.prototype.scopes = null;

    Token.prototype.isAtomic = null;

    Token.prototype.isHardTab = null;

    Token.prototype.firstNonWhitespaceIndex = null;

    Token.prototype.firstTrailingWhitespaceIndex = null;

    Token.prototype.hasInvisibleCharacters = false;

    function Token(_arg) {
      this.value = _arg.value, this.scopes = _arg.scopes, this.isAtomic = _arg.isAtomic, this.bufferDelta = _arg.bufferDelta, this.isHardTab = _arg.isHardTab, this.hasPairedCharacter = _arg.hasPairedCharacter, this.isSoftWrapIndentation = _arg.isSoftWrapIndentation;
      this.screenDelta = this.value.length;
      if (this.bufferDelta == null) {
        this.bufferDelta = this.screenDelta;
      }
      if (this.hasPairedCharacter == null) {
        this.hasPairedCharacter = textUtils.hasPairedCharacter(this.value);
      }
    }

    Token.prototype.isEqual = function(other) {
      return this.value === other.value && _.isEqual(this.scopes, other.scopes) && !!this.isAtomic === !!other.isAtomic;
    };

    Token.prototype.isBracket = function() {
      return /^meta\.brace\b/.test(_.last(this.scopes));
    };

    Token.prototype.splitAt = function(splitIndex) {
      var leftToken, rightToken;
      leftToken = new Token({
        value: this.value.substring(0, splitIndex),
        scopes: this.scopes
      });
      rightToken = new Token({
        value: this.value.substring(splitIndex),
        scopes: this.scopes
      });
      if (this.firstNonWhitespaceIndex != null) {
        leftToken.firstNonWhitespaceIndex = Math.min(splitIndex, this.firstNonWhitespaceIndex);
        leftToken.hasInvisibleCharacters = this.hasInvisibleCharacters;
        if (this.firstNonWhitespaceIndex > splitIndex) {
          rightToken.firstNonWhitespaceIndex = this.firstNonWhitespaceIndex - splitIndex;
          rightToken.hasInvisibleCharacters = this.hasInvisibleCharacters;
        }
      }
      if (this.firstTrailingWhitespaceIndex != null) {
        rightToken.firstTrailingWhitespaceIndex = Math.max(0, this.firstTrailingWhitespaceIndex - splitIndex);
        rightToken.hasInvisibleCharacters = this.hasInvisibleCharacters;
        if (this.firstTrailingWhitespaceIndex < splitIndex) {
          leftToken.firstTrailingWhitespaceIndex = this.firstTrailingWhitespaceIndex;
          leftToken.hasInvisibleCharacters = this.hasInvisibleCharacters;
        }
      }
      return [leftToken, rightToken];
    };

    Token.prototype.whitespaceRegexForTabLength = function(tabLength) {
      return WhitespaceRegexesByTabLength[tabLength] != null ? WhitespaceRegexesByTabLength[tabLength] : WhitespaceRegexesByTabLength[tabLength] = new RegExp("([ ]{" + tabLength + "})|(\t)|([^\t]+)", "g");
    };

    Token.prototype.breakOutAtomicTokens = function(tabLength, breakOutLeadingSoftTabs, startColumn) {
      var column, fullMatch, hardTab, match, outputTokens, regex, softTab, token, value, _i, _len, _ref;
      if (this.hasPairedCharacter) {
        outputTokens = [];
        column = startColumn;
        _ref = this.breakOutPairedCharacters();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          token = _ref[_i];
          if (token.isAtomic) {
            outputTokens.push(token);
          } else {
            outputTokens.push.apply(outputTokens, token.breakOutAtomicTokens(tabLength, breakOutLeadingSoftTabs, column));
          }
          if (breakOutLeadingSoftTabs) {
            breakOutLeadingSoftTabs = token.isOnlyWhitespace();
          }
          column += token.value.length;
        }
        return outputTokens;
      } else {
        if (this.isAtomic) {
          return [this];
        }
        if (breakOutLeadingSoftTabs) {
          if (!/^[ ]|\t/.test(this.value)) {
            return [this];
          }
        } else {
          if (!/\t/.test(this.value)) {
            return [this];
          }
        }
        outputTokens = [];
        regex = this.whitespaceRegexForTabLength(tabLength);
        column = startColumn;
        while (match = regex.exec(this.value)) {
          fullMatch = match[0], softTab = match[1], hardTab = match[2];
          token = null;
          if (softTab && breakOutLeadingSoftTabs) {
            token = this.buildSoftTabToken(tabLength);
          } else if (hardTab) {
            breakOutLeadingSoftTabs = false;
            token = this.buildHardTabToken(tabLength, column);
          } else {
            breakOutLeadingSoftTabs = false;
            value = match[0];
            token = new Token({
              value: value,
              scopes: this.scopes
            });
          }
          column += token.value.length;
          outputTokens.push(token);
        }
        return outputTokens;
      }
    };

    Token.prototype.breakOutPairedCharacters = function() {
      var index, nonPairStart, outputTokens;
      outputTokens = [];
      index = 0;
      nonPairStart = 0;
      while (index < this.value.length) {
        if (textUtils.isPairedCharacter(this.value, index)) {
          if (nonPairStart !== index) {
            outputTokens.push(new Token({
              value: this.value.slice(nonPairStart, index),
              scopes: this.scopes
            }));
          }
          outputTokens.push(this.buildPairedCharacterToken(this.value, index));
          index += 2;
          nonPairStart = index;
        } else {
          index++;
        }
      }
      if (nonPairStart !== index) {
        outputTokens.push(new Token({
          value: this.value.slice(nonPairStart, index),
          scopes: this.scopes
        }));
      }
      return outputTokens;
    };

    Token.prototype.buildPairedCharacterToken = function(value, index) {
      return new Token({
        value: value.slice(index, +(index + 1) + 1 || 9e9),
        scopes: this.scopes,
        isAtomic: true,
        hasPairedCharacter: true
      });
    };

    Token.prototype.buildHardTabToken = function(tabLength, column) {
      return this.buildTabToken(tabLength, true, column);
    };

    Token.prototype.buildSoftTabToken = function(tabLength) {
      return this.buildTabToken(tabLength, false, 0);
    };

    Token.prototype.buildTabToken = function(tabLength, isHardTab, column) {
      var tabStop;
      if (column == null) {
        column = 0;
      }
      tabStop = tabLength - (column % tabLength);
      return new Token({
        value: _.multiplyString(" ", tabStop),
        scopes: this.scopes,
        bufferDelta: isHardTab ? 1 : tabStop,
        isAtomic: true,
        isHardTab: isHardTab
      });
    };

    Token.prototype.buildSoftWrapIndentationToken = function(length) {
      return new Token({
        value: _.multiplyString(" ", length),
        scopes: this.scopes,
        bufferDelta: 0,
        isAtomic: true,
        isSoftWrapIndentation: true
      });
    };

    Token.prototype.isOnlyWhitespace = function() {
      return !WhitespaceRegex.test(this.value);
    };

    Token.prototype.matchesScopeSelector = function(selector) {
      var targetClasses;
      targetClasses = selector.replace(StartDotRegex, '').split('.');
      return _.any(this.scopes, function(scope) {
        var scopeClasses;
        scopeClasses = scope.split('.');
        return _.isSubset(targetClasses, scopeClasses);
      });
    };

    Token.prototype.getValueAsHtml = function(_arg) {
      var classes, endIndex, hasIndentGuide, html, leadingHtml, leadingWhitespace, startIndex, tokenIsOnlyWhitespace, trailingHtml, trailingWhitespace;
      hasIndentGuide = _arg.hasIndentGuide;
      if (this.isHardTab) {
        classes = 'hard-tab';
        if (this.hasLeadingWhitespace()) {
          classes += ' leading-whitespace';
        }
        if (this.hasTrailingWhitespace()) {
          classes += ' trailing-whitespace';
        }
        if (hasIndentGuide) {
          classes += ' indent-guide';
        }
        if (this.hasInvisibleCharacters) {
          classes += ' invisible-character';
        }
        html = "<span class='" + classes + "'>" + (this.escapeString(this.value)) + "</span>";
      } else {
        startIndex = 0;
        endIndex = this.value.length;
        leadingHtml = '';
        trailingHtml = '';
        if (this.hasLeadingWhitespace()) {
          leadingWhitespace = this.value.substring(0, this.firstNonWhitespaceIndex);
          classes = 'leading-whitespace';
          if (hasIndentGuide) {
            classes += ' indent-guide';
          }
          if (this.hasInvisibleCharacters) {
            classes += ' invisible-character';
          }
          leadingHtml = "<span class='" + classes + "'>" + leadingWhitespace + "</span>";
          startIndex = this.firstNonWhitespaceIndex;
        }
        if (this.hasTrailingWhitespace()) {
          tokenIsOnlyWhitespace = this.firstTrailingWhitespaceIndex === 0;
          trailingWhitespace = this.value.substring(this.firstTrailingWhitespaceIndex);
          classes = 'trailing-whitespace';
          if (hasIndentGuide && !this.hasLeadingWhitespace() && tokenIsOnlyWhitespace) {
            classes += ' indent-guide';
          }
          if (this.hasInvisibleCharacters) {
            classes += ' invisible-character';
          }
          trailingHtml = "<span class='" + classes + "'>" + trailingWhitespace + "</span>";
          endIndex = this.firstTrailingWhitespaceIndex;
        }
        html = leadingHtml;
        if (this.value.length > MaxTokenLength) {
          while (startIndex < endIndex) {
            html += "<span>" + this.escapeString(this.value, startIndex, startIndex + MaxTokenLength) + "</span>";
            startIndex += MaxTokenLength;
          }
        } else {
          html += this.escapeString(this.value, startIndex, endIndex);
        }
        html += trailingHtml;
      }
      return html;
    };

    Token.prototype.escapeString = function(str, startIndex, endIndex) {
      var strLength;
      strLength = str.length;
      if (startIndex == null) {
        startIndex = 0;
      }
      if (endIndex == null) {
        endIndex = strLength;
      }
      if (startIndex > 0 || endIndex < strLength) {
        str = str.slice(startIndex, endIndex);
      }
      return str.replace(EscapeRegex, this.escapeStringReplace);
    };

    Token.prototype.escapeStringReplace = function(match) {
      switch (match) {
        case '&':
          return '&amp;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        default:
          return match;
      }
    };

    Token.prototype.hasLeadingWhitespace = function() {
      return (this.firstNonWhitespaceIndex != null) && this.firstNonWhitespaceIndex > 0;
    };

    Token.prototype.hasTrailingWhitespace = function() {
      return (this.firstTrailingWhitespaceIndex != null) && this.firstTrailingWhitespaceIndex < this.value.length;
    };

    return Token;

  })();

}).call(this);

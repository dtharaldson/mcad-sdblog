(function() {
  var Emitter, Grim, Model, NonWhitespaceRegExp, Point, Range, Selection, pick, _, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('text-buffer'), Point = _ref.Point, Range = _ref.Range;

  pick = (_ = require('underscore-plus')).pick;

  Emitter = require('event-kit').Emitter;

  Grim = require('grim');

  Model = require('./model');

  NonWhitespaceRegExp = /\S/;

  module.exports = Selection = (function(_super) {
    __extends(Selection, _super);

    Selection.prototype.cursor = null;

    Selection.prototype.marker = null;

    Selection.prototype.editor = null;

    Selection.prototype.initialScreenRange = null;

    Selection.prototype.wordwise = false;

    function Selection(_arg) {
      var id;
      this.cursor = _arg.cursor, this.marker = _arg.marker, this.editor = _arg.editor, id = _arg.id;
      this.emitter = new Emitter;
      this.assignId(id);
      this.cursor.selection = this;
      this.decoration = this.editor.decorateMarker(this.marker, {
        type: 'highlight',
        "class": 'selection'
      });
      this.marker.onDidChange((function(_this) {
        return function(e) {
          return _this.screenRangeChanged(e);
        };
      })(this));
      this.marker.onDidDestroy((function(_this) {
        return function() {
          if (!_this.editor.isDestroyed()) {
            _this.destroyed = true;
            _this.editor.removeSelection(_this);
            if (Grim.includeDeprecatedAPIs) {
              _this.emit('destroyed');
            }
            _this.emitter.emit('did-destroy');
            return _this.emitter.dispose();
          }
        };
      })(this));
    }

    Selection.prototype.destroy = function() {
      return this.marker.destroy();
    };

    Selection.prototype.isLastSelection = function() {
      return this === this.editor.getLastSelection();
    };


    /*
    Section: Event Subscription
     */

    Selection.prototype.onDidChangeRange = function(callback) {
      return this.emitter.on('did-change-range', callback);
    };

    Selection.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };


    /*
    Section: Managing the selection range
     */

    Selection.prototype.getScreenRange = function() {
      return this.marker.getScreenRange();
    };

    Selection.prototype.setScreenRange = function(screenRange, options) {
      return this.setBufferRange(this.editor.bufferRangeForScreenRange(screenRange), options);
    };

    Selection.prototype.getBufferRange = function() {
      return this.marker.getBufferRange();
    };

    Selection.prototype.setBufferRange = function(bufferRange, options) {
      if (options == null) {
        options = {};
      }
      bufferRange = Range.fromObject(bufferRange);
      if (options.reversed == null) {
        options.reversed = this.isReversed();
      }
      if (!options.preserveFolds) {
        this.editor.destroyFoldsContainingBufferRange(bufferRange);
      }
      return this.modifySelection((function(_this) {
        return function() {
          var needsFlash, _ref1;
          needsFlash = options.flash;
          if (options.flash != null) {
            delete options.flash;
          }
          _this.marker.setBufferRange(bufferRange, options);
          if ((_ref1 = options != null ? options.autoscroll : void 0) != null ? _ref1 : _this.isLastSelection()) {
            _this.autoscroll();
          }
          if (needsFlash) {
            return _this.decoration.flash('flash', _this.editor.selectionFlashDuration);
          }
        };
      })(this));
    };

    Selection.prototype.getBufferRowRange = function() {
      var end, range, start;
      range = this.getBufferRange();
      start = range.start.row;
      end = range.end.row;
      if (range.end.column === 0) {
        end = Math.max(start, end - 1);
      }
      return [start, end];
    };

    Selection.prototype.getTailScreenPosition = function() {
      return this.marker.getTailScreenPosition();
    };

    Selection.prototype.getTailBufferPosition = function() {
      return this.marker.getTailBufferPosition();
    };

    Selection.prototype.getHeadScreenPosition = function() {
      return this.marker.getHeadScreenPosition();
    };

    Selection.prototype.getHeadBufferPosition = function() {
      return this.marker.getHeadBufferPosition();
    };


    /*
    Section: Info about the selection
     */

    Selection.prototype.isEmpty = function() {
      return this.getBufferRange().isEmpty();
    };

    Selection.prototype.isReversed = function() {
      return this.marker.isReversed();
    };

    Selection.prototype.isSingleScreenLine = function() {
      return this.getScreenRange().isSingleLine();
    };

    Selection.prototype.getText = function() {
      return this.editor.buffer.getTextInRange(this.getBufferRange());
    };

    Selection.prototype.intersectsBufferRange = function(bufferRange) {
      return this.getBufferRange().intersectsWith(bufferRange);
    };

    Selection.prototype.intersectsScreenRowRange = function(startRow, endRow) {
      return this.getScreenRange().intersectsRowRange(startRow, endRow);
    };

    Selection.prototype.intersectsScreenRow = function(screenRow) {
      return this.getScreenRange().intersectsRow(screenRow);
    };

    Selection.prototype.intersectsWith = function(otherSelection, exclusive) {
      return this.getBufferRange().intersectsWith(otherSelection.getBufferRange(), exclusive);
    };


    /*
    Section: Modifying the selected range
     */

    Selection.prototype.clear = function(options) {
      var _ref1;
      this.marker.setProperties({
        goalScreenRange: null
      });
      if (!this.retainSelection) {
        this.marker.clearTail();
      }
      if ((_ref1 = options != null ? options.autoscroll : void 0) != null ? _ref1 : this.isLastSelection()) {
        this.autoscroll();
      }
      return this.finalize();
    };

    Selection.prototype.selectToScreenPosition = function(position) {
      position = Point.fromObject(position);
      return this.modifySelection((function(_this) {
        return function() {
          if (_this.initialScreenRange) {
            if (position.isLessThan(_this.initialScreenRange.start)) {
              _this.marker.setScreenRange([position, _this.initialScreenRange.end], {
                reversed: true
              });
            } else {
              _this.marker.setScreenRange([_this.initialScreenRange.start, position]);
            }
          } else {
            _this.cursor.setScreenPosition(position);
          }
          if (_this.linewise) {
            return _this.expandOverLine();
          } else if (_this.wordwise) {
            return _this.expandOverWord();
          }
        };
      })(this));
    };

    Selection.prototype.selectToBufferPosition = function(position) {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.setBufferPosition(position);
        };
      })(this));
    };

    Selection.prototype.selectRight = function(columnCount) {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveRight(columnCount);
        };
      })(this));
    };

    Selection.prototype.selectLeft = function(columnCount) {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveLeft(columnCount);
        };
      })(this));
    };

    Selection.prototype.selectUp = function(rowCount) {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveUp(rowCount);
        };
      })(this));
    };

    Selection.prototype.selectDown = function(rowCount) {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveDown(rowCount);
        };
      })(this));
    };

    Selection.prototype.selectToTop = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToTop();
        };
      })(this));
    };

    Selection.prototype.selectToBottom = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToBottom();
        };
      })(this));
    };

    Selection.prototype.selectAll = function() {
      return this.setBufferRange(this.editor.buffer.getRange(), {
        autoscroll: false
      });
    };

    Selection.prototype.selectToBeginningOfLine = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToBeginningOfLine();
        };
      })(this));
    };

    Selection.prototype.selectToFirstCharacterOfLine = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToFirstCharacterOfLine();
        };
      })(this));
    };

    Selection.prototype.selectToEndOfLine = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToEndOfScreenLine();
        };
      })(this));
    };

    Selection.prototype.selectToBeginningOfWord = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToBeginningOfWord();
        };
      })(this));
    };

    Selection.prototype.selectToEndOfWord = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToEndOfWord();
        };
      })(this));
    };

    Selection.prototype.selectToBeginningOfNextWord = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToBeginningOfNextWord();
        };
      })(this));
    };

    Selection.prototype.selectToPreviousWordBoundary = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToPreviousWordBoundary();
        };
      })(this));
    };

    Selection.prototype.selectToNextWordBoundary = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToNextWordBoundary();
        };
      })(this));
    };

    Selection.prototype.selectToBeginningOfNextParagraph = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToBeginningOfNextParagraph();
        };
      })(this));
    };

    Selection.prototype.selectToBeginningOfPreviousParagraph = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToBeginningOfPreviousParagraph();
        };
      })(this));
    };

    Selection.prototype.selectWord = function() {
      var options;
      options = {};
      if (this.cursor.isSurroundedByWhitespace()) {
        options.wordRegex = /[\t ]*/;
      }
      if (this.cursor.isBetweenWordAndNonWord()) {
        options.includeNonWordCharacters = false;
      }
      this.setBufferRange(this.cursor.getCurrentWordBufferRange(options));
      this.wordwise = true;
      return this.initialScreenRange = this.getScreenRange();
    };

    Selection.prototype.expandOverWord = function() {
      return this.setBufferRange(this.getBufferRange().union(this.cursor.getCurrentWordBufferRange()));
    };

    Selection.prototype.selectLine = function(row) {
      var range;
      if (row == null) {
        row = this.cursor.getBufferPosition().row;
      }
      range = this.editor.bufferRangeForBufferRow(row, {
        includeNewline: true
      });
      this.setBufferRange(this.getBufferRange().union(range), {
        autoscroll: true
      });
      this.linewise = true;
      this.wordwise = false;
      return this.initialScreenRange = this.getScreenRange();
    };

    Selection.prototype.expandOverLine = function() {
      var range;
      range = this.getBufferRange().union(this.cursor.getCurrentLineBufferRange({
        includeNewline: true
      }));
      return this.setBufferRange(range);
    };


    /*
    Section: Modifying the selected text
     */

    Selection.prototype.insertText = function(text, options) {
      var autoIndentFirstLine, currentIndentation, desiredIndentLevel, firstInsertedLine, firstLine, indentAdjustment, newBufferRange, oldBufferRange, precedingText, remainingLines, wasReversed;
      if (options == null) {
        options = {};
      }
      oldBufferRange = this.getBufferRange();
      this.editor.unfoldBufferRow(oldBufferRange.end.row);
      wasReversed = this.isReversed();
      this.clear();
      autoIndentFirstLine = false;
      precedingText = this.editor.getTextInRange([[oldBufferRange.start.row, 0], oldBufferRange.start]);
      remainingLines = text.split('\n');
      firstInsertedLine = remainingLines.shift();
      if (options.indentBasis != null) {
        indentAdjustment = this.editor.indentLevelForLine(precedingText) - options.indentBasis;
        this.adjustIndent(remainingLines, indentAdjustment);
      }
      if (options.autoIndent && !NonWhitespaceRegExp.test(precedingText)) {
        autoIndentFirstLine = true;
        firstLine = precedingText + firstInsertedLine;
        desiredIndentLevel = this.editor.languageMode.suggestedIndentForLineAtBufferRow(oldBufferRange.start.row, firstLine);
        indentAdjustment = desiredIndentLevel - this.editor.indentLevelForLine(firstLine);
        this.adjustIndent(remainingLines, indentAdjustment);
      }
      text = firstInsertedLine;
      if (remainingLines.length > 0) {
        text += '\n' + remainingLines.join('\n');
      }
      newBufferRange = this.editor.buffer.setTextInRange(oldBufferRange, text, pick(options, 'undo', 'normalizeLineEndings'));
      if (options.select) {
        this.setBufferRange(newBufferRange, {
          reversed: wasReversed
        });
      } else {
        if (wasReversed) {
          this.cursor.setBufferPosition(newBufferRange.end, {
            clip: 'forward'
          });
        }
      }
      if (autoIndentFirstLine) {
        this.editor.setIndentationForBufferRow(oldBufferRange.start.row, desiredIndentLevel);
      }
      if (options.autoIndentNewline && text === '\n') {
        currentIndentation = this.editor.indentationForBufferRow(newBufferRange.start.row);
        this.editor.autoIndentBufferRow(newBufferRange.end.row, {
          preserveLeadingWhitespace: true,
          skipBlankLines: false
        });
        if (this.editor.indentationForBufferRow(newBufferRange.end.row) < currentIndentation) {
          this.editor.setIndentationForBufferRow(newBufferRange.end.row, currentIndentation);
        }
      } else if (options.autoDecreaseIndent && NonWhitespaceRegExp.test(text)) {
        this.editor.autoDecreaseIndentForBufferRow(newBufferRange.start.row);
      }
      if (this.isLastSelection()) {
        this.autoscroll();
      }
      return newBufferRange;
    };

    Selection.prototype.backspace = function() {
      if (this.isEmpty() && !this.editor.isFoldedAtScreenRow(this.cursor.getScreenRow())) {
        this.selectLeft();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteToBeginningOfWord = function() {
      if (this.isEmpty()) {
        this.selectToBeginningOfWord();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteToBeginningOfLine = function() {
      if (this.isEmpty() && this.cursor.isAtBeginningOfLine()) {
        this.selectLeft();
      } else {
        this.selectToBeginningOfLine();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype["delete"] = function() {
      var fold;
      if (this.isEmpty()) {
        if (this.cursor.isAtEndOfLine() && (fold = this.editor.largestFoldStartingAtScreenRow(this.cursor.getScreenRow() + 1))) {
          this.selectToBufferPosition(fold.getBufferRange().end);
        } else {
          this.selectRight();
        }
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteToEndOfLine = function() {
      if (this.isEmpty() && this.cursor.isAtEndOfLine()) {
        return this["delete"]();
      }
      if (this.isEmpty()) {
        this.selectToEndOfLine();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteToEndOfWord = function() {
      if (this.isEmpty()) {
        this.selectToEndOfWord();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteSelectedText = function() {
      var bufferRange, fold, _ref1;
      bufferRange = this.getBufferRange();
      if (bufferRange.isEmpty() && (fold = this.editor.largestFoldContainingBufferRow(bufferRange.start.row))) {
        bufferRange = bufferRange.union(fold.getBufferRange({
          includeNewline: true
        }));
      }
      if (!bufferRange.isEmpty()) {
        this.editor.buffer["delete"](bufferRange);
      }
      return (_ref1 = this.cursor) != null ? _ref1.setBufferPosition(bufferRange.start) : void 0;
    };

    Selection.prototype.deleteLine = function() {
      var end, range, start;
      if (this.isEmpty()) {
        start = this.cursor.getScreenRow();
        range = this.editor.bufferRowsForScreenRows(start, start + 1);
        if (range[1] > range[0]) {
          return this.editor.buffer.deleteRows(range[0], range[1] - 1);
        } else {
          return this.editor.buffer.deleteRow(range[0]);
        }
      } else {
        range = this.getBufferRange();
        start = range.start.row;
        end = range.end.row;
        if (end !== this.editor.buffer.getLastRow() && range.end.column === 0) {
          end--;
        }
        return this.editor.buffer.deleteRows(start, end);
      }
    };

    Selection.prototype.joinLines = function() {
      var currentRow, insertSpace, joinMarker, newSelectedRange, nextRow, row, rowCount, scanRange, selectedRange, trailingWhitespaceRange, _i;
      selectedRange = this.getBufferRange();
      if (selectedRange.isEmpty()) {
        if (selectedRange.start.row === this.editor.buffer.getLastRow()) {
          return;
        }
      } else {
        joinMarker = this.editor.markBufferRange(selectedRange, {
          invalidationStrategy: 'never'
        });
      }
      rowCount = Math.max(1, selectedRange.getRowCount() - 1);
      for (row = _i = 0; 0 <= rowCount ? _i < rowCount : _i > rowCount; row = 0 <= rowCount ? ++_i : --_i) {
        this.cursor.setBufferPosition([selectedRange.start.row]);
        this.cursor.moveToEndOfLine();
        scanRange = this.cursor.getCurrentLineBufferRange();
        trailingWhitespaceRange = null;
        this.editor.scanInBufferRange(/[ \t]+$/, scanRange, function(_arg) {
          var range;
          range = _arg.range;
          return trailingWhitespaceRange = range;
        });
        if (trailingWhitespaceRange != null) {
          this.setBufferRange(trailingWhitespaceRange);
          this.deleteSelectedText();
        }
        currentRow = selectedRange.start.row;
        nextRow = currentRow + 1;
        insertSpace = nextRow <= this.editor.buffer.getLastRow() && this.editor.buffer.lineLengthForRow(nextRow) > 0 && this.editor.buffer.lineLengthForRow(currentRow) > 0;
        if (insertSpace) {
          this.insertText(' ');
        }
        this.cursor.moveToEndOfLine();
        this.modifySelection((function(_this) {
          return function() {
            _this.cursor.moveRight();
            return _this.cursor.moveToFirstCharacterOfLine();
          };
        })(this));
        this.deleteSelectedText();
        if (insertSpace) {
          this.cursor.moveLeft();
        }
      }
      if (joinMarker != null) {
        newSelectedRange = joinMarker.getBufferRange();
        this.setBufferRange(newSelectedRange);
        return joinMarker.destroy();
      }
    };

    Selection.prototype.outdentSelectedRows = function() {
      var buffer, end, leadingTabRegex, matchLength, row, start, _i, _ref1, _ref2;
      _ref1 = this.getBufferRowRange(), start = _ref1[0], end = _ref1[1];
      buffer = this.editor.buffer;
      leadingTabRegex = new RegExp("^( {1," + (this.editor.getTabLength()) + "}|\t)");
      for (row = _i = start; start <= end ? _i <= end : _i >= end; row = start <= end ? ++_i : --_i) {
        if (matchLength = (_ref2 = buffer.lineForRow(row).match(leadingTabRegex)) != null ? _ref2[0].length : void 0) {
          buffer["delete"]([[row, 0], [row, matchLength]]);
        }
      }
    };

    Selection.prototype.autoIndentSelectedRows = function() {
      var end, start, _ref1;
      _ref1 = this.getBufferRowRange(), start = _ref1[0], end = _ref1[1];
      return this.editor.autoIndentBufferRows(start, end);
    };

    Selection.prototype.toggleLineComments = function() {
      var _ref1;
      return (_ref1 = this.editor).toggleLineCommentsForBufferRows.apply(_ref1, this.getBufferRowRange());
    };

    Selection.prototype.cutToEndOfLine = function(maintainClipboard) {
      if (this.isEmpty()) {
        this.selectToEndOfLine();
      }
      return this.cut(maintainClipboard);
    };

    Selection.prototype.cut = function(maintainClipboard, fullLine) {
      if (maintainClipboard == null) {
        maintainClipboard = false;
      }
      if (fullLine == null) {
        fullLine = false;
      }
      this.copy(maintainClipboard, fullLine);
      return this["delete"]();
    };

    Selection.prototype.copy = function(maintainClipboard, fullLine) {
      var clipboardText, end, metadata, precedingText, selectionText, start, startLevel, _ref1, _ref2;
      if (maintainClipboard == null) {
        maintainClipboard = false;
      }
      if (fullLine == null) {
        fullLine = false;
      }
      if (this.isEmpty()) {
        return;
      }
      _ref1 = this.getBufferRange(), start = _ref1.start, end = _ref1.end;
      selectionText = this.editor.getTextInRange([start, end]);
      precedingText = this.editor.getTextInRange([[start.row, 0], start]);
      startLevel = this.editor.indentLevelForLine(precedingText);
      if (maintainClipboard) {
        _ref2 = atom.clipboard.readWithMetadata(), clipboardText = _ref2.text, metadata = _ref2.metadata;
        if (metadata == null) {
          metadata = {};
        }
        if (metadata.selections == null) {
          metadata.selections = [
            {
              text: clipboardText,
              indentBasis: metadata.indentBasis,
              fullLine: metadata.fullLine
            }
          ];
        }
        metadata.selections.push({
          text: selectionText,
          indentBasis: startLevel,
          fullLine: fullLine
        });
        return atom.clipboard.write([clipboardText, selectionText].join("\n"), metadata);
      } else {
        return atom.clipboard.write(selectionText, {
          indentBasis: startLevel,
          fullLine: fullLine
        });
      }
    };

    Selection.prototype.fold = function() {
      var range;
      range = this.getBufferRange();
      this.editor.createFold(range.start.row, range.end.row);
      return this.cursor.setBufferPosition([range.end.row + 1, 0]);
    };

    Selection.prototype.adjustIndent = function(lines, indentAdjustment) {
      var currentIndentLevel, i, indentLevel, line, _i, _len;
      for (i = _i = 0, _len = lines.length; _i < _len; i = ++_i) {
        line = lines[i];
        if (indentAdjustment === 0 || line === '') {
          continue;
        } else if (indentAdjustment > 0) {
          lines[i] = this.editor.buildIndentString(indentAdjustment) + line;
        } else {
          currentIndentLevel = this.editor.indentLevelForLine(lines[i]);
          indentLevel = Math.max(0, currentIndentLevel + indentAdjustment);
          lines[i] = line.replace(/^[\t ]+/, this.editor.buildIndentString(indentLevel));
        }
      }
    };

    Selection.prototype.indent = function(_arg) {
      var autoIndent, column, delta, desiredIndent, row, _ref1;
      autoIndent = (_arg != null ? _arg : {}).autoIndent;
      _ref1 = this.cursor.getBufferPosition(), row = _ref1.row, column = _ref1.column;
      if (this.isEmpty()) {
        this.cursor.skipLeadingWhitespace();
        desiredIndent = this.editor.suggestedIndentForBufferRow(row);
        delta = desiredIndent - this.cursor.getIndentLevel();
        if (autoIndent && delta > 0) {
          if (!this.editor.getSoftTabs()) {
            delta = Math.max(delta, 1);
          }
          return this.insertText(this.editor.buildIndentString(delta));
        } else {
          return this.insertText(this.editor.buildIndentString(1, this.cursor.getBufferColumn()));
        }
      } else {
        return this.indentSelectedRows();
      }
    };

    Selection.prototype.indentSelectedRows = function() {
      var end, row, start, _i, _ref1;
      _ref1 = this.getBufferRowRange(), start = _ref1[0], end = _ref1[1];
      for (row = _i = start; start <= end ? _i <= end : _i >= end; row = start <= end ? ++_i : --_i) {
        if (this.editor.buffer.lineLengthForRow(row) !== 0) {
          this.editor.buffer.insert([row, 0], this.editor.getTabText());
        }
      }
    };


    /*
    Section: Managing multiple selections
     */

    Selection.prototype.addSelectionBelow = function() {
      var clippedRange, nextRow, range, row, _i, _ref1, _ref2;
      range = ((_ref1 = this.getGoalScreenRange()) != null ? _ref1 : this.getScreenRange()).copy();
      nextRow = range.end.row + 1;
      for (row = _i = nextRow, _ref2 = this.editor.getLastScreenRow(); nextRow <= _ref2 ? _i <= _ref2 : _i >= _ref2; row = nextRow <= _ref2 ? ++_i : --_i) {
        range.start.row = row;
        range.end.row = row;
        clippedRange = this.editor.clipScreenRange(range, {
          skipSoftWrapIndentation: true
        });
        if (range.isEmpty()) {
          if (range.end.column > 0 && clippedRange.end.column === 0) {
            continue;
          }
        } else {
          if (clippedRange.isEmpty()) {
            continue;
          }
        }
        this.editor.addSelectionForScreenRange(clippedRange, {
          goalScreenRange: range
        });
        break;
      }
    };

    Selection.prototype.addSelectionAbove = function() {
      var clippedRange, previousRow, range, row, _i, _ref1;
      range = ((_ref1 = this.getGoalScreenRange()) != null ? _ref1 : this.getScreenRange()).copy();
      previousRow = range.end.row - 1;
      for (row = _i = previousRow; previousRow <= 0 ? _i <= 0 : _i >= 0; row = previousRow <= 0 ? ++_i : --_i) {
        range.start.row = row;
        range.end.row = row;
        clippedRange = this.editor.clipScreenRange(range, {
          skipSoftWrapIndentation: true
        });
        if (range.isEmpty()) {
          if (range.end.column > 0 && clippedRange.end.column === 0) {
            continue;
          }
        } else {
          if (clippedRange.isEmpty()) {
            continue;
          }
        }
        this.editor.addSelectionForScreenRange(clippedRange, {
          goalScreenRange: range
        });
        break;
      }
    };

    Selection.prototype.merge = function(otherSelection, options) {
      var myGoalScreenRange, otherGoalScreenRange;
      myGoalScreenRange = this.getGoalScreenRange();
      otherGoalScreenRange = otherSelection.getGoalScreenRange();
      if ((myGoalScreenRange != null) && (otherGoalScreenRange != null)) {
        options.goalScreenRange = myGoalScreenRange.union(otherGoalScreenRange);
      } else {
        options.goalScreenRange = myGoalScreenRange != null ? myGoalScreenRange : otherGoalScreenRange;
      }
      this.setBufferRange(this.getBufferRange().union(otherSelection.getBufferRange()), _.extend({
        autoscroll: false
      }, options));
      return otherSelection.destroy();
    };


    /*
    Section: Comparing to other selections
     */

    Selection.prototype.compare = function(otherSelection) {
      return this.getBufferRange().compare(otherSelection.getBufferRange());
    };


    /*
    Section: Private Utilities
     */

    Selection.prototype.screenRangeChanged = function(e) {
      var eventObject, oldHeadBufferPosition, oldHeadScreenPosition, oldTailBufferPosition, oldTailScreenPosition;
      oldHeadBufferPosition = e.oldHeadBufferPosition, oldTailBufferPosition = e.oldTailBufferPosition;
      oldHeadScreenPosition = e.oldHeadScreenPosition, oldTailScreenPosition = e.oldTailScreenPosition;
      eventObject = {
        oldBufferRange: new Range(oldHeadBufferPosition, oldTailBufferPosition),
        oldScreenRange: new Range(oldHeadScreenPosition, oldTailScreenPosition),
        newBufferRange: this.getBufferRange(),
        newScreenRange: this.getScreenRange(),
        selection: this
      };
      if (Grim.includeDeprecatedAPIs) {
        this.emit('screen-range-changed', this.getScreenRange());
      }
      this.emitter.emit('did-change-range');
      return this.editor.selectionRangeChanged(eventObject);
    };

    Selection.prototype.finalize = function() {
      var _ref1;
      if (!((_ref1 = this.initialScreenRange) != null ? _ref1.isEqual(this.getScreenRange()) : void 0)) {
        this.initialScreenRange = null;
      }
      if (this.isEmpty()) {
        this.wordwise = false;
        return this.linewise = false;
      }
    };

    Selection.prototype.autoscroll = function() {
      if (this.marker.hasTail()) {
        return this.editor.scrollToScreenRange(this.getScreenRange(), {
          reversed: this.isReversed()
        });
      } else {
        return this.cursor.autoscroll();
      }
    };

    Selection.prototype.clearAutoscroll = function() {};

    Selection.prototype.modifySelection = function(fn) {
      this.retainSelection = true;
      this.plantTail();
      fn();
      return this.retainSelection = false;
    };

    Selection.prototype.plantTail = function() {
      return this.marker.plantTail();
    };

    Selection.prototype.getGoalScreenRange = function() {
      var goalScreenRange;
      if (goalScreenRange = this.marker.getProperties().goalScreenRange) {
        return Range.fromObject(goalScreenRange);
      }
    };

    return Selection;

  })(Model);

  if (Grim.includeDeprecatedAPIs) {
    Selection.prototype.on = function(eventName) {
      switch (eventName) {
        case 'screen-range-changed':
          Grim.deprecate("Use Selection::onDidChangeRange instead. Call ::getScreenRange() yourself in your callback if you need the range.");
          break;
        case 'destroyed':
          Grim.deprecate("Use Selection::onDidDestroy instead.");
          break;
        default:
          Grim.deprecate("Selection::on is deprecated. Use documented event subscription methods instead.");
      }
      return Selection.__super__.on.apply(this, arguments);
    };
    Selection.prototype.backspaceToBeginningOfWord = function() {
      deprecate("Use Selection::deleteToBeginningOfWord() instead");
      return this.deleteToBeginningOfWord();
    };
    Selection.prototype.backspaceToBeginningOfLine = function() {
      deprecate("Use Selection::deleteToBeginningOfLine() instead");
      return this.deleteToBeginningOfLine();
    };
  }

}).call(this);

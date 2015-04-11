(function() {
  var Cursor, Emitter, Grim, Model, Point, Range, _, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('text-buffer'), Point = _ref.Point, Range = _ref.Range;

  Emitter = require('event-kit').Emitter;

  _ = require('underscore-plus');

  Grim = require('grim');

  Model = require('./model');

  module.exports = Cursor = (function(_super) {
    __extends(Cursor, _super);

    Cursor.prototype.screenPosition = null;

    Cursor.prototype.bufferPosition = null;

    Cursor.prototype.goalColumn = null;

    Cursor.prototype.visible = true;

    function Cursor(_arg) {
      var id;
      this.editor = _arg.editor, this.marker = _arg.marker, id = _arg.id;
      this.emitter = new Emitter;
      this.assignId(id);
      this.updateVisibility();
      this.marker.onDidChange((function(_this) {
        return function(e) {
          var movedEvent, newHeadBufferPosition, newHeadScreenPosition, oldHeadBufferPosition, oldHeadScreenPosition, textChanged;
          _this.updateVisibility();
          oldHeadScreenPosition = e.oldHeadScreenPosition, newHeadScreenPosition = e.newHeadScreenPosition;
          oldHeadBufferPosition = e.oldHeadBufferPosition, newHeadBufferPosition = e.newHeadBufferPosition;
          textChanged = e.textChanged;
          if (oldHeadScreenPosition.isEqual(newHeadScreenPosition)) {
            return;
          }
          _this.goalColumn = null;
          movedEvent = {
            oldBufferPosition: oldHeadBufferPosition,
            oldScreenPosition: oldHeadScreenPosition,
            newBufferPosition: newHeadBufferPosition,
            newScreenPosition: newHeadScreenPosition,
            textChanged: textChanged,
            cursor: _this
          };
          if (Grim.includeDeprecatedAPIs) {
            _this.emit('moved', movedEvent);
          }
          _this.emitter.emit('did-change-position', movedEvent);
          return _this.editor.cursorMoved(movedEvent);
        };
      })(this));
      this.marker.onDidDestroy((function(_this) {
        return function() {
          _this.destroyed = true;
          _this.editor.removeCursor(_this);
          if (Grim.includeDeprecatedAPIs) {
            _this.emit('destroyed');
          }
          _this.emitter.emit('did-destroy');
          return _this.emitter.dispose();
        };
      })(this));
    }

    Cursor.prototype.destroy = function() {
      return this.marker.destroy();
    };


    /*
    Section: Event Subscription
     */

    Cursor.prototype.onDidChangePosition = function(callback) {
      return this.emitter.on('did-change-position', callback);
    };

    Cursor.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };

    Cursor.prototype.onDidChangeVisibility = function(callback) {
      return this.emitter.on('did-change-visibility', callback);
    };

    Cursor.prototype.on = function(eventName) {
      if (!Grim.includeDeprecatedAPIs) {
        return;
      }
      switch (eventName) {
        case 'moved':
          Grim.deprecate("Use Cursor::onDidChangePosition instead");
          break;
        case 'destroyed':
          Grim.deprecate("Use Cursor::onDidDestroy instead");
          break;
        default:
          Grim.deprecate("::on is no longer supported. Use the event subscription methods instead");
      }
      return Cursor.__super__.on.apply(this, arguments);
    };


    /*
    Section: Managing Cursor Position
     */

    Cursor.prototype.setScreenPosition = function(screenPosition, options) {
      if (options == null) {
        options = {};
      }
      return this.changePosition(options, (function(_this) {
        return function() {
          return _this.marker.setHeadScreenPosition(screenPosition, options);
        };
      })(this));
    };

    Cursor.prototype.getScreenPosition = function() {
      return this.marker.getHeadScreenPosition();
    };

    Cursor.prototype.setBufferPosition = function(bufferPosition, options) {
      if (options == null) {
        options = {};
      }
      return this.changePosition(options, (function(_this) {
        return function() {
          return _this.marker.setHeadBufferPosition(bufferPosition, options);
        };
      })(this));
    };

    Cursor.prototype.getBufferPosition = function() {
      return this.marker.getHeadBufferPosition();
    };

    Cursor.prototype.getScreenRow = function() {
      return this.getScreenPosition().row;
    };

    Cursor.prototype.getScreenColumn = function() {
      return this.getScreenPosition().column;
    };

    Cursor.prototype.getBufferRow = function() {
      return this.getBufferPosition().row;
    };

    Cursor.prototype.getBufferColumn = function() {
      return this.getBufferPosition().column;
    };

    Cursor.prototype.getCurrentBufferLine = function() {
      return this.editor.lineTextForBufferRow(this.getBufferRow());
    };

    Cursor.prototype.isAtBeginningOfLine = function() {
      return this.getBufferPosition().column === 0;
    };

    Cursor.prototype.isAtEndOfLine = function() {
      return this.getBufferPosition().isEqual(this.getCurrentLineBufferRange().end);
    };


    /*
    Section: Cursor Position Details
     */

    Cursor.prototype.getMarker = function() {
      return this.marker;
    };

    Cursor.prototype.isSurroundedByWhitespace = function() {
      var column, range, row, _ref1;
      _ref1 = this.getBufferPosition(), row = _ref1.row, column = _ref1.column;
      range = [[row, column - 1], [row, column + 1]];
      return /^\s+$/.test(this.editor.getTextInBufferRange(range));
    };

    Cursor.prototype.isBetweenWordAndNonWord = function() {
      var after, before, column, nonWordCharacters, range, row, _ref1, _ref2;
      if (this.isAtBeginningOfLine() || this.isAtEndOfLine()) {
        return false;
      }
      _ref1 = this.getBufferPosition(), row = _ref1.row, column = _ref1.column;
      range = [[row, column - 1], [row, column + 1]];
      _ref2 = this.editor.getTextInBufferRange(range), before = _ref2[0], after = _ref2[1];
      if (/\s/.test(before) || /\s/.test(after)) {
        return false;
      }
      nonWordCharacters = atom.config.get('editor.nonWordCharacters', {
        scope: this.getScopeDescriptor()
      }).split('');
      return _.contains(nonWordCharacters, before) !== _.contains(nonWordCharacters, after);
    };

    Cursor.prototype.isInsideWord = function(options) {
      var column, range, row, _ref1, _ref2;
      _ref1 = this.getBufferPosition(), row = _ref1.row, column = _ref1.column;
      range = [[row, column], [row, Infinity]];
      return this.editor.getTextInBufferRange(range).search((_ref2 = options != null ? options.wordRegex : void 0) != null ? _ref2 : this.wordRegExp()) === 0;
    };

    Cursor.prototype.getIndentLevel = function() {
      if (this.editor.getSoftTabs()) {
        return this.getBufferColumn() / this.editor.getTabLength();
      } else {
        return this.getBufferColumn();
      }
    };

    Cursor.prototype.getScopeDescriptor = function() {
      return this.editor.scopeDescriptorForBufferPosition(this.getBufferPosition());
    };

    Cursor.prototype.hasPrecedingCharactersOnLine = function() {
      var bufferPosition, firstCharacterColumn, line;
      bufferPosition = this.getBufferPosition();
      line = this.editor.lineTextForBufferRow(bufferPosition.row);
      firstCharacterColumn = line.search(/\S/);
      if (firstCharacterColumn === -1) {
        return false;
      } else {
        return bufferPosition.column > firstCharacterColumn;
      }
    };

    Cursor.prototype.isLastCursor = function() {
      return this === this.editor.getLastCursor();
    };


    /*
    Section: Moving the Cursor
     */

    Cursor.prototype.moveUp = function(rowCount, _arg) {
      var column, moveToEndOfSelection, range, row, _ref1, _ref2;
      if (rowCount == null) {
        rowCount = 1;
      }
      moveToEndOfSelection = (_arg != null ? _arg : {}).moveToEndOfSelection;
      range = this.marker.getScreenRange();
      if (moveToEndOfSelection && !range.isEmpty()) {
        _ref1 = range.start, row = _ref1.row, column = _ref1.column;
      } else {
        _ref2 = this.getScreenPosition(), row = _ref2.row, column = _ref2.column;
      }
      if (this.goalColumn != null) {
        column = this.goalColumn;
      }
      this.setScreenPosition({
        row: row - rowCount,
        column: column
      }, {
        skipSoftWrapIndentation: true
      });
      return this.goalColumn = column;
    };

    Cursor.prototype.moveDown = function(rowCount, _arg) {
      var column, moveToEndOfSelection, range, row, _ref1, _ref2;
      if (rowCount == null) {
        rowCount = 1;
      }
      moveToEndOfSelection = (_arg != null ? _arg : {}).moveToEndOfSelection;
      range = this.marker.getScreenRange();
      if (moveToEndOfSelection && !range.isEmpty()) {
        _ref1 = range.end, row = _ref1.row, column = _ref1.column;
      } else {
        _ref2 = this.getScreenPosition(), row = _ref2.row, column = _ref2.column;
      }
      if (this.goalColumn != null) {
        column = this.goalColumn;
      }
      this.setScreenPosition({
        row: row + rowCount,
        column: column
      }, {
        skipSoftWrapIndentation: true
      });
      return this.goalColumn = column;
    };

    Cursor.prototype.moveLeft = function(columnCount, _arg) {
      var column, moveToEndOfSelection, range, row, _ref1;
      if (columnCount == null) {
        columnCount = 1;
      }
      moveToEndOfSelection = (_arg != null ? _arg : {}).moveToEndOfSelection;
      range = this.marker.getScreenRange();
      if (moveToEndOfSelection && !range.isEmpty()) {
        return this.setScreenPosition(range.start);
      } else {
        _ref1 = this.getScreenPosition(), row = _ref1.row, column = _ref1.column;
        while (columnCount > column && row > 0) {
          columnCount -= column;
          column = this.editor.lineTextForScreenRow(--row).length;
          columnCount--;
        }
        column = column - columnCount;
        return this.setScreenPosition({
          row: row,
          column: column
        }, {
          clip: 'backward'
        });
      }
    };

    Cursor.prototype.moveRight = function(columnCount, _arg) {
      var column, columnsRemainingInLine, maxLines, moveToEndOfSelection, range, row, rowLength, _ref1;
      if (columnCount == null) {
        columnCount = 1;
      }
      moveToEndOfSelection = (_arg != null ? _arg : {}).moveToEndOfSelection;
      range = this.marker.getScreenRange();
      if (moveToEndOfSelection && !range.isEmpty()) {
        return this.setScreenPosition(range.end);
      } else {
        _ref1 = this.getScreenPosition(), row = _ref1.row, column = _ref1.column;
        maxLines = this.editor.getScreenLineCount();
        rowLength = this.editor.lineTextForScreenRow(row).length;
        columnsRemainingInLine = rowLength - column;
        while (columnCount > columnsRemainingInLine && row < maxLines - 1) {
          columnCount -= columnsRemainingInLine;
          columnCount--;
          column = 0;
          rowLength = this.editor.lineTextForScreenRow(++row).length;
          columnsRemainingInLine = rowLength;
        }
        column = column + columnCount;
        return this.setScreenPosition({
          row: row,
          column: column
        }, {
          clip: 'forward',
          wrapBeyondNewlines: true,
          wrapAtSoftNewlines: true
        });
      }
    };

    Cursor.prototype.moveToTop = function() {
      return this.setBufferPosition([0, 0]);
    };

    Cursor.prototype.moveToBottom = function() {
      return this.setBufferPosition(this.editor.getEofBufferPosition());
    };

    Cursor.prototype.moveToBeginningOfScreenLine = function() {
      return this.setScreenPosition([this.getScreenRow(), 0]);
    };

    Cursor.prototype.moveToBeginningOfLine = function() {
      return this.setBufferPosition([this.getBufferRow(), 0]);
    };

    Cursor.prototype.moveToFirstCharacterOfLine = function() {
      var firstCharacterColumn, screenLineBufferRange, screenLineEnd, screenLineStart, screenRow, targetBufferColumn;
      screenRow = this.getScreenRow();
      screenLineStart = this.editor.clipScreenPosition([screenRow, 0], {
        skipSoftWrapIndentation: true
      });
      screenLineEnd = [screenRow, Infinity];
      screenLineBufferRange = this.editor.bufferRangeForScreenRange([screenLineStart, screenLineEnd]);
      firstCharacterColumn = null;
      this.editor.scanInBufferRange(/\S/, screenLineBufferRange, function(_arg) {
        var range, stop;
        range = _arg.range, stop = _arg.stop;
        firstCharacterColumn = range.start.column;
        return stop();
      });
      if ((firstCharacterColumn != null) && firstCharacterColumn !== this.getBufferColumn()) {
        targetBufferColumn = firstCharacterColumn;
      } else {
        targetBufferColumn = screenLineBufferRange.start.column;
      }
      return this.setBufferPosition([screenLineBufferRange.start.row, targetBufferColumn]);
    };

    Cursor.prototype.moveToEndOfScreenLine = function() {
      return this.setScreenPosition([this.getScreenRow(), Infinity]);
    };

    Cursor.prototype.moveToEndOfLine = function() {
      return this.setBufferPosition([this.getBufferRow(), Infinity]);
    };

    Cursor.prototype.moveToBeginningOfWord = function() {
      return this.setBufferPosition(this.getBeginningOfCurrentWordBufferPosition());
    };

    Cursor.prototype.moveToEndOfWord = function() {
      var position;
      if (position = this.getEndOfCurrentWordBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToBeginningOfNextWord = function() {
      var position;
      if (position = this.getBeginningOfNextWordBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToPreviousWordBoundary = function() {
      var position;
      if (position = this.getPreviousWordBoundaryBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToNextWordBoundary = function() {
      var position;
      if (position = this.getNextWordBoundaryBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.skipLeadingWhitespace = function() {
      var endOfLeadingWhitespace, position, scanRange;
      position = this.getBufferPosition();
      scanRange = this.getCurrentLineBufferRange();
      endOfLeadingWhitespace = null;
      this.editor.scanInBufferRange(/^[ \t]*/, scanRange, function(_arg) {
        var range;
        range = _arg.range;
        return endOfLeadingWhitespace = range.end;
      });
      if (endOfLeadingWhitespace.isGreaterThan(position)) {
        return this.setBufferPosition(endOfLeadingWhitespace);
      }
    };

    Cursor.prototype.moveToBeginningOfNextParagraph = function() {
      var position;
      if (position = this.getBeginningOfNextParagraphBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToBeginningOfPreviousParagraph = function() {
      var position;
      if (position = this.getBeginningOfPreviousParagraphBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };


    /*
    Section: Local Positions and Ranges
     */

    Cursor.prototype.getPreviousWordBoundaryBufferPosition = function(options) {
      var beginningOfWordPosition, currentBufferPosition, previousNonBlankRow, scanRange, _ref1;
      if (options == null) {
        options = {};
      }
      currentBufferPosition = this.getBufferPosition();
      previousNonBlankRow = this.editor.buffer.previousNonBlankRow(currentBufferPosition.row);
      scanRange = [[previousNonBlankRow, 0], currentBufferPosition];
      beginningOfWordPosition = null;
      this.editor.backwardsScanInBufferRange((_ref1 = options.wordRegex) != null ? _ref1 : this.wordRegExp(), scanRange, function(_arg) {
        var range, stop;
        range = _arg.range, stop = _arg.stop;
        if (range.start.row < currentBufferPosition.row && currentBufferPosition.column > 0) {
          beginningOfWordPosition = new Point(currentBufferPosition.row, 0);
        } else if (range.end.isLessThan(currentBufferPosition)) {
          beginningOfWordPosition = range.end;
        } else {
          beginningOfWordPosition = range.start;
        }
        if (!(beginningOfWordPosition != null ? beginningOfWordPosition.isEqual(currentBufferPosition) : void 0)) {
          return stop();
        }
      });
      return beginningOfWordPosition || currentBufferPosition;
    };

    Cursor.prototype.getNextWordBoundaryBufferPosition = function(options) {
      var currentBufferPosition, endOfWordPosition, scanRange, _ref1;
      if (options == null) {
        options = {};
      }
      currentBufferPosition = this.getBufferPosition();
      scanRange = [currentBufferPosition, this.editor.getEofBufferPosition()];
      endOfWordPosition = null;
      this.editor.scanInBufferRange((_ref1 = options.wordRegex) != null ? _ref1 : this.wordRegExp(), scanRange, function(_arg) {
        var range, stop;
        range = _arg.range, stop = _arg.stop;
        if (range.start.row > currentBufferPosition.row) {
          endOfWordPosition = new Point(range.start.row, 0);
        } else if (range.start.isGreaterThan(currentBufferPosition)) {
          endOfWordPosition = range.start;
        } else {
          endOfWordPosition = range.end;
        }
        if (!(endOfWordPosition != null ? endOfWordPosition.isEqual(currentBufferPosition) : void 0)) {
          return stop();
        }
      });
      return endOfWordPosition || currentBufferPosition;
    };

    Cursor.prototype.getBeginningOfCurrentWordBufferPosition = function(options) {
      var allowPrevious, beginningOfWordPosition, currentBufferPosition, previousNonBlankRow, scanRange, _ref1, _ref2, _ref3;
      if (options == null) {
        options = {};
      }
      allowPrevious = (_ref1 = options.allowPrevious) != null ? _ref1 : true;
      currentBufferPosition = this.getBufferPosition();
      previousNonBlankRow = (_ref2 = this.editor.buffer.previousNonBlankRow(currentBufferPosition.row)) != null ? _ref2 : 0;
      scanRange = [[previousNonBlankRow, 0], currentBufferPosition];
      beginningOfWordPosition = null;
      this.editor.backwardsScanInBufferRange((_ref3 = options.wordRegex) != null ? _ref3 : this.wordRegExp(options), scanRange, function(_arg) {
        var range, stop;
        range = _arg.range, stop = _arg.stop;
        if (range.end.isGreaterThanOrEqual(currentBufferPosition) || allowPrevious) {
          beginningOfWordPosition = range.start;
        }
        if (!(beginningOfWordPosition != null ? beginningOfWordPosition.isEqual(currentBufferPosition) : void 0)) {
          return stop();
        }
      });
      if (beginningOfWordPosition != null) {
        return beginningOfWordPosition;
      } else if (allowPrevious) {
        return new Point(0, 0);
      } else {
        return currentBufferPosition;
      }
    };

    Cursor.prototype.getEndOfCurrentWordBufferPosition = function(options) {
      var allowNext, currentBufferPosition, endOfWordPosition, scanRange, _ref1, _ref2;
      if (options == null) {
        options = {};
      }
      allowNext = (_ref1 = options.allowNext) != null ? _ref1 : true;
      currentBufferPosition = this.getBufferPosition();
      scanRange = [currentBufferPosition, this.editor.getEofBufferPosition()];
      endOfWordPosition = null;
      this.editor.scanInBufferRange((_ref2 = options.wordRegex) != null ? _ref2 : this.wordRegExp(options), scanRange, function(_arg) {
        var range, stop;
        range = _arg.range, stop = _arg.stop;
        if (range.start.isLessThanOrEqual(currentBufferPosition) || allowNext) {
          endOfWordPosition = range.end;
        }
        if (!(endOfWordPosition != null ? endOfWordPosition.isEqual(currentBufferPosition) : void 0)) {
          return stop();
        }
      });
      return endOfWordPosition != null ? endOfWordPosition : currentBufferPosition;
    };

    Cursor.prototype.getBeginningOfNextWordBufferPosition = function(options) {
      var beginningOfNextWordPosition, currentBufferPosition, scanRange, start, _ref1;
      if (options == null) {
        options = {};
      }
      currentBufferPosition = this.getBufferPosition();
      start = this.isInsideWord(options) ? this.getEndOfCurrentWordBufferPosition(options) : currentBufferPosition;
      scanRange = [start, this.editor.getEofBufferPosition()];
      beginningOfNextWordPosition = null;
      this.editor.scanInBufferRange((_ref1 = options.wordRegex) != null ? _ref1 : this.wordRegExp(), scanRange, function(_arg) {
        var range, stop;
        range = _arg.range, stop = _arg.stop;
        beginningOfNextWordPosition = range.start;
        return stop();
      });
      return beginningOfNextWordPosition || currentBufferPosition;
    };

    Cursor.prototype.getCurrentWordBufferRange = function(options) {
      var endOptions, startOptions;
      if (options == null) {
        options = {};
      }
      startOptions = _.extend(_.clone(options), {
        allowPrevious: false
      });
      endOptions = _.extend(_.clone(options), {
        allowNext: false
      });
      return new Range(this.getBeginningOfCurrentWordBufferPosition(startOptions), this.getEndOfCurrentWordBufferPosition(endOptions));
    };

    Cursor.prototype.getCurrentLineBufferRange = function(options) {
      return this.editor.bufferRangeForBufferRow(this.getBufferRow(), options);
    };

    Cursor.prototype.getCurrentParagraphBufferRange = function() {
      return this.editor.languageMode.rowRangeForParagraphAtBufferRow(this.getBufferRow());
    };

    Cursor.prototype.getCurrentWordPrefix = function() {
      return this.editor.getTextInBufferRange([this.getBeginningOfCurrentWordBufferPosition(), this.getBufferPosition()]);
    };


    /*
    Section: Visibility
     */

    Cursor.prototype.setVisible = function(visible) {
      if (this.visible !== visible) {
        this.visible = visible;
        if (Grim.includeDeprecatedAPIs) {
          this.emit('visibility-changed', this.visible);
        }
        return this.emitter.emit('did-change-visibility', this.visible);
      }
    };

    Cursor.prototype.isVisible = function() {
      return this.visible;
    };

    Cursor.prototype.updateVisibility = function() {
      return this.setVisible(this.marker.getBufferRange().isEmpty());
    };


    /*
    Section: Comparing to another cursor
     */

    Cursor.prototype.compare = function(otherCursor) {
      return this.getBufferPosition().compare(otherCursor.getBufferPosition());
    };


    /*
    Section: Utilities
     */

    Cursor.prototype.clearAutoscroll = function() {};

    Cursor.prototype.clearSelection = function(options) {
      var _ref1;
      return (_ref1 = this.selection) != null ? _ref1.clear(options) : void 0;
    };

    Cursor.prototype.wordRegExp = function(_arg) {
      var includeNonWordCharacters, nonWordCharacters, segments;
      includeNonWordCharacters = (_arg != null ? _arg : {}).includeNonWordCharacters;
      if (includeNonWordCharacters == null) {
        includeNonWordCharacters = true;
      }
      nonWordCharacters = atom.config.get('editor.nonWordCharacters', {
        scope: this.getScopeDescriptor()
      });
      segments = ["^[\t ]*$"];
      segments.push("[^\\s" + (_.escapeRegExp(nonWordCharacters)) + "]+");
      if (includeNonWordCharacters) {
        segments.push("[" + (_.escapeRegExp(nonWordCharacters)) + "]+");
      }
      return new RegExp(segments.join("|"), "g");
    };


    /*
    Section: Private
     */

    Cursor.prototype.changePosition = function(options, fn) {
      var _ref1;
      this.clearSelection({
        autoscroll: false
      });
      fn();
      if ((_ref1 = options.autoscroll) != null ? _ref1 : this.isLastCursor()) {
        return this.autoscroll();
      }
    };

    Cursor.prototype.getPixelRect = function() {
      return this.editor.pixelRectForScreenRange(this.getScreenRange());
    };

    Cursor.prototype.getScreenRange = function() {
      var column, row, _ref1;
      _ref1 = this.getScreenPosition(), row = _ref1.row, column = _ref1.column;
      return new Range(new Point(row, column), new Point(row, column + 1));
    };

    Cursor.prototype.autoscroll = function(options) {
      return this.editor.scrollToScreenRange(this.getScreenRange(), options);
    };

    Cursor.prototype.getBeginningOfNextParagraphBufferPosition = function() {
      var column, eof, position, row, scanRange, start;
      start = this.getBufferPosition();
      eof = this.editor.getEofBufferPosition();
      scanRange = [start, eof];
      row = eof.row, column = eof.column;
      position = new Point(row, column - 1);
      this.editor.scanInBufferRange(/^\n*$/g, scanRange, function(_arg) {
        var range, stop;
        range = _arg.range, stop = _arg.stop;
        if (!range.start.isEqual(start)) {
          position = range.start;
          return stop();
        }
      });
      return position;
    };

    Cursor.prototype.getBeginningOfPreviousParagraphBufferPosition = function() {
      var column, position, row, scanRange, start, zero;
      start = this.getBufferPosition();
      row = start.row, column = start.column;
      scanRange = [[row - 1, column], [0, 0]];
      position = new Point(0, 0);
      zero = new Point(0, 0);
      this.editor.backwardsScanInBufferRange(/^\n*$/g, scanRange, function(_arg) {
        var range, stop;
        range = _arg.range, stop = _arg.stop;
        if (!range.start.isEqual(zero)) {
          position = range.start;
          return stop();
        }
      });
      return position;
    };

    return Cursor;

  })(Model);

  if (Grim.includeDeprecatedAPIs) {
    Cursor.prototype.getScopes = function() {
      Grim.deprecate('Use Cursor::getScopeDescriptor() instead');
      return this.getScopeDescriptor().getScopesArray();
    };
    Cursor.prototype.getMoveNextWordBoundaryBufferPosition = function(options) {
      Grim.deprecate('Use `::getNextWordBoundaryBufferPosition(options)` instead');
      return this.getNextWordBoundaryBufferPosition(options);
    };
  }

}).call(this);

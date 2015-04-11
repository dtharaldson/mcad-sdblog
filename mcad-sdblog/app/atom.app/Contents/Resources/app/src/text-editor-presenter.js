(function() {
  var CompositeDisposable, Emitter, Point, Range, TextEditorPresenter, _, _ref, _ref1;

  _ref = require('event-kit'), CompositeDisposable = _ref.CompositeDisposable, Emitter = _ref.Emitter;

  _ref1 = require('text-buffer'), Point = _ref1.Point, Range = _ref1.Range;

  _ = require('underscore-plus');

  module.exports = TextEditorPresenter = (function() {
    TextEditorPresenter.prototype.toggleCursorBlinkHandle = null;

    TextEditorPresenter.prototype.startBlinkingCursorsAfterDelay = null;

    TextEditorPresenter.prototype.stoppedScrollingTimeoutId = null;

    TextEditorPresenter.prototype.mouseWheelScreenRow = null;

    TextEditorPresenter.prototype.scopedCharacterWidthsChangeCount = 0;

    TextEditorPresenter.prototype.overlayDimensions = {};

    function TextEditorPresenter(params) {
      var horizontalScrollbarHeight, verticalScrollbarWidth;
      this.model = params.model, this.autoHeight = params.autoHeight, this.explicitHeight = params.explicitHeight, this.contentFrameWidth = params.contentFrameWidth, this.scrollTop = params.scrollTop, this.scrollLeft = params.scrollLeft, this.boundingClientRect = params.boundingClientRect, this.windowWidth = params.windowWidth, this.windowHeight = params.windowHeight;
      horizontalScrollbarHeight = params.horizontalScrollbarHeight, verticalScrollbarWidth = params.verticalScrollbarWidth;
      this.lineHeight = params.lineHeight, this.baseCharacterWidth = params.baseCharacterWidth, this.lineOverdrawMargin = params.lineOverdrawMargin, this.backgroundColor = params.backgroundColor, this.gutterBackgroundColor = params.gutterBackgroundColor;
      this.cursorBlinkPeriod = params.cursorBlinkPeriod, this.cursorBlinkResumeDelay = params.cursorBlinkResumeDelay, this.stoppedScrollingDelay = params.stoppedScrollingDelay, this.focused = params.focused;
      this.measuredHorizontalScrollbarHeight = horizontalScrollbarHeight;
      this.measuredVerticalScrollbarWidth = verticalScrollbarWidth;
      this.disposables = new CompositeDisposable;
      this.emitter = new Emitter;
      this.characterWidthsByScope = {};
      this.transferMeasurementsToModel();
      this.observeModel();
      this.observeConfig();
      this.buildState();
      if (this.focused) {
        this.startBlinkingCursors();
      }
      this.updating = false;
    }

    TextEditorPresenter.prototype.destroy = function() {
      return this.disposables.dispose();
    };

    TextEditorPresenter.prototype.onDidUpdateState = function(callback) {
      return this.emitter.on('did-update-state', callback);
    };

    TextEditorPresenter.prototype.emitDidUpdateState = function() {
      if (this.isBatching()) {
        return this.emitter.emit("did-update-state");
      }
    };

    TextEditorPresenter.prototype.transferMeasurementsToModel = function() {
      if (this.explicitHeight != null) {
        this.model.setHeight(this.explicitHeight);
      }
      if (this.contentFrameWidth != null) {
        this.model.setWidth(this.contentFrameWidth);
      }
      if (this.lineHeight != null) {
        this.model.setLineHeightInPixels(this.lineHeight);
      }
      if (this.baseCharacterWidth != null) {
        this.model.setDefaultCharWidth(this.baseCharacterWidth);
      }
      if (this.scrollTop != null) {
        this.model.setScrollTop(this.scrollTop);
      }
      if (this.scrollLeft != null) {
        this.model.setScrollLeft(this.scrollLeft);
      }
      if (this.measuredVerticalScrollbarWidth != null) {
        this.model.setVerticalScrollbarWidth(this.measuredVerticalScrollbarWidth);
      }
      if (this.measuredHorizontalScrollbarHeight != null) {
        return this.model.setHorizontalScrollbarHeight(this.measuredHorizontalScrollbarHeight);
      }
    };

    TextEditorPresenter.prototype.isBatching = function() {
      return this.updating === false;
    };

    TextEditorPresenter.prototype.batch = function(flagName, fn) {
      if (this.isBatching()) {
        this[flagName] = true;
      } else {
        fn.apply(this);
        this[flagName] = false;
      }
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.getState = function() {
      this.updating = true;
      this.updateContentDimensions();
      this.updateScrollbarDimensions();
      this.updateStartRow();
      this.updateEndRow();
      if (this.shouldUpdateFocusedState) {
        this.updateFocusedState();
      }
      if (this.shouldUpdateHeightState) {
        this.updateHeightState();
      }
      if (this.shouldUpdateVerticalScrollState) {
        this.updateVerticalScrollState();
      }
      if (this.shouldUpdateHorizontalScrollState) {
        this.updateHorizontalScrollState();
      }
      if (this.shouldUpdateScrollbarsState) {
        this.updateScrollbarsState();
      }
      if (this.shouldUpdateHiddenInputState) {
        this.updateHiddenInputState();
      }
      if (this.shouldUpdateContentState) {
        this.updateContentState();
      }
      if (this.shouldUpdateDecorations) {
        this.updateDecorations();
      }
      if (this.shouldUpdateLinesState) {
        this.updateLinesState();
      }
      if (this.shouldUpdateCursorsState) {
        this.updateCursorsState();
      }
      if (this.shouldUpdateOverlaysState) {
        this.updateOverlaysState();
      }
      if (this.shouldUpdateGutterState) {
        this.updateGutterState();
      }
      if (this.shouldUpdateLineNumbersState) {
        this.updateLineNumbersState();
      }
      this.updating = false;
      return this.state;
    };

    TextEditorPresenter.prototype.observeModel = function() {
      var cursor, decoration, _i, _j, _len, _len1, _ref2, _ref3;
      this.disposables.add(this.model.onDidChange((function(_this) {
        return function() {
          _this.updateContentDimensions();
          _this.updateEndRow();
          _this.updateHeightState();
          _this.updateVerticalScrollState();
          _this.updateHorizontalScrollState();
          _this.updateScrollbarsState();
          _this.updateContentState();
          _this.updateDecorations();
          _this.updateLinesState();
          _this.updateGutterState();
          return _this.updateLineNumbersState();
        };
      })(this)));
      this.disposables.add(this.model.onDidChangeGrammar(this.didChangeGrammar.bind(this)));
      this.disposables.add(this.model.onDidChangePlaceholderText(this.updateContentState.bind(this)));
      this.disposables.add(this.model.onDidChangeMini((function(_this) {
        return function() {
          _this.updateScrollbarDimensions();
          _this.updateScrollbarsState();
          _this.updateContentState();
          _this.updateDecorations();
          _this.updateLinesState();
          _this.updateGutterState();
          return _this.updateLineNumbersState();
        };
      })(this)));
      this.disposables.add(this.model.onDidChangeGutterVisible((function(_this) {
        return function() {
          return _this.updateGutterState();
        };
      })(this)));
      this.disposables.add(this.model.onDidAddDecoration(this.didAddDecoration.bind(this)));
      this.disposables.add(this.model.onDidAddCursor(this.didAddCursor.bind(this)));
      this.disposables.add(this.model.onDidChangeScrollTop(this.setScrollTop.bind(this)));
      this.disposables.add(this.model.onDidChangeScrollLeft(this.setScrollLeft.bind(this)));
      _ref2 = this.model.getDecorations();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        decoration = _ref2[_i];
        this.observeDecoration(decoration);
      }
      _ref3 = this.model.getCursors();
      for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
        cursor = _ref3[_j];
        this.observeCursor(cursor);
      }
    };

    TextEditorPresenter.prototype.observeConfig = function() {
      var configParams, _ref2;
      configParams = {
        scope: this.model.getRootScopeDescriptor()
      };
      this.scrollPastEnd = atom.config.get('editor.scrollPastEnd', configParams);
      this.showLineNumbers = atom.config.get('editor.showLineNumbers', configParams);
      this.showIndentGuide = atom.config.get('editor.showIndentGuide', configParams);
      if (this.configDisposables != null) {
        if ((_ref2 = this.configDisposables) != null) {
          _ref2.dispose();
        }
        this.disposables.remove(this.configDisposables);
      }
      this.configDisposables = new CompositeDisposable;
      this.disposables.add(this.configDisposables);
      this.configDisposables.add(atom.config.onDidChange('editor.showIndentGuide', configParams, (function(_this) {
        return function(_arg) {
          var newValue;
          newValue = _arg.newValue;
          _this.showIndentGuide = newValue;
          return _this.updateContentState();
        };
      })(this)));
      this.configDisposables.add(atom.config.onDidChange('editor.scrollPastEnd', configParams, (function(_this) {
        return function(_arg) {
          var newValue;
          newValue = _arg.newValue;
          _this.scrollPastEnd = newValue;
          _this.updateScrollHeight();
          _this.updateVerticalScrollState();
          return _this.updateScrollbarsState();
        };
      })(this)));
      return this.configDisposables.add(atom.config.onDidChange('editor.showLineNumbers', configParams, (function(_this) {
        return function(_arg) {
          var newValue;
          newValue = _arg.newValue;
          _this.showLineNumbers = newValue;
          return _this.updateGutterState();
        };
      })(this)));
    };

    TextEditorPresenter.prototype.didChangeGrammar = function() {
      this.observeConfig();
      this.updateContentState();
      return this.updateGutterState();
    };

    TextEditorPresenter.prototype.buildState = function() {
      this.state = {
        horizontalScrollbar: {},
        verticalScrollbar: {},
        hiddenInput: {},
        content: {
          scrollingVertically: false,
          cursorsVisible: false,
          lines: {},
          highlights: {},
          overlays: {}
        },
        gutter: {
          lineNumbers: {}
        }
      };
      return this.updateState();
    };

    TextEditorPresenter.prototype.updateState = function() {
      this.updateContentDimensions();
      this.updateScrollbarDimensions();
      this.updateStartRow();
      this.updateEndRow();
      this.updateFocusedState();
      this.updateHeightState();
      this.updateVerticalScrollState();
      this.updateHorizontalScrollState();
      this.updateScrollbarsState();
      this.updateHiddenInputState();
      this.updateContentState();
      this.updateDecorations();
      this.updateLinesState();
      this.updateCursorsState();
      this.updateOverlaysState();
      this.updateGutterState();
      return this.updateLineNumbersState();
    };

    TextEditorPresenter.prototype.updateFocusedState = function() {
      return this.batch("shouldUpdateFocusedState", function() {
        return this.state.focused = this.focused;
      });
    };

    TextEditorPresenter.prototype.updateHeightState = function() {
      return this.batch("shouldUpdateHeightState", function() {
        if (this.autoHeight) {
          return this.state.height = this.contentHeight;
        } else {
          return this.state.height = null;
        }
      });
    };

    TextEditorPresenter.prototype.updateVerticalScrollState = function() {
      return this.batch("shouldUpdateVerticalScrollState", function() {
        this.state.content.scrollHeight = this.scrollHeight;
        this.state.gutter.scrollHeight = this.scrollHeight;
        this.state.verticalScrollbar.scrollHeight = this.scrollHeight;
        this.state.content.scrollTop = this.scrollTop;
        this.state.gutter.scrollTop = this.scrollTop;
        return this.state.verticalScrollbar.scrollTop = this.scrollTop;
      });
    };

    TextEditorPresenter.prototype.updateHorizontalScrollState = function() {
      return this.batch("shouldUpdateHorizontalScrollState", function() {
        this.state.content.scrollWidth = this.scrollWidth;
        this.state.horizontalScrollbar.scrollWidth = this.scrollWidth;
        this.state.content.scrollLeft = this.scrollLeft;
        return this.state.horizontalScrollbar.scrollLeft = this.scrollLeft;
      });
    };

    TextEditorPresenter.prototype.updateScrollbarsState = function() {
      return this.batch("shouldUpdateScrollbarsState", function() {
        this.state.horizontalScrollbar.visible = this.horizontalScrollbarHeight > 0;
        this.state.horizontalScrollbar.height = this.measuredHorizontalScrollbarHeight;
        this.state.horizontalScrollbar.right = this.verticalScrollbarWidth;
        this.state.verticalScrollbar.visible = this.verticalScrollbarWidth > 0;
        this.state.verticalScrollbar.width = this.measuredVerticalScrollbarWidth;
        return this.state.verticalScrollbar.bottom = this.horizontalScrollbarHeight;
      });
    };

    TextEditorPresenter.prototype.updateHiddenInputState = function() {
      return this.batch("shouldUpdateHiddenInputState", function() {
        var height, lastCursor, left, top, width, _ref2;
        if (!(lastCursor = this.model.getLastCursor())) {
          return;
        }
        _ref2 = this.pixelRectForScreenRange(lastCursor.getScreenRange()), top = _ref2.top, left = _ref2.left, height = _ref2.height, width = _ref2.width;
        if (this.focused) {
          top -= this.scrollTop;
          left -= this.scrollLeft;
          this.state.hiddenInput.top = Math.max(Math.min(top, this.clientHeight - height), 0);
          this.state.hiddenInput.left = Math.max(Math.min(left, this.clientWidth - width), 0);
        } else {
          this.state.hiddenInput.top = 0;
          this.state.hiddenInput.left = 0;
        }
        this.state.hiddenInput.height = height;
        return this.state.hiddenInput.width = Math.max(width, 2);
      });
    };

    TextEditorPresenter.prototype.updateContentState = function() {
      return this.batch("shouldUpdateContentState", function() {
        this.state.content.scrollWidth = this.scrollWidth;
        this.state.content.scrollLeft = this.scrollLeft;
        this.state.content.indentGuidesVisible = !this.model.isMini() && this.showIndentGuide;
        this.state.content.backgroundColor = this.model.isMini() ? null : this.backgroundColor;
        return this.state.content.placeholderText = this.model.isEmpty() ? this.model.getPlaceholderText() : null;
      });
    };

    TextEditorPresenter.prototype.updateLinesState = function() {
      return this.batch("shouldUpdateLinesState", function() {
        var id, line, preservedLine, row, visibleLineIds, _ref2;
        if (!((this.startRow != null) && (this.endRow != null) && (this.lineHeight != null))) {
          return;
        }
        visibleLineIds = {};
        row = this.startRow;
        while (row < this.endRow) {
          line = this.model.tokenizedLineForScreenRow(row);
          if (line == null) {
            throw new Error("No line exists for row " + row + ". Last screen row: " + (this.model.getLastScreenRow()));
          }
          visibleLineIds[line.id] = true;
          if (this.state.content.lines.hasOwnProperty(line.id)) {
            this.updateLineState(row, line);
          } else {
            this.buildLineState(row, line);
          }
          row++;
        }
        if (this.mouseWheelScreenRow != null) {
          if (preservedLine = this.model.tokenizedLineForScreenRow(this.mouseWheelScreenRow)) {
            visibleLineIds[preservedLine.id] = true;
          }
        }
        _ref2 = this.state.content.lines;
        for (id in _ref2) {
          line = _ref2[id];
          if (!visibleLineIds.hasOwnProperty(id)) {
            delete this.state.content.lines[id];
          }
        }
      });
    };

    TextEditorPresenter.prototype.updateLineState = function(row, line) {
      var lineState;
      lineState = this.state.content.lines[line.id];
      lineState.screenRow = row;
      lineState.top = row * this.lineHeight;
      return lineState.decorationClasses = this.lineDecorationClassesForRow(row);
    };

    TextEditorPresenter.prototype.buildLineState = function(row, line) {
      return this.state.content.lines[line.id] = {
        screenRow: row,
        text: line.text,
        tokens: line.tokens,
        isOnlyWhitespace: line.isOnlyWhitespace(),
        endOfLineInvisibles: line.endOfLineInvisibles,
        indentLevel: line.indentLevel,
        tabLength: line.tabLength,
        fold: line.fold,
        top: row * this.lineHeight,
        decorationClasses: this.lineDecorationClassesForRow(row)
      };
    };

    TextEditorPresenter.prototype.updateCursorsState = function() {
      return this.batch("shouldUpdateCursorsState", function() {
        var cursor, _i, _len, _ref2;
        this.state.content.cursors = {};
        _ref2 = this.model.cursors;
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          cursor = _ref2[_i];
          this.updateCursorState(cursor);
        }
      });
    };

    TextEditorPresenter.prototype.updateCursorState = function(cursor, destroyOnly) {
      var pixelRect, _ref2;
      if (destroyOnly == null) {
        destroyOnly = false;
      }
      delete this.state.content.cursors[cursor.id];
      if (destroyOnly) {
        return;
      }
      if (!((this.startRow != null) && (this.endRow != null) && this.hasPixelRectRequirements() && (this.baseCharacterWidth != null))) {
        return;
      }
      if (!(cursor.isVisible() && (this.startRow <= (_ref2 = cursor.getScreenRow()) && _ref2 < this.endRow))) {
        return;
      }
      pixelRect = this.pixelRectForScreenRange(cursor.getScreenRange());
      if (pixelRect.width === 0) {
        pixelRect.width = this.baseCharacterWidth;
      }
      this.state.content.cursors[cursor.id] = pixelRect;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.updateOverlaysState = function() {
      return this.batch("shouldUpdateOverlaysState", function() {
        var contentMargin, decoration, gutterWidth, id, item, itemHeight, itemWidth, left, leftDiff, overlayDimensions, pixelPosition, position, rightDiff, screenPosition, scrollLeft, scrollTop, top, visibleDecorationIds, _base, _i, _len, _name, _ref2, _ref3, _ref4;
        if (!this.hasOverlayPositionRequirements()) {
          return;
        }
        visibleDecorationIds = {};
        _ref2 = this.model.getOverlayDecorations();
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          decoration = _ref2[_i];
          if (!decoration.getMarker().isValid()) {
            continue;
          }
          _ref3 = decoration.getProperties(), item = _ref3.item, position = _ref3.position;
          if (position === 'tail') {
            screenPosition = decoration.getMarker().getTailScreenPosition();
          } else {
            screenPosition = decoration.getMarker().getHeadScreenPosition();
          }
          pixelPosition = this.pixelPositionForScreenPosition(screenPosition);
          _ref4 = this.state.content, scrollTop = _ref4.scrollTop, scrollLeft = _ref4.scrollLeft;
          gutterWidth = this.boundingClientRect.width - this.contentFrameWidth;
          top = pixelPosition.top + this.lineHeight - scrollTop;
          left = pixelPosition.left + gutterWidth - scrollLeft;
          if (overlayDimensions = this.overlayDimensions[decoration.id]) {
            itemWidth = overlayDimensions.itemWidth, itemHeight = overlayDimensions.itemHeight, contentMargin = overlayDimensions.contentMargin;
            rightDiff = left + this.boundingClientRect.left + itemWidth + contentMargin - this.windowWidth;
            if (rightDiff > 0) {
              left -= rightDiff;
            }
            leftDiff = left + this.boundingClientRect.left + contentMargin;
            if (leftDiff < 0) {
              left -= leftDiff;
            }
            if (top + this.boundingClientRect.top + itemHeight > this.windowHeight && top - (itemHeight + this.lineHeight) >= 0) {
              top -= itemHeight + this.lineHeight;
            }
          }
          pixelPosition.top = top;
          pixelPosition.left = left;
          if ((_base = this.state.content.overlays)[_name = decoration.id] == null) {
            _base[_name] = {
              item: item
            };
          }
          this.state.content.overlays[decoration.id].pixelPosition = pixelPosition;
          visibleDecorationIds[decoration.id] = true;
        }
        for (id in this.state.content.overlays) {
          if (!visibleDecorationIds[id]) {
            delete this.state.content.overlays[id];
          }
        }
        for (id in this.overlayDimensions) {
          if (!visibleDecorationIds[id]) {
            delete this.overlayDimensions[id];
          }
        }
      });
    };

    TextEditorPresenter.prototype.updateGutterState = function() {
      return this.batch("shouldUpdateGutterState", function() {
        var _ref2;
        this.state.gutter.visible = !this.model.isMini() && ((_ref2 = this.model.isGutterVisible()) != null ? _ref2 : true) && this.showLineNumbers;
        this.state.gutter.maxLineNumberDigits = this.model.getLineCount().toString().length;
        return this.state.gutter.backgroundColor = this.gutterBackgroundColor !== "rgba(0, 0, 0, 0)" ? this.gutterBackgroundColor : this.backgroundColor;
      });
    };

    TextEditorPresenter.prototype.updateLineNumbersState = function() {
      return this.batch("shouldUpdateLineNumbersState", function() {
        var bufferRow, decorationClasses, foldable, i, id, lastBufferRow, rowBeforeStartRow, screenRow, softWrapped, top, visibleLineNumberIds, wrapCount, _i, _len, _ref2;
        if (!((this.startRow != null) && (this.endRow != null) && (this.lineHeight != null))) {
          return;
        }
        visibleLineNumberIds = {};
        if (this.startRow > 0) {
          rowBeforeStartRow = this.startRow - 1;
          lastBufferRow = this.model.bufferRowForScreenRow(rowBeforeStartRow);
          wrapCount = rowBeforeStartRow - this.model.screenRowForBufferRow(lastBufferRow);
        } else {
          lastBufferRow = null;
          wrapCount = 0;
        }
        if (this.endRow > this.startRow) {
          _ref2 = this.model.bufferRowsForScreenRows(this.startRow, this.endRow - 1);
          for (i = _i = 0, _len = _ref2.length; _i < _len; i = ++_i) {
            bufferRow = _ref2[i];
            if (bufferRow === lastBufferRow) {
              wrapCount++;
              id = bufferRow + '-' + wrapCount;
              softWrapped = true;
            } else {
              id = bufferRow;
              wrapCount = 0;
              lastBufferRow = bufferRow;
              softWrapped = false;
            }
            screenRow = this.startRow + i;
            top = screenRow * this.lineHeight;
            decorationClasses = this.lineNumberDecorationClassesForRow(screenRow);
            foldable = this.model.isFoldableAtScreenRow(screenRow);
            this.state.gutter.lineNumbers[id] = {
              screenRow: screenRow,
              bufferRow: bufferRow,
              softWrapped: softWrapped,
              top: top,
              decorationClasses: decorationClasses,
              foldable: foldable
            };
            visibleLineNumberIds[id] = true;
          }
        }
        if (this.mouseWheelScreenRow != null) {
          bufferRow = this.model.bufferRowForScreenRow(this.mouseWheelScreenRow);
          wrapCount = this.mouseWheelScreenRow - this.model.screenRowForBufferRow(bufferRow);
          id = bufferRow;
          if (wrapCount > 0) {
            id += '-' + wrapCount;
          }
          visibleLineNumberIds[id] = true;
        }
        for (id in this.state.gutter.lineNumbers) {
          if (!visibleLineNumberIds[id]) {
            delete this.state.gutter.lineNumbers[id];
          }
        }
      });
    };

    TextEditorPresenter.prototype.updateStartRow = function() {
      var startRow;
      if (!((this.scrollTop != null) && (this.lineHeight != null))) {
        return;
      }
      startRow = Math.floor(this.scrollTop / this.lineHeight) - this.lineOverdrawMargin;
      return this.startRow = Math.max(0, startRow);
    };

    TextEditorPresenter.prototype.updateEndRow = function() {
      var endRow, startRow, visibleLinesCount;
      if (!((this.scrollTop != null) && (this.lineHeight != null) && (this.height != null))) {
        return;
      }
      startRow = Math.max(0, Math.floor(this.scrollTop / this.lineHeight));
      visibleLinesCount = Math.ceil(this.height / this.lineHeight) + 1;
      endRow = startRow + visibleLinesCount + this.lineOverdrawMargin;
      return this.endRow = Math.min(this.model.getScreenLineCount(), endRow);
    };

    TextEditorPresenter.prototype.updateScrollWidth = function() {
      var scrollWidth;
      if (!((this.contentWidth != null) && (this.clientWidth != null))) {
        return;
      }
      scrollWidth = Math.max(this.contentWidth, this.clientWidth);
      if (this.scrollWidth !== scrollWidth) {
        this.scrollWidth = scrollWidth;
        return this.updateScrollLeft();
      }
    };

    TextEditorPresenter.prototype.updateScrollHeight = function() {
      var contentHeight, extraScrollHeight, scrollHeight;
      if (!((this.contentHeight != null) && (this.clientHeight != null))) {
        return;
      }
      contentHeight = this.contentHeight;
      if (this.scrollPastEnd) {
        extraScrollHeight = this.clientHeight - (this.lineHeight * 3);
        if (extraScrollHeight > 0) {
          contentHeight += extraScrollHeight;
        }
      }
      scrollHeight = Math.max(contentHeight, this.height);
      if (this.scrollHeight !== scrollHeight) {
        this.scrollHeight = scrollHeight;
        return this.updateScrollTop();
      }
    };

    TextEditorPresenter.prototype.updateContentDimensions = function() {
      var oldContentHeight, oldContentWidth;
      if (this.lineHeight != null) {
        oldContentHeight = this.contentHeight;
        this.contentHeight = this.lineHeight * this.model.getScreenLineCount();
      }
      if (this.baseCharacterWidth != null) {
        oldContentWidth = this.contentWidth;
        this.contentWidth = this.pixelPositionForScreenPosition([this.model.getLongestScreenRow(), Infinity]).left;
        if (!this.model.isSoftWrapped()) {
          this.contentWidth += 1;
        }
      }
      if (this.contentHeight !== oldContentHeight) {
        this.updateHeight();
        this.updateScrollbarDimensions();
        this.updateScrollHeight();
      }
      if (this.contentWidth !== oldContentWidth) {
        this.updateScrollbarDimensions();
        return this.updateScrollWidth();
      }
    };

    TextEditorPresenter.prototype.updateClientHeight = function() {
      var clientHeight;
      if (!((this.height != null) && (this.horizontalScrollbarHeight != null))) {
        return;
      }
      clientHeight = this.height - this.horizontalScrollbarHeight;
      if (this.clientHeight !== clientHeight) {
        this.clientHeight = clientHeight;
        this.updateScrollHeight();
        return this.updateScrollTop();
      }
    };

    TextEditorPresenter.prototype.updateClientWidth = function() {
      var clientWidth;
      if (!((this.contentFrameWidth != null) && (this.verticalScrollbarWidth != null))) {
        return;
      }
      clientWidth = this.contentFrameWidth - this.verticalScrollbarWidth;
      if (this.clientWidth !== clientWidth) {
        this.clientWidth = clientWidth;
        this.updateScrollWidth();
        return this.updateScrollLeft();
      }
    };

    TextEditorPresenter.prototype.updateScrollTop = function() {
      var scrollTop;
      scrollTop = this.constrainScrollTop(this.scrollTop);
      if (this.scrollTop !== scrollTop) {
        this.scrollTop = scrollTop;
        this.updateStartRow();
        return this.updateEndRow();
      }
    };

    TextEditorPresenter.prototype.constrainScrollTop = function(scrollTop) {
      if (!((scrollTop != null) && (this.scrollHeight != null) && (this.clientHeight != null))) {
        return scrollTop;
      }
      return Math.max(0, Math.min(scrollTop, this.scrollHeight - this.clientHeight));
    };

    TextEditorPresenter.prototype.updateScrollLeft = function() {
      return this.scrollLeft = this.constrainScrollLeft(this.scrollLeft);
    };

    TextEditorPresenter.prototype.constrainScrollLeft = function(scrollLeft) {
      if (!((scrollLeft != null) && (this.scrollWidth != null) && (this.clientWidth != null))) {
        return scrollLeft;
      }
      return Math.max(0, Math.min(scrollLeft, this.scrollWidth - this.clientWidth));
    };

    TextEditorPresenter.prototype.updateScrollbarDimensions = function() {
      var clientHeightWithHorizontalScrollbar, clientHeightWithoutHorizontalScrollbar, clientWidthWithVerticalScrollbar, clientWidthWithoutVerticalScrollbar, horizontalScrollbarHeight, horizontalScrollbarVisible, verticalScrollbarVisible, verticalScrollbarWidth;
      if (!((this.contentFrameWidth != null) && (this.height != null))) {
        return;
      }
      if (!((this.measuredVerticalScrollbarWidth != null) && (this.measuredHorizontalScrollbarHeight != null))) {
        return;
      }
      if (!((this.contentWidth != null) && (this.contentHeight != null))) {
        return;
      }
      clientWidthWithoutVerticalScrollbar = this.contentFrameWidth;
      clientWidthWithVerticalScrollbar = clientWidthWithoutVerticalScrollbar - this.measuredVerticalScrollbarWidth;
      clientHeightWithoutHorizontalScrollbar = this.height;
      clientHeightWithHorizontalScrollbar = clientHeightWithoutHorizontalScrollbar - this.measuredHorizontalScrollbarHeight;
      horizontalScrollbarVisible = !this.model.isMini() && (this.contentWidth > clientWidthWithoutVerticalScrollbar || this.contentWidth > clientWidthWithVerticalScrollbar && this.contentHeight > clientHeightWithoutHorizontalScrollbar);
      verticalScrollbarVisible = !this.model.isMini() && (this.contentHeight > clientHeightWithoutHorizontalScrollbar || this.contentHeight > clientHeightWithHorizontalScrollbar && this.contentWidth > clientWidthWithoutVerticalScrollbar);
      horizontalScrollbarHeight = horizontalScrollbarVisible ? this.measuredHorizontalScrollbarHeight : 0;
      verticalScrollbarWidth = verticalScrollbarVisible ? this.measuredVerticalScrollbarWidth : 0;
      if (this.horizontalScrollbarHeight !== horizontalScrollbarHeight) {
        this.horizontalScrollbarHeight = horizontalScrollbarHeight;
        this.updateClientHeight();
      }
      if (this.verticalScrollbarWidth !== verticalScrollbarWidth) {
        this.verticalScrollbarWidth = verticalScrollbarWidth;
        return this.updateClientWidth();
      }
    };

    TextEditorPresenter.prototype.lineDecorationClassesForRow = function(row) {
      var decoration, decorationClasses, id, _ref2;
      if (this.model.isMini()) {
        return null;
      }
      decorationClasses = null;
      _ref2 = this.lineDecorationsByScreenRow[row];
      for (id in _ref2) {
        decoration = _ref2[id];
        if (decorationClasses == null) {
          decorationClasses = [];
        }
        decorationClasses.push(decoration.getProperties()["class"]);
      }
      return decorationClasses;
    };

    TextEditorPresenter.prototype.lineNumberDecorationClassesForRow = function(row) {
      var decoration, decorationClasses, id, _ref2;
      if (this.model.isMini()) {
        return null;
      }
      decorationClasses = null;
      _ref2 = this.lineNumberDecorationsByScreenRow[row];
      for (id in _ref2) {
        decoration = _ref2[id];
        if (decorationClasses == null) {
          decorationClasses = [];
        }
        decorationClasses.push(decoration.getProperties()["class"]);
      }
      return decorationClasses;
    };

    TextEditorPresenter.prototype.getCursorBlinkPeriod = function() {
      return this.cursorBlinkPeriod;
    };

    TextEditorPresenter.prototype.getCursorBlinkResumeDelay = function() {
      return this.cursorBlinkResumeDelay;
    };

    TextEditorPresenter.prototype.setFocused = function(focused) {
      if (this.focused !== focused) {
        this.focused = focused;
        if (this.focused) {
          this.startBlinkingCursors();
        } else {
          this.stopBlinkingCursors(false);
        }
        this.updateFocusedState();
        return this.updateHiddenInputState();
      }
    };

    TextEditorPresenter.prototype.setScrollTop = function(scrollTop) {
      scrollTop = this.constrainScrollTop(scrollTop);
      if (!(this.scrollTop === scrollTop || Number.isNaN(scrollTop))) {
        this.scrollTop = scrollTop;
        this.model.setScrollTop(scrollTop);
        this.updateStartRow();
        this.updateEndRow();
        this.didStartScrolling();
        this.updateVerticalScrollState();
        this.updateHiddenInputState();
        this.updateDecorations();
        this.updateLinesState();
        this.updateCursorsState();
        this.updateLineNumbersState();
        return this.updateOverlaysState();
      }
    };

    TextEditorPresenter.prototype.didStartScrolling = function() {
      if (this.stoppedScrollingTimeoutId != null) {
        clearTimeout(this.stoppedScrollingTimeoutId);
        this.stoppedScrollingTimeoutId = null;
      }
      this.stoppedScrollingTimeoutId = setTimeout(this.didStopScrolling.bind(this), this.stoppedScrollingDelay);
      this.state.content.scrollingVertically = true;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.didStopScrolling = function() {
      this.state.content.scrollingVertically = false;
      if (this.mouseWheelScreenRow != null) {
        this.mouseWheelScreenRow = null;
        this.updateLinesState();
        return this.updateLineNumbersState();
      } else {
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.setScrollLeft = function(scrollLeft) {
      var oldScrollLeft;
      scrollLeft = this.constrainScrollLeft(scrollLeft);
      if (!(this.scrollLeft === scrollLeft || Number.isNaN(scrollLeft))) {
        oldScrollLeft = this.scrollLeft;
        this.scrollLeft = scrollLeft;
        this.model.setScrollLeft(scrollLeft);
        this.updateHorizontalScrollState();
        this.updateHiddenInputState();
        if (oldScrollLeft == null) {
          this.updateCursorsState();
        }
        return this.updateOverlaysState();
      }
    };

    TextEditorPresenter.prototype.setHorizontalScrollbarHeight = function(horizontalScrollbarHeight) {
      var oldHorizontalScrollbarHeight;
      if (this.measuredHorizontalScrollbarHeight !== horizontalScrollbarHeight) {
        oldHorizontalScrollbarHeight = this.measuredHorizontalScrollbarHeight;
        this.measuredHorizontalScrollbarHeight = horizontalScrollbarHeight;
        this.model.setHorizontalScrollbarHeight(horizontalScrollbarHeight);
        this.updateScrollbarDimensions();
        this.updateScrollbarsState();
        this.updateVerticalScrollState();
        this.updateHorizontalScrollState();
        if (oldHorizontalScrollbarHeight == null) {
          return this.updateCursorsState();
        }
      }
    };

    TextEditorPresenter.prototype.setVerticalScrollbarWidth = function(verticalScrollbarWidth) {
      var oldVerticalScrollbarWidth;
      if (this.measuredVerticalScrollbarWidth !== verticalScrollbarWidth) {
        oldVerticalScrollbarWidth = this.measuredVerticalScrollbarWidth;
        this.measuredVerticalScrollbarWidth = verticalScrollbarWidth;
        this.model.setVerticalScrollbarWidth(verticalScrollbarWidth);
        this.updateScrollbarDimensions();
        this.updateScrollbarsState();
        this.updateVerticalScrollState();
        this.updateHorizontalScrollState();
        if (oldVerticalScrollbarWidth == null) {
          return this.updateCursorsState();
        }
      }
    };

    TextEditorPresenter.prototype.setAutoHeight = function(autoHeight) {
      if (this.autoHeight !== autoHeight) {
        this.autoHeight = autoHeight;
        return this.updateHeightState();
      }
    };

    TextEditorPresenter.prototype.setExplicitHeight = function(explicitHeight) {
      if (this.explicitHeight !== explicitHeight) {
        this.explicitHeight = explicitHeight;
        this.model.setHeight(explicitHeight);
        this.updateHeight();
        this.updateVerticalScrollState();
        this.updateScrollbarsState();
        this.updateDecorations();
        this.updateLinesState();
        this.updateCursorsState();
        return this.updateLineNumbersState();
      }
    };

    TextEditorPresenter.prototype.updateHeight = function() {
      var height, _ref2;
      height = (_ref2 = this.explicitHeight) != null ? _ref2 : this.contentHeight;
      if (this.height !== height) {
        this.height = height;
        this.updateScrollbarDimensions();
        this.updateClientHeight();
        this.updateScrollHeight();
        return this.updateEndRow();
      }
    };

    TextEditorPresenter.prototype.setContentFrameWidth = function(contentFrameWidth) {
      var oldContentFrameWidth;
      if (this.contentFrameWidth !== contentFrameWidth) {
        oldContentFrameWidth = this.contentFrameWidth;
        this.contentFrameWidth = contentFrameWidth;
        this.model.setWidth(contentFrameWidth);
        this.updateScrollbarDimensions();
        this.updateClientWidth();
        this.updateVerticalScrollState();
        this.updateHorizontalScrollState();
        this.updateScrollbarsState();
        this.updateContentState();
        this.updateDecorations();
        this.updateLinesState();
        if (oldContentFrameWidth == null) {
          return this.updateCursorsState();
        }
      }
    };

    TextEditorPresenter.prototype.setBoundingClientRect = function(boundingClientRect) {
      if (!this.clientRectsEqual(this.boundingClientRect, boundingClientRect)) {
        this.boundingClientRect = boundingClientRect;
        return this.updateOverlaysState();
      }
    };

    TextEditorPresenter.prototype.clientRectsEqual = function(clientRectA, clientRectB) {
      return (clientRectA != null) && (clientRectB != null) && clientRectA.top === clientRectB.top && clientRectA.left === clientRectB.left && clientRectA.width === clientRectB.width && clientRectA.height === clientRectB.height;
    };

    TextEditorPresenter.prototype.setWindowSize = function(width, height) {
      if (this.windowWidth !== width || this.windowHeight !== height) {
        this.windowWidth = width;
        this.windowHeight = height;
        return this.updateOverlaysState();
      }
    };

    TextEditorPresenter.prototype.setBackgroundColor = function(backgroundColor) {
      if (this.backgroundColor !== backgroundColor) {
        this.backgroundColor = backgroundColor;
        this.updateContentState();
        return this.updateGutterState();
      }
    };

    TextEditorPresenter.prototype.setGutterBackgroundColor = function(gutterBackgroundColor) {
      if (this.gutterBackgroundColor !== gutterBackgroundColor) {
        this.gutterBackgroundColor = gutterBackgroundColor;
        return this.updateGutterState();
      }
    };

    TextEditorPresenter.prototype.setLineHeight = function(lineHeight) {
      if (this.lineHeight !== lineHeight) {
        this.lineHeight = lineHeight;
        this.model.setLineHeightInPixels(lineHeight);
        this.updateContentDimensions();
        this.updateScrollHeight();
        this.updateHeight();
        this.updateStartRow();
        this.updateEndRow();
        this.updateHeightState();
        this.updateHorizontalScrollState();
        this.updateVerticalScrollState();
        this.updateScrollbarsState();
        this.updateHiddenInputState();
        this.updateDecorations();
        this.updateLinesState();
        this.updateCursorsState();
        this.updateLineNumbersState();
        return this.updateOverlaysState();
      }
    };

    TextEditorPresenter.prototype.setMouseWheelScreenRow = function(mouseWheelScreenRow) {
      if (this.mouseWheelScreenRow !== mouseWheelScreenRow) {
        this.mouseWheelScreenRow = mouseWheelScreenRow;
        return this.didStartScrolling();
      }
    };

    TextEditorPresenter.prototype.setBaseCharacterWidth = function(baseCharacterWidth) {
      if (this.baseCharacterWidth !== baseCharacterWidth) {
        this.baseCharacterWidth = baseCharacterWidth;
        this.model.setDefaultCharWidth(baseCharacterWidth);
        return this.characterWidthsChanged();
      }
    };

    TextEditorPresenter.prototype.getScopedCharacterWidth = function(scopeNames, char) {
      return this.getScopedCharacterWidths(scopeNames)[char];
    };

    TextEditorPresenter.prototype.getScopedCharacterWidths = function(scopeNames) {
      var scope, scopeName, _i, _len;
      scope = this.characterWidthsByScope;
      for (_i = 0, _len = scopeNames.length; _i < _len; _i++) {
        scopeName = scopeNames[_i];
        if (scope[scopeName] == null) {
          scope[scopeName] = {};
        }
        scope = scope[scopeName];
      }
      if (scope.characterWidths == null) {
        scope.characterWidths = {};
      }
      return scope.characterWidths;
    };

    TextEditorPresenter.prototype.batchCharacterMeasurement = function(fn) {
      var oldChangeCount;
      oldChangeCount = this.scopedCharacterWidthsChangeCount;
      this.batchingCharacterMeasurement = true;
      this.model.batchCharacterMeasurement(fn);
      this.batchingCharacterMeasurement = false;
      if (oldChangeCount !== this.scopedCharacterWidthsChangeCount) {
        return this.characterWidthsChanged();
      }
    };

    TextEditorPresenter.prototype.setScopedCharacterWidth = function(scopeNames, character, width) {
      this.getScopedCharacterWidths(scopeNames)[character] = width;
      this.model.setScopedCharWidth(scopeNames, character, width);
      this.scopedCharacterWidthsChangeCount++;
      if (!this.batchingCharacterMeasurement) {
        return this.characterWidthsChanged();
      }
    };

    TextEditorPresenter.prototype.characterWidthsChanged = function() {
      this.updateContentDimensions();
      this.updateHorizontalScrollState();
      this.updateVerticalScrollState();
      this.updateScrollbarsState();
      this.updateHiddenInputState();
      this.updateContentState();
      this.updateDecorations();
      this.updateLinesState();
      this.updateCursorsState();
      return this.updateOverlaysState();
    };

    TextEditorPresenter.prototype.clearScopedCharacterWidths = function() {
      this.characterWidthsByScope = {};
      return this.model.clearScopedCharWidths();
    };

    TextEditorPresenter.prototype.hasPixelPositionRequirements = function() {
      return (this.lineHeight != null) && (this.baseCharacterWidth != null);
    };

    TextEditorPresenter.prototype.pixelPositionForScreenPosition = function(screenPosition, clip) {
      var baseCharacterWidth, char, charLength, characterWidths, column, left, targetColumn, targetRow, token, top, valueIndex, _i, _len, _ref2, _ref3;
      if (clip == null) {
        clip = true;
      }
      screenPosition = Point.fromObject(screenPosition);
      if (clip) {
        screenPosition = this.model.clipScreenPosition(screenPosition);
      }
      targetRow = screenPosition.row;
      targetColumn = screenPosition.column;
      baseCharacterWidth = this.baseCharacterWidth;
      top = targetRow * this.lineHeight;
      left = 0;
      column = 0;
      _ref2 = this.model.tokenizedLineForScreenRow(targetRow).tokens;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        token = _ref2[_i];
        characterWidths = this.getScopedCharacterWidths(token.scopes);
        valueIndex = 0;
        while (valueIndex < token.value.length) {
          if (token.hasPairedCharacter) {
            char = token.value.substr(valueIndex, 2);
            charLength = 2;
            valueIndex += 2;
          } else {
            char = token.value[valueIndex];
            charLength = 1;
            valueIndex++;
          }
          if (column === targetColumn) {
            return {
              top: top,
              left: left
            };
          }
          if (char !== '\0') {
            left += (_ref3 = characterWidths[char]) != null ? _ref3 : baseCharacterWidth;
          }
          column += charLength;
        }
      }
      return {
        top: top,
        left: left
      };
    };

    TextEditorPresenter.prototype.hasPixelRectRequirements = function() {
      return this.hasPixelPositionRequirements() && (this.scrollWidth != null);
    };

    TextEditorPresenter.prototype.hasOverlayPositionRequirements = function() {
      return this.hasPixelRectRequirements() && (this.boundingClientRect != null) && this.windowWidth && this.windowHeight;
    };

    TextEditorPresenter.prototype.pixelRectForScreenRange = function(screenRange) {
      var height, left, top, width, _ref2;
      if (screenRange.end.row > screenRange.start.row) {
        top = this.pixelPositionForScreenPosition(screenRange.start).top;
        left = 0;
        height = (screenRange.end.row - screenRange.start.row + 1) * this.lineHeight;
        width = this.scrollWidth;
      } else {
        _ref2 = this.pixelPositionForScreenPosition(screenRange.start, false), top = _ref2.top, left = _ref2.left;
        height = this.lineHeight;
        width = this.pixelPositionForScreenPosition(screenRange.end, false).left - left;
      }
      return {
        top: top,
        left: left,
        width: width,
        height: height
      };
    };

    TextEditorPresenter.prototype.observeDecoration = function(decoration) {
      var decorationDisposables;
      decorationDisposables = new CompositeDisposable;
      decorationDisposables.add(decoration.getMarker().onDidChange(this.decorationMarkerDidChange.bind(this, decoration)));
      if (decoration.isType('highlight')) {
        decorationDisposables.add(decoration.onDidChangeProperties(this.updateHighlightState.bind(this, decoration)));
        decorationDisposables.add(decoration.onDidFlash(this.highlightDidFlash.bind(this, decoration)));
      }
      decorationDisposables.add(decoration.onDidDestroy((function(_this) {
        return function() {
          _this.disposables.remove(decorationDisposables);
          decorationDisposables.dispose();
          return _this.didDestroyDecoration(decoration);
        };
      })(this)));
      return this.disposables.add(decorationDisposables);
    };

    TextEditorPresenter.prototype.decorationMarkerDidChange = function(decoration, change) {
      var intersectsVisibleRowRange, newRange, oldRange;
      if (decoration.isType('line') || decoration.isType('line-number')) {
        if (change.textChanged) {
          return;
        }
        intersectsVisibleRowRange = false;
        oldRange = new Range(change.oldTailScreenPosition, change.oldHeadScreenPosition);
        newRange = new Range(change.newTailScreenPosition, change.newHeadScreenPosition);
        if (oldRange.intersectsRowRange(this.startRow, this.endRow - 1)) {
          this.removeFromLineDecorationCaches(decoration, oldRange);
          intersectsVisibleRowRange = true;
        }
        if (newRange.intersectsRowRange(this.startRow, this.endRow - 1)) {
          this.addToLineDecorationCaches(decoration, newRange);
          intersectsVisibleRowRange = true;
        }
        if (intersectsVisibleRowRange) {
          if (decoration.isType('line')) {
            this.updateLinesState();
          }
          if (decoration.isType('line-number')) {
            this.updateLineNumbersState();
          }
        }
      }
      if (decoration.isType('highlight')) {
        if (change.textChanged) {
          return;
        }
        this.updateHighlightState(decoration);
      }
      if (decoration.isType('overlay')) {
        return this.updateOverlaysState();
      }
    };

    TextEditorPresenter.prototype.didDestroyDecoration = function(decoration) {
      if (decoration.isType('line') || decoration.isType('line-number')) {
        this.removeFromLineDecorationCaches(decoration, decoration.getMarker().getScreenRange());
        if (decoration.isType('line')) {
          this.updateLinesState();
        }
        if (decoration.isType('line-number')) {
          this.updateLineNumbersState();
        }
      }
      if (decoration.isType('highlight')) {
        this.updateHighlightState(decoration);
      }
      if (decoration.isType('overlay')) {
        return this.updateOverlaysState();
      }
    };

    TextEditorPresenter.prototype.highlightDidFlash = function(decoration) {
      var decorationState, flash;
      flash = decoration.consumeNextFlash();
      if (decorationState = this.state.content.highlights[decoration.id]) {
        decorationState.flashCount++;
        decorationState.flashClass = flash["class"];
        decorationState.flashDuration = flash.duration;
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.didAddDecoration = function(decoration) {
      this.observeDecoration(decoration);
      if (decoration.isType('line') || decoration.isType('line-number')) {
        this.addToLineDecorationCaches(decoration, decoration.getMarker().getScreenRange());
        if (decoration.isType('line')) {
          this.updateLinesState();
        }
        if (decoration.isType('line-number')) {
          return this.updateLineNumbersState();
        }
      } else if (decoration.isType('highlight')) {
        return this.updateHighlightState(decoration);
      } else if (decoration.isType('overlay')) {
        return this.updateOverlaysState();
      }
    };

    TextEditorPresenter.prototype.updateDecorations = function() {
      return this.batch("shouldUpdateDecorations", function() {
        var decoration, decorations, id, markerId, range, visibleHighlights, _i, _len, _ref2, _ref3, _ref4;
        this.lineDecorationsByScreenRow = {};
        this.lineNumberDecorationsByScreenRow = {};
        this.highlightDecorationsById = {};
        visibleHighlights = {};
        if (!(((0 <= (_ref3 = this.startRow) && _ref3 <= (_ref2 = this.endRow)) && _ref2 <= Infinity))) {
          return;
        }
        _ref4 = this.model.decorationsForScreenRowRange(this.startRow, this.endRow - 1);
        for (markerId in _ref4) {
          decorations = _ref4[markerId];
          range = this.model.getMarker(markerId).getScreenRange();
          for (_i = 0, _len = decorations.length; _i < _len; _i++) {
            decoration = decorations[_i];
            if (decoration.isType('line') || decoration.isType('line-number')) {
              this.addToLineDecorationCaches(decoration, range);
            } else if (decoration.isType('highlight')) {
              visibleHighlights[decoration.id] = this.updateHighlightState(decoration);
            }
          }
        }
        for (id in this.state.content.highlights) {
          if (!visibleHighlights[id]) {
            delete this.state.content.highlights[id];
          }
        }
      });
    };

    TextEditorPresenter.prototype.removeFromLineDecorationCaches = function(decoration, range) {
      var row, _i, _ref2, _ref3, _ref4, _ref5;
      for (row = _i = _ref2 = range.start.row, _ref3 = range.end.row; _i <= _ref3; row = _i += 1) {
        if ((_ref4 = this.lineDecorationsByScreenRow[row]) != null) {
          delete _ref4[decoration.id];
        }
        if ((_ref5 = this.lineNumberDecorationsByScreenRow[row]) != null) {
          delete _ref5[decoration.id];
        }
      }
    };

    TextEditorPresenter.prototype.addToLineDecorationCaches = function(decoration, range) {
      var marker, omitLastRow, properties, row, _base, _base1, _i, _ref2, _ref3;
      marker = decoration.getMarker();
      properties = decoration.getProperties();
      if (!marker.isValid()) {
        return;
      }
      if (range.isEmpty()) {
        if (properties.onlyNonEmpty) {
          return;
        }
      } else {
        if (properties.onlyEmpty) {
          return;
        }
        omitLastRow = range.end.column === 0;
      }
      for (row = _i = _ref2 = range.start.row, _ref3 = range.end.row; _i <= _ref3; row = _i += 1) {
        if (properties.onlyHead && row !== marker.getHeadScreenPosition().row) {
          continue;
        }
        if (omitLastRow && row === range.end.row) {
          continue;
        }
        if (decoration.isType('line')) {
          if ((_base = this.lineDecorationsByScreenRow)[row] == null) {
            _base[row] = {};
          }
          this.lineDecorationsByScreenRow[row][decoration.id] = decoration;
        }
        if (decoration.isType('line-number')) {
          if ((_base1 = this.lineNumberDecorationsByScreenRow)[row] == null) {
            _base1[row] = {};
          }
          this.lineNumberDecorationsByScreenRow[row][decoration.id] = decoration;
        }
      }
    };

    TextEditorPresenter.prototype.updateHighlightState = function(decoration) {
      var highlightState, marker, properties, range, _base, _name;
      if (!((this.startRow != null) && (this.endRow != null) && (this.lineHeight != null) && this.hasPixelPositionRequirements())) {
        return;
      }
      properties = decoration.getProperties();
      marker = decoration.getMarker();
      range = marker.getScreenRange();
      if (decoration.isDestroyed() || !marker.isValid() || range.isEmpty() || !range.intersectsRowRange(this.startRow, this.endRow - 1)) {
        delete this.state.content.highlights[decoration.id];
        this.emitDidUpdateState();
        return;
      }
      if (range.start.row < this.startRow) {
        range.start.row = this.startRow;
        range.start.column = 0;
      }
      if (range.end.row >= this.endRow) {
        range.end.row = this.endRow;
        range.end.column = 0;
      }
      if (range.isEmpty()) {
        delete this.state.content.highlights[decoration.id];
        this.emitDidUpdateState();
        return;
      }
      highlightState = (_base = this.state.content.highlights)[_name = decoration.id] != null ? _base[_name] : _base[_name] = {
        flashCount: 0,
        flashDuration: null,
        flashClass: null
      };
      highlightState["class"] = properties["class"];
      highlightState.deprecatedRegionClass = properties.deprecatedRegionClass;
      highlightState.regions = this.buildHighlightRegions(range);
      this.emitDidUpdateState();
      return true;
    };

    TextEditorPresenter.prototype.buildHighlightRegions = function(screenRange) {
      var endPixelPosition, lineHeightInPixels, regions, spannedRows, startPixelPosition;
      lineHeightInPixels = this.lineHeight;
      startPixelPosition = this.pixelPositionForScreenPosition(screenRange.start, true);
      endPixelPosition = this.pixelPositionForScreenPosition(screenRange.end, true);
      spannedRows = screenRange.end.row - screenRange.start.row + 1;
      if (spannedRows === 1) {
        return [
          {
            top: startPixelPosition.top,
            height: lineHeightInPixels,
            left: startPixelPosition.left,
            width: endPixelPosition.left - startPixelPosition.left
          }
        ];
      } else {
        regions = [];
        regions.push({
          top: startPixelPosition.top,
          left: startPixelPosition.left,
          height: lineHeightInPixels,
          right: 0
        });
        if (spannedRows > 2) {
          regions.push({
            top: startPixelPosition.top + lineHeightInPixels,
            height: endPixelPosition.top - startPixelPosition.top - lineHeightInPixels,
            left: 0,
            right: 0
          });
        }
        if (screenRange.end.column > 0) {
          regions.push({
            top: endPixelPosition.top,
            height: lineHeightInPixels,
            left: 0,
            width: endPixelPosition.left
          });
        }
        return regions;
      }
    };

    TextEditorPresenter.prototype.setOverlayDimensions = function(decorationId, itemWidth, itemHeight, contentMargin) {
      var dimensionsAreEqual, overlayState, _base;
      if ((_base = this.overlayDimensions)[decorationId] == null) {
        _base[decorationId] = {};
      }
      overlayState = this.overlayDimensions[decorationId];
      dimensionsAreEqual = overlayState.itemWidth === itemWidth && overlayState.itemHeight === itemHeight && overlayState.contentMargin === contentMargin;
      if (!dimensionsAreEqual) {
        overlayState.itemWidth = itemWidth;
        overlayState.itemHeight = itemHeight;
        overlayState.contentMargin = contentMargin;
        return this.updateOverlaysState();
      }
    };

    TextEditorPresenter.prototype.observeCursor = function(cursor) {
      var didChangePositionDisposable, didChangeVisibilityDisposable, didDestroyDisposable;
      didChangePositionDisposable = cursor.onDidChangePosition((function(_this) {
        return function() {
          if (cursor.isLastCursor()) {
            _this.updateHiddenInputState();
          }
          _this.pauseCursorBlinking();
          return _this.updateCursorState(cursor);
        };
      })(this));
      didChangeVisibilityDisposable = cursor.onDidChangeVisibility((function(_this) {
        return function() {
          return _this.updateCursorState(cursor);
        };
      })(this));
      didDestroyDisposable = cursor.onDidDestroy((function(_this) {
        return function() {
          _this.disposables.remove(didChangePositionDisposable);
          _this.disposables.remove(didChangeVisibilityDisposable);
          _this.disposables.remove(didDestroyDisposable);
          _this.updateHiddenInputState();
          return _this.updateCursorState(cursor, true);
        };
      })(this));
      this.disposables.add(didChangePositionDisposable);
      this.disposables.add(didChangeVisibilityDisposable);
      return this.disposables.add(didDestroyDisposable);
    };

    TextEditorPresenter.prototype.didAddCursor = function(cursor) {
      this.observeCursor(cursor);
      this.updateHiddenInputState();
      this.pauseCursorBlinking();
      return this.updateCursorState(cursor);
    };

    TextEditorPresenter.prototype.startBlinkingCursors = function() {
      if (!this.toggleCursorBlinkHandle) {
        this.state.content.cursorsVisible = true;
        return this.toggleCursorBlinkHandle = setInterval(this.toggleCursorBlink.bind(this), this.getCursorBlinkPeriod() / 2);
      }
    };

    TextEditorPresenter.prototype.stopBlinkingCursors = function(visible) {
      if (this.toggleCursorBlinkHandle) {
        this.state.content.cursorsVisible = visible;
        clearInterval(this.toggleCursorBlinkHandle);
        return this.toggleCursorBlinkHandle = null;
      }
    };

    TextEditorPresenter.prototype.toggleCursorBlink = function() {
      this.state.content.cursorsVisible = !this.state.content.cursorsVisible;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.pauseCursorBlinking = function() {
      this.stopBlinkingCursors(true);
      if (this.startBlinkingCursorsAfterDelay == null) {
        this.startBlinkingCursorsAfterDelay = _.debounce(this.startBlinkingCursors, this.getCursorBlinkResumeDelay());
      }
      this.startBlinkingCursorsAfterDelay();
      return this.emitDidUpdateState();
    };

    return TextEditorPresenter;

  })();

}).call(this);

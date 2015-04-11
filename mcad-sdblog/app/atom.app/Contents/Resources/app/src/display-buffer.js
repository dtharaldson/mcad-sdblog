(function() {
  var BufferToScreenConversionError, CompositeDisposable, Decoration, DisplayBuffer, Emitter, EmitterMixin, Fold, Grim, Marker, Model, Point, Range, RowMap, Serializable, Token, TokenizedBuffer, _, _ref, _ref1,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __slice = [].slice;

  _ = require('underscore-plus');

  Serializable = require('serializable');

  _ref = require('event-kit'), CompositeDisposable = _ref.CompositeDisposable, Emitter = _ref.Emitter;

  _ref1 = require('text-buffer'), Point = _ref1.Point, Range = _ref1.Range;

  TokenizedBuffer = require('./tokenized-buffer');

  RowMap = require('./row-map');

  Fold = require('./fold');

  Model = require('./model');

  Token = require('./token');

  Decoration = require('./decoration');

  Marker = require('./marker');

  Grim = require('grim');

  BufferToScreenConversionError = (function(_super) {
    __extends(BufferToScreenConversionError, _super);

    function BufferToScreenConversionError(message, metadata) {
      this.message = message;
      this.metadata = metadata;
      BufferToScreenConversionError.__super__.constructor.apply(this, arguments);
      Error.captureStackTrace(this, BufferToScreenConversionError);
    }

    return BufferToScreenConversionError;

  })(Error);

  module.exports = DisplayBuffer = (function(_super) {
    __extends(DisplayBuffer, _super);

    Serializable.includeInto(DisplayBuffer);

    DisplayBuffer.prototype.verticalScrollMargin = 2;

    DisplayBuffer.prototype.horizontalScrollMargin = 6;

    DisplayBuffer.prototype.scopedCharacterWidthsChangeCount = 0;

    function DisplayBuffer(_arg) {
      var buffer, marker, tabLength, _i, _len, _ref2, _ref3;
      _ref2 = _arg != null ? _arg : {}, tabLength = _ref2.tabLength, this.editorWidthInChars = _ref2.editorWidthInChars, this.tokenizedBuffer = _ref2.tokenizedBuffer, buffer = _ref2.buffer, this.invisibles = _ref2.invisibles;
      this.handleBufferMarkerCreated = __bind(this.handleBufferMarkerCreated, this);
      this.handleBufferMarkersUpdated = __bind(this.handleBufferMarkersUpdated, this);
      this.handleTokenizedBufferChange = __bind(this.handleTokenizedBufferChange, this);
      this.subscribeToScopedConfigSettings = __bind(this.subscribeToScopedConfigSettings, this);
      DisplayBuffer.__super__.constructor.apply(this, arguments);
      this.emitter = new Emitter;
      this.disposables = new CompositeDisposable;
      if (this.tokenizedBuffer == null) {
        this.tokenizedBuffer = new TokenizedBuffer({
          tabLength: tabLength,
          buffer: buffer,
          invisibles: this.invisibles
        });
      }
      this.buffer = this.tokenizedBuffer.buffer;
      this.charWidthsByScope = {};
      this.markers = {};
      this.foldsByMarkerId = {};
      this.decorationsById = {};
      this.decorationsByMarkerId = {};
      this.disposables.add(this.tokenizedBuffer.observeGrammar(this.subscribeToScopedConfigSettings));
      this.disposables.add(this.tokenizedBuffer.onDidChange(this.handleTokenizedBufferChange));
      this.disposables.add(this.buffer.onDidUpdateMarkers(this.handleBufferMarkersUpdated));
      this.disposables.add(this.buffer.onDidCreateMarker(this.handleBufferMarkerCreated));
      this.updateAllScreenLines();
      _ref3 = this.buffer.findMarkers(this.getFoldMarkerAttributes());
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        marker = _ref3[_i];
        this.createFoldForMarker(marker);
      }
    }

    DisplayBuffer.prototype.subscribeToScopedConfigSettings = function() {
      var oldConfigSettings, scopeDescriptor, subscriptions, _ref2;
      if ((_ref2 = this.scopedConfigSubscriptions) != null) {
        _ref2.dispose();
      }
      this.scopedConfigSubscriptions = subscriptions = new CompositeDisposable;
      scopeDescriptor = this.getRootScopeDescriptor();
      oldConfigSettings = this.configSettings;
      this.configSettings = {
        scrollPastEnd: atom.config.get('editor.scrollPastEnd', {
          scope: scopeDescriptor
        }),
        softWrap: atom.config.get('editor.softWrap', {
          scope: scopeDescriptor
        }),
        softWrapAtPreferredLineLength: atom.config.get('editor.softWrapAtPreferredLineLength', {
          scope: scopeDescriptor
        }),
        softWrapHangingIndent: atom.config.get('editor.softWrapHangingIndent', {
          scope: scopeDescriptor
        }),
        preferredLineLength: atom.config.get('editor.preferredLineLength', {
          scope: scopeDescriptor
        })
      };
      subscriptions.add(atom.config.onDidChange('editor.softWrap', {
        scope: scopeDescriptor
      }, (function(_this) {
        return function(_arg) {
          var newValue;
          newValue = _arg.newValue;
          _this.configSettings.softWrap = newValue;
          return _this.updateWrappedScreenLines();
        };
      })(this)));
      subscriptions.add(atom.config.onDidChange('editor.softWrapHangingIndent', {
        scope: scopeDescriptor
      }, (function(_this) {
        return function(_arg) {
          var newValue;
          newValue = _arg.newValue;
          _this.configSettings.softWrapHangingIndent = newValue;
          return _this.updateWrappedScreenLines();
        };
      })(this)));
      subscriptions.add(atom.config.onDidChange('editor.softWrapAtPreferredLineLength', {
        scope: scopeDescriptor
      }, (function(_this) {
        return function(_arg) {
          var newValue;
          newValue = _arg.newValue;
          _this.configSettings.softWrapAtPreferredLineLength = newValue;
          if (_this.isSoftWrapped()) {
            return _this.updateWrappedScreenLines();
          }
        };
      })(this)));
      subscriptions.add(atom.config.onDidChange('editor.preferredLineLength', {
        scope: scopeDescriptor
      }, (function(_this) {
        return function(_arg) {
          var newValue;
          newValue = _arg.newValue;
          _this.configSettings.preferredLineLength = newValue;
          if (_this.isSoftWrapped() && atom.config.get('editor.softWrapAtPreferredLineLength', {
            scope: scopeDescriptor
          })) {
            return _this.updateWrappedScreenLines();
          }
        };
      })(this)));
      subscriptions.add(atom.config.observe('editor.scrollPastEnd', {
        scope: scopeDescriptor
      }, (function(_this) {
        return function(value) {
          return _this.configSettings.scrollPastEnd = value;
        };
      })(this)));
      if ((oldConfigSettings != null) && !_.isEqual(oldConfigSettings, this.configSettings)) {
        return this.updateWrappedScreenLines();
      }
    };

    DisplayBuffer.prototype.serializeParams = function() {
      return {
        id: this.id,
        softWrapped: this.isSoftWrapped(),
        editorWidthInChars: this.editorWidthInChars,
        scrollTop: this.scrollTop,
        scrollLeft: this.scrollLeft,
        tokenizedBuffer: this.tokenizedBuffer.serialize(),
        invisibles: _.clone(this.invisibles)
      };
    };

    DisplayBuffer.prototype.deserializeParams = function(params) {
      params.tokenizedBuffer = TokenizedBuffer.deserialize(params.tokenizedBuffer);
      return params;
    };

    DisplayBuffer.prototype.copy = function() {
      var marker, newDisplayBuffer, _i, _len, _ref2;
      newDisplayBuffer = new DisplayBuffer({
        buffer: this.buffer,
        tabLength: this.getTabLength(),
        invisibles: this.invisibles
      });
      newDisplayBuffer.setScrollTop(this.getScrollTop());
      newDisplayBuffer.setScrollLeft(this.getScrollLeft());
      _ref2 = this.findMarkers({
        displayBufferId: this.id
      });
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        marker = _ref2[_i];
        marker.copy({
          displayBufferId: newDisplayBuffer.id
        });
      }
      return newDisplayBuffer;
    };

    DisplayBuffer.prototype.updateAllScreenLines = function() {
      this.maxLineLength = 0;
      this.screenLines = [];
      this.rowMap = new RowMap;
      return this.updateScreenLines(0, this.buffer.getLineCount(), null, {
        suppressChangeEvent: true
      });
    };

    DisplayBuffer.prototype.onDidChangeSoftWrapped = function(callback) {
      return this.emitter.on('did-change-soft-wrapped', callback);
    };

    DisplayBuffer.prototype.onDidChangeGrammar = function(callback) {
      return this.tokenizedBuffer.onDidChangeGrammar(callback);
    };

    DisplayBuffer.prototype.onDidTokenize = function(callback) {
      return this.tokenizedBuffer.onDidTokenize(callback);
    };

    DisplayBuffer.prototype.onDidChange = function(callback) {
      return this.emitter.on('did-change', callback);
    };

    DisplayBuffer.prototype.onDidChangeCharacterWidths = function(callback) {
      return this.emitter.on('did-change-character-widths', callback);
    };

    DisplayBuffer.prototype.onDidChangeScrollTop = function(callback) {
      return this.emitter.on('did-change-scroll-top', callback);
    };

    DisplayBuffer.prototype.onDidChangeScrollLeft = function(callback) {
      return this.emitter.on('did-change-scroll-left', callback);
    };

    DisplayBuffer.prototype.observeScrollTop = function(callback) {
      callback(this.scrollTop);
      return this.onDidChangeScrollTop(callback);
    };

    DisplayBuffer.prototype.observeScrollLeft = function(callback) {
      callback(this.scrollLeft);
      return this.onDidChangeScrollLeft(callback);
    };

    DisplayBuffer.prototype.observeDecorations = function(callback) {
      var decoration, _i, _len, _ref2;
      _ref2 = this.getDecorations();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        decoration = _ref2[_i];
        callback(decoration);
      }
      return this.onDidAddDecoration(callback);
    };

    DisplayBuffer.prototype.onDidAddDecoration = function(callback) {
      return this.emitter.on('did-add-decoration', callback);
    };

    DisplayBuffer.prototype.onDidRemoveDecoration = function(callback) {
      return this.emitter.on('did-remove-decoration', callback);
    };

    DisplayBuffer.prototype.onDidCreateMarker = function(callback) {
      return this.emitter.on('did-create-marker', callback);
    };

    DisplayBuffer.prototype.onDidUpdateMarkers = function(callback) {
      return this.emitter.on('did-update-markers', callback);
    };

    DisplayBuffer.prototype.emitDidChange = function(eventProperties, refreshMarkers) {
      if (refreshMarkers == null) {
        refreshMarkers = true;
      }
      if (refreshMarkers) {
        this.pauseMarkerChangeEvents();
        this.refreshMarkerScreenPositions();
      }
      if (Grim.includeDeprecatedAPIs) {
        this.emit('changed', eventProperties);
      }
      this.emitter.emit('did-change', eventProperties);
      return this.resumeMarkerChangeEvents();
    };

    DisplayBuffer.prototype.updateWrappedScreenLines = function() {
      var bufferDelta, end, screenDelta, start;
      start = 0;
      end = this.getLastRow();
      this.updateAllScreenLines();
      screenDelta = this.getLastRow() - end;
      bufferDelta = 0;
      return this.emitDidChange({
        start: start,
        end: end,
        screenDelta: screenDelta,
        bufferDelta: bufferDelta
      });
    };

    DisplayBuffer.prototype.setVisible = function(visible) {
      return this.tokenizedBuffer.setVisible(visible);
    };

    DisplayBuffer.prototype.getVerticalScrollMargin = function() {
      return Math.min(this.verticalScrollMargin, (this.getHeight() - this.getLineHeightInPixels()) / 2);
    };

    DisplayBuffer.prototype.setVerticalScrollMargin = function(verticalScrollMargin) {
      this.verticalScrollMargin = verticalScrollMargin;
      return this.verticalScrollMargin;
    };

    DisplayBuffer.prototype.getVerticalScrollMarginInPixels = function() {
      var maxScrollMarginInPixels, scrollMarginInPixels;
      scrollMarginInPixels = this.getVerticalScrollMargin() * this.getLineHeightInPixels();
      maxScrollMarginInPixels = (this.getHeight() - this.getLineHeightInPixels()) / 2;
      return Math.min(scrollMarginInPixels, maxScrollMarginInPixels);
    };

    DisplayBuffer.prototype.getHorizontalScrollMargin = function() {
      return Math.min(this.horizontalScrollMargin, (this.getWidth() - this.getDefaultCharWidth()) / 2);
    };

    DisplayBuffer.prototype.setHorizontalScrollMargin = function(horizontalScrollMargin) {
      this.horizontalScrollMargin = horizontalScrollMargin;
      return this.horizontalScrollMargin;
    };

    DisplayBuffer.prototype.getHorizontalScrollMarginInPixels = function() {
      var maxScrollMarginInPixels, scrollMarginInPixels;
      scrollMarginInPixels = this.getHorizontalScrollMargin() * this.getDefaultCharWidth();
      maxScrollMarginInPixels = (this.getWidth() - this.getDefaultCharWidth()) / 2;
      return Math.min(scrollMarginInPixels, maxScrollMarginInPixels);
    };

    DisplayBuffer.prototype.getHorizontalScrollbarHeight = function() {
      return this.horizontalScrollbarHeight;
    };

    DisplayBuffer.prototype.setHorizontalScrollbarHeight = function(horizontalScrollbarHeight) {
      this.horizontalScrollbarHeight = horizontalScrollbarHeight;
      return this.horizontalScrollbarHeight;
    };

    DisplayBuffer.prototype.getVerticalScrollbarWidth = function() {
      return this.verticalScrollbarWidth;
    };

    DisplayBuffer.prototype.setVerticalScrollbarWidth = function(verticalScrollbarWidth) {
      this.verticalScrollbarWidth = verticalScrollbarWidth;
      return this.verticalScrollbarWidth;
    };

    DisplayBuffer.prototype.getHeight = function() {
      if (this.height != null) {
        return this.height;
      } else {
        if (this.horizontallyScrollable()) {
          return this.getScrollHeight() + this.getHorizontalScrollbarHeight();
        } else {
          return this.getScrollHeight();
        }
      }
    };

    DisplayBuffer.prototype.setHeight = function(height) {
      this.height = height;
      return this.height;
    };

    DisplayBuffer.prototype.getClientHeight = function(reentrant) {
      if (this.horizontallyScrollable(reentrant)) {
        return this.getHeight() - this.getHorizontalScrollbarHeight();
      } else {
        return this.getHeight();
      }
    };

    DisplayBuffer.prototype.getClientWidth = function(reentrant) {
      if (this.verticallyScrollable(reentrant)) {
        return this.getWidth() - this.getVerticalScrollbarWidth();
      } else {
        return this.getWidth();
      }
    };

    DisplayBuffer.prototype.horizontallyScrollable = function(reentrant) {
      if (this.width == null) {
        return false;
      }
      if (this.isSoftWrapped()) {
        return false;
      }
      if (reentrant) {
        return this.getScrollWidth() > this.getWidth();
      } else {
        return this.getScrollWidth() > this.getClientWidth(true);
      }
    };

    DisplayBuffer.prototype.verticallyScrollable = function(reentrant) {
      if (this.height == null) {
        return false;
      }
      if (reentrant) {
        return this.getScrollHeight() > this.getHeight();
      } else {
        return this.getScrollHeight() > this.getClientHeight(true);
      }
    };

    DisplayBuffer.prototype.getWidth = function() {
      if (this.width != null) {
        return this.width;
      } else {
        if (this.verticallyScrollable()) {
          return this.getScrollWidth() + this.getVerticalScrollbarWidth();
        } else {
          return this.getScrollWidth();
        }
      }
    };

    DisplayBuffer.prototype.setWidth = function(newWidth) {
      var oldWidth;
      oldWidth = this.width;
      this.width = newWidth;
      if (newWidth !== oldWidth && this.isSoftWrapped()) {
        this.updateWrappedScreenLines();
      }
      this.setScrollTop(this.getScrollTop());
      return this.width;
    };

    DisplayBuffer.prototype.getScrollTop = function() {
      return this.scrollTop;
    };

    DisplayBuffer.prototype.setScrollTop = function(scrollTop) {
      scrollTop = Math.round(Math.max(0, Math.min(this.getMaxScrollTop(), scrollTop)));
      if (scrollTop !== this.scrollTop) {
        this.scrollTop = scrollTop;
        this.emitter.emit('did-change-scroll-top', this.scrollTop);
      }
      return this.scrollTop;
    };

    DisplayBuffer.prototype.getMaxScrollTop = function() {
      return this.getScrollHeight() - this.getClientHeight();
    };

    DisplayBuffer.prototype.getScrollBottom = function() {
      return this.scrollTop + this.getClientHeight();
    };

    DisplayBuffer.prototype.setScrollBottom = function(scrollBottom) {
      this.setScrollTop(scrollBottom - this.getClientHeight());
      return this.getScrollBottom();
    };

    DisplayBuffer.prototype.getScrollLeft = function() {
      return this.scrollLeft;
    };

    DisplayBuffer.prototype.setScrollLeft = function(scrollLeft) {
      scrollLeft = Math.round(Math.max(0, Math.min(this.getScrollWidth() - this.getClientWidth(), scrollLeft)));
      if (scrollLeft !== this.scrollLeft) {
        this.scrollLeft = scrollLeft;
        this.emitter.emit('did-change-scroll-left', this.scrollLeft);
      }
      return this.scrollLeft;
    };

    DisplayBuffer.prototype.getMaxScrollLeft = function() {
      return this.getScrollWidth() - this.getClientWidth();
    };

    DisplayBuffer.prototype.getScrollRight = function() {
      return this.scrollLeft + this.width;
    };

    DisplayBuffer.prototype.setScrollRight = function(scrollRight) {
      this.setScrollLeft(scrollRight - this.width);
      return this.getScrollRight();
    };

    DisplayBuffer.prototype.getLineHeightInPixels = function() {
      return this.lineHeightInPixels;
    };

    DisplayBuffer.prototype.setLineHeightInPixels = function(lineHeightInPixels) {
      this.lineHeightInPixels = lineHeightInPixels;
      return this.lineHeightInPixels;
    };

    DisplayBuffer.prototype.getDefaultCharWidth = function() {
      return this.defaultCharWidth;
    };

    DisplayBuffer.prototype.setDefaultCharWidth = function(defaultCharWidth) {
      if (defaultCharWidth !== this.defaultCharWidth) {
        this.defaultCharWidth = defaultCharWidth;
        this.computeScrollWidth();
      }
      return defaultCharWidth;
    };

    DisplayBuffer.prototype.getCursorWidth = function() {
      return 1;
    };

    DisplayBuffer.prototype.getScopedCharWidth = function(scopeNames, char) {
      return this.getScopedCharWidths(scopeNames)[char];
    };

    DisplayBuffer.prototype.getScopedCharWidths = function(scopeNames) {
      var scope, scopeName, _i, _len;
      scope = this.charWidthsByScope;
      for (_i = 0, _len = scopeNames.length; _i < _len; _i++) {
        scopeName = scopeNames[_i];
        if (scope[scopeName] == null) {
          scope[scopeName] = {};
        }
        scope = scope[scopeName];
      }
      if (scope.charWidths == null) {
        scope.charWidths = {};
      }
      return scope.charWidths;
    };

    DisplayBuffer.prototype.batchCharacterMeasurement = function(fn) {
      var oldChangeCount;
      oldChangeCount = this.scopedCharacterWidthsChangeCount;
      this.batchingCharacterMeasurement = true;
      fn();
      this.batchingCharacterMeasurement = false;
      if (oldChangeCount !== this.scopedCharacterWidthsChangeCount) {
        return this.characterWidthsChanged();
      }
    };

    DisplayBuffer.prototype.setScopedCharWidth = function(scopeNames, char, width) {
      this.getScopedCharWidths(scopeNames)[char] = width;
      this.scopedCharacterWidthsChangeCount++;
      if (!this.batchingCharacterMeasurement) {
        return this.characterWidthsChanged();
      }
    };

    DisplayBuffer.prototype.characterWidthsChanged = function() {
      this.computeScrollWidth();
      if (Grim.includeDeprecatedAPIs) {
        this.emit('character-widths-changed', this.scopedCharacterWidthsChangeCount);
      }
      return this.emitter.emit('did-change-character-widths', this.scopedCharacterWidthsChangeCount);
    };

    DisplayBuffer.prototype.clearScopedCharWidths = function() {
      return this.charWidthsByScope = {};
    };

    DisplayBuffer.prototype.getScrollHeight = function() {
      var lineHeight, scrollHeight;
      lineHeight = this.getLineHeightInPixels();
      if (!(lineHeight > 0)) {
        return 0;
      }
      scrollHeight = this.getLineCount() * lineHeight;
      if ((this.height != null) && this.configSettings.scrollPastEnd) {
        scrollHeight = scrollHeight + this.height - (lineHeight * 3);
      }
      return scrollHeight;
    };

    DisplayBuffer.prototype.getScrollWidth = function() {
      return this.scrollWidth;
    };

    DisplayBuffer.prototype.getVisibleRowRange = function() {
      var endRow, startRow;
      if (!(this.getLineHeightInPixels() > 0)) {
        return [0, 0];
      }
      startRow = Math.floor(this.getScrollTop() / this.getLineHeightInPixels());
      endRow = Math.ceil((this.getScrollTop() + this.getHeight()) / this.getLineHeightInPixels()) - 1;
      endRow = Math.min(this.getLineCount(), endRow);
      return [startRow, endRow];
    };

    DisplayBuffer.prototype.intersectsVisibleRowRange = function(startRow, endRow) {
      var visibleEnd, visibleStart, _ref2;
      _ref2 = this.getVisibleRowRange(), visibleStart = _ref2[0], visibleEnd = _ref2[1];
      return !(endRow <= visibleStart || visibleEnd <= startRow);
    };

    DisplayBuffer.prototype.selectionIntersectsVisibleRowRange = function(selection) {
      var end, start, _ref2;
      _ref2 = selection.getScreenRange(), start = _ref2.start, end = _ref2.end;
      return this.intersectsVisibleRowRange(start.row, end.row + 1);
    };

    DisplayBuffer.prototype.scrollToScreenRange = function(screenRange, options) {
      var bottom, desiredScrollBottom, desiredScrollCenter, desiredScrollLeft, desiredScrollRight, desiredScrollTop, endHeight, endLeft, endTop, horizontalScrollMarginInPixels, left, right, top, verticalScrollMarginInPixels, _ref2, _ref3, _ref4;
      verticalScrollMarginInPixels = this.getVerticalScrollMarginInPixels();
      horizontalScrollMarginInPixels = this.getHorizontalScrollMarginInPixels();
      _ref2 = this.pixelRectForScreenRange(new Range(screenRange.start, screenRange.start)), top = _ref2.top, left = _ref2.left;
      _ref3 = this.pixelRectForScreenRange(new Range(screenRange.end, screenRange.end)), endTop = _ref3.top, endLeft = _ref3.left, endHeight = _ref3.height;
      bottom = endTop + endHeight;
      right = endLeft;
      if (options != null ? options.center : void 0) {
        desiredScrollCenter = (top + bottom) / 2;
        if (!((this.getScrollTop() < desiredScrollCenter && desiredScrollCenter < this.getScrollBottom()))) {
          desiredScrollTop = desiredScrollCenter - this.getHeight() / 2;
          desiredScrollBottom = desiredScrollCenter + this.getHeight() / 2;
        }
      } else {
        desiredScrollTop = top - verticalScrollMarginInPixels;
        desiredScrollBottom = bottom + verticalScrollMarginInPixels;
      }
      desiredScrollLeft = left - horizontalScrollMarginInPixels;
      desiredScrollRight = right + horizontalScrollMarginInPixels;
      if ((_ref4 = options != null ? options.reversed : void 0) != null ? _ref4 : true) {
        if (desiredScrollBottom > this.getScrollBottom()) {
          this.setScrollBottom(desiredScrollBottom);
        }
        if (desiredScrollTop < this.getScrollTop()) {
          this.setScrollTop(desiredScrollTop);
        }
        if (desiredScrollRight > this.getScrollRight()) {
          this.setScrollRight(desiredScrollRight);
        }
        if (desiredScrollLeft < this.getScrollLeft()) {
          return this.setScrollLeft(desiredScrollLeft);
        }
      } else {
        if (desiredScrollTop < this.getScrollTop()) {
          this.setScrollTop(desiredScrollTop);
        }
        if (desiredScrollBottom > this.getScrollBottom()) {
          this.setScrollBottom(desiredScrollBottom);
        }
        if (desiredScrollLeft < this.getScrollLeft()) {
          this.setScrollLeft(desiredScrollLeft);
        }
        if (desiredScrollRight > this.getScrollRight()) {
          return this.setScrollRight(desiredScrollRight);
        }
      }
    };

    DisplayBuffer.prototype.scrollToScreenPosition = function(screenPosition, options) {
      return this.scrollToScreenRange(new Range(screenPosition, screenPosition), options);
    };

    DisplayBuffer.prototype.scrollToBufferPosition = function(bufferPosition, options) {
      return this.scrollToScreenPosition(this.screenPositionForBufferPosition(bufferPosition), options);
    };

    DisplayBuffer.prototype.pixelRectForScreenRange = function(screenRange) {
      var height, left, top, width, _ref2;
      if (screenRange.end.row > screenRange.start.row) {
        top = this.pixelPositionForScreenPosition(screenRange.start).top;
        left = 0;
        height = (screenRange.end.row - screenRange.start.row + 1) * this.getLineHeightInPixels();
        width = this.getScrollWidth();
      } else {
        _ref2 = this.pixelPositionForScreenPosition(screenRange.start, false), top = _ref2.top, left = _ref2.left;
        height = this.getLineHeightInPixels();
        width = this.pixelPositionForScreenPosition(screenRange.end, false).left - left;
      }
      return {
        top: top,
        left: left,
        width: width,
        height: height
      };
    };

    DisplayBuffer.prototype.getTabLength = function() {
      return this.tokenizedBuffer.getTabLength();
    };

    DisplayBuffer.prototype.setTabLength = function(tabLength) {
      return this.tokenizedBuffer.setTabLength(tabLength);
    };

    DisplayBuffer.prototype.setInvisibles = function(invisibles) {
      this.invisibles = invisibles;
      return this.tokenizedBuffer.setInvisibles(this.invisibles);
    };

    DisplayBuffer.prototype.setSoftWrapped = function(softWrapped) {
      if (softWrapped !== this.softWrapped) {
        this.softWrapped = softWrapped;
        this.updateWrappedScreenLines();
        softWrapped = this.isSoftWrapped();
        if (Grim.includeDeprecatedAPIs) {
          this.emit('soft-wrap-changed', softWrapped);
        }
        this.emitter.emit('did-change-soft-wrapped', softWrapped);
        return softWrapped;
      } else {
        return this.isSoftWrapped();
      }
    };

    DisplayBuffer.prototype.isSoftWrapped = function() {
      var _ref2, _ref3;
      return (_ref2 = (_ref3 = this.softWrapped) != null ? _ref3 : this.configSettings.softWrap) != null ? _ref2 : false;
    };

    DisplayBuffer.prototype.setEditorWidthInChars = function(editorWidthInChars) {
      var previousWidthInChars;
      if (editorWidthInChars > 0) {
        previousWidthInChars = this.editorWidthInChars;
        this.editorWidthInChars = editorWidthInChars;
        if (editorWidthInChars !== previousWidthInChars && this.isSoftWrapped()) {
          return this.updateWrappedScreenLines();
        }
      }
    };

    DisplayBuffer.prototype.getEditorWidthInChars = function() {
      var width, _ref2;
      width = (_ref2 = this.width) != null ? _ref2 : this.getScrollWidth();
      width -= this.getVerticalScrollbarWidth();
      if ((width != null) && this.defaultCharWidth > 0) {
        return Math.max(0, Math.floor(width / this.defaultCharWidth));
      } else {
        return this.editorWidthInChars;
      }
    };

    DisplayBuffer.prototype.getSoftWrapColumn = function() {
      if (this.configSettings.softWrapAtPreferredLineLength) {
        return Math.min(this.getEditorWidthInChars(), this.configSettings.preferredLineLength);
      } else {
        return this.getEditorWidthInChars();
      }
    };

    DisplayBuffer.prototype.tokenizedLineForScreenRow = function(screenRow) {
      return this.screenLines[screenRow];
    };

    DisplayBuffer.prototype.tokenizedLinesForScreenRows = function(startRow, endRow) {
      return this.screenLines.slice(startRow, +endRow + 1 || 9e9);
    };

    DisplayBuffer.prototype.getTokenizedLines = function() {
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(Array, this.screenLines, function(){});
    };

    DisplayBuffer.prototype.indentLevelForLine = function(line) {
      return this.tokenizedBuffer.indentLevelForLine(line);
    };

    DisplayBuffer.prototype.bufferRowsForScreenRows = function(startScreenRow, endScreenRow) {
      var screenRow, _i, _results;
      _results = [];
      for (screenRow = _i = startScreenRow; startScreenRow <= endScreenRow ? _i <= endScreenRow : _i >= endScreenRow; screenRow = startScreenRow <= endScreenRow ? ++_i : --_i) {
        _results.push(this.rowMap.bufferRowRangeForScreenRow(screenRow)[0]);
      }
      return _results;
    };

    DisplayBuffer.prototype.createFold = function(startRow, endRow) {
      var foldMarker, _ref2;
      foldMarker = (_ref2 = this.findFoldMarker({
        startRow: startRow,
        endRow: endRow
      })) != null ? _ref2 : this.buffer.markRange([[startRow, 0], [endRow, Infinity]], this.getFoldMarkerAttributes());
      return this.foldForMarker(foldMarker);
    };

    DisplayBuffer.prototype.isFoldedAtBufferRow = function(bufferRow) {
      return this.largestFoldContainingBufferRow(bufferRow) != null;
    };

    DisplayBuffer.prototype.isFoldedAtScreenRow = function(screenRow) {
      return this.largestFoldContainingBufferRow(this.bufferRowForScreenRow(screenRow)) != null;
    };

    DisplayBuffer.prototype.destroyFoldWithId = function(id) {
      var _ref2;
      return (_ref2 = this.foldsByMarkerId[id]) != null ? _ref2.destroy() : void 0;
    };

    DisplayBuffer.prototype.unfoldBufferRow = function(bufferRow) {
      var fold, _i, _len, _ref2;
      _ref2 = this.foldsContainingBufferRow(bufferRow);
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        fold = _ref2[_i];
        fold.destroy();
      }
    };

    DisplayBuffer.prototype.largestFoldStartingAtBufferRow = function(bufferRow) {
      return this.foldsStartingAtBufferRow(bufferRow)[0];
    };

    DisplayBuffer.prototype.foldsStartingAtBufferRow = function(bufferRow) {
      var marker, _i, _len, _ref2, _results;
      _ref2 = this.findFoldMarkers({
        startRow: bufferRow
      });
      _results = [];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        marker = _ref2[_i];
        _results.push(this.foldForMarker(marker));
      }
      return _results;
    };

    DisplayBuffer.prototype.largestFoldStartingAtScreenRow = function(screenRow) {
      return this.largestFoldStartingAtBufferRow(this.bufferRowForScreenRow(screenRow));
    };

    DisplayBuffer.prototype.largestFoldContainingBufferRow = function(bufferRow) {
      return this.foldsContainingBufferRow(bufferRow)[0];
    };

    DisplayBuffer.prototype.outermostFoldsInBufferRowRange = function(startRow, endRow) {
      return this.findFoldMarkers({
        containedInRange: [[startRow, 0], [endRow, 0]]
      }).map((function(_this) {
        return function(marker) {
          return _this.foldForMarker(marker);
        };
      })(this)).filter(function(fold) {
        return !fold.isInsideLargerFold();
      });
    };

    DisplayBuffer.prototype.foldsContainingBufferRow = function(bufferRow) {
      var marker, _i, _len, _ref2, _results;
      _ref2 = this.findFoldMarkers({
        intersectsRow: bufferRow
      });
      _results = [];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        marker = _ref2[_i];
        _results.push(this.foldForMarker(marker));
      }
      return _results;
    };

    DisplayBuffer.prototype.screenRowForBufferRow = function(bufferRow) {
      return this.rowMap.screenRowRangeForBufferRow(bufferRow)[0];
    };

    DisplayBuffer.prototype.lastScreenRowForBufferRow = function(bufferRow) {
      return this.rowMap.screenRowRangeForBufferRow(bufferRow)[1] - 1;
    };

    DisplayBuffer.prototype.bufferRowForScreenRow = function(screenRow) {
      return this.rowMap.bufferRowRangeForScreenRow(screenRow)[0];
    };

    DisplayBuffer.prototype.screenRangeForBufferRange = function(bufferRange, options) {
      var end, start;
      bufferRange = Range.fromObject(bufferRange);
      start = this.screenPositionForBufferPosition(bufferRange.start, options);
      end = this.screenPositionForBufferPosition(bufferRange.end, options);
      return new Range(start, end);
    };

    DisplayBuffer.prototype.bufferRangeForScreenRange = function(screenRange) {
      var end, start;
      screenRange = Range.fromObject(screenRange);
      start = this.bufferPositionForScreenPosition(screenRange.start);
      end = this.bufferPositionForScreenPosition(screenRange.end);
      return new Range(start, end);
    };

    DisplayBuffer.prototype.pixelRangeForScreenRange = function(screenRange, clip) {
      var end, start, _ref2;
      if (clip == null) {
        clip = true;
      }
      _ref2 = Range.fromObject(screenRange), start = _ref2.start, end = _ref2.end;
      return {
        start: this.pixelPositionForScreenPosition(start, clip),
        end: this.pixelPositionForScreenPosition(end, clip)
      };
    };

    DisplayBuffer.prototype.pixelPositionForScreenPosition = function(screenPosition, clip) {
      var char, charLength, charWidths, column, defaultCharWidth, left, targetColumn, targetRow, token, top, valueIndex, _i, _len, _ref2, _ref3;
      if (clip == null) {
        clip = true;
      }
      screenPosition = Point.fromObject(screenPosition);
      if (clip) {
        screenPosition = this.clipScreenPosition(screenPosition);
      }
      targetRow = screenPosition.row;
      targetColumn = screenPosition.column;
      defaultCharWidth = this.defaultCharWidth;
      top = targetRow * this.lineHeightInPixels;
      left = 0;
      column = 0;
      _ref2 = this.tokenizedLineForScreenRow(targetRow).tokens;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        token = _ref2[_i];
        charWidths = this.getScopedCharWidths(token.scopes);
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
            left += (_ref3 = charWidths[char]) != null ? _ref3 : defaultCharWidth;
          }
          column += charLength;
        }
      }
      return {
        top: top,
        left: left
      };
    };

    DisplayBuffer.prototype.screenPositionForPixelPosition = function(pixelPosition) {
      var char, charLength, charWidth, charWidths, column, defaultCharWidth, left, row, targetLeft, targetTop, token, valueIndex, _i, _len, _ref2, _ref3;
      targetTop = pixelPosition.top;
      targetLeft = pixelPosition.left;
      defaultCharWidth = this.defaultCharWidth;
      row = Math.floor(targetTop / this.getLineHeightInPixels());
      if (row < 0) {
        targetLeft = 0;
      }
      if (row > this.getLastRow()) {
        targetLeft = Infinity;
      }
      row = Math.min(row, this.getLastRow());
      row = Math.max(0, row);
      left = 0;
      column = 0;
      _ref2 = this.tokenizedLineForScreenRow(row).tokens;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        token = _ref2[_i];
        charWidths = this.getScopedCharWidths(token.scopes);
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
          charWidth = (_ref3 = charWidths[char]) != null ? _ref3 : defaultCharWidth;
          if (targetLeft <= left + (charWidth / 2)) {
            break;
          }
          left += charWidth;
          column += charLength;
        }
      }
      return new Point(row, column);
    };

    DisplayBuffer.prototype.pixelPositionForBufferPosition = function(bufferPosition) {
      return this.pixelPositionForScreenPosition(this.screenPositionForBufferPosition(bufferPosition));
    };

    DisplayBuffer.prototype.getLineCount = function() {
      return this.screenLines.length;
    };

    DisplayBuffer.prototype.getLastRow = function() {
      return this.getLineCount() - 1;
    };

    DisplayBuffer.prototype.getMaxLineLength = function() {
      return this.maxLineLength;
    };

    DisplayBuffer.prototype.getLongestScreenRow = function() {
      return this.longestScreenRow;
    };

    DisplayBuffer.prototype.screenPositionForBufferPosition = function(bufferPosition, options) {
      var column, endScreenRow, maxBufferColumn, row, screenColumn, screenLine, screenRow, startScreenRow, _i, _ref2, _ref3;
      if (this.isDestroyed()) {
        throw new Error("This TextEditor has been destroyed");
      }
      _ref2 = this.buffer.clipPosition(bufferPosition), row = _ref2.row, column = _ref2.column;
      _ref3 = this.rowMap.screenRowRangeForBufferRow(row), startScreenRow = _ref3[0], endScreenRow = _ref3[1];
      for (screenRow = _i = startScreenRow; startScreenRow <= endScreenRow ? _i < endScreenRow : _i > endScreenRow; screenRow = startScreenRow <= endScreenRow ? ++_i : --_i) {
        screenLine = this.screenLines[screenRow];
        if (screenLine == null) {
          throw new BufferToScreenConversionError("No screen line exists when converting buffer row to screen row", {
            softWrapEnabled: this.isSoftWrapped(),
            foldCount: this.findFoldMarkers().length,
            lastBufferRow: this.buffer.getLastRow(),
            lastScreenRow: this.getLastRow()
          });
        }
        maxBufferColumn = screenLine.getMaxBufferColumn();
        if (screenLine.isSoftWrapped() && column > maxBufferColumn) {
          continue;
        } else {
          if (column <= maxBufferColumn) {
            screenColumn = screenLine.screenColumnForBufferColumn(column);
          } else {
            screenColumn = Infinity;
          }
          break;
        }
      }
      return this.clipScreenPosition([screenRow, screenColumn], options);
    };

    DisplayBuffer.prototype.bufferPositionForScreenPosition = function(screenPosition, options) {
      var bufferRow, column, row, _ref2;
      _ref2 = this.clipScreenPosition(Point.fromObject(screenPosition), options), row = _ref2.row, column = _ref2.column;
      bufferRow = this.rowMap.bufferRowRangeForScreenRow(row)[0];
      return new Point(bufferRow, this.screenLines[row].bufferColumnForScreenColumn(column));
    };

    DisplayBuffer.prototype.scopeDescriptorForBufferPosition = function(bufferPosition) {
      return this.tokenizedBuffer.scopeDescriptorForPosition(bufferPosition);
    };

    DisplayBuffer.prototype.bufferRangeForScopeAtPosition = function(selector, position) {
      return this.tokenizedBuffer.bufferRangeForScopeAtPosition(selector, position);
    };

    DisplayBuffer.prototype.tokenForBufferPosition = function(bufferPosition) {
      return this.tokenizedBuffer.tokenForPosition(bufferPosition);
    };

    DisplayBuffer.prototype.getGrammar = function() {
      return this.tokenizedBuffer.grammar;
    };

    DisplayBuffer.prototype.setGrammar = function(grammar) {
      return this.tokenizedBuffer.setGrammar(grammar);
    };

    DisplayBuffer.prototype.reloadGrammar = function() {
      return this.tokenizedBuffer.reloadGrammar();
    };

    DisplayBuffer.prototype.clipScreenPosition = function(screenPosition, options) {
      var column, maxScreenColumn, row, screenLine, skipSoftWrapIndentation, wrapAtSoftNewlines, wrapBeyondNewlines, _ref2;
      if (options == null) {
        options = {};
      }
      wrapBeyondNewlines = options.wrapBeyondNewlines, wrapAtSoftNewlines = options.wrapAtSoftNewlines, skipSoftWrapIndentation = options.skipSoftWrapIndentation;
      _ref2 = Point.fromObject(screenPosition), row = _ref2.row, column = _ref2.column;
      if (row < 0) {
        row = 0;
        column = 0;
      } else if (row > this.getLastRow()) {
        row = this.getLastRow();
        column = Infinity;
      } else if (column < 0) {
        column = 0;
      }
      screenLine = this.screenLines[row];
      maxScreenColumn = screenLine.getMaxScreenColumn();
      if (screenLine.isSoftWrapped() && column >= maxScreenColumn) {
        if (wrapAtSoftNewlines) {
          row++;
          column = this.screenLines[row].clipScreenColumn(0);
        } else {
          column = screenLine.clipScreenColumn(maxScreenColumn - 1);
        }
      } else if (screenLine.isColumnInsideSoftWrapIndentation(column)) {
        if (skipSoftWrapIndentation) {
          column = screenLine.clipScreenColumn(0);
        } else {
          row--;
          column = this.screenLines[row].getMaxScreenColumn() - 1;
        }
      } else if (wrapBeyondNewlines && column > maxScreenColumn && row < this.getLastRow()) {
        row++;
        column = 0;
      } else {
        column = screenLine.clipScreenColumn(column, options);
      }
      return new Point(row, column);
    };

    DisplayBuffer.prototype.clipScreenRange = function(range, options) {
      var end, start;
      start = this.clipScreenPosition(range.start, options);
      end = this.clipScreenPosition(range.end, options);
      return new Range(start, end);
    };

    DisplayBuffer.prototype.rangeForAllLines = function() {
      return new Range([0, 0], this.clipScreenPosition([Infinity, Infinity]));
    };

    DisplayBuffer.prototype.decorationForId = function(id) {
      return this.decorationsById[id];
    };

    DisplayBuffer.prototype.getDecorations = function(propertyFilter) {
      var allDecorations, decorations, markerId, _ref2;
      allDecorations = [];
      _ref2 = this.decorationsByMarkerId;
      for (markerId in _ref2) {
        decorations = _ref2[markerId];
        if (decorations != null) {
          allDecorations = allDecorations.concat(decorations);
        }
      }
      if (propertyFilter != null) {
        allDecorations = allDecorations.filter(function(decoration) {
          var key, value;
          for (key in propertyFilter) {
            value = propertyFilter[key];
            if (decoration.properties[key] !== value) {
              return false;
            }
          }
          return true;
        });
      }
      return allDecorations;
    };

    DisplayBuffer.prototype.getLineDecorations = function(propertyFilter) {
      return this.getDecorations(propertyFilter).filter(function(decoration) {
        return decoration.isType('line');
      });
    };

    DisplayBuffer.prototype.getLineNumberDecorations = function(propertyFilter) {
      return this.getDecorations(propertyFilter).filter(function(decoration) {
        return decoration.isType('line-number');
      });
    };

    DisplayBuffer.prototype.getHighlightDecorations = function(propertyFilter) {
      return this.getDecorations(propertyFilter).filter(function(decoration) {
        return decoration.isType('highlight');
      });
    };

    DisplayBuffer.prototype.getOverlayDecorations = function(propertyFilter) {
      return this.getDecorations(propertyFilter).filter(function(decoration) {
        return decoration.isType('overlay');
      });
    };

    DisplayBuffer.prototype.decorationsForScreenRowRange = function(startScreenRow, endScreenRow) {
      var decorations, decorationsByMarkerId, marker, _i, _len, _ref2;
      decorationsByMarkerId = {};
      _ref2 = this.findMarkers({
        intersectsScreenRowRange: [startScreenRow, endScreenRow]
      });
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        marker = _ref2[_i];
        if (decorations = this.decorationsByMarkerId[marker.id]) {
          decorationsByMarkerId[marker.id] = decorations;
        }
      }
      return decorationsByMarkerId;
    };

    DisplayBuffer.prototype.decorateMarker = function(marker, decorationParams) {
      var decoration, _base, _name;
      marker = this.getMarker(marker.id);
      decoration = new Decoration(marker, this, decorationParams);
      this.disposables.add(decoration.onDidDestroy((function(_this) {
        return function() {
          return _this.removeDecoration(decoration);
        };
      })(this)));
      if ((_base = this.decorationsByMarkerId)[_name = marker.id] == null) {
        _base[_name] = [];
      }
      this.decorationsByMarkerId[marker.id].push(decoration);
      this.decorationsById[decoration.id] = decoration;
      if (Grim.includeDeprecatedAPIs) {
        this.emit('decoration-added', decoration);
      }
      this.emitter.emit('did-add-decoration', decoration);
      return decoration;
    };

    DisplayBuffer.prototype.removeDecoration = function(decoration) {
      var decorations, index, marker;
      marker = decoration.marker;
      if (!(decorations = this.decorationsByMarkerId[marker.id])) {
        return;
      }
      index = decorations.indexOf(decoration);
      if (index > -1) {
        decorations.splice(index, 1);
        delete this.decorationsById[decoration.id];
        if (Grim.includeDeprecatedAPIs) {
          this.emit('decoration-removed', decoration);
        }
        this.emitter.emit('did-remove-decoration', decoration);
        if (decorations.length === 0) {
          return delete this.decorationsByMarkerId[marker.id];
        }
      }
    };

    DisplayBuffer.prototype.getMarker = function(id) {
      var bufferMarker, marker;
      if (!(marker = this.markers[id])) {
        if (bufferMarker = this.buffer.getMarker(id)) {
          marker = new Marker({
            bufferMarker: bufferMarker,
            displayBuffer: this
          });
          this.markers[id] = marker;
        }
      }
      return marker;
    };

    DisplayBuffer.prototype.getMarkers = function() {
      return this.buffer.getMarkers().map((function(_this) {
        return function(_arg) {
          var id;
          id = _arg.id;
          return _this.getMarker(id);
        };
      })(this));
    };

    DisplayBuffer.prototype.getMarkerCount = function() {
      return this.buffer.getMarkerCount();
    };

    DisplayBuffer.prototype.markScreenRange = function() {
      var args, bufferRange;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      bufferRange = this.bufferRangeForScreenRange(args.shift());
      return this.markBufferRange.apply(this, [bufferRange].concat(__slice.call(args)));
    };

    DisplayBuffer.prototype.markBufferRange = function(range, options) {
      return this.getMarker(this.buffer.markRange(range, options).id);
    };

    DisplayBuffer.prototype.markScreenPosition = function(screenPosition, options) {
      return this.markBufferPosition(this.bufferPositionForScreenPosition(screenPosition), options);
    };

    DisplayBuffer.prototype.markBufferPosition = function(bufferPosition, options) {
      return this.getMarker(this.buffer.markPosition(bufferPosition, options).id);
    };

    DisplayBuffer.prototype.destroyMarker = function(id) {
      this.buffer.destroyMarker(id);
      return delete this.markers[id];
    };

    DisplayBuffer.prototype.findMarker = function(params) {
      return this.findMarkers(params)[0];
    };

    DisplayBuffer.prototype.findMarkers = function(params) {
      params = this.translateToBufferMarkerParams(params);
      return this.buffer.findMarkers(params).map((function(_this) {
        return function(stringMarker) {
          return _this.getMarker(stringMarker.id);
        };
      })(this));
    };

    DisplayBuffer.prototype.translateToBufferMarkerParams = function(params) {
      var bufferMarkerParams, endRow, key, startRow, value;
      bufferMarkerParams = {};
      for (key in params) {
        value = params[key];
        switch (key) {
          case 'startBufferRow':
            key = 'startRow';
            break;
          case 'endBufferRow':
            key = 'endRow';
            break;
          case 'startScreenRow':
            key = 'startRow';
            value = this.bufferRowForScreenRow(value);
            break;
          case 'endScreenRow':
            key = 'endRow';
            value = this.bufferRowForScreenRow(value);
            break;
          case 'intersectsBufferRowRange':
            key = 'intersectsRowRange';
            break;
          case 'intersectsScreenRowRange':
            key = 'intersectsRowRange';
            startRow = value[0], endRow = value[1];
            value = [this.bufferRowForScreenRow(startRow), this.bufferRowForScreenRow(endRow)];
            break;
          case 'containsBufferRange':
            key = 'containsRange';
            break;
          case 'containsBufferPosition':
            key = 'containsPosition';
            break;
          case 'containedInBufferRange':
            key = 'containedInRange';
            break;
          case 'containedInScreenRange':
            key = 'containedInRange';
            value = this.bufferRangeForScreenRange(value);
            break;
          case 'intersectsBufferRange':
            key = 'intersectsRange';
            break;
          case 'intersectsScreenRange':
            key = 'intersectsRange';
            value = this.bufferRangeForScreenRange(value);
        }
        bufferMarkerParams[key] = value;
      }
      return bufferMarkerParams;
    };

    DisplayBuffer.prototype.findFoldMarker = function(attributes) {
      return this.findFoldMarkers(attributes)[0];
    };

    DisplayBuffer.prototype.findFoldMarkers = function(attributes) {
      return this.buffer.findMarkers(this.getFoldMarkerAttributes(attributes));
    };

    DisplayBuffer.prototype.getFoldMarkerAttributes = function(attributes) {
      if (attributes == null) {
        attributes = {};
      }
      return _.extend(attributes, {
        "class": 'fold',
        displayBufferId: this.id
      });
    };

    DisplayBuffer.prototype.pauseMarkerChangeEvents = function() {
      var marker, _i, _len, _ref2;
      _ref2 = this.getMarkers();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        marker = _ref2[_i];
        marker.pauseChangeEvents();
      }
    };

    DisplayBuffer.prototype.resumeMarkerChangeEvents = function() {
      var marker, _i, _len, _ref2;
      _ref2 = this.getMarkers();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        marker = _ref2[_i];
        marker.resumeChangeEvents();
      }
      if (Grim.includeDeprecatedAPIs) {
        this.emit('markers-updated');
      }
      return this.emitter.emit('did-update-markers');
    };

    DisplayBuffer.prototype.refreshMarkerScreenPositions = function() {
      var marker, _i, _len, _ref2;
      _ref2 = this.getMarkers();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        marker = _ref2[_i];
        marker.notifyObservers({
          textChanged: false
        });
      }
    };

    DisplayBuffer.prototype.destroyed = function() {
      var id, marker, _ref2;
      _ref2 = this.markers;
      for (id in _ref2) {
        marker = _ref2[id];
        marker.disposables.dispose();
      }
      this.scopedConfigSubscriptions.dispose();
      this.disposables.dispose();
      return this.tokenizedBuffer.destroy();
    };

    DisplayBuffer.prototype.logLines = function(start, end) {
      var line, row, _i;
      if (start == null) {
        start = 0;
      }
      if (end == null) {
        end = this.getLastRow();
      }
      for (row = _i = start; start <= end ? _i <= end : _i >= end; row = start <= end ? ++_i : --_i) {
        line = this.tokenizedLineForScreenRow(row).text;
        console.log(row, this.bufferRowForScreenRow(row), line, line.length);
      }
    };

    DisplayBuffer.prototype.getRootScopeDescriptor = function() {
      return this.tokenizedBuffer.rootScopeDescriptor;
    };

    DisplayBuffer.prototype.handleTokenizedBufferChange = function(tokenizedBufferChange) {
      var bufferChange, delta, end, start;
      start = tokenizedBufferChange.start, end = tokenizedBufferChange.end, delta = tokenizedBufferChange.delta, bufferChange = tokenizedBufferChange.bufferChange;
      this.updateScreenLines(start, end + 1, delta, {
        delayChangeEvent: bufferChange != null
      });
      if (delta < 0) {
        return this.setScrollTop(Math.min(this.getScrollTop(), this.getMaxScrollTop()));
      }
    };

    DisplayBuffer.prototype.updateScreenLines = function(startBufferRow, endBufferRow, bufferDelta, options) {
      var changeEvent, endScreenRow, regions, screenDelta, screenLines, startScreenRow, _ref2;
      if (bufferDelta == null) {
        bufferDelta = 0;
      }
      if (options == null) {
        options = {};
      }
      startBufferRow = this.rowMap.bufferRowRangeForBufferRow(startBufferRow)[0];
      endBufferRow = this.rowMap.bufferRowRangeForBufferRow(endBufferRow - 1)[1];
      startScreenRow = this.rowMap.screenRowRangeForBufferRow(startBufferRow)[0];
      endScreenRow = this.rowMap.screenRowRangeForBufferRow(endBufferRow - 1)[1];
      _ref2 = this.buildScreenLines(startBufferRow, endBufferRow + bufferDelta), screenLines = _ref2.screenLines, regions = _ref2.regions;
      screenDelta = screenLines.length - (endScreenRow - startScreenRow);
      [].splice.apply(this.screenLines, [startScreenRow, endScreenRow - startScreenRow].concat(screenLines)), screenLines;
      this.rowMap.spliceRegions(startBufferRow, endBufferRow - startBufferRow, regions);
      this.findMaxLineLength(startScreenRow, endScreenRow, screenLines, screenDelta);
      if (options.suppressChangeEvent) {
        return;
      }
      changeEvent = {
        start: startScreenRow,
        end: endScreenRow - 1,
        screenDelta: screenDelta,
        bufferDelta: bufferDelta
      };
      if (options.delayChangeEvent) {
        this.pauseMarkerChangeEvents();
        return this.pendingChangeEvent = changeEvent;
      } else {
        return this.emitDidChange(changeEvent, options.refreshMarkers);
      }
    };

    DisplayBuffer.prototype.buildScreenLines = function(startBufferRow, endBufferRow) {
      var bufferRow, fold, foldLine, foldedRowCount, rectangularRegion, regions, screenLines, softWraps, tokenizedLine, wrapScreenColumn, wrappedLine, _ref2;
      screenLines = [];
      regions = [];
      rectangularRegion = null;
      bufferRow = startBufferRow;
      while (bufferRow < endBufferRow) {
        tokenizedLine = this.tokenizedBuffer.tokenizedLineForRow(bufferRow);
        if (fold = this.largestFoldStartingAtBufferRow(bufferRow)) {
          foldLine = tokenizedLine.copy();
          foldLine.fold = fold;
          screenLines.push(foldLine);
          if (rectangularRegion != null) {
            regions.push(rectangularRegion);
            rectangularRegion = null;
          }
          foldedRowCount = fold.getBufferRowCount();
          regions.push({
            bufferRows: foldedRowCount,
            screenRows: 1
          });
          bufferRow += foldedRowCount;
        } else {
          softWraps = 0;
          if (this.isSoftWrapped()) {
            while (wrapScreenColumn = tokenizedLine.findWrapColumn(this.getSoftWrapColumn())) {
              _ref2 = tokenizedLine.softWrapAt(wrapScreenColumn, this.configSettings.softWrapHangingIndent), wrappedLine = _ref2[0], tokenizedLine = _ref2[1];
              if (wrappedLine.hasOnlySoftWrapIndentation()) {
                break;
              }
              screenLines.push(wrappedLine);
              softWraps++;
            }
          }
          screenLines.push(tokenizedLine);
          if (softWraps > 0) {
            if (rectangularRegion != null) {
              regions.push(rectangularRegion);
              rectangularRegion = null;
            }
            regions.push({
              bufferRows: 1,
              screenRows: softWraps + 1
            });
          } else {
            if (rectangularRegion == null) {
              rectangularRegion = {
                bufferRows: 0,
                screenRows: 0
              };
            }
            rectangularRegion.bufferRows++;
            rectangularRegion.screenRows++;
          }
          bufferRow++;
        }
      }
      if (rectangularRegion != null) {
        regions.push(rectangularRegion);
      }
      return {
        screenLines: screenLines,
        regions: regions
      };
    };

    DisplayBuffer.prototype.findMaxLineLength = function(startScreenRow, endScreenRow, newScreenLines, screenDelta) {
      var i, length, maxLengthCandidates, maxLengthCandidatesStartRow, oldMaxLineLength, screenLine, screenRow, _i, _len, _ref2;
      oldMaxLineLength = this.maxLineLength;
      if ((startScreenRow <= (_ref2 = this.longestScreenRow) && _ref2 < endScreenRow)) {
        this.longestScreenRow = 0;
        this.maxLineLength = 0;
        maxLengthCandidatesStartRow = 0;
        maxLengthCandidates = this.screenLines;
      } else {
        if (endScreenRow <= this.longestScreenRow) {
          this.longestScreenRow += screenDelta;
        }
        maxLengthCandidatesStartRow = startScreenRow;
        maxLengthCandidates = newScreenLines;
      }
      for (i = _i = 0, _len = maxLengthCandidates.length; _i < _len; i = ++_i) {
        screenLine = maxLengthCandidates[i];
        screenRow = maxLengthCandidatesStartRow + i;
        length = screenLine.text.length;
        if (length > this.maxLineLength) {
          this.longestScreenRow = screenRow;
          this.maxLineLength = length;
        }
      }
      if (oldMaxLineLength !== this.maxLineLength) {
        return this.computeScrollWidth();
      }
    };

    DisplayBuffer.prototype.computeScrollWidth = function() {
      this.scrollWidth = this.pixelPositionForScreenPosition([this.longestScreenRow, this.maxLineLength]).left;
      if (!this.isSoftWrapped()) {
        this.scrollWidth += 1;
      }
      return this.setScrollLeft(Math.min(this.getScrollLeft(), this.getMaxScrollLeft()));
    };

    DisplayBuffer.prototype.handleBufferMarkersUpdated = function() {
      var event;
      if (event = this.pendingChangeEvent) {
        this.pendingChangeEvent = null;
        return this.emitDidChange(event, false);
      }
    };

    DisplayBuffer.prototype.handleBufferMarkerCreated = function(textBufferMarker) {
      var marker;
      if (textBufferMarker.matchesParams(this.getFoldMarkerAttributes())) {
        this.createFoldForMarker(textBufferMarker);
      }
      if (marker = this.getMarker(textBufferMarker.id)) {
        if (Grim.includeDeprecatedAPIs) {
          this.emit('marker-created', marker);
        }
        return this.emitter.emit('did-create-marker', marker);
      }
    };

    DisplayBuffer.prototype.createFoldForMarker = function(marker) {
      this.decorateMarker(marker, {
        type: 'line-number',
        "class": 'folded'
      });
      return new Fold(this, marker);
    };

    DisplayBuffer.prototype.foldForMarker = function(marker) {
      return this.foldsByMarkerId[marker.id];
    };

    return DisplayBuffer;

  })(Model);

  if (Grim.includeDeprecatedAPIs) {
    DisplayBuffer.properties({
      softWrapped: null,
      editorWidthInChars: null,
      lineHeightInPixels: null,
      defaultCharWidth: null,
      height: null,
      width: null,
      scrollTop: 0,
      scrollLeft: 0,
      scrollWidth: 0,
      verticalScrollbarWidth: 15,
      horizontalScrollbarHeight: 15
    });
    EmitterMixin = require('emissary').Emitter;
    DisplayBuffer.prototype.on = function(eventName) {
      switch (eventName) {
        case 'changed':
          Grim.deprecate("Use DisplayBuffer::onDidChange instead");
          break;
        case 'grammar-changed':
          Grim.deprecate("Use DisplayBuffer::onDidChangeGrammar instead");
          break;
        case 'soft-wrap-changed':
          Grim.deprecate("Use DisplayBuffer::onDidChangeSoftWrap instead");
          break;
        case 'character-widths-changed':
          Grim.deprecate("Use DisplayBuffer::onDidChangeCharacterWidths instead");
          break;
        case 'decoration-added':
          Grim.deprecate("Use DisplayBuffer::onDidAddDecoration instead");
          break;
        case 'decoration-removed':
          Grim.deprecate("Use DisplayBuffer::onDidRemoveDecoration instead");
          break;
        case 'decoration-changed':
          Grim.deprecate("Use decoration.getMarker().onDidChange() instead");
          break;
        case 'decoration-updated':
          Grim.deprecate("Use Decoration::onDidChangeProperties instead");
          break;
        case 'marker-created':
          Grim.deprecate("Use Decoration::onDidCreateMarker instead");
          break;
        case 'markers-updated':
          Grim.deprecate("Use Decoration::onDidUpdateMarkers instead");
          break;
        default:
          Grim.deprecate("DisplayBuffer::on is deprecated. Use event subscription methods instead.");
      }
      return EmitterMixin.prototype.on.apply(this, arguments);
    };
  } else {
    DisplayBuffer.prototype.softWrapped = null;
    DisplayBuffer.prototype.editorWidthInChars = null;
    DisplayBuffer.prototype.lineHeightInPixels = null;
    DisplayBuffer.prototype.defaultCharWidth = null;
    DisplayBuffer.prototype.height = null;
    DisplayBuffer.prototype.width = null;
    DisplayBuffer.prototype.scrollTop = 0;
    DisplayBuffer.prototype.scrollLeft = 0;
    DisplayBuffer.prototype.scrollWidth = 0;
    DisplayBuffer.prototype.verticalScrollbarWidth = 15;
    DisplayBuffer.prototype.horizontalScrollbarHeight = 15;
  }

}).call(this);

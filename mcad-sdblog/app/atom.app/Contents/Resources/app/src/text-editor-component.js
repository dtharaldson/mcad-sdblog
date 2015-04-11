(function() {
  var CompositeDisposable, GutterComponent, InputComponent, LinesComponent, OverlayManager, Point, Range, ScrollbarComponent, ScrollbarCornerComponent, TextEditorComponent, TextEditorPresenter, grim, ipc, scrollbarStyle, _, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ = require('underscore-plus');

  scrollbarStyle = require('scrollbar-style');

  _ref = require('text-buffer'), Range = _ref.Range, Point = _ref.Point;

  grim = require('grim');

  CompositeDisposable = require('event-kit').CompositeDisposable;

  ipc = require('ipc');

  TextEditorPresenter = require('./text-editor-presenter');

  GutterComponent = require('./gutter-component');

  InputComponent = require('./input-component');

  LinesComponent = require('./lines-component');

  ScrollbarComponent = require('./scrollbar-component');

  ScrollbarCornerComponent = require('./scrollbar-corner-component');

  OverlayManager = require('./overlay-manager');

  module.exports = TextEditorComponent = (function() {
    TextEditorComponent.prototype.scrollSensitivity = 0.4;

    TextEditorComponent.prototype.cursorBlinkPeriod = 800;

    TextEditorComponent.prototype.cursorBlinkResumeDelay = 100;

    TextEditorComponent.prototype.lineOverdrawMargin = 15;

    TextEditorComponent.prototype.pendingScrollTop = null;

    TextEditorComponent.prototype.pendingScrollLeft = null;

    TextEditorComponent.prototype.updateRequested = false;

    TextEditorComponent.prototype.updatesPaused = false;

    TextEditorComponent.prototype.updateRequestedWhilePaused = false;

    TextEditorComponent.prototype.heightAndWidthMeasurementRequested = false;

    TextEditorComponent.prototype.cursorMoved = false;

    TextEditorComponent.prototype.selectionChanged = false;

    TextEditorComponent.prototype.inputEnabled = true;

    TextEditorComponent.prototype.measureScrollbarsWhenShown = true;

    TextEditorComponent.prototype.measureLineHeightAndDefaultCharWidthWhenShown = true;

    TextEditorComponent.prototype.remeasureCharacterWidthsWhenShown = false;

    TextEditorComponent.prototype.stylingChangeAnimationFrameRequested = false;

    TextEditorComponent.prototype.gutterComponent = null;

    TextEditorComponent.prototype.mounted = true;

    function TextEditorComponent(_arg) {
      var insertionPoint, lineOverdrawMargin;
      this.editor = _arg.editor, this.hostElement = _arg.hostElement, this.rootElement = _arg.rootElement, this.stylesElement = _arg.stylesElement, this.useShadowDOM = _arg.useShadowDOM, lineOverdrawMargin = _arg.lineOverdrawMargin;
      this.setScrollSensitivity = __bind(this.setScrollSensitivity, this);
      this.refreshScrollbars = __bind(this.refreshScrollbars, this);
      this.sampleFontStyling = __bind(this.sampleFontStyling, this);
      this.requestHeightAndWidthMeasurement = __bind(this.requestHeightAndWidthMeasurement, this);
      this.pollDOM = __bind(this.pollDOM, this);
      this.handleDragUntilMouseUp = __bind(this.handleDragUntilMouseUp, this);
      this.onCursorMoved = __bind(this.onCursorMoved, this);
      this.onCursorAdded = __bind(this.onCursorAdded, this);
      this.onSelectionChanged = __bind(this.onSelectionChanged, this);
      this.onSelectionAdded = __bind(this.onSelectionAdded, this);
      this.handleStylingChange = __bind(this.handleStylingChange, this);
      this.onAllThemesLoaded = __bind(this.onAllThemesLoaded, this);
      this.onStylesheetsChanged = __bind(this.onStylesheetsChanged, this);
      this.onGutterShiftClick = __bind(this.onGutterShiftClick, this);
      this.onGutterMetaClick = __bind(this.onGutterMetaClick, this);
      this.onGutterClick = __bind(this.onGutterClick, this);
      this.onGutterMouseDown = __bind(this.onGutterMouseDown, this);
      this.onMouseDown = __bind(this.onMouseDown, this);
      this.onScrollViewScroll = __bind(this.onScrollViewScroll, this);
      this.onMouseWheel = __bind(this.onMouseWheel, this);
      this.onHorizontalScroll = __bind(this.onHorizontalScroll, this);
      this.onVerticalScroll = __bind(this.onVerticalScroll, this);
      this.onTextInput = __bind(this.onTextInput, this);
      this.onGrammarChanged = __bind(this.onGrammarChanged, this);
      this.requestUpdate = __bind(this.requestUpdate, this);
      this.readAfterUpdateSync = __bind(this.readAfterUpdateSync, this);
      if (lineOverdrawMargin != null) {
        this.lineOverdrawMargin = lineOverdrawMargin;
      }
      this.disposables = new CompositeDisposable;
      this.observeConfig();
      this.setScrollSensitivity(atom.config.get('editor.scrollSensitivity'));
      this.presenter = new TextEditorPresenter({
        model: this.editor,
        scrollTop: this.editor.getScrollTop(),
        scrollLeft: this.editor.getScrollLeft(),
        lineOverdrawMargin: lineOverdrawMargin,
        cursorBlinkPeriod: this.cursorBlinkPeriod,
        cursorBlinkResumeDelay: this.cursorBlinkResumeDelay,
        stoppedScrollingDelay: 200
      });
      this.presenter.onDidUpdateState(this.requestUpdate);
      this.domNode = document.createElement('div');
      if (this.useShadowDOM) {
        this.domNode.classList.add('editor-contents--private');
        insertionPoint = document.createElement('content');
        insertionPoint.setAttribute('select', 'atom-overlay');
        this.domNode.appendChild(insertionPoint);
        this.overlayManager = new OverlayManager(this.presenter, this.hostElement);
      } else {
        this.domNode.classList.add('editor-contents');
        this.overlayManager = new OverlayManager(this.presenter, this.domNode);
      }
      this.scrollViewNode = document.createElement('div');
      this.scrollViewNode.classList.add('scroll-view');
      this.domNode.appendChild(this.scrollViewNode);
      if (this.presenter.getState().gutter.visible) {
        this.mountGutterComponent();
      }
      this.hiddenInputComponent = new InputComponent;
      this.scrollViewNode.appendChild(this.hiddenInputComponent.domNode);
      this.linesComponent = new LinesComponent({
        presenter: this.presenter,
        hostElement: this.hostElement,
        useShadowDOM: this.useShadowDOM
      });
      this.scrollViewNode.appendChild(this.linesComponent.domNode);
      this.horizontalScrollbarComponent = new ScrollbarComponent({
        orientation: 'horizontal',
        onScroll: this.onHorizontalScroll
      });
      this.scrollViewNode.appendChild(this.horizontalScrollbarComponent.domNode);
      this.verticalScrollbarComponent = new ScrollbarComponent({
        orientation: 'vertical',
        onScroll: this.onVerticalScroll
      });
      this.domNode.appendChild(this.verticalScrollbarComponent.domNode);
      this.scrollbarCornerComponent = new ScrollbarCornerComponent;
      this.domNode.appendChild(this.scrollbarCornerComponent.domNode);
      this.observeEditor();
      this.listenForDOMEvents();
      this.disposables.add(this.stylesElement.onDidAddStyleElement(this.onStylesheetsChanged));
      this.disposables.add(this.stylesElement.onDidUpdateStyleElement(this.onStylesheetsChanged));
      this.disposables.add(this.stylesElement.onDidRemoveStyleElement(this.onStylesheetsChanged));
      if (!atom.themes.isInitialLoadComplete()) {
        this.disposables.add(atom.themes.onDidChangeActiveThemes(this.onAllThemesLoaded));
      }
      this.disposables.add(scrollbarStyle.changes.onValue(this.refreshScrollbars));
      this.disposables.add(atom.views.pollDocument(this.pollDOM));
      this.updateSync();
      this.checkForVisibilityChange();
    }

    TextEditorComponent.prototype.destroy = function() {
      this.mounted = false;
      this.disposables.dispose();
      this.presenter.destroy();
      return window.removeEventListener('resize', this.requestHeightAndWidthMeasurement);
    };

    TextEditorComponent.prototype.updateSync = function() {
      var cursorMoved, selectionChanged, _ref1, _ref2, _ref3;
      if (this.oldState == null) {
        this.oldState = {};
      }
      this.newState = this.presenter.getState();
      cursorMoved = this.cursorMoved;
      selectionChanged = this.selectionChanged;
      this.cursorMoved = false;
      this.selectionChanged = false;
      if ((this.editor.getLastSelection() != null) && !this.editor.getLastSelection().isEmpty()) {
        this.domNode.classList.add('has-selection');
      } else {
        this.domNode.classList.remove('has-selection');
      }
      if (this.newState.focused !== this.oldState.focused) {
        this.domNode.classList.toggle('is-focused', this.newState.focused);
      }
      if (this.editor.isDestroyed()) {
        this.performedInitialMeasurement = false;
      }
      if (this.performedInitialMeasurement) {
        if (this.newState.height !== this.oldState.height) {
          if (this.newState.height != null) {
            this.domNode.style.height = this.newState.height + 'px';
          } else {
            this.domNode.style.height = '';
          }
        }
      }
      if (this.newState.gutter.visible) {
        if (this.gutterComponent == null) {
          this.mountGutterComponent();
        }
        this.gutterComponent.updateSync(this.newState);
      } else {
        if ((_ref1 = this.gutterComponent) != null) {
          if ((_ref2 = _ref1.domNode) != null) {
            _ref2.remove();
          }
        }
        this.gutterComponent = null;
      }
      this.hiddenInputComponent.updateSync(this.newState);
      this.linesComponent.updateSync(this.newState);
      this.horizontalScrollbarComponent.updateSync(this.newState);
      this.verticalScrollbarComponent.updateSync(this.newState);
      this.scrollbarCornerComponent.updateSync(this.newState);
      if ((_ref3 = this.overlayManager) != null) {
        _ref3.render(this.newState);
      }
      if (this.editor.isAlive()) {
        this.updateParentViewFocusedClassIfNeeded();
        this.updateParentViewMiniClass();
        if (grim.includeDeprecatedAPIs) {
          if (cursorMoved) {
            this.hostElement.__spacePenView.trigger('cursor:moved');
          }
          if (selectionChanged) {
            this.hostElement.__spacePenView.trigger('selection:changed');
          }
          return this.hostElement.__spacePenView.trigger('editor:display-updated');
        }
      }
    };

    TextEditorComponent.prototype.readAfterUpdateSync = function() {
      var _ref1;
      if (this.isVisible() && !this.newState.content.scrollingVertically) {
        this.linesComponent.measureCharactersInNewLines();
      }
      return (_ref1 = this.overlayManager) != null ? _ref1.measureOverlays() : void 0;
    };

    TextEditorComponent.prototype.mountGutterComponent = function() {
      this.gutterComponent = new GutterComponent({
        editor: this.editor,
        onMouseDown: this.onGutterMouseDown
      });
      return this.domNode.insertBefore(this.gutterComponent.domNode, this.domNode.firstChild);
    };

    TextEditorComponent.prototype.becameVisible = function() {
      this.updatesPaused = true;
      if (this.measureScrollbarsWhenShown) {
        this.measureScrollbars();
      }
      this.sampleFontStyling();
      this.sampleBackgroundColors();
      this.measureWindowSize();
      this.measureDimensions();
      if (this.measureLineHeightAndDefaultCharWidthWhenShown) {
        this.measureLineHeightAndDefaultCharWidth();
      }
      if (this.remeasureCharacterWidthsWhenShown) {
        this.remeasureCharacterWidths();
      }
      this.editor.setVisible(true);
      this.performedInitialMeasurement = true;
      this.updatesPaused = false;
      if (this.canUpdate()) {
        return this.updateSync();
      }
    };

    TextEditorComponent.prototype.requestUpdate = function() {
      if (!this.canUpdate()) {
        return;
      }
      if (this.updatesPaused) {
        this.updateRequestedWhilePaused = true;
        return;
      }
      if (this.hostElement.isUpdatedSynchronously()) {
        return this.updateSync();
      } else if (!this.updateRequested) {
        this.updateRequested = true;
        atom.views.updateDocument((function(_this) {
          return function() {
            _this.updateRequested = false;
            if (_this.editor.isAlive()) {
              return _this.updateSync();
            }
          };
        })(this));
        return atom.views.readDocument(this.readAfterUpdateSync);
      }
    };

    TextEditorComponent.prototype.canUpdate = function() {
      return this.mounted && this.editor.isAlive();
    };

    TextEditorComponent.prototype.requestAnimationFrame = function(fn) {
      this.updatesPaused = true;
      return requestAnimationFrame((function(_this) {
        return function() {
          fn();
          _this.updatesPaused = false;
          if (_this.updateRequestedWhilePaused && _this.canUpdate()) {
            _this.updateRequestedWhilePaused = false;
            return _this.updateSync();
          }
        };
      })(this));
    };

    TextEditorComponent.prototype.getTopmostDOMNode = function() {
      return this.hostElement;
    };

    TextEditorComponent.prototype.observeEditor = function() {
      this.disposables.add(this.editor.observeGrammar(this.onGrammarChanged));
      this.disposables.add(this.editor.observeCursors(this.onCursorAdded));
      return this.disposables.add(this.editor.observeSelections(this.onSelectionAdded));
    };

    TextEditorComponent.prototype.listenForDOMEvents = function() {
      this.domNode.addEventListener('mousewheel', this.onMouseWheel);
      this.domNode.addEventListener('textInput', this.onTextInput);
      this.scrollViewNode.addEventListener('mousedown', this.onMouseDown);
      this.scrollViewNode.addEventListener('scroll', this.onScrollViewScroll);
      window.addEventListener('resize', this.requestHeightAndWidthMeasurement);
      this.listenForIMEEvents();
      if (process.platform === 'linux') {
        return this.trackSelectionClipboard();
      }
    };

    TextEditorComponent.prototype.listenForIMEEvents = function() {
      var selectedText;
      selectedText = null;
      this.domNode.addEventListener('compositionstart', (function(_this) {
        return function() {
          return selectedText = _this.editor.getSelectedText();
        };
      })(this));
      this.domNode.addEventListener('compositionupdate', (function(_this) {
        return function(event) {
          return _this.editor.insertText(event.data, {
            select: true,
            undo: 'skip'
          });
        };
      })(this));
      return this.domNode.addEventListener('compositionend', (function(_this) {
        return function(event) {
          _this.editor.insertText(selectedText, {
            select: true,
            undo: 'skip'
          });
          return event.target.value = '';
        };
      })(this));
    };

    TextEditorComponent.prototype.trackSelectionClipboard = function() {
      var timeoutId, writeSelectedTextToSelectionClipboard;
      timeoutId = null;
      writeSelectedTextToSelectionClipboard = (function(_this) {
        return function() {
          var selectedText;
          if (_this.editor.isDestroyed()) {
            return;
          }
          if (selectedText = _this.editor.getSelectedText()) {
            return ipc.send('write-text-to-selection-clipboard', selectedText);
          }
        };
      })(this);
      return this.disposables.add(this.editor.onDidChangeSelectionRange(function() {
        clearTimeout(timeoutId);
        return timeoutId = setTimeout(writeSelectedTextToSelectionClipboard);
      }));
    };

    TextEditorComponent.prototype.observeConfig = function() {
      this.disposables.add(atom.config.onDidChange('editor.fontSize', this.sampleFontStyling));
      this.disposables.add(atom.config.onDidChange('editor.fontFamily', this.sampleFontStyling));
      return this.disposables.add(atom.config.onDidChange('editor.lineHeight', this.sampleFontStyling));
    };

    TextEditorComponent.prototype.onGrammarChanged = function() {
      var scope;
      if (this.scopedConfigDisposables != null) {
        this.scopedConfigDisposables.dispose();
        this.disposables.remove(this.scopedConfigDisposables);
      }
      this.scopedConfigDisposables = new CompositeDisposable;
      this.disposables.add(this.scopedConfigDisposables);
      scope = this.editor.getRootScopeDescriptor();
      return this.scopedConfigDisposables.add(atom.config.observe('editor.scrollSensitivity', {
        scope: scope
      }, this.setScrollSensitivity));
    };

    TextEditorComponent.prototype.focused = function() {
      if (this.mounted) {
        this.presenter.setFocused(true);
        return this.hiddenInputComponent.domNode.focus();
      }
    };

    TextEditorComponent.prototype.blurred = function() {
      if (this.mounted) {
        return this.presenter.setFocused(false);
      }
    };

    TextEditorComponent.prototype.onTextInput = function(event) {
      var inputNode, insertedRange, selectedLength;
      event.stopPropagation();
      if (event.data !== ' ') {
        event.preventDefault();
      }
      if (!this.isInputEnabled()) {
        return;
      }
      inputNode = event.target;
      selectedLength = inputNode.selectionEnd - inputNode.selectionStart;
      if (selectedLength === 1) {
        this.editor.selectLeft();
      }
      insertedRange = this.editor.transact(atom.config.get('editor.undoGroupingInterval'), (function(_this) {
        return function() {
          return _this.editor.insertText(event.data);
        };
      })(this));
      if (insertedRange) {
        return inputNode.value = event.data;
      }
    };

    TextEditorComponent.prototype.onVerticalScroll = function(scrollTop) {
      var animationFramePending;
      if (this.updateRequested || scrollTop === this.editor.getScrollTop()) {
        return;
      }
      animationFramePending = this.pendingScrollTop != null;
      this.pendingScrollTop = scrollTop;
      if (!animationFramePending) {
        return this.requestAnimationFrame((function(_this) {
          return function() {
            var pendingScrollTop;
            pendingScrollTop = _this.pendingScrollTop;
            _this.pendingScrollTop = null;
            return _this.presenter.setScrollTop(pendingScrollTop);
          };
        })(this));
      }
    };

    TextEditorComponent.prototype.onHorizontalScroll = function(scrollLeft) {
      var animationFramePending;
      if (this.updateRequested || scrollLeft === this.editor.getScrollLeft()) {
        return;
      }
      animationFramePending = this.pendingScrollLeft != null;
      this.pendingScrollLeft = scrollLeft;
      if (!animationFramePending) {
        return this.requestAnimationFrame((function(_this) {
          return function() {
            _this.presenter.setScrollLeft(_this.pendingScrollLeft);
            return _this.pendingScrollLeft = null;
          };
        })(this));
      }
    };

    TextEditorComponent.prototype.onMouseWheel = function(event) {
      var previousScrollLeft, previousScrollTop, wheelDeltaX, wheelDeltaY;
      wheelDeltaX = event.wheelDeltaX, wheelDeltaY = event.wheelDeltaY;
      if (event.ctrlKey && atom.config.get('editor.zoomFontWhenCtrlScrolling')) {
        if (wheelDeltaY > 0) {
          atom.workspace.increaseFontSize();
        } else if (wheelDeltaY < 0) {
          atom.workspace.decreaseFontSize();
        }
        event.preventDefault();
        return;
      }
      if (Math.abs(wheelDeltaX) > Math.abs(wheelDeltaY)) {
        previousScrollLeft = this.editor.getScrollLeft();
        this.presenter.setScrollLeft(previousScrollLeft - Math.round(wheelDeltaX * this.scrollSensitivity));
        if (previousScrollLeft !== this.editor.getScrollLeft()) {
          return event.preventDefault();
        }
      } else {
        this.presenter.setMouseWheelScreenRow(this.screenRowForNode(event.target));
        previousScrollTop = this.presenter.scrollTop;
        this.presenter.setScrollTop(previousScrollTop - Math.round(wheelDeltaY * this.scrollSensitivity));
        if (previousScrollTop !== this.editor.getScrollTop()) {
          return event.preventDefault();
        }
      }
    };

    TextEditorComponent.prototype.onScrollViewScroll = function() {
      if (this.mounted) {
        console.warn("TextEditorScrollView scrolled when it shouldn't have.");
        this.scrollViewNode.scrollTop = 0;
        return this.scrollViewNode.scrollLeft = 0;
      }
    };

    TextEditorComponent.prototype.onMouseDown = function(event) {
      var bufferRow, ctrlKey, detail, metaKey, screenPosition, shiftKey, _ref1, _ref2;
      if (!(event.button === 0 || (event.button === 1 && process.platform === 'linux'))) {
        return;
      }
      if ((_ref1 = event.target) != null ? _ref1.classList.contains('horizontal-scrollbar') : void 0) {
        return;
      }
      detail = event.detail, shiftKey = event.shiftKey, metaKey = event.metaKey, ctrlKey = event.ctrlKey;
      if (ctrlKey && process.platform === 'darwin') {
        return;
      }
      if (this.oldState.focused) {
        event.preventDefault();
      }
      screenPosition = this.screenPositionForMouseEvent(event);
      if ((_ref2 = event.target) != null ? _ref2.classList.contains('fold-marker') : void 0) {
        bufferRow = this.editor.bufferRowForScreenRow(screenPosition.row);
        this.editor.unfoldBufferRow(bufferRow);
        return;
      }
      switch (detail) {
        case 1:
          if (shiftKey) {
            this.editor.selectToScreenPosition(screenPosition);
          } else if (metaKey || (ctrlKey && process.platform !== 'darwin')) {
            this.editor.addCursorAtScreenPosition(screenPosition);
          } else {
            this.editor.setCursorScreenPosition(screenPosition);
          }
          break;
        case 2:
          this.editor.getLastSelection().selectWord();
          break;
        case 3:
          this.editor.getLastSelection().selectLine();
      }
      return this.handleDragUntilMouseUp(event, (function(_this) {
        return function(screenPosition) {
          return _this.editor.selectToScreenPosition(screenPosition);
        };
      })(this));
    };

    TextEditorComponent.prototype.onGutterMouseDown = function(event) {
      var ctrlKey, metaKey, shiftKey;
      if (event.button !== 0) {
        return;
      }
      shiftKey = event.shiftKey, metaKey = event.metaKey, ctrlKey = event.ctrlKey;
      if (shiftKey) {
        return this.onGutterShiftClick(event);
      } else if (metaKey || (ctrlKey && process.platform !== 'darwin')) {
        return this.onGutterMetaClick(event);
      } else {
        return this.onGutterClick(event);
      }
    };

    TextEditorComponent.prototype.onGutterClick = function(event) {
      var clickedBufferRow, clickedRow;
      clickedRow = this.screenPositionForMouseEvent(event).row;
      clickedBufferRow = this.editor.bufferRowForScreenRow(clickedRow);
      this.editor.setSelectedBufferRange([[clickedBufferRow, 0], [clickedBufferRow + 1, 0]], {
        preserveFolds: true
      });
      return this.handleDragUntilMouseUp(event, (function(_this) {
        return function(screenPosition) {
          var dragBufferRow, dragRow;
          dragRow = screenPosition.row;
          dragBufferRow = _this.editor.bufferRowForScreenRow(dragRow);
          if (dragBufferRow < clickedBufferRow) {
            return _this.editor.setSelectedBufferRange([[dragBufferRow, 0], [clickedBufferRow + 1, 0]], {
              preserveFolds: true
            });
          } else {
            return _this.editor.setSelectedBufferRange([[clickedBufferRow, 0], [dragBufferRow + 1, 0]], {
              preserveFolds: true
            });
          }
        };
      })(this));
    };

    TextEditorComponent.prototype.onGutterMetaClick = function(event) {
      var bufferRange, clickedBufferRow, clickedRow, rowSelection;
      clickedRow = this.screenPositionForMouseEvent(event).row;
      clickedBufferRow = this.editor.bufferRowForScreenRow(clickedRow);
      bufferRange = new Range([clickedBufferRow, 0], [clickedBufferRow + 1, 0]);
      rowSelection = this.editor.addSelectionForBufferRange(bufferRange, {
        preserveFolds: true
      });
      return this.handleDragUntilMouseUp(event, (function(_this) {
        return function(screenPosition) {
          var dragBufferRow, dragRow;
          dragRow = screenPosition.row;
          dragBufferRow = _this.editor.bufferRowForScreenRow(dragRow);
          if (dragBufferRow < clickedBufferRow) {
            rowSelection.setBufferRange([[dragBufferRow, 0], [clickedBufferRow + 1, 0]], {
              preserveFolds: true
            });
          } else {
            rowSelection.setBufferRange([[clickedBufferRow, 0], [dragBufferRow + 1, 0]], {
              preserveFolds: true
            });
          }
          _this.editor.mergeIntersectingSelections({
            preserveFolds: true
          });
          return rowSelection = _.find(_this.editor.getSelections(), function(selection) {
            return selection.intersectsBufferRange(bufferRange);
          });
        };
      })(this));
    };

    TextEditorComponent.prototype.onGutterShiftClick = function(event) {
      var clickedBufferRow, clickedRow, tailBufferPosition, tailPosition;
      clickedRow = this.screenPositionForMouseEvent(event).row;
      clickedBufferRow = this.editor.bufferRowForScreenRow(clickedRow);
      tailPosition = this.editor.getLastSelection().getTailScreenPosition();
      tailBufferPosition = this.editor.bufferPositionForScreenPosition(tailPosition);
      if (clickedRow < tailPosition.row) {
        this.editor.selectToBufferPosition([clickedBufferRow, 0]);
      } else {
        this.editor.selectToBufferPosition([clickedBufferRow + 1, 0]);
      }
      return this.handleDragUntilMouseUp(event, (function(_this) {
        return function(screenPosition) {
          var dragBufferRow, dragRow;
          dragRow = screenPosition.row;
          dragBufferRow = _this.editor.bufferRowForScreenRow(dragRow);
          if (dragRow < tailPosition.row) {
            return _this.editor.setSelectedBufferRange([[dragBufferRow, 0], tailBufferPosition], {
              preserveFolds: true
            });
          } else {
            return _this.editor.setSelectedBufferRange([tailBufferPosition, [dragBufferRow + 1, 0]], {
              preserveFolds: true
            });
          }
        };
      })(this));
    };

    TextEditorComponent.prototype.onStylesheetsChanged = function(styleElement) {
      if (!this.performedInitialMeasurement) {
        return;
      }
      if (!atom.themes.isInitialLoadComplete()) {
        return;
      }
      if (!this.stylingChangeAnimationFrameRequested) {
        this.stylingChangeAnimationFrameRequested = true;
        return requestAnimationFrame((function(_this) {
          return function() {
            _this.stylingChangeAnimationFrameRequested = false;
            if (_this.mounted) {
              if ((styleElement.sheet == null) || _this.containsScrollbarSelector(styleElement.sheet)) {
                _this.refreshScrollbars();
              }
              return _this.handleStylingChange();
            }
          };
        })(this));
      }
    };

    TextEditorComponent.prototype.onAllThemesLoaded = function() {
      this.refreshScrollbars();
      return this.handleStylingChange();
    };

    TextEditorComponent.prototype.handleStylingChange = function() {
      this.sampleFontStyling();
      this.sampleBackgroundColors();
      return this.remeasureCharacterWidths();
    };

    TextEditorComponent.prototype.onSelectionAdded = function(selection) {
      var selectionDisposables;
      selectionDisposables = new CompositeDisposable;
      selectionDisposables.add(selection.onDidChangeRange((function(_this) {
        return function() {
          return _this.onSelectionChanged(selection);
        };
      })(this)));
      selectionDisposables.add(selection.onDidDestroy((function(_this) {
        return function() {
          _this.onSelectionChanged(selection);
          selectionDisposables.dispose();
          return _this.disposables.remove(selectionDisposables);
        };
      })(this)));
      this.disposables.add(selectionDisposables);
      if (this.editor.selectionIntersectsVisibleRowRange(selection)) {
        return this.selectionChanged = true;
      }
    };

    TextEditorComponent.prototype.onSelectionChanged = function(selection) {
      if (this.editor.selectionIntersectsVisibleRowRange(selection)) {
        return this.selectionChanged = true;
      }
    };

    TextEditorComponent.prototype.onCursorAdded = function(cursor) {
      return this.disposables.add(cursor.onDidChangePosition(this.onCursorMoved));
    };

    TextEditorComponent.prototype.onCursorMoved = function() {
      return this.cursorMoved = true;
    };

    TextEditorComponent.prototype.handleDragUntilMouseUp = function(event, dragHandler) {
      var animationLoop, dragging, lastMousePosition, onMouseMove, onMouseUp, pasteSelectionClipboard, stopDragging;
      dragging = false;
      lastMousePosition = {};
      animationLoop = (function(_this) {
        return function() {
          return _this.requestAnimationFrame(function() {
            var screenPosition;
            if (dragging && _this.mounted) {
              screenPosition = _this.screenPositionForMouseEvent(lastMousePosition);
              dragHandler(screenPosition);
              return animationLoop();
            } else if (!_this.mounted) {
              return stopDragging();
            }
          });
        };
      })(this);
      onMouseMove = function(event) {
        lastMousePosition.clientX = event.clientX;
        lastMousePosition.clientY = event.clientY;
        if (!dragging) {
          dragging = true;
          animationLoop();
        }
        if (event.which === 0) {
          return onMouseUp();
        }
      };
      onMouseUp = (function(_this) {
        return function(event) {
          stopDragging();
          _this.editor.finalizeSelections();
          return pasteSelectionClipboard(event);
        };
      })(this);
      stopDragging = function() {
        dragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        return window.removeEventListener('mouseup', onMouseUp);
      };
      pasteSelectionClipboard = (function(_this) {
        return function(event) {
          var selection;
          if ((event != null ? event.which : void 0) === 2 && process.platform === 'linux') {
            if (selection = require('clipboard').readText('selection')) {
              return _this.editor.insertText(selection);
            }
          }
        };
      })(this);
      window.addEventListener('mousemove', onMouseMove);
      return window.addEventListener('mouseup', onMouseUp);
    };

    TextEditorComponent.prototype.isVisible = function() {
      return this.domNode.offsetHeight > 0 || this.domNode.offsetWidth > 0;
    };

    TextEditorComponent.prototype.pollDOM = function() {
      var _ref1;
      if (!this.checkForVisibilityChange()) {
        this.sampleBackgroundColors();
        this.measureDimensions();
        this.sampleFontStyling();
        return (_ref1 = this.overlayManager) != null ? _ref1.measureOverlays() : void 0;
      }
    };

    TextEditorComponent.prototype.checkForVisibilityChange = function() {
      if (this.isVisible()) {
        if (this.wasVisible) {
          return false;
        } else {
          this.becameVisible();
          return this.wasVisible = true;
        }
      } else {
        return this.wasVisible = false;
      }
    };

    TextEditorComponent.prototype.requestHeightAndWidthMeasurement = function() {
      if (this.heightAndWidthMeasurementRequested) {
        return;
      }
      this.heightAndWidthMeasurementRequested = true;
      return requestAnimationFrame((function(_this) {
        return function() {
          _this.heightAndWidthMeasurementRequested = false;
          _this.measureDimensions();
          return _this.measureWindowSize();
        };
      })(this));
    };

    TextEditorComponent.prototype.measureDimensions = function() {
      var clientWidth, height, paddingLeft, position;
      if (!this.mounted) {
        return;
      }
      position = getComputedStyle(this.hostElement).position;
      height = this.hostElement.style.height;
      if (position === 'absolute' || height) {
        this.presenter.setAutoHeight(false);
        height = this.hostElement.offsetHeight;
        if (height > 0) {
          this.presenter.setExplicitHeight(height);
        }
      } else {
        this.presenter.setAutoHeight(true);
        this.presenter.setExplicitHeight(null);
      }
      clientWidth = this.scrollViewNode.clientWidth;
      paddingLeft = parseInt(getComputedStyle(this.scrollViewNode).paddingLeft);
      clientWidth -= paddingLeft;
      if (clientWidth > 0) {
        this.presenter.setContentFrameWidth(clientWidth);
      }
      return this.presenter.setBoundingClientRect(this.hostElement.getBoundingClientRect());
    };

    TextEditorComponent.prototype.measureWindowSize = function() {
      if (!this.mounted) {
        return;
      }
      return this.presenter.setWindowSize(window.innerWidth, window.innerHeight);
    };

    TextEditorComponent.prototype.sampleFontStyling = function() {
      var oldFontFamily, oldFontSize, oldLineHeight, _ref1;
      oldFontSize = this.fontSize;
      oldFontFamily = this.fontFamily;
      oldLineHeight = this.lineHeight;
      _ref1 = getComputedStyle(this.getTopmostDOMNode()), this.fontSize = _ref1.fontSize, this.fontFamily = _ref1.fontFamily, this.lineHeight = _ref1.lineHeight;
      if (this.fontSize !== oldFontSize || this.fontFamily !== oldFontFamily || this.lineHeight !== oldLineHeight) {
        this.measureLineHeightAndDefaultCharWidth();
      }
      if ((this.fontSize !== oldFontSize || this.fontFamily !== oldFontFamily) && this.performedInitialMeasurement) {
        return this.remeasureCharacterWidths();
      }
    };

    TextEditorComponent.prototype.sampleBackgroundColors = function(suppressUpdate) {
      var backgroundColor, gutterBackgroundColor;
      backgroundColor = getComputedStyle(this.hostElement).backgroundColor;
      this.presenter.setBackgroundColor(backgroundColor);
      if (this.gutterComponent != null) {
        gutterBackgroundColor = getComputedStyle(this.gutterComponent.domNode).backgroundColor;
        return this.presenter.setGutterBackgroundColor(gutterBackgroundColor);
      }
    };

    TextEditorComponent.prototype.measureLineHeightAndDefaultCharWidth = function() {
      if (this.isVisible()) {
        this.measureLineHeightAndDefaultCharWidthWhenShown = false;
        return this.linesComponent.measureLineHeightAndDefaultCharWidth();
      } else {
        return this.measureLineHeightAndDefaultCharWidthWhenShown = true;
      }
    };

    TextEditorComponent.prototype.remeasureCharacterWidths = function() {
      if (this.isVisible()) {
        this.remeasureCharacterWidthsWhenShown = false;
        return this.linesComponent.remeasureCharacterWidths();
      } else {
        return this.remeasureCharacterWidthsWhenShown = true;
      }
    };

    TextEditorComponent.prototype.measureScrollbars = function() {
      var cornerNode, height, originalDisplayValue, width;
      this.measureScrollbarsWhenShown = false;
      cornerNode = this.scrollbarCornerComponent.domNode;
      originalDisplayValue = cornerNode.style.display;
      cornerNode.style.display = 'block';
      width = (cornerNode.offsetWidth - cornerNode.clientWidth) || 15;
      height = (cornerNode.offsetHeight - cornerNode.clientHeight) || 15;
      this.presenter.setVerticalScrollbarWidth(width);
      this.presenter.setHorizontalScrollbarHeight(height);
      return cornerNode.style.display = originalDisplayValue;
    };

    TextEditorComponent.prototype.containsScrollbarSelector = function(stylesheet) {
      var rule, _i, _len, _ref1, _ref2;
      _ref1 = stylesheet.cssRules;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        rule = _ref1[_i];
        if (((_ref2 = rule.selectorText) != null ? _ref2.indexOf('scrollbar') : void 0) > -1) {
          return true;
        }
      }
      return false;
    };

    TextEditorComponent.prototype.refreshScrollbars = function() {
      var cornerNode, horizontalNode, originalCornerDisplayValue, originalHorizontalDisplayValue, originalVerticalDisplayValue, verticalNode;
      if (this.isVisible()) {
        this.measureScrollbarsWhenShown = false;
      } else {
        this.measureScrollbarsWhenShown = true;
        return;
      }
      verticalNode = this.verticalScrollbarComponent.domNode;
      horizontalNode = this.horizontalScrollbarComponent.domNode;
      cornerNode = this.scrollbarCornerComponent.domNode;
      originalVerticalDisplayValue = verticalNode.style.display;
      originalHorizontalDisplayValue = horizontalNode.style.display;
      originalCornerDisplayValue = cornerNode.style.display;
      verticalNode.style.display = 'none';
      horizontalNode.style.display = 'none';
      cornerNode.style.display = 'none';
      cornerNode.offsetWidth;
      this.measureScrollbars();
      verticalNode.style.display = originalVerticalDisplayValue;
      horizontalNode.style.display = originalHorizontalDisplayValue;
      return cornerNode.style.display = originalCornerDisplayValue;
    };

    TextEditorComponent.prototype.consolidateSelections = function(e) {
      if (!this.editor.consolidateSelections()) {
        return e.abortKeyBinding();
      }
    };

    TextEditorComponent.prototype.lineNodeForScreenRow = function(screenRow) {
      return this.linesComponent.lineNodeForScreenRow(screenRow);
    };

    TextEditorComponent.prototype.lineNumberNodeForScreenRow = function(screenRow) {
      return this.gutterComponent.lineNumberNodeForScreenRow(screenRow);
    };

    TextEditorComponent.prototype.screenRowForNode = function(node) {
      var screenRow;
      while (node != null) {
        if (screenRow = node.dataset.screenRow) {
          return parseInt(screenRow);
        }
        node = node.parentElement;
      }
      return null;
    };

    TextEditorComponent.prototype.getFontSize = function() {
      return parseInt(getComputedStyle(this.getTopmostDOMNode()).fontSize);
    };

    TextEditorComponent.prototype.setFontSize = function(fontSize) {
      this.getTopmostDOMNode().style.fontSize = fontSize + 'px';
      return this.sampleFontStyling();
    };

    TextEditorComponent.prototype.getFontFamily = function() {
      return getComputedStyle(this.getTopmostDOMNode()).fontFamily;
    };

    TextEditorComponent.prototype.setFontFamily = function(fontFamily) {
      this.getTopmostDOMNode().style.fontFamily = fontFamily;
      return this.sampleFontStyling();
    };

    TextEditorComponent.prototype.setLineHeight = function(lineHeight) {
      this.getTopmostDOMNode().style.lineHeight = lineHeight;
      return this.sampleFontStyling();
    };

    TextEditorComponent.prototype.setShowIndentGuide = function(showIndentGuide) {
      return atom.config.set("editor.showIndentGuide", showIndentGuide);
    };

    TextEditorComponent.prototype.setScrollSensitivity = function(scrollSensitivity) {
      if (scrollSensitivity = parseInt(scrollSensitivity)) {
        return this.scrollSensitivity = Math.abs(scrollSensitivity) / 100;
      }
    };

    TextEditorComponent.prototype.screenPositionForMouseEvent = function(event) {
      var pixelPosition;
      pixelPosition = this.pixelPositionForMouseEvent(event);
      return this.editor.screenPositionForPixelPosition(pixelPosition);
    };

    TextEditorComponent.prototype.pixelPositionForMouseEvent = function(event) {
      var clientX, clientY, left, linesClientRect, top;
      clientX = event.clientX, clientY = event.clientY;
      linesClientRect = this.linesComponent.domNode.getBoundingClientRect();
      top = clientY - linesClientRect.top;
      left = clientX - linesClientRect.left;
      return {
        top: top,
        left: left
      };
    };

    TextEditorComponent.prototype.getModel = function() {
      return this.editor;
    };

    TextEditorComponent.prototype.isInputEnabled = function() {
      return this.inputEnabled;
    };

    TextEditorComponent.prototype.setInputEnabled = function(inputEnabled) {
      this.inputEnabled = inputEnabled;
      return this.inputEnabled;
    };

    TextEditorComponent.prototype.updateParentViewFocusedClassIfNeeded = function() {
      if (this.oldState.focused !== this.newState.focused) {
        this.hostElement.classList.toggle('is-focused', this.newState.focused);
        this.rootElement.classList.toggle('is-focused', this.newState.focused);
        return this.oldState.focused = this.newState.focused;
      }
    };

    TextEditorComponent.prototype.updateParentViewMiniClass = function() {
      this.hostElement.classList.toggle('mini', this.editor.isMini());
      return this.rootElement.classList.toggle('mini', this.editor.isMini());
    };

    return TextEditorComponent;

  })();

  if (grim.includeDeprecatedAPIs) {
    TextEditorComponent.prototype.setInvisibles = function(invisibles) {
      if (invisibles == null) {
        invisibles = {};
      }
      grim.deprecate("Use config.set('editor.invisibles', invisibles) instead");
      return atom.config.set('editor.invisibles', invisibles);
    };
    TextEditorComponent.prototype.setShowInvisibles = function(showInvisibles) {
      grim.deprecate("Use config.set('editor.showInvisibles', showInvisibles) instead");
      return atom.config.set('editor.showInvisibles', showInvisibles);
    };
  }

}).call(this);

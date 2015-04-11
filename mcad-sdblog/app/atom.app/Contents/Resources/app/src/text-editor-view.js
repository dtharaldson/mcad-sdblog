(function() {
  var $, TextBuffer, TextEditor, TextEditorComponent, TextEditorElement, TextEditorView, View, defaults, deprecate, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  _ref = require('space-pen'), View = _ref.View, $ = _ref.$;

  defaults = require('underscore-plus').defaults;

  TextBuffer = require('text-buffer');

  TextEditor = require('./text-editor');

  TextEditorElement = require('./text-editor-element');

  TextEditorComponent = require('./text-editor-component');

  deprecate = require('grim').deprecate;

  module.exports = TextEditorView = (function(_super) {
    __extends(TextEditorView, _super);

    function TextEditorView(modelOrParams, props) {
      var attributes, editor, element, mini, model, name, placeholderText, value;
      if (!(modelOrParams instanceof HTMLElement)) {
        if (modelOrParams instanceof TextEditor) {
          model = modelOrParams;
        } else {
          editor = modelOrParams.editor, mini = modelOrParams.mini, placeholderText = modelOrParams.placeholderText, attributes = modelOrParams.attributes;
          model = editor != null ? editor : new TextEditor({
            buffer: new TextBuffer,
            softWrapped: false,
            tabLength: 2,
            softTabs: true,
            mini: mini,
            placeholderText: placeholderText
          });
        }
        element = new TextEditorElement;
        element.lineOverdrawMargin = props != null ? props.lineOverdrawMargin : void 0;
        if (attributes != null) {
          for (name in attributes) {
            value = attributes[name];
            element.setAttribute(name, value);
          }
        }
        element.setModel(model);
        return element.__spacePenView;
      }
      this.element = modelOrParams;
      TextEditorView.__super__.constructor.apply(this, arguments);
    }

    TextEditorView.prototype.setModel = function(model) {
      this.model = model;
      this.editor = this.model;
      this.root = $(this.element.rootElement);
      this.scrollView = this.root.find('.scroll-view');
      if (atom.config.get('editor.useShadowDOM')) {
        this.underlayer = $("<div class='underlayer'></div>").appendTo(this);
        this.overlayer = $("<div class='overlayer'></div>").appendTo(this);
      } else {
        this.underlayer = this.find('.highlights').addClass('underlayer');
        this.overlayer = this.find('.lines').addClass('overlayer');
      }
      this.hiddenInput = this.root.find('.hidden-input');
      this.hiddenInput.on = (function(_this) {
        return function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          if (args[0] === 'focusout') {
            args[0] = 'blur';
          }
          return $.prototype.on.apply(_this, args);
        };
      })(this);
      return this.subscribe(atom.config.observe('editor.showLineNumbers', (function(_this) {
        return function() {
          _this.gutter = _this.root.find('.gutter');
          _this.gutter.removeClassFromAllLines = function(klass) {
            deprecate('Use decorations instead: http://blog.atom.io/2014/07/24/decorations.html');
            return _this.gutter.find('.line-number').removeClass(klass);
          };
          _this.gutter.getLineNumberElement = function(bufferRow) {
            deprecate('Use decorations instead: http://blog.atom.io/2014/07/24/decorations.html');
            return _this.gutter.find("[data-buffer-row='" + bufferRow + "']");
          };
          return _this.gutter.addClassToLine = function(bufferRow, klass) {
            var lines;
            deprecate('Use decorations instead: http://blog.atom.io/2014/07/24/decorations.html');
            lines = _this.gutter.find("[data-buffer-row='" + bufferRow + "']");
            lines.addClass(klass);
            return lines.length > 0;
          };
        };
      })(this)));
    };

    TextEditorView.prototype.find = function() {
      var shadowResult;
      shadowResult = this.root.find.apply(this.root, arguments);
      if (shadowResult.length > 0) {
        return shadowResult;
      } else {
        return TextEditorView.__super__.find.apply(this, arguments);
      }
    };

    TextEditorView.prototype.getModel = function() {
      return this.model;
    };

    TextEditorView.prototype.getEditor = function() {
      return this.model;
    };

    Object.defineProperty(TextEditorView.prototype, 'lineHeight', {
      get: function() {
        return this.model.getLineHeightInPixels();
      }
    });

    Object.defineProperty(TextEditorView.prototype, 'charWidth', {
      get: function() {
        return this.model.getDefaultCharWidth();
      }
    });

    Object.defineProperty(TextEditorView.prototype, 'firstRenderedScreenRow', {
      get: function() {
        return this.component.getRenderedRowRange()[0];
      }
    });

    Object.defineProperty(TextEditorView.prototype, 'lastRenderedScreenRow', {
      get: function() {
        return this.component.getRenderedRowRange()[1];
      }
    });

    Object.defineProperty(TextEditorView.prototype, 'active', {
      get: function() {
        var _ref1;
        return this.is((_ref1 = this.getPaneView()) != null ? _ref1.activeView : void 0);
      }
    });

    Object.defineProperty(TextEditorView.prototype, 'isFocused', {
      get: function() {
        var _ref1, _ref2;
        return document.activeElement === this.element || document.activeElement === ((_ref1 = this.element.component) != null ? (_ref2 = _ref1.hiddenInputComponent) != null ? _ref2.domNode : void 0 : void 0);
      }
    });

    Object.defineProperty(TextEditorView.prototype, 'mini', {
      get: function() {
        var _ref1;
        return (_ref1 = this.model) != null ? _ref1.isMini() : void 0;
      }
    });

    Object.defineProperty(TextEditorView.prototype, 'component', {
      get: function() {
        var _ref1;
        return (_ref1 = this.element) != null ? _ref1.component : void 0;
      }
    });

    TextEditorView.prototype.afterAttach = function(onDom) {
      if (!onDom) {
        return;
      }
      if (this.attached) {
        return;
      }
      this.attached = true;
      return this.trigger('editor:attached', [this]);
    };

    TextEditorView.prototype.beforeRemove = function() {
      this.trigger('editor:detached', [this]);
      this.trigger('editor:will-be-removed', [this]);
      return this.attached = false;
    };

    TextEditorView.prototype.remove = function(selector, keepData) {
      if (!keepData) {
        this.model.destroy();
      }
      return TextEditorView.__super__.remove.apply(this, arguments);
    };

    TextEditorView.prototype.scrollTop = function(scrollTop) {
      if (scrollTop != null) {
        return this.model.setScrollTop(scrollTop);
      } else {
        return this.model.getScrollTop();
      }
    };

    TextEditorView.prototype.scrollLeft = function(scrollLeft) {
      if (scrollLeft != null) {
        return this.model.setScrollLeft(scrollLeft);
      } else {
        return this.model.getScrollLeft();
      }
    };

    TextEditorView.prototype.scrollToBottom = function() {
      deprecate('Use TextEditor::scrollToBottom instead. You can get the editor via editorView.getModel()');
      return this.model.setScrollBottom(Infinity);
    };

    TextEditorView.prototype.scrollToScreenPosition = function(screenPosition, options) {
      deprecate('Use TextEditor::scrollToScreenPosition instead. You can get the editor via editorView.getModel()');
      return this.model.scrollToScreenPosition(screenPosition, options);
    };

    TextEditorView.prototype.scrollToBufferPosition = function(bufferPosition, options) {
      deprecate('Use TextEditor::scrollToBufferPosition instead. You can get the editor via editorView.getModel()');
      return this.model.scrollToBufferPosition(bufferPosition, options);
    };

    TextEditorView.prototype.scrollToCursorPosition = function() {
      deprecate('Use TextEditor::scrollToCursorPosition instead. You can get the editor via editorView.getModel()');
      return this.model.scrollToCursorPosition();
    };

    TextEditorView.prototype.pixelPositionForBufferPosition = function(bufferPosition) {
      deprecate('Use TextEditorElement::pixelPositionForBufferPosition instead. You can get the editor via editorView.getModel()');
      return this.model.pixelPositionForBufferPosition(bufferPosition, true);
    };

    TextEditorView.prototype.pixelPositionForScreenPosition = function(screenPosition) {
      deprecate('Use TextEditorElement::pixelPositionForScreenPosition instead. You can get the editor via editorView.getModel()');
      return this.model.pixelPositionForScreenPosition(screenPosition, true);
    };

    TextEditorView.prototype.appendToLinesView = function(view) {
      view.css('position', 'absolute');
      view.css('z-index', 1);
      return this.overlayer.append(view);
    };

    TextEditorView.prototype.splitLeft = function() {
      var pane;
      deprecate("Use Pane::splitLeft instead.\nTo duplicate this editor into the split use:\neditorView.getPaneView().getModel().splitLeft(copyActiveItem: true)");
      pane = this.getPaneView();
      return pane != null ? pane.splitLeft(pane != null ? pane.copyActiveItem() : void 0).activeView : void 0;
    };

    TextEditorView.prototype.splitRight = function() {
      var pane;
      deprecate("Use Pane::splitRight instead.\nTo duplicate this editor into the split use:\neditorView.getPaneView().getModel().splitRight(copyActiveItem: true)");
      pane = this.getPaneView();
      return pane != null ? pane.splitRight(pane != null ? pane.copyActiveItem() : void 0).activeView : void 0;
    };

    TextEditorView.prototype.splitUp = function() {
      var pane;
      deprecate("Use Pane::splitUp instead.\nTo duplicate this editor into the split use:\neditorView.getPaneView().getModel().splitUp(copyActiveItem: true)");
      pane = this.getPaneView();
      return pane != null ? pane.splitUp(pane != null ? pane.copyActiveItem() : void 0).activeView : void 0;
    };

    TextEditorView.prototype.splitDown = function() {
      var pane;
      deprecate("Use Pane::splitDown instead.\nTo duplicate this editor into the split use:\neditorView.getPaneView().getModel().splitDown(copyActiveItem: true)");
      pane = this.getPaneView();
      return pane != null ? pane.splitDown(pane != null ? pane.copyActiveItem() : void 0).activeView : void 0;
    };

    TextEditorView.prototype.getPaneView = function() {
      return this.parent('.item-views').parents('atom-pane').view();
    };

    TextEditorView.prototype.getPane = function() {
      deprecate('Use TextEditorView::getPaneView() instead');
      return this.getPaneView();
    };

    TextEditorView.prototype.show = function() {
      var _ref1;
      TextEditorView.__super__.show.apply(this, arguments);
      return (_ref1 = this.component) != null ? _ref1.checkForVisibilityChange() : void 0;
    };

    TextEditorView.prototype.hide = function() {
      var _ref1;
      TextEditorView.__super__.hide.apply(this, arguments);
      return (_ref1 = this.component) != null ? _ref1.checkForVisibilityChange() : void 0;
    };

    TextEditorView.prototype.pageDown = function() {
      deprecate('Use editorView.getModel().pageDown()');
      return this.model.pageDown();
    };

    TextEditorView.prototype.pageUp = function() {
      deprecate('Use editorView.getModel().pageUp()');
      return this.model.pageUp();
    };

    TextEditorView.prototype.getFirstVisibleScreenRow = function() {
      deprecate('Use TextEditorElement::getFirstVisibleScreenRow instead.');
      return this.model.getFirstVisibleScreenRow(true);
    };

    TextEditorView.prototype.getLastVisibleScreenRow = function() {
      deprecate('Use TextEditor::getLastVisibleScreenRow instead. You can get the editor via editorView.getModel()');
      return this.model.getLastVisibleScreenRow();
    };

    TextEditorView.prototype.getFontFamily = function() {
      var _ref1;
      deprecate('This is going away. Use atom.config.get("editor.fontFamily") instead');
      return (_ref1 = this.component) != null ? _ref1.getFontFamily() : void 0;
    };

    TextEditorView.prototype.setFontFamily = function(fontFamily) {
      var _ref1;
      deprecate('This is going away. Use atom.config.set("editor.fontFamily", "my-font") instead');
      return (_ref1 = this.component) != null ? _ref1.setFontFamily(fontFamily) : void 0;
    };

    TextEditorView.prototype.getFontSize = function() {
      var _ref1;
      deprecate('This is going away. Use atom.config.get("editor.fontSize") instead');
      return (_ref1 = this.component) != null ? _ref1.getFontSize() : void 0;
    };

    TextEditorView.prototype.setFontSize = function(fontSize) {
      var _ref1;
      deprecate('This is going away. Use atom.config.set("editor.fontSize", 12) instead');
      return (_ref1 = this.component) != null ? _ref1.setFontSize(fontSize) : void 0;
    };

    TextEditorView.prototype.setLineHeight = function(lineHeight) {
      deprecate('This is going away. Use atom.config.set("editor.lineHeight", 1.5) instead');
      return this.component.setLineHeight(lineHeight);
    };

    TextEditorView.prototype.setWidthInChars = function(widthInChars) {
      return this.component.getDOMNode().style.width = (this.model.getDefaultCharWidth() * widthInChars) + 'px';
    };

    TextEditorView.prototype.setShowIndentGuide = function(showIndentGuide) {
      deprecate('This is going away. Use atom.config.set("editor.showIndentGuide", true|false) instead');
      return atom.config.set("editor.showIndentGuide", showIndentGuide);
    };

    TextEditorView.prototype.setSoftWrap = function(softWrapped) {
      deprecate('Use TextEditor::setSoftWrapped instead. You can get the editor via editorView.getModel()');
      return this.model.setSoftWrapped(softWrapped);
    };

    TextEditorView.prototype.setShowInvisibles = function(showInvisibles) {
      deprecate('This is going away. Use atom.config.set("editor.showInvisibles", true|false) instead');
      return this.component.setShowInvisibles(showInvisibles);
    };

    TextEditorView.prototype.getText = function() {
      return this.model.getText();
    };

    TextEditorView.prototype.setText = function(text) {
      return this.model.setText(text);
    };

    TextEditorView.prototype.insertText = function(text) {
      return this.model.insertText(text);
    };

    TextEditorView.prototype.isInputEnabled = function() {
      return this.component.isInputEnabled();
    };

    TextEditorView.prototype.setInputEnabled = function(inputEnabled) {
      return this.component.setInputEnabled(inputEnabled);
    };

    TextEditorView.prototype.requestDisplayUpdate = function() {
      return deprecate('Please remove from your code. ::requestDisplayUpdate no longer does anything');
    };

    TextEditorView.prototype.updateDisplay = function() {
      return deprecate('Please remove from your code. ::updateDisplay no longer does anything');
    };

    TextEditorView.prototype.resetDisplay = function() {
      return deprecate('Please remove from your code. ::resetDisplay no longer does anything');
    };

    TextEditorView.prototype.redraw = function() {
      return deprecate('Please remove from your code. ::redraw no longer does anything');
    };

    TextEditorView.prototype.setPlaceholderText = function(placeholderText) {
      deprecate('Use TextEditor::setPlaceholderText instead. eg. editorView.getModel().setPlaceholderText(text)');
      return this.model.setPlaceholderText(placeholderText);
    };

    TextEditorView.prototype.lineElementForScreenRow = function(screenRow) {
      return $(this.component.lineNodeForScreenRow(screenRow));
    };

    return TextEditorView;

  })(View);

}).call(this);

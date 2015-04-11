(function() {
  var $, Emitter, Grim, Path, ShadowStyleSheet, TextBuffer, TextEditor, TextEditorComponent, TextEditorElement, TextEditorView, View, callRemoveHooks, defaults, stopEventPropagation, stopEventPropagationAndGroupUndo, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Emitter = require('event-kit').Emitter;

  _ref = require('space-pen'), View = _ref.View, $ = _ref.$, callRemoveHooks = _ref.callRemoveHooks;

  Path = require('path');

  defaults = require('underscore-plus').defaults;

  TextBuffer = require('text-buffer');

  Grim = require('grim');

  TextEditor = require('./text-editor');

  TextEditorComponent = require('./text-editor-component');

  TextEditorView = null;

  ShadowStyleSheet = null;

  TextEditorElement = (function(_super) {
    __extends(TextEditorElement, _super);

    function TextEditorElement() {
      return TextEditorElement.__super__.constructor.apply(this, arguments);
    }

    TextEditorElement.prototype.model = null;

    TextEditorElement.prototype.componentDescriptor = null;

    TextEditorElement.prototype.component = null;

    TextEditorElement.prototype.attached = false;

    TextEditorElement.prototype.lineOverdrawMargin = null;

    TextEditorElement.prototype.focusOnAttach = false;

    TextEditorElement.prototype.createdCallback = function() {
      this.emitter = new Emitter;
      this.initializeContent();
      if (Grim.includeDeprecatedAPIs) {
        this.createSpacePenShim();
      }
      this.addEventListener('focus', this.focused.bind(this));
      return this.addEventListener('blur', this.blurred.bind(this));
    };

    TextEditorElement.prototype.initializeContent = function(attributes) {
      this.classList.add('editor');
      this.setAttribute('tabindex', -1);
      if (atom.config.get('editor.useShadowDOM')) {
        this.useShadowDOM = true;
        if (ShadowStyleSheet == null) {
          ShadowStyleSheet = document.createElement('style');
          ShadowStyleSheet.textContent = atom.themes.loadLessStylesheet(require.resolve('../static/text-editor-shadow.less'));
        }
        this.createShadowRoot();
        this.shadowRoot.appendChild(ShadowStyleSheet.cloneNode(true));
        this.stylesElement = document.createElement('atom-styles');
        this.stylesElement.setAttribute('context', 'atom-text-editor');
        this.stylesElement.initialize();
        this.rootElement = document.createElement('div');
        this.rootElement.classList.add('editor--private');
        this.shadowRoot.appendChild(this.stylesElement);
        return this.shadowRoot.appendChild(this.rootElement);
      } else {
        this.useShadowDOM = false;
        this.classList.add('editor', 'editor-colors');
        this.stylesElement = document.head.querySelector('atom-styles');
        return this.rootElement = this;
      }
    };

    TextEditorElement.prototype.createSpacePenShim = function() {
      if (TextEditorView == null) {
        TextEditorView = require('./text-editor-view');
      }
      return this.__spacePenView = new TextEditorView(this);
    };

    TextEditorElement.prototype.attachedCallback = function() {
      if (this.getModel() == null) {
        this.buildModel();
      }
      if (this.component == null) {
        this.mountComponent();
      }
      this.component.checkForVisibilityChange();
      if (this === document.activeElement) {
        this.focused();
      }
      return this.emitter.emit("did-attach");
    };

    TextEditorElement.prototype.detachedCallback = function() {
      this.unmountComponent();
      return this.emitter.emit("did-detach");
    };

    TextEditorElement.prototype.initialize = function(model) {
      this.setModel(model);
      return this;
    };

    TextEditorElement.prototype.setModel = function(model) {
      if (this.model != null) {
        throw new Error("Model already assigned on TextEditorElement");
      }
      if (model.isDestroyed()) {
        return;
      }
      this.model = model;
      this.mountComponent();
      this.addGrammarScopeAttribute();
      this.addMiniAttributeIfNeeded();
      this.addEncodingAttribute();
      this.model.onDidChangeGrammar((function(_this) {
        return function() {
          return _this.addGrammarScopeAttribute();
        };
      })(this));
      this.model.onDidChangeEncoding((function(_this) {
        return function() {
          return _this.addEncodingAttribute();
        };
      })(this));
      this.model.onDidDestroy((function(_this) {
        return function() {
          return _this.unmountComponent();
        };
      })(this));
      if (Grim.includeDeprecatedAPIs) {
        this.__spacePenView.setModel(this.model);
      }
      return this.model;
    };

    TextEditorElement.prototype.getModel = function() {
      var _ref1;
      return (_ref1 = this.model) != null ? _ref1 : this.buildModel();
    };

    TextEditorElement.prototype.buildModel = function() {
      return this.setModel(new TextEditor({
        buffer: new TextBuffer(this.textContent),
        softWrapped: false,
        tabLength: 2,
        softTabs: true,
        mini: this.hasAttribute('mini'),
        gutterVisible: !this.hasAttribute('gutter-hidden'),
        placeholderText: this.getAttribute('placeholder-text')
      }));
    };

    TextEditorElement.prototype.mountComponent = function() {
      var inputNode;
      this.component = new TextEditorComponent({
        hostElement: this,
        rootElement: this.rootElement,
        stylesElement: this.stylesElement,
        editor: this.model,
        lineOverdrawMargin: this.lineOverdrawMargin,
        useShadowDOM: this.useShadowDOM
      });
      this.rootElement.appendChild(this.component.domNode);
      if (this.useShadowDOM) {
        return this.shadowRoot.addEventListener('blur', this.shadowRootBlurred.bind(this), true);
      } else {
        inputNode = this.component.hiddenInputComponent.domNode;
        inputNode.addEventListener('focus', this.focused.bind(this));
        return inputNode.addEventListener('blur', (function(_this) {
          return function() {
            return _this.dispatchEvent(new FocusEvent('blur', {
              bubbles: false
            }));
          };
        })(this));
      }
    };

    TextEditorElement.prototype.unmountComponent = function() {
      callRemoveHooks(this);
      if (this.component != null) {
        this.component.destroy();
        this.component.domNode.remove();
        return this.component = null;
      }
    };

    TextEditorElement.prototype.focused = function() {
      var _ref1;
      return (_ref1 = this.component) != null ? _ref1.focused() : void 0;
    };

    TextEditorElement.prototype.blurred = function(event) {
      var _ref1;
      if (!this.useShadowDOM) {
        if (event.relatedTarget === this.component.hiddenInputComponent.domNode) {
          event.stopImmediatePropagation();
          return;
        }
      }
      return (_ref1 = this.component) != null ? _ref1.blurred() : void 0;
    };

    TextEditorElement.prototype.shadowRootBlurred = function(event) {
      if (event.relatedTarget === this) {
        return this.component.focused();
      }
    };

    TextEditorElement.prototype.addGrammarScopeAttribute = function() {
      var grammarScope, _ref1, _ref2;
      grammarScope = (_ref1 = this.model.getGrammar()) != null ? (_ref2 = _ref1.scopeName) != null ? _ref2.replace(/\./g, ' ') : void 0 : void 0;
      return this.dataset.grammar = grammarScope;
    };

    TextEditorElement.prototype.addMiniAttributeIfNeeded = function() {
      if (this.model.isMini()) {
        return this.setAttributeNode(document.createAttribute("mini"));
      }
    };

    TextEditorElement.prototype.addEncodingAttribute = function() {
      return this.dataset.encoding = this.model.getEncoding();
    };

    TextEditorElement.prototype.hasFocus = function() {
      return this === document.activeElement || this.contains(document.activeElement);
    };

    TextEditorElement.prototype.setUpdatedSynchronously = function(updatedSynchronously) {
      this.updatedSynchronously = updatedSynchronously;
      return this.updatedSynchronously;
    };

    TextEditorElement.prototype.isUpdatedSynchronously = function() {
      return this.updatedSynchronously;
    };

    TextEditorElement.prototype.getDefaultCharacterWidth = function() {
      return this.getModel().getDefaultCharWidth();
    };

    TextEditorElement.prototype.pixelPositionForBufferPosition = function(bufferPosition) {
      return this.getModel().pixelPositionForBufferPosition(bufferPosition, true);
    };

    TextEditorElement.prototype.pixelPositionForScreenPosition = function(screenPosition) {
      return this.getModel().pixelPositionForScreenPosition(screenPosition, true);
    };

    TextEditorElement.prototype.getFirstVisibleScreenRow = function() {
      return this.getModel().getFirstVisibleScreenRow(true);
    };

    TextEditorElement.prototype.getLastVisibleScreenRow = function() {
      return this.getModel().getLastVisibleScreenRow(true);
    };

    TextEditorElement.prototype.onDidAttach = function(callback) {
      return this.emitter.on("did-attach", callback);
    };

    TextEditorElement.prototype.onDidDetach = function(callback) {
      return this.emitter.on("did-detach", callback);
    };

    return TextEditorElement;

  })(HTMLElement);

  stopEventPropagation = function(commandListeners) {
    var commandListener, commandName, newCommandListeners, _fn;
    newCommandListeners = {};
    _fn = function(commandListener) {
      return newCommandListeners[commandName] = function(event) {
        event.stopPropagation();
        return commandListener.call(this.getModel(), event);
      };
    };
    for (commandName in commandListeners) {
      commandListener = commandListeners[commandName];
      _fn(commandListener);
    }
    return newCommandListeners;
  };

  stopEventPropagationAndGroupUndo = function(commandListeners) {
    var commandListener, commandName, newCommandListeners, _fn;
    newCommandListeners = {};
    _fn = function(commandListener) {
      return newCommandListeners[commandName] = function(event) {
        var model;
        event.stopPropagation();
        model = this.getModel();
        return model.transact(atom.config.get('editor.undoGroupingInterval'), function() {
          return commandListener.call(model, event);
        });
      };
    };
    for (commandName in commandListeners) {
      commandListener = commandListeners[commandName];
      _fn(commandListener);
    }
    return newCommandListeners;
  };

  atom.commands.add('atom-text-editor', stopEventPropagation({
    'core:undo': function() {
      return this.undo();
    },
    'core:redo': function() {
      return this.redo();
    },
    'core:move-left': function() {
      return this.moveLeft();
    },
    'core:move-right': function() {
      return this.moveRight();
    },
    'core:select-left': function() {
      return this.selectLeft();
    },
    'core:select-right': function() {
      return this.selectRight();
    },
    'core:select-all': function() {
      return this.selectAll();
    },
    'editor:move-to-previous-word': function() {
      return this.moveToPreviousWord();
    },
    'editor:select-word': function() {
      return this.selectWordsContainingCursors();
    },
    'editor:consolidate-selections': function(event) {
      if (!this.consolidateSelections()) {
        return event.abortKeyBinding();
      }
    },
    'editor:move-to-beginning-of-next-paragraph': function() {
      return this.moveToBeginningOfNextParagraph();
    },
    'editor:move-to-beginning-of-previous-paragraph': function() {
      return this.moveToBeginningOfPreviousParagraph();
    },
    'editor:move-to-beginning-of-screen-line': function() {
      return this.moveToBeginningOfScreenLine();
    },
    'editor:move-to-beginning-of-line': function() {
      return this.moveToBeginningOfLine();
    },
    'editor:move-to-end-of-screen-line': function() {
      return this.moveToEndOfScreenLine();
    },
    'editor:move-to-end-of-line': function() {
      return this.moveToEndOfLine();
    },
    'editor:move-to-first-character-of-line': function() {
      return this.moveToFirstCharacterOfLine();
    },
    'editor:move-to-beginning-of-word': function() {
      return this.moveToBeginningOfWord();
    },
    'editor:move-to-end-of-word': function() {
      return this.moveToEndOfWord();
    },
    'editor:move-to-beginning-of-next-word': function() {
      return this.moveToBeginningOfNextWord();
    },
    'editor:move-to-previous-word-boundary': function() {
      return this.moveToPreviousWordBoundary();
    },
    'editor:move-to-next-word-boundary': function() {
      return this.moveToNextWordBoundary();
    },
    'editor:select-to-beginning-of-next-paragraph': function() {
      return this.selectToBeginningOfNextParagraph();
    },
    'editor:select-to-beginning-of-previous-paragraph': function() {
      return this.selectToBeginningOfPreviousParagraph();
    },
    'editor:select-to-end-of-line': function() {
      return this.selectToEndOfLine();
    },
    'editor:select-to-beginning-of-line': function() {
      return this.selectToBeginningOfLine();
    },
    'editor:select-to-end-of-word': function() {
      return this.selectToEndOfWord();
    },
    'editor:select-to-beginning-of-word': function() {
      return this.selectToBeginningOfWord();
    },
    'editor:select-to-beginning-of-next-word': function() {
      return this.selectToBeginningOfNextWord();
    },
    'editor:select-to-next-word-boundary': function() {
      return this.selectToNextWordBoundary();
    },
    'editor:select-to-previous-word-boundary': function() {
      return this.selectToPreviousWordBoundary();
    },
    'editor:select-to-first-character-of-line': function() {
      return this.selectToFirstCharacterOfLine();
    },
    'editor:select-line': function() {
      return this.selectLinesContainingCursors();
    }
  }));

  atom.commands.add('atom-text-editor', stopEventPropagationAndGroupUndo({
    'core:backspace': function() {
      return this.backspace();
    },
    'core:delete': function() {
      return this["delete"]();
    },
    'core:cut': function() {
      return this.cutSelectedText();
    },
    'core:copy': function() {
      return this.copySelectedText();
    },
    'core:paste': function() {
      return this.pasteText();
    },
    'editor:delete-to-beginning-of-word': function() {
      return this.deleteToBeginningOfWord();
    },
    'editor:delete-to-beginning-of-line': function() {
      return this.deleteToBeginningOfLine();
    },
    'editor:delete-to-end-of-line': function() {
      return this.deleteToEndOfLine();
    },
    'editor:delete-to-end-of-word': function() {
      return this.deleteToEndOfWord();
    },
    'editor:delete-line': function() {
      return this.deleteLine();
    },
    'editor:cut-to-end-of-line': function() {
      return this.cutToEndOfLine();
    },
    'editor:transpose': function() {
      return this.transpose();
    },
    'editor:upper-case': function() {
      return this.upperCase();
    },
    'editor:lower-case': function() {
      return this.lowerCase();
    }
  }));

  atom.commands.add('atom-text-editor:not([mini])', stopEventPropagation({
    'core:move-up': function() {
      return this.moveUp();
    },
    'core:move-down': function() {
      return this.moveDown();
    },
    'core:move-to-top': function() {
      return this.moveToTop();
    },
    'core:move-to-bottom': function() {
      return this.moveToBottom();
    },
    'core:page-up': function() {
      return this.pageUp();
    },
    'core:page-down': function() {
      return this.pageDown();
    },
    'core:select-up': function() {
      return this.selectUp();
    },
    'core:select-down': function() {
      return this.selectDown();
    },
    'core:select-to-top': function() {
      return this.selectToTop();
    },
    'core:select-to-bottom': function() {
      return this.selectToBottom();
    },
    'core:select-page-up': function() {
      return this.selectPageUp();
    },
    'core:select-page-down': function() {
      return this.selectPageDown();
    },
    'editor:add-selection-below': function() {
      return this.addSelectionBelow();
    },
    'editor:add-selection-above': function() {
      return this.addSelectionAbove();
    },
    'editor:split-selections-into-lines': function() {
      return this.splitSelectionsIntoLines();
    },
    'editor:toggle-soft-tabs': function() {
      return this.toggleSoftTabs();
    },
    'editor:toggle-soft-wrap': function() {
      return this.toggleSoftWrapped();
    },
    'editor:fold-all': function() {
      return this.foldAll();
    },
    'editor:unfold-all': function() {
      return this.unfoldAll();
    },
    'editor:fold-current-row': function() {
      return this.foldCurrentRow();
    },
    'editor:unfold-current-row': function() {
      return this.unfoldCurrentRow();
    },
    'editor:fold-selection': function() {
      return this.foldSelectedLines();
    },
    'editor:fold-at-indent-level-1': function() {
      return this.foldAllAtIndentLevel(0);
    },
    'editor:fold-at-indent-level-2': function() {
      return this.foldAllAtIndentLevel(1);
    },
    'editor:fold-at-indent-level-3': function() {
      return this.foldAllAtIndentLevel(2);
    },
    'editor:fold-at-indent-level-4': function() {
      return this.foldAllAtIndentLevel(3);
    },
    'editor:fold-at-indent-level-5': function() {
      return this.foldAllAtIndentLevel(4);
    },
    'editor:fold-at-indent-level-6': function() {
      return this.foldAllAtIndentLevel(5);
    },
    'editor:fold-at-indent-level-7': function() {
      return this.foldAllAtIndentLevel(6);
    },
    'editor:fold-at-indent-level-8': function() {
      return this.foldAllAtIndentLevel(7);
    },
    'editor:fold-at-indent-level-9': function() {
      return this.foldAllAtIndentLevel(8);
    },
    'editor:log-cursor-scope': function() {
      return this.logCursorScope();
    },
    'editor:copy-path': function() {
      return this.copyPathToClipboard();
    },
    'editor:toggle-indent-guide': function() {
      return atom.config.set('editor.showIndentGuide', !atom.config.get('editor.showIndentGuide'));
    },
    'editor:toggle-line-numbers': function() {
      return atom.config.set('editor.showLineNumbers', !atom.config.get('editor.showLineNumbers'));
    },
    'editor:scroll-to-cursor': function() {
      return this.scrollToCursorPosition();
    }
  }));

  atom.commands.add('atom-text-editor:not([mini])', stopEventPropagationAndGroupUndo({
    'editor:indent': function() {
      return this.indent();
    },
    'editor:auto-indent': function() {
      return this.autoIndentSelectedRows();
    },
    'editor:indent-selected-rows': function() {
      return this.indentSelectedRows();
    },
    'editor:outdent-selected-rows': function() {
      return this.outdentSelectedRows();
    },
    'editor:newline': function() {
      return this.insertNewline();
    },
    'editor:newline-below': function() {
      return this.insertNewlineBelow();
    },
    'editor:newline-above': function() {
      return this.insertNewlineAbove();
    },
    'editor:toggle-line-comments': function() {
      return this.toggleLineCommentsInSelection();
    },
    'editor:checkout-head-revision': function() {
      return this.checkoutHeadRevision();
    },
    'editor:move-line-up': function() {
      return this.moveLineUp();
    },
    'editor:move-line-down': function() {
      return this.moveLineDown();
    },
    'editor:duplicate-lines': function() {
      return this.duplicateLines();
    },
    'editor:join-lines': function() {
      return this.joinLines();
    }
  }));

  module.exports = TextEditorElement = document.registerElement('atom-text-editor', {
    prototype: TextEditorElement.prototype
  });

}).call(this);

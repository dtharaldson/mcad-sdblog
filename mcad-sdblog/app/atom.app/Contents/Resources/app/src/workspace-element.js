(function() {
  var CompositeDisposable, Disposable, Grim, WorkspaceElement, WorkspaceView, callAttachHooks, ipc, path, scrollbarStyle, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ipc = require('ipc');

  path = require('path');

  _ref = require('event-kit'), Disposable = _ref.Disposable, CompositeDisposable = _ref.CompositeDisposable;

  Grim = require('grim');

  scrollbarStyle = require('scrollbar-style');

  callAttachHooks = require('space-pen').callAttachHooks;

  WorkspaceView = null;

  module.exports = WorkspaceElement = (function(_super) {
    __extends(WorkspaceElement, _super);

    function WorkspaceElement() {
      return WorkspaceElement.__super__.constructor.apply(this, arguments);
    }

    WorkspaceElement.prototype.globalTextEditorStyleSheet = null;

    WorkspaceElement.prototype.createdCallback = function() {
      this.subscriptions = new CompositeDisposable;
      this.initializeGlobalTextEditorStyleSheet();
      this.initializeContent();
      this.observeScrollbarStyle();
      this.observeTextEditorFontConfig();
      if (Grim.includeDeprecatedAPIs) {
        return this.createSpacePenShim();
      }
    };

    WorkspaceElement.prototype.attachedCallback = function() {
      if (Grim.includeDeprecatedAPIs) {
        callAttachHooks(this);
      }
      return this.focus();
    };

    WorkspaceElement.prototype.detachedCallback = function() {
      this.subscriptions.dispose();
      return this.model.destroy();
    };

    WorkspaceElement.prototype.initializeGlobalTextEditorStyleSheet = function() {
      atom.styles.addStyleSheet('atom-text-editor {}', {
        sourcePath: 'global-text-editor-styles'
      });
      return this.globalTextEditorStyleSheet = document.head.querySelector('style[source-path="global-text-editor-styles"]').sheet;
    };

    WorkspaceElement.prototype.initializeContent = function() {
      this.classList.add('workspace');
      this.setAttribute('tabindex', -1);
      this.verticalAxis = document.createElement('atom-workspace-axis');
      this.verticalAxis.classList.add('vertical');
      this.horizontalAxis = document.createElement('atom-workspace-axis');
      this.horizontalAxis.classList.add('horizontal');
      this.horizontalAxis.appendChild(this.verticalAxis);
      return this.appendChild(this.horizontalAxis);
    };

    WorkspaceElement.prototype.observeScrollbarStyle = function() {
      return this.subscriptions.add(scrollbarStyle.onValue((function(_this) {
        return function(style) {
          switch (style) {
            case 'legacy':
              _this.classList.remove('scrollbars-visible-when-scrolling');
              return _this.classList.add("scrollbars-visible-always");
            case 'overlay':
              _this.classList.remove('scrollbars-visible-always');
              return _this.classList.add("scrollbars-visible-when-scrolling");
          }
        };
      })(this)));
    };

    WorkspaceElement.prototype.observeTextEditorFontConfig = function() {
      this.subscriptions.add(atom.config.observe('editor.fontSize', this.setTextEditorFontSize.bind(this)));
      this.subscriptions.add(atom.config.observe('editor.fontFamily', this.setTextEditorFontFamily.bind(this)));
      return this.subscriptions.add(atom.config.observe('editor.lineHeight', this.setTextEditorLineHeight.bind(this)));
    };

    WorkspaceElement.prototype.createSpacePenShim = function() {
      if (WorkspaceView == null) {
        WorkspaceView = require('./workspace-view');
      }
      return this.__spacePenView = new WorkspaceView(this);
    };

    WorkspaceElement.prototype.initialize = function(model) {
      this.model = model;
      this.paneContainer = atom.views.getView(this.model.paneContainer);
      this.verticalAxis.appendChild(this.paneContainer);
      this.addEventListener('focus', this.handleFocus.bind(this));
      this.panelContainers = {
        top: atom.views.getView(this.model.panelContainers.top),
        left: atom.views.getView(this.model.panelContainers.left),
        right: atom.views.getView(this.model.panelContainers.right),
        bottom: atom.views.getView(this.model.panelContainers.bottom),
        modal: atom.views.getView(this.model.panelContainers.modal)
      };
      this.horizontalAxis.insertBefore(this.panelContainers.left, this.verticalAxis);
      this.horizontalAxis.appendChild(this.panelContainers.right);
      this.verticalAxis.insertBefore(this.panelContainers.top, this.paneContainer);
      this.verticalAxis.appendChild(this.panelContainers.bottom);
      this.appendChild(this.panelContainers.modal);
      if (Grim.includeDeprecatedAPIs) {
        this.__spacePenView.setModel(this.model);
      }
      return this;
    };

    WorkspaceElement.prototype.getModel = function() {
      return this.model;
    };

    WorkspaceElement.prototype.setTextEditorFontSize = function(fontSize) {
      return this.updateGlobalEditorStyle('font-size', fontSize + 'px');
    };

    WorkspaceElement.prototype.setTextEditorFontFamily = function(fontFamily) {
      return this.updateGlobalEditorStyle('font-family', fontFamily);
    };

    WorkspaceElement.prototype.setTextEditorLineHeight = function(lineHeight) {
      return this.updateGlobalEditorStyle('line-height', lineHeight);
    };

    WorkspaceElement.prototype.updateGlobalEditorStyle = function(property, value) {
      var editorRule;
      editorRule = this.globalTextEditorStyleSheet.cssRules[0];
      editorRule.style[property] = value;
      return atom.themes.emitter.emit('did-update-stylesheet', this.globalTextEditorStyleSheet);
    };

    WorkspaceElement.prototype.handleFocus = function(event) {
      return this.model.getActivePane().activate();
    };

    WorkspaceElement.prototype.focusPaneViewAbove = function() {
      return this.paneContainer.focusPaneViewAbove();
    };

    WorkspaceElement.prototype.focusPaneViewBelow = function() {
      return this.paneContainer.focusPaneViewBelow();
    };

    WorkspaceElement.prototype.focusPaneViewOnLeft = function() {
      return this.paneContainer.focusPaneViewOnLeft();
    };

    WorkspaceElement.prototype.focusPaneViewOnRight = function() {
      return this.paneContainer.focusPaneViewOnRight();
    };

    WorkspaceElement.prototype.runPackageSpecs = function() {
      var projectPath;
      projectPath = atom.project.getPaths()[0];
      if (projectPath) {
        return ipc.send('run-package-specs', path.join(projectPath, 'spec'));
      }
    };

    return WorkspaceElement;

  })(HTMLElement);

  atom.commands.add('atom-workspace', {
    'window:increase-font-size': function() {
      return this.getModel().increaseFontSize();
    },
    'window:decrease-font-size': function() {
      return this.getModel().decreaseFontSize();
    },
    'window:reset-font-size': function() {
      return this.getModel().resetFontSize();
    },
    'application:about': function() {
      return ipc.send('command', 'application:about');
    },
    'application:run-all-specs': function() {
      return ipc.send('command', 'application:run-all-specs');
    },
    'application:run-benchmarks': function() {
      return ipc.send('command', 'application:run-benchmarks');
    },
    'application:show-settings': function() {
      return ipc.send('command', 'application:show-settings');
    },
    'application:quit': function() {
      return ipc.send('command', 'application:quit');
    },
    'application:hide': function() {
      return ipc.send('command', 'application:hide');
    },
    'application:hide-other-applications': function() {
      return ipc.send('command', 'application:hide-other-applications');
    },
    'application:install-update': function() {
      return ipc.send('command', 'application:install-update');
    },
    'application:unhide-all-applications': function() {
      return ipc.send('command', 'application:unhide-all-applications');
    },
    'application:new-window': function() {
      return ipc.send('command', 'application:new-window');
    },
    'application:new-file': function() {
      return ipc.send('command', 'application:new-file');
    },
    'application:open': function() {
      return ipc.send('command', 'application:open');
    },
    'application:open-file': function() {
      return ipc.send('command', 'application:open-file');
    },
    'application:open-folder': function() {
      return ipc.send('command', 'application:open-folder');
    },
    'application:open-dev': function() {
      return ipc.send('command', 'application:open-dev');
    },
    'application:open-safe': function() {
      return ipc.send('command', 'application:open-safe');
    },
    'application:open-api-preview': function() {
      return ipc.send('command', 'application:open-api-preview');
    },
    'application:open-dev-api-preview': function() {
      return ipc.send('command', 'application:open-dev-api-preview');
    },
    'application:add-project-folder': function() {
      return atom.addProjectFolder();
    },
    'application:minimize': function() {
      return ipc.send('command', 'application:minimize');
    },
    'application:zoom': function() {
      return ipc.send('command', 'application:zoom');
    },
    'application:bring-all-windows-to-front': function() {
      return ipc.send('command', 'application:bring-all-windows-to-front');
    },
    'application:open-your-config': function() {
      return ipc.send('command', 'application:open-your-config');
    },
    'application:open-your-init-script': function() {
      return ipc.send('command', 'application:open-your-init-script');
    },
    'application:open-your-keymap': function() {
      return ipc.send('command', 'application:open-your-keymap');
    },
    'application:open-your-snippets': function() {
      return ipc.send('command', 'application:open-your-snippets');
    },
    'application:open-your-stylesheet': function() {
      return ipc.send('command', 'application:open-your-stylesheet');
    },
    'application:open-license': function() {
      return this.getModel().openLicense();
    },
    'window:run-package-specs': function() {
      return this.runPackageSpecs();
    },
    'window:focus-next-pane': function() {
      return this.getModel().activateNextPane();
    },
    'window:focus-previous-pane': function() {
      return this.getModel().activatePreviousPane();
    },
    'window:focus-pane-above': function() {
      return this.focusPaneViewAbove();
    },
    'window:focus-pane-below': function() {
      return this.focusPaneViewBelow();
    },
    'window:focus-pane-on-left': function() {
      return this.focusPaneViewOnLeft();
    },
    'window:focus-pane-on-right': function() {
      return this.focusPaneViewOnRight();
    },
    'window:save-all': function() {
      return this.getModel().saveAll();
    },
    'window:toggle-invisibles': function() {
      return atom.config.set("editor.showInvisibles", !atom.config.get("editor.showInvisibles"));
    },
    'window:log-deprecation-warnings': function() {
      return Grim.logDeprecations();
    },
    'window:toggle-auto-indent': function() {
      return atom.config.set("editor.autoIndent", !atom.config.get("editor.autoIndent"));
    },
    'pane:reopen-closed-item': function() {
      return this.getModel().reopenItem();
    },
    'core:close': function() {
      return this.getModel().destroyActivePaneItemOrEmptyPane();
    },
    'core:save': function() {
      return this.getModel().saveActivePaneItem();
    },
    'core:save-as': function() {
      return this.getModel().saveActivePaneItemAs();
    }
  });

  if (process.platform === 'darwin') {
    atom.commands.add('atom-workspace', 'window:install-shell-commands', function() {
      return this.getModel().installShellCommands();
    });
  }

  module.exports = WorkspaceElement = document.registerElement('atom-workspace', {
    prototype: WorkspaceElement.prototype
  });

}).call(this);

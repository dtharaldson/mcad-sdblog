(function() {
  var CompositeDisposable, Disposable, Emitter, Grim, Model, Pane, PaneContainer, Panel, PanelContainer, PanelContainerElement, PanelElement, Q, Serializable, StackTraceParser, Task, TextEditor, Workspace, WorkspaceElement, deprecate, fs, includeDeprecatedAPIs, join, path, _, _ref, _ref1,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ref = require('grim'), includeDeprecatedAPIs = _ref.includeDeprecatedAPIs, deprecate = _ref.deprecate;

  _ = require('underscore-plus');

  path = require('path');

  join = path.join;

  Q = require('q');

  Serializable = require('serializable');

  _ref1 = require('event-kit'), Emitter = _ref1.Emitter, Disposable = _ref1.Disposable, CompositeDisposable = _ref1.CompositeDisposable;

  Grim = require('grim');

  fs = require('fs-plus');

  Model = require('./model');

  TextEditor = require('./text-editor');

  PaneContainer = require('./pane-container');

  Pane = require('./pane');

  Panel = require('./panel');

  PanelElement = require('./panel-element');

  PanelContainer = require('./panel-container');

  PanelContainerElement = require('./panel-container-element');

  WorkspaceElement = require('./workspace-element');

  Task = require('./task');

  module.exports = Workspace = (function(_super) {
    __extends(Workspace, _super);

    atom.deserializers.add(Workspace);

    Serializable.includeInto(Workspace);

    function Workspace(params) {
      this.didDestroyPaneItem = __bind(this.didDestroyPaneItem, this);
      this.updateDocumentEdited = __bind(this.updateDocumentEdited, this);
      this.updateWindowTitle = __bind(this.updateWindowTitle, this);
      var _ref2, _ref3;
      Workspace.__super__.constructor.apply(this, arguments);
      if (!Grim.includeDeprecatedAPIs) {
        this.paneContainer = params != null ? params.paneContainer : void 0;
        this.fullScreen = (_ref2 = params != null ? params.fullScreen : void 0) != null ? _ref2 : false;
        this.destroyedItemURIs = (_ref3 = params != null ? params.destroyedItemURIs : void 0) != null ? _ref3 : [];
      }
      this.emitter = new Emitter;
      this.openers = [];
      if (this.paneContainer == null) {
        this.paneContainer = new PaneContainer();
      }
      this.paneContainer.onDidDestroyPaneItem(this.didDestroyPaneItem);
      this.panelContainers = {
        top: new PanelContainer({
          location: 'top'
        }),
        left: new PanelContainer({
          location: 'left'
        }),
        right: new PanelContainer({
          location: 'right'
        }),
        bottom: new PanelContainer({
          location: 'bottom'
        }),
        modal: new PanelContainer({
          location: 'modal'
        })
      };
      this.subscribeToActiveItem();
      this.addOpener(function(filePath) {
        switch (filePath) {
          case 'atom://.atom/stylesheet':
            return atom.project.open(atom.styles.getUserStyleSheetPath());
          case 'atom://.atom/keymap':
            return atom.project.open(atom.keymaps.getUserKeymapPath());
          case 'atom://.atom/config':
            return atom.project.open(atom.config.getUserConfigPath());
          case 'atom://.atom/init-script':
            return atom.project.open(atom.getUserInitScriptPath());
        }
      });
      atom.views.addViewProvider(Workspace, function(model) {
        return new WorkspaceElement().initialize(model);
      });
      atom.views.addViewProvider(PanelContainer, function(model) {
        return new PanelContainerElement().initialize(model);
      });
      atom.views.addViewProvider(Panel, function(model) {
        return new PanelElement().initialize(model);
      });
    }

    Workspace.prototype.deserializeParams = function(params) {
      var packageName, _i, _len, _ref2, _ref3, _ref4;
      _ref3 = (_ref2 = params.packagesWithActiveGrammars) != null ? _ref2 : [];
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        packageName = _ref3[_i];
        if ((_ref4 = atom.packages.getLoadedPackage(packageName)) != null) {
          _ref4.loadGrammarsSync();
        }
      }
      params.paneContainer = PaneContainer.deserialize(params.paneContainer);
      return params;
    };

    Workspace.prototype.serializeParams = function() {
      return {
        paneContainer: this.paneContainer.serialize(),
        fullScreen: atom.isFullScreen(),
        packagesWithActiveGrammars: this.getPackageNamesWithActiveGrammars()
      };
    };

    Workspace.prototype.getPackageNamesWithActiveGrammars = function() {
      var addGrammar, editor, editors, grammar, packageNames, _i, _j, _len, _len1, _ref2;
      packageNames = [];
      addGrammar = function(_arg) {
        var includedGrammarScopes, packageName, scopeName, _i, _len, _ref2, _ref3;
        _ref2 = _arg != null ? _arg : {}, includedGrammarScopes = _ref2.includedGrammarScopes, packageName = _ref2.packageName;
        if (!packageName) {
          return;
        }
        if (packageNames.indexOf(packageName) !== -1) {
          return;
        }
        packageNames.push(packageName);
        _ref3 = includedGrammarScopes != null ? includedGrammarScopes : [];
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          scopeName = _ref3[_i];
          addGrammar(atom.grammars.grammarForScopeName(scopeName));
        }
      };
      editors = this.getTextEditors();
      for (_i = 0, _len = editors.length; _i < _len; _i++) {
        editor = editors[_i];
        addGrammar(editor.getGrammar());
      }
      if (editors.length > 0) {
        _ref2 = atom.grammars.getGrammars();
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          grammar = _ref2[_j];
          if (grammar.injectionSelector) {
            addGrammar(grammar);
          }
        }
      }
      return _.uniq(packageNames);
    };

    Workspace.prototype.editorAdded = function(editor) {
      if (includeDeprecatedAPIs) {
        return this.emit('editor-created', editor);
      }
    };

    Workspace.prototype.installShellCommands = function() {
      return require('./command-installer').installShellCommandsInteractively();
    };

    Workspace.prototype.subscribeToActiveItem = function() {
      this.updateWindowTitle();
      this.updateDocumentEdited();
      atom.project.onDidChangePaths(this.updateWindowTitle);
      return this.observeActivePaneItem((function(_this) {
        return function(item) {
          var modifiedSubscription, titleSubscription, _ref2;
          _this.updateWindowTitle();
          _this.updateDocumentEdited();
          if ((_ref2 = _this.activeItemSubscriptions) != null) {
            _ref2.dispose();
          }
          _this.activeItemSubscriptions = new CompositeDisposable;
          if (typeof (item != null ? item.onDidChangeTitle : void 0) === 'function') {
            titleSubscription = item.onDidChangeTitle(_this.updateWindowTitle);
          } else if (typeof (item != null ? item.on : void 0) === 'function') {
            titleSubscription = item.on('title-changed', _this.updateWindowTitle);
            if (typeof (titleSubscription != null ? titleSubscription.dispose : void 0) !== 'function') {
              titleSubscription = new Disposable(function() {
                return item.off('title-changed', _this.updateWindowTitle);
              });
            }
          }
          if (typeof (item != null ? item.onDidChangeModified : void 0) === 'function') {
            modifiedSubscription = item.onDidChangeModified(_this.updateDocumentEdited);
          } else if (typeof ((item != null ? item.on : void 0) != null) === 'function') {
            modifiedSubscription = item.on('modified-status-changed', _this.updateDocumentEdited);
            if (typeof (modifiedSubscription != null ? modifiedSubscription.dispose : void 0) !== 'function') {
              modifiedSubscription = new Disposable(function() {
                return item.off('modified-status-changed', _this.updateDocumentEdited);
              });
            }
          }
          if (titleSubscription != null) {
            _this.activeItemSubscriptions.add(titleSubscription);
          }
          if (modifiedSubscription != null) {
            return _this.activeItemSubscriptions.add(modifiedSubscription);
          }
        };
      })(this));
    };

    Workspace.prototype.updateWindowTitle = function() {
      var appName, item, itemPath, itemTitle, projectPath, projectPaths, _ref2, _ref3;
      appName = 'Atom';
      projectPaths = (_ref2 = (_ref3 = atom.project) != null ? _ref3.getPaths() : void 0) != null ? _ref2 : [];
      if (item = this.getActivePaneItem()) {
        itemPath = typeof item.getPath === "function" ? item.getPath() : void 0;
        itemTitle = typeof item.getTitle === "function" ? item.getTitle() : void 0;
        projectPath = _.find(projectPaths, function(projectPath) {
          return itemPath === projectPath || (itemPath != null ? itemPath.startsWith(projectPath + path.sep) : void 0);
        });
      }
      if (itemTitle == null) {
        itemTitle = "untitled";
      }
      if (projectPath == null) {
        projectPath = projectPaths[0];
      }
      if ((item != null) && (projectPath != null)) {
        document.title = "" + itemTitle + " - " + projectPath + " - " + appName;
        return atom.setRepresentedFilename(itemPath != null ? itemPath : projectPath);
      } else if (projectPath != null) {
        document.title = "" + projectPath + " - " + appName;
        return atom.setRepresentedFilename(projectPath);
      } else {
        document.title = "" + itemTitle + " - " + appName;
        return atom.setRepresentedFilename("");
      }
    };

    Workspace.prototype.updateDocumentEdited = function() {
      var modified, _ref2, _ref3;
      modified = (_ref2 = (_ref3 = this.getActivePaneItem()) != null ? typeof _ref3.isModified === "function" ? _ref3.isModified() : void 0 : void 0) != null ? _ref2 : false;
      return atom.setDocumentEdited(modified);
    };


    /*
    Section: Event Subscription
     */

    Workspace.prototype.observeTextEditors = function(callback) {
      var textEditor, _i, _len, _ref2;
      _ref2 = this.getTextEditors();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        textEditor = _ref2[_i];
        callback(textEditor);
      }
      return this.onDidAddTextEditor(function(_arg) {
        var textEditor;
        textEditor = _arg.textEditor;
        return callback(textEditor);
      });
    };

    Workspace.prototype.observePaneItems = function(callback) {
      return this.paneContainer.observePaneItems(callback);
    };

    Workspace.prototype.onDidChangeActivePaneItem = function(callback) {
      return this.paneContainer.onDidChangeActivePaneItem(callback);
    };

    Workspace.prototype.observeActivePaneItem = function(callback) {
      return this.paneContainer.observeActivePaneItem(callback);
    };

    Workspace.prototype.onDidOpen = function(callback) {
      return this.emitter.on('did-open', callback);
    };

    Workspace.prototype.onDidAddPane = function(callback) {
      return this.paneContainer.onDidAddPane(callback);
    };

    Workspace.prototype.onDidDestroyPane = function(callback) {
      return this.paneContainer.onDidDestroyPane(callback);
    };

    Workspace.prototype.observePanes = function(callback) {
      return this.paneContainer.observePanes(callback);
    };

    Workspace.prototype.onDidChangeActivePane = function(callback) {
      return this.paneContainer.onDidChangeActivePane(callback);
    };

    Workspace.prototype.observeActivePane = function(callback) {
      return this.paneContainer.observeActivePane(callback);
    };

    Workspace.prototype.onDidAddPaneItem = function(callback) {
      return this.paneContainer.onDidAddPaneItem(callback);
    };

    Workspace.prototype.onWillDestroyPaneItem = function(callback) {
      return this.paneContainer.onWillDestroyPaneItem(callback);
    };

    Workspace.prototype.onDidDestroyPaneItem = function(callback) {
      return this.paneContainer.onDidDestroyPaneItem(callback);
    };

    Workspace.prototype.onDidAddTextEditor = function(callback) {
      return this.onDidAddPaneItem(function(_arg) {
        var index, item, pane;
        item = _arg.item, pane = _arg.pane, index = _arg.index;
        if (item instanceof TextEditor) {
          return callback({
            textEditor: item,
            pane: pane,
            index: index
          });
        }
      });
    };


    /*
    Section: Opening
     */

    Workspace.prototype.open = function(uri, options) {
      var pane, searchAllPanes, split;
      if (options == null) {
        options = {};
      }
      searchAllPanes = options.searchAllPanes;
      split = options.split;
      uri = atom.project.resolvePath(uri);
      if (searchAllPanes) {
        pane = this.paneContainer.paneForURI(uri);
      }
      if (pane == null) {
        pane = (function() {
          switch (split) {
            case 'left':
              return this.getActivePane().findLeftmostSibling();
            case 'right':
              return this.getActivePane().findOrCreateRightmostSibling();
            default:
              return this.getActivePane();
          }
        }).call(this);
      }
      return this.openURIInPane(uri, pane, options);
    };

    Workspace.prototype.openLicense = function() {
      return this.open(join(atom.getLoadSettings().resourcePath, 'LICENSE.md'));
    };

    Workspace.prototype.openSync = function(uri, options) {
      var activatePane, initialColumn, initialLine, item, opener, _i, _len, _ref2, _ref3;
      if (uri == null) {
        uri = '';
      }
      if (options == null) {
        options = {};
      }
      if (includeDeprecatedAPIs && (options.changeFocus != null)) {
        deprecate("The `changeFocus` option has been renamed to `activatePane`");
        options.activatePane = options.changeFocus;
        delete options.changeFocus;
      }
      initialLine = options.initialLine, initialColumn = options.initialColumn;
      activatePane = (_ref2 = options.activatePane) != null ? _ref2 : true;
      uri = atom.project.resolvePath(uri);
      item = this.getActivePane().itemForURI(uri);
      if (uri) {
        _ref3 = this.getOpeners();
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          opener = _ref3[_i];
          if (!item) {
            if (item == null) {
              item = opener(uri, options);
            }
          }
        }
      }
      if (item == null) {
        item = atom.project.openSync(uri, {
          initialLine: initialLine,
          initialColumn: initialColumn
        });
      }
      this.getActivePane().activateItem(item);
      this.itemOpened(item);
      if (activatePane) {
        this.getActivePane().activate();
      }
      return item;
    };

    Workspace.prototype.openURIInPane = function(uri, pane, options) {
      var activatePane, error, item, opener, _i, _len, _ref2, _ref3;
      if (options == null) {
        options = {};
      }
      if (includeDeprecatedAPIs && (options.changeFocus != null)) {
        deprecate("The `changeFocus` option has been renamed to `activatePane`");
        options.activatePane = options.changeFocus;
        delete options.changeFocus;
      }
      activatePane = (_ref2 = options.activatePane) != null ? _ref2 : true;
      if (uri != null) {
        item = pane.itemForURI(uri);
        _ref3 = this.getOpeners();
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          opener = _ref3[_i];
          if (!item) {
            if (item == null) {
              item = opener(uri, options);
            }
          }
        }
      }
      try {
        if (item == null) {
          item = atom.project.open(uri, options);
        }
      } catch (_error) {
        error = _error;
        switch (error.code) {
          case 'EFILETOOLARGE':
            atom.notifications.addWarning("" + error.message + " Large file support is being tracked at [atom/atom#307](https://github.com/atom/atom/issues/307).");
            break;
          case 'EACCES':
            atom.notifications.addWarning("Permission denied '" + error.path + "'");
            break;
          case 'EPERM':
          case 'EBUSY':
            atom.notifications.addWarning("Unable to open '" + error.path + "'", {
              detail: error.message
            });
            break;
          default:
            throw error;
        }
        return Q();
      }
      return Q(item).then((function(_this) {
        return function(item) {
          var index;
          if (!pane) {
            pane = new Pane({
              items: [item]
            });
            _this.paneContainer.root = pane;
          }
          _this.itemOpened(item);
          pane.activateItem(item);
          if (activatePane) {
            pane.activate();
          }
          if ((options.initialLine != null) || (options.initialColumn != null)) {
            if (typeof item.setCursorBufferPosition === "function") {
              item.setCursorBufferPosition([options.initialLine, options.initialColumn]);
            }
          }
          index = pane.getActiveItemIndex();
          if (includeDeprecatedAPIs) {
            _this.emit("uri-opened");
          }
          _this.emitter.emit('did-open', {
            uri: uri,
            pane: pane,
            item: item,
            index: index
          });
          return item;
        };
      })(this));
    };

    Workspace.prototype.reopenItem = function() {
      var uri;
      if (uri = this.destroyedItemURIs.pop()) {
        return this.open(uri);
      } else {
        return Q();
      }
    };

    Workspace.prototype.addOpener = function(opener) {
      var packageName, wrappedOpener;
      if (includeDeprecatedAPIs) {
        packageName = this.getCallingPackageName();
        wrappedOpener = function(uri, options) {
          var item;
          item = opener(uri, options);
          if ((item != null) && typeof item.getUri === 'function' && typeof item.getURI !== 'function') {
            Grim.deprecate("Pane item with class `" + item.constructor.name + "` should implement `::getURI` instead of `::getUri`.", {
              packageName: packageName
            });
          }
          return item;
        };
        this.openers.push(wrappedOpener);
        return new Disposable((function(_this) {
          return function() {
            return _.remove(_this.openers, wrappedOpener);
          };
        })(this));
      } else {
        this.openers.push(opener);
        return new Disposable((function(_this) {
          return function() {
            return _.remove(_this.openers, opener);
          };
        })(this));
      }
    };

    Workspace.prototype.getOpeners = function() {
      return this.openers;
    };


    /*
    Section: Pane Items
     */

    Workspace.prototype.getPaneItems = function() {
      return this.paneContainer.getPaneItems();
    };

    Workspace.prototype.getActivePaneItem = function() {
      return this.paneContainer.getActivePaneItem();
    };

    Workspace.prototype.getTextEditors = function() {
      return this.getPaneItems().filter(function(item) {
        return item instanceof TextEditor;
      });
    };

    Workspace.prototype.getActiveTextEditor = function() {
      var activeItem;
      activeItem = this.getActivePaneItem();
      if (activeItem instanceof TextEditor) {
        return activeItem;
      }
    };

    Workspace.prototype.saveAll = function() {
      return this.paneContainer.saveAll();
    };

    Workspace.prototype.confirmClose = function(options) {
      return this.paneContainer.confirmClose(options);
    };

    Workspace.prototype.saveActivePaneItem = function() {
      return this.getActivePane().saveActiveItem();
    };

    Workspace.prototype.saveActivePaneItemAs = function() {
      return this.getActivePane().saveActiveItemAs();
    };

    Workspace.prototype.destroyActivePaneItem = function() {
      return this.getActivePane().destroyActiveItem();
    };


    /*
    Section: Panes
     */

    Workspace.prototype.getPanes = function() {
      return this.paneContainer.getPanes();
    };

    Workspace.prototype.getActivePane = function() {
      return this.paneContainer.getActivePane();
    };

    Workspace.prototype.activateNextPane = function() {
      return this.paneContainer.activateNextPane();
    };

    Workspace.prototype.activatePreviousPane = function() {
      return this.paneContainer.activatePreviousPane();
    };

    Workspace.prototype.paneForURI = function(uri) {
      return this.paneContainer.paneForURI(uri);
    };

    Workspace.prototype.paneForItem = function(item) {
      return this.paneContainer.paneForItem(item);
    };

    Workspace.prototype.destroyActivePane = function() {
      var _ref2;
      return (_ref2 = this.getActivePane()) != null ? _ref2.destroy() : void 0;
    };

    Workspace.prototype.destroyActivePaneItemOrEmptyPane = function() {
      if (this.getActivePaneItem() != null) {
        return this.destroyActivePaneItem();
      } else {
        return this.destroyActivePane();
      }
    };

    Workspace.prototype.increaseFontSize = function() {
      return atom.config.set("editor.fontSize", atom.config.get("editor.fontSize") + 1);
    };

    Workspace.prototype.decreaseFontSize = function() {
      var fontSize;
      fontSize = atom.config.get("editor.fontSize");
      if (fontSize > 1) {
        return atom.config.set("editor.fontSize", fontSize - 1);
      }
    };

    Workspace.prototype.resetFontSize = function() {
      return atom.config.unset("editor.fontSize");
    };

    Workspace.prototype.itemOpened = function(item) {
      var uri;
      if (typeof item.getURI === 'function') {
        uri = item.getURI();
      } else if (typeof item.getUri === 'function') {
        uri = item.getUri();
      }
      if (uri != null) {
        return _.remove(this.destroyedItemURIs, uri);
      }
    };

    Workspace.prototype.didDestroyPaneItem = function(_arg) {
      var item, uri;
      item = _arg.item;
      if (typeof item.getURI === 'function') {
        uri = item.getURI();
      } else if (typeof item.getUri === 'function') {
        uri = item.getUri();
      }
      if (uri != null) {
        return this.destroyedItemURIs.push(uri);
      }
    };

    Workspace.prototype.destroyed = function() {
      var _ref2;
      this.paneContainer.destroy();
      return (_ref2 = this.activeItemSubscriptions) != null ? _ref2.dispose() : void 0;
    };


    /*
    Section: Panels
    
    Panels are used to display UI related to an editor window. They are placed at one of the four
    edges of the window: left, right, top or bottom. If there are multiple panels on the same window
    edge they are stacked in order of priority: higher priority is closer to the center, lower
    priority towards the edge.
    
    *Note:* If your panel changes its size throughout its lifetime, consider giving it a higher
    priority, allowing fixed size panels to be closer to the edge. This allows control targets to
    remain more static for easier targeting by users that employ mice or trackpads. (See
    [atom/atom#4834](https://github.com/atom/atom/issues/4834) for discussion.)
     */

    Workspace.prototype.getBottomPanels = function() {
      return this.getPanels('bottom');
    };

    Workspace.prototype.addBottomPanel = function(options) {
      return this.addPanel('bottom', options);
    };

    Workspace.prototype.getLeftPanels = function() {
      return this.getPanels('left');
    };

    Workspace.prototype.addLeftPanel = function(options) {
      return this.addPanel('left', options);
    };

    Workspace.prototype.getRightPanels = function() {
      return this.getPanels('right');
    };

    Workspace.prototype.addRightPanel = function(options) {
      return this.addPanel('right', options);
    };

    Workspace.prototype.getTopPanels = function() {
      return this.getPanels('top');
    };

    Workspace.prototype.addTopPanel = function(options) {
      return this.addPanel('top', options);
    };

    Workspace.prototype.getModalPanels = function() {
      return this.getPanels('modal');
    };

    Workspace.prototype.addModalPanel = function(options) {
      if (options == null) {
        options = {};
      }
      return this.addPanel('modal', options);
    };

    Workspace.prototype.panelForItem = function(item) {
      var container, location, panel, _ref2;
      _ref2 = this.panelContainers;
      for (location in _ref2) {
        container = _ref2[location];
        panel = container.panelForItem(item);
        if (panel != null) {
          return panel;
        }
      }
      return null;
    };

    Workspace.prototype.getPanels = function(location) {
      return this.panelContainers[location].getPanels();
    };

    Workspace.prototype.addPanel = function(location, options) {
      if (options == null) {
        options = {};
      }
      return this.panelContainers[location].addPanel(new Panel(options));
    };


    /*
    Section: Searching and Replacing
     */

    Workspace.prototype.scan = function(regex, options, iterator) {
      var buffer, deferred, filePath, matches, promise, searchOptions, task, _i, _len, _ref2;
      if (options == null) {
        options = {};
      }
      if (_.isFunction(options)) {
        iterator = options;
        options = {};
      }
      deferred = Q.defer();
      searchOptions = {
        ignoreCase: regex.ignoreCase,
        inclusions: options.paths,
        includeHidden: true,
        excludeVcsIgnores: atom.config.get('core.excludeVcsIgnoredPaths'),
        exclusions: atom.config.get('core.ignoredNames'),
        follow: atom.config.get('core.followSymlinks')
      };
      task = Task.once(require.resolve('./scan-handler'), atom.project.getPaths(), regex.source, searchOptions, function() {
        return deferred.resolve();
      });
      task.on('scan:result-found', function(result) {
        if (!atom.project.isPathModified(result.filePath)) {
          return iterator(result);
        }
      });
      task.on('scan:file-error', function(error) {
        return iterator(null, error);
      });
      if (_.isFunction(options.onPathsSearched)) {
        task.on('scan:paths-searched', function(numberOfPathsSearched) {
          return options.onPathsSearched(numberOfPathsSearched);
        });
      }
      _ref2 = atom.project.getBuffers();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        buffer = _ref2[_i];
        if (!(buffer.isModified())) {
          continue;
        }
        filePath = buffer.getPath();
        if (!atom.project.contains(filePath)) {
          continue;
        }
        matches = [];
        buffer.scan(regex, function(match) {
          return matches.push(match);
        });
        if (matches.length > 0) {
          iterator({
            filePath: filePath,
            matches: matches
          });
        }
      }
      promise = deferred.promise;
      promise.cancel = function() {
        task.terminate();
        return deferred.resolve('cancelled');
      };
      return promise;
    };

    Workspace.prototype.replace = function(regex, replacementText, filePaths, iterator) {
      var buffer, checkFinished, deferred, flags, inProcessFinished, openPaths, outOfProcessFinished, outOfProcessPaths, replacements, task, _i, _len, _ref2, _ref3;
      deferred = Q.defer();
      openPaths = (function() {
        var _i, _len, _ref2, _results;
        _ref2 = atom.project.getBuffers();
        _results = [];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          buffer = _ref2[_i];
          _results.push(buffer.getPath());
        }
        return _results;
      })();
      outOfProcessPaths = _.difference(filePaths, openPaths);
      inProcessFinished = !openPaths.length;
      outOfProcessFinished = !outOfProcessPaths.length;
      checkFinished = function() {
        if (outOfProcessFinished && inProcessFinished) {
          return deferred.resolve();
        }
      };
      if (!outOfProcessFinished.length) {
        flags = 'g';
        if (regex.ignoreCase) {
          flags += 'i';
        }
        task = Task.once(require.resolve('./replace-handler'), outOfProcessPaths, regex.source, flags, replacementText, function() {
          outOfProcessFinished = true;
          return checkFinished();
        });
        task.on('replace:path-replaced', iterator);
        task.on('replace:file-error', function(error) {
          return iterator(null, error);
        });
      }
      _ref2 = atom.project.getBuffers();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        buffer = _ref2[_i];
        if (_ref3 = buffer.getPath(), __indexOf.call(filePaths, _ref3) < 0) {
          continue;
        }
        replacements = buffer.replace(regex, replacementText, iterator);
        if (replacements) {
          iterator({
            filePath: buffer.getPath(),
            replacements: replacements
          });
        }
      }
      inProcessFinished = true;
      checkFinished();
      return deferred.promise;
    };

    return Workspace;

  })(Model);

  if (includeDeprecatedAPIs) {
    Workspace.properties({
      paneContainer: null,
      fullScreen: false,
      destroyedItemURIs: function() {
        return [];
      }
    });
    Object.defineProperty(Workspace.prototype, 'activePaneItem', {
      get: function() {
        Grim.deprecate("Use ::getActivePaneItem() instead of the ::activePaneItem property");
        return this.getActivePaneItem();
      }
    });
    Object.defineProperty(Workspace.prototype, 'activePane', {
      get: function() {
        Grim.deprecate("Use ::getActivePane() instead of the ::activePane property");
        return this.getActivePane();
      }
    });
    StackTraceParser = require('stacktrace-parser');
    Workspace.prototype.getCallingPackageName = function() {
      var error, i, packageName, packagePath, packagePaths, relativePath, stack, stackFramePath, _i, _ref2;
      error = new Error;
      Error.captureStackTrace(error);
      stack = StackTraceParser.parse(error.stack);
      packagePaths = this.getPackagePathsByPackageName();
      for (i = _i = 0, _ref2 = stack.length; 0 <= _ref2 ? _i < _ref2 : _i > _ref2; i = 0 <= _ref2 ? ++_i : --_i) {
        stackFramePath = stack[i].file;
        if (!stackFramePath) {
          return;
        }
        for (packageName in packagePaths) {
          packagePath = packagePaths[packageName];
          if (stackFramePath === 'node.js') {
            continue;
          }
          relativePath = path.relative(packagePath, stackFramePath);
          if (!/^\.\./.test(relativePath)) {
            return packageName;
          }
        }
      }
    };
    Workspace.prototype.getPackagePathsByPackageName = function() {
      var pack, packagePath, packagePathsByPackageName, _i, _len, _ref2;
      packagePathsByPackageName = {};
      _ref2 = atom.packages.getLoadedPackages();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        pack = _ref2[_i];
        packagePath = pack.path;
        if (packagePath.indexOf('.atom/dev/packages') > -1 || packagePath.indexOf('.atom/packages') > -1) {
          packagePath = fs.realpathSync(packagePath);
        }
        packagePathsByPackageName[pack.name] = packagePath;
      }
      return packagePathsByPackageName;
    };
    Workspace.prototype.eachEditor = function(callback) {
      var editor, _i, _len, _ref2;
      deprecate("Use Workspace::observeTextEditors instead");
      _ref2 = this.getEditors();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        editor = _ref2[_i];
        callback(editor);
      }
      return this.subscribe(this, 'editor-created', function(editor) {
        return callback(editor);
      });
    };
    Workspace.prototype.getEditors = function() {
      var editors, item, pane, _i, _j, _len, _len1, _ref2, _ref3;
      deprecate("Use Workspace::getTextEditors instead");
      editors = [];
      _ref2 = this.paneContainer.getPanes();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        pane = _ref2[_i];
        _ref3 = pane.getItems();
        for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
          item = _ref3[_j];
          if (item instanceof TextEditor) {
            editors.push(item);
          }
        }
      }
      return editors;
    };
    Workspace.prototype.on = function(eventName) {
      switch (eventName) {
        case 'editor-created':
          deprecate("Use Workspace::onDidAddTextEditor or Workspace::observeTextEditors instead.");
          break;
        case 'uri-opened':
          deprecate("Use Workspace::onDidOpen or Workspace::onDidAddPaneItem instead. https://atom.io/docs/api/latest/Workspace#instance-onDidOpen");
          break;
        default:
          deprecate("Subscribing via ::on is deprecated. Use documented event subscription methods instead.");
      }
      return Workspace.__super__.on.apply(this, arguments);
    };
    Workspace.prototype.reopenItemSync = function() {
      var uri;
      deprecate("Use Workspace::reopenItem instead");
      if (uri = this.destroyedItemURIs.pop()) {
        return this.openSync(uri);
      }
    };
    Workspace.prototype.registerOpener = function(opener) {
      Grim.deprecate("Call Workspace::addOpener instead");
      return this.addOpener(opener);
    };
    Workspace.prototype.unregisterOpener = function(opener) {
      Grim.deprecate("Call .dispose() on the Disposable returned from ::addOpener instead");
      return _.remove(this.openers, opener);
    };
    Workspace.prototype.getActiveEditor = function() {
      var _ref2;
      Grim.deprecate("Call ::getActiveTextEditor instead");
      return (_ref2 = this.getActivePane()) != null ? _ref2.getActiveEditor() : void 0;
    };
    Workspace.prototype.paneForUri = function(uri) {
      deprecate("Use ::paneForURI instead.");
      return this.paneForURI(uri);
    };
  }

}).call(this);

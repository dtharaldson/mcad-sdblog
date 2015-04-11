(function() {
  var $, Atom, CompositeDisposable, Emitter, Model, StylesElement, WindowEventHandler, convertLine, convertStackTrace, crypto, deprecate, fs, includeDeprecatedAPIs, ipc, os, path, remote, shell, _, _ref, _ref1, _ref2,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  crypto = require('crypto');

  ipc = require('ipc');

  os = require('os');

  path = require('path');

  remote = require('remote');

  shell = require('shell');

  _ = require('underscore-plus');

  _ref = require('grim'), deprecate = _ref.deprecate, includeDeprecatedAPIs = _ref.includeDeprecatedAPIs;

  _ref1 = require('event-kit'), CompositeDisposable = _ref1.CompositeDisposable, Emitter = _ref1.Emitter;

  fs = require('fs-plus');

  _ref2 = require('coffeestack'), convertStackTrace = _ref2.convertStackTrace, convertLine = _ref2.convertLine;

  Model = require('./model');

  $ = require('./space-pen-extensions').$;

  WindowEventHandler = require('./window-event-handler');

  StylesElement = require('./styles-element');

  module.exports = Atom = (function(_super) {
    __extends(Atom, _super);

    Atom.version = 1;

    Atom.loadOrCreate = function(mode) {
      var atom, serviceHubDeprecationMessage, startTime, workspaceViewDeprecationMessage, _ref3;
      startTime = Date.now();
      atom = (_ref3 = this.deserialize(this.loadState(mode))) != null ? _ref3 : new this({
        mode: mode,
        version: this.version
      });
      atom.deserializeTimings.atom = Date.now() - startTime;
      if (includeDeprecatedAPIs) {
        workspaceViewDeprecationMessage = "atom.workspaceView is no longer available.\nIn most cases you will not need the view. See the Workspace docs for\nalternatives: https://atom.io/docs/api/latest/Workspace.\nIf you do need the view, please use `atom.views.getView(atom.workspace)`,\nwhich returns an HTMLElement.";
        serviceHubDeprecationMessage = "atom.services is no longer available. To register service providers and\nconsumers, use the `providedServices` and `consumedServices` fields in\nyour package's package.json.";
        Object.defineProperty(atom, 'workspaceView', {
          get: function() {
            deprecate(workspaceViewDeprecationMessage);
            return atom.__workspaceView;
          },
          set: function(newValue) {
            deprecate(workspaceViewDeprecationMessage);
            return atom.__workspaceView = newValue;
          }
        });
        Object.defineProperty(atom, 'services', {
          get: function() {
            deprecate(serviceHubDeprecationMessage);
            return atom.packages.serviceHub;
          },
          set: function(newValue) {
            deprecate(serviceHubDeprecationMessage);
            return atom.packages.serviceHub = newValue;
          }
        });
      }
      return atom;
    };

    Atom.deserialize = function(state) {
      if ((state != null ? state.version : void 0) === this.version) {
        return new this(state);
      }
    };

    Atom.loadState = function(mode) {
      var error, statePath, stateString;
      statePath = this.getStatePath(this.getLoadSettings().initialPaths, mode);
      if (fs.existsSync(statePath)) {
        try {
          stateString = fs.readFileSync(statePath, 'utf8');
        } catch (_error) {
          error = _error;
          console.warn("Error reading window state: " + statePath, error.stack, error);
        }
      } else {
        stateString = this.getLoadSettings().windowState;
      }
      try {
        if (stateString != null) {
          return JSON.parse(stateString);
        }
      } catch (_error) {
        error = _error;
        return console.warn("Error parsing window state: " + statePath + " " + error.stack, error);
      }
    };

    Atom.getStatePath = function(paths, mode) {
      var filename, sha1;
      switch (mode) {
        case 'spec':
          filename = 'spec';
          break;
        case 'editor':
          if ((paths != null ? paths.length : void 0) > 0) {
            sha1 = crypto.createHash('sha1').update(paths.slice().sort().join("\n")).digest('hex');
            filename = "editor-" + sha1;
          }
      }
      if (filename) {
        return path.join(this.getStorageDirPath(), filename);
      } else {
        return null;
      }
    };

    Atom.getConfigDirPath = function() {
      return this.configDirPath != null ? this.configDirPath : this.configDirPath = process.env.ATOM_HOME;
    };

    Atom.getStorageDirPath = function() {
      return this.storageDirPath != null ? this.storageDirPath : this.storageDirPath = path.join(this.getConfigDirPath(), 'storage');
    };

    Atom.getLoadSettings = function() {
      var cloned;
      if (this.loadSettings == null) {
        this.loadSettings = JSON.parse(decodeURIComponent(location.hash.substr(1)));
      }
      cloned = _.deepClone(this.loadSettings);
      cloned.__defineGetter__('windowState', (function(_this) {
        return function() {
          return _this.getCurrentWindow().loadSettings.windowState;
        };
      })(this));
      cloned.__defineSetter__('windowState', (function(_this) {
        return function(value) {
          return _this.getCurrentWindow().loadSettings.windowState = value;
        };
      })(this));
      return cloned;
    };

    Atom.updateLoadSetting = function(key, value) {
      this.getLoadSettings();
      this.loadSettings[key] = value;
      return location.hash = encodeURIComponent(JSON.stringify(this.loadSettings));
    };

    Atom.getCurrentWindow = function() {
      return remote.getCurrentWindow();
    };

    Atom.prototype.workspaceViewParentSelector = 'body';

    Atom.prototype.lastUncaughtError = null;


    /*
    Section: Properties
     */

    Atom.prototype.commands = null;

    Atom.prototype.config = null;

    Atom.prototype.clipboard = null;

    Atom.prototype.contextMenu = null;

    Atom.prototype.menu = null;

    Atom.prototype.keymaps = null;

    Atom.prototype.tooltips = null;

    Atom.prototype.notifications = null;

    Atom.prototype.project = null;

    Atom.prototype.grammars = null;

    Atom.prototype.packages = null;

    Atom.prototype.themes = null;

    Atom.prototype.styles = null;

    Atom.prototype.deserializers = null;

    Atom.prototype.views = null;

    Atom.prototype.workspace = null;


    /*
    Section: Construction and Destruction
     */

    function Atom(state) {
      var DeserializerManager;
      this.state = state;
      this.emitter = new Emitter;
      this.disposables = new CompositeDisposable;
      this.mode = this.state.mode;
      DeserializerManager = require('./deserializer-manager');
      this.deserializers = new DeserializerManager();
      this.deserializeTimings = {};
    }

    Atom.prototype.initialize = function() {
      var Clipboard, CommandRegistry, Config, ContextMenuManager, DisplayBuffer, GrammarRegistry, KeymapManager, MenuManager, NotificationManager, PackageManager, Project, StyleManager, TextBuffer, TextEditor, ThemeManager, TokenizedBuffer, TooltipManager, ViewRegistry, configDirPath, devMode, exportsPath, resourcePath, safeMode, sourceMapCache, _base, _ref3, _ref4, _ref5, _ref6;
      sourceMapCache = {};
      window.onerror = (function(_this) {
        return function() {
          var column, convertedLine, eventObject, line, message, openDevTools, originalError, url, _ref3;
          _this.lastUncaughtError = Array.prototype.slice.call(arguments);
          _ref3 = _this.lastUncaughtError, message = _ref3[0], url = _ref3[1], line = _ref3[2], column = _ref3[3], originalError = _ref3[4];
          convertedLine = convertLine(url, line, column, sourceMapCache);
          if (convertedLine != null) {
            line = convertedLine.line, column = convertedLine.column;
          }
          if (originalError) {
            originalError.stack = convertStackTrace(originalError.stack, sourceMapCache);
          }
          eventObject = {
            message: message,
            url: url,
            line: line,
            column: column,
            originalError: originalError
          };
          openDevTools = true;
          eventObject.preventDefault = function() {
            return openDevTools = false;
          };
          _this.emitter.emit('will-throw-error', eventObject);
          if (openDevTools) {
            _this.openDevTools();
            _this.executeJavaScriptInDevTools('InspectorFrontendAPI.showConsole()');
          }
          if (includeDeprecatedAPIs) {
            _this.emit.apply(_this, ['uncaught-error'].concat(__slice.call(arguments)));
          }
          return _this.emitter.emit('did-throw-error', {
            message: message,
            url: url,
            line: line,
            column: column,
            originalError: originalError
          });
        };
      })(this);
      if ((_ref3 = this.disposables) != null) {
        _ref3.dispose();
      }
      this.disposables = new CompositeDisposable;
      this.setBodyPlatformClass();
      this.loadTime = null;
      Config = require('./config');
      KeymapManager = require('./keymap-extensions');
      ViewRegistry = require('./view-registry');
      CommandRegistry = require('./command-registry');
      TooltipManager = require('./tooltip-manager');
      NotificationManager = require('./notification-manager');
      PackageManager = require('./package-manager');
      Clipboard = require('./clipboard');
      GrammarRegistry = require('./grammar-registry');
      ThemeManager = require('./theme-manager');
      StyleManager = require('./style-manager');
      ContextMenuManager = require('./context-menu-manager');
      MenuManager = require('./menu-manager');
      _ref4 = this.getLoadSettings(), devMode = _ref4.devMode, safeMode = _ref4.safeMode, resourcePath = _ref4.resourcePath;
      configDirPath = this.getConfigDirPath();
      exportsPath = path.join(resourcePath, 'exports');
      require('module').globalPaths.push(exportsPath);
      process.env.NODE_PATH = exportsPath;
      if (!devMode) {
        if ((_base = process.env).NODE_ENV == null) {
          _base.NODE_ENV = 'production';
        }
      }
      this.config = new Config({
        configDirPath: configDirPath,
        resourcePath: resourcePath
      });
      this.keymaps = new KeymapManager({
        configDirPath: configDirPath,
        resourcePath: resourcePath
      });
      if (includeDeprecatedAPIs) {
        this.keymap = this.keymaps;
      }
      this.keymaps.subscribeToFileReadFailure();
      this.tooltips = new TooltipManager;
      this.notifications = new NotificationManager;
      this.commands = new CommandRegistry;
      this.views = new ViewRegistry;
      this.packages = new PackageManager({
        devMode: devMode,
        configDirPath: configDirPath,
        resourcePath: resourcePath,
        safeMode: safeMode
      });
      this.styles = new StyleManager;
      document.head.appendChild(new StylesElement);
      this.themes = new ThemeManager({
        packageManager: this.packages,
        configDirPath: configDirPath,
        resourcePath: resourcePath,
        safeMode: safeMode
      });
      this.contextMenu = new ContextMenuManager({
        resourcePath: resourcePath,
        devMode: devMode
      });
      this.menu = new MenuManager({
        resourcePath: resourcePath
      });
      this.clipboard = new Clipboard();
      this.grammars = (_ref5 = this.deserializers.deserialize((_ref6 = this.state.grammars) != null ? _ref6 : this.state.syntax)) != null ? _ref5 : new GrammarRegistry();
      if (includeDeprecatedAPIs) {
        Object.defineProperty(this, 'syntax', {
          get: function() {
            deprecate("The atom.syntax global is deprecated. Use atom.grammars instead.");
            return this.grammars;
          }
        });
      }
      this.disposables.add(this.packages.onDidActivateInitialPackages((function(_this) {
        return function() {
          return _this.watchThemes();
        };
      })(this)));
      Project = require('./project');
      TextBuffer = require('text-buffer');
      this.deserializers.add(TextBuffer);
      TokenizedBuffer = require('./tokenized-buffer');
      DisplayBuffer = require('./display-buffer');
      TextEditor = require('./text-editor');
      return this.windowEventHandler = new WindowEventHandler;
    };


    /*
    Section: Event Subscription
     */

    Atom.prototype.onDidBeep = function(callback) {
      return this.emitter.on('did-beep', callback);
    };

    Atom.prototype.onWillThrowError = function(callback) {
      return this.emitter.on('will-throw-error', callback);
    };

    Atom.prototype.onDidThrowError = function(callback) {
      return this.emitter.on('did-throw-error', callback);
    };


    /*
    Section: Atom Details
     */

    Atom.prototype.inDevMode = function() {
      return this.devMode != null ? this.devMode : this.devMode = this.getLoadSettings().devMode;
    };

    Atom.prototype.inSafeMode = function() {
      return this.safeMode != null ? this.safeMode : this.safeMode = this.getLoadSettings().safeMode;
    };

    Atom.prototype.inSpecMode = function() {
      return this.specMode != null ? this.specMode : this.specMode = this.getLoadSettings().isSpec;
    };

    Atom.prototype.getVersion = function() {
      return this.appVersion != null ? this.appVersion : this.appVersion = this.getLoadSettings().appVersion;
    };

    Atom.prototype.isReleasedVersion = function() {
      return !/\w{7}/.test(this.getVersion());
    };

    Atom.prototype.getConfigDirPath = function() {
      return this.constructor.getConfigDirPath();
    };

    Atom.prototype.getWindowLoadTime = function() {
      return this.loadTime;
    };

    Atom.prototype.getLoadSettings = function() {
      return this.constructor.getLoadSettings();
    };


    /*
    Section: Managing The Atom Window
     */

    Atom.prototype.open = function(options) {
      return ipc.send('open', options);
    };

    Atom.prototype.pickFolder = function(callback) {
      var responseChannel;
      responseChannel = "atom-pick-folder-response";
      ipc.on(responseChannel, function(path) {
        ipc.removeAllListeners(responseChannel);
        return callback(path);
      });
      return ipc.send("pick-folder", responseChannel);
    };

    Atom.prototype.close = function() {
      return this.getCurrentWindow().close();
    };

    Atom.prototype.getSize = function() {
      var height, width, _ref3;
      _ref3 = this.getCurrentWindow().getSize(), width = _ref3[0], height = _ref3[1];
      return {
        width: width,
        height: height
      };
    };

    Atom.prototype.setSize = function(width, height) {
      return this.getCurrentWindow().setSize(width, height);
    };

    Atom.prototype.getPosition = function() {
      var x, y, _ref3;
      _ref3 = this.getCurrentWindow().getPosition(), x = _ref3[0], y = _ref3[1];
      return {
        x: x,
        y: y
      };
    };

    Atom.prototype.setPosition = function(x, y) {
      return ipc.send('call-window-method', 'setPosition', x, y);
    };

    Atom.prototype.getCurrentWindow = function() {
      return this.constructor.getCurrentWindow();
    };

    Atom.prototype.center = function() {
      return ipc.send('call-window-method', 'center');
    };

    Atom.prototype.focus = function() {
      ipc.send('call-window-method', 'focus');
      return $(window).focus();
    };

    Atom.prototype.show = function() {
      return ipc.send('call-window-method', 'show');
    };

    Atom.prototype.hide = function() {
      return ipc.send('call-window-method', 'hide');
    };

    Atom.prototype.reload = function() {
      return ipc.send('call-window-method', 'restart');
    };

    Atom.prototype.isMaximixed = function() {
      return this.getCurrentWindow().isMaximized();
    };

    Atom.prototype.maximize = function() {
      return ipc.send('call-window-method', 'maximize');
    };

    Atom.prototype.isFullScreen = function() {
      return this.getCurrentWindow().isFullScreen();
    };

    Atom.prototype.setFullScreen = function(fullScreen) {
      if (fullScreen == null) {
        fullScreen = false;
      }
      ipc.send('call-window-method', 'setFullScreen', fullScreen);
      if (fullScreen) {
        return document.body.classList.add("fullscreen");
      } else {
        return document.body.classList.remove("fullscreen");
      }
    };

    Atom.prototype.toggleFullScreen = function() {
      return this.setFullScreen(!this.isFullScreen());
    };

    Atom.prototype.displayWindow = function(_arg) {
      var maximize;
      maximize = (_arg != null ? _arg : {}).maximize;
      return setImmediate((function(_this) {
        return function() {
          _this.show();
          _this.focus();
          if (_this.workspace.fullScreen) {
            _this.setFullScreen(true);
          }
          if (maximize) {
            return _this.maximize();
          }
        };
      })(this));
    };

    Atom.prototype.getWindowDimensions = function() {
      var browserWindow, height, maximized, width, x, y, _ref3, _ref4;
      browserWindow = this.getCurrentWindow();
      _ref3 = browserWindow.getPosition(), x = _ref3[0], y = _ref3[1];
      _ref4 = browserWindow.getSize(), width = _ref4[0], height = _ref4[1];
      maximized = browserWindow.isMaximized();
      return {
        x: x,
        y: y,
        width: width,
        height: height,
        maximized: maximized
      };
    };

    Atom.prototype.setWindowDimensions = function(_arg) {
      var height, width, x, y;
      x = _arg.x, y = _arg.y, width = _arg.width, height = _arg.height;
      if ((width != null) && (height != null)) {
        this.setSize(width, height);
      }
      if ((x != null) && (y != null)) {
        return this.setPosition(x, y);
      } else {
        return this.center();
      }
    };

    Atom.prototype.isValidDimensions = function(_arg) {
      var height, width, x, y, _ref3;
      _ref3 = _arg != null ? _arg : {}, x = _ref3.x, y = _ref3.y, width = _ref3.width, height = _ref3.height;
      return width > 0 && height > 0 && x + width > 0 && y + height > 0;
    };

    Atom.prototype.storeDefaultWindowDimensions = function() {
      var dimensions;
      dimensions = this.getWindowDimensions();
      if (this.isValidDimensions(dimensions)) {
        return localStorage.setItem("defaultWindowDimensions", JSON.stringify(dimensions));
      }
    };

    Atom.prototype.getDefaultWindowDimensions = function() {
      var dimensions, error, height, screen, width, windowDimensions, _ref3;
      windowDimensions = this.getLoadSettings().windowDimensions;
      if (windowDimensions != null) {
        return windowDimensions;
      }
      dimensions = null;
      try {
        dimensions = JSON.parse(localStorage.getItem("defaultWindowDimensions"));
      } catch (_error) {
        error = _error;
        console.warn("Error parsing default window dimensions", error);
        localStorage.removeItem("defaultWindowDimensions");
      }
      if (this.isValidDimensions(dimensions)) {
        return dimensions;
      } else {
        screen = remote.require('screen');
        _ref3 = screen.getPrimaryDisplay().workAreaSize, width = _ref3.width, height = _ref3.height;
        return {
          x: 0,
          y: 0,
          width: Math.min(1024, width),
          height: height
        };
      }
    };

    Atom.prototype.restoreWindowDimensions = function() {
      var dimensions;
      dimensions = this.state.windowDimensions;
      if (!this.isValidDimensions(dimensions)) {
        dimensions = this.getDefaultWindowDimensions();
      }
      this.setWindowDimensions(dimensions);
      return dimensions;
    };

    Atom.prototype.storeWindowDimensions = function() {
      var dimensions;
      dimensions = this.getWindowDimensions();
      if (this.isValidDimensions(dimensions)) {
        return this.state.windowDimensions = dimensions;
      }
    };

    Atom.prototype.startEditorWindow = function() {
      var CommandInstaller, dimensions, maximize, resourcePath, safeMode, _ref3;
      _ref3 = this.getLoadSettings(), resourcePath = _ref3.resourcePath, safeMode = _ref3.safeMode;
      CommandInstaller = require('./command-installer');
      CommandInstaller.installAtomCommand(resourcePath, false, function(error) {
        if (error != null) {
          return console.warn(error.message);
        }
      });
      CommandInstaller.installApmCommand(resourcePath, false, function(error) {
        if (error != null) {
          return console.warn(error.message);
        }
      });
      dimensions = this.restoreWindowDimensions();
      this.loadConfig();
      this.keymaps.loadBundledKeymaps();
      this.themes.loadBaseStylesheets();
      this.packages.loadPackages();
      this.deserializeEditorWindow();
      this.watchProjectPath();
      this.packages.activate();
      this.keymaps.loadUserKeymap();
      if (!safeMode) {
        this.requireUserInitScript();
      }
      this.menu.update();
      this.disposables.add(this.config.onDidChange('core.autoHideMenuBar', (function(_this) {
        return function(_arg) {
          var newValue;
          newValue = _arg.newValue;
          return _this.setAutoHideMenuBar(newValue);
        };
      })(this)));
      if (this.config.get('core.autoHideMenuBar')) {
        this.setAutoHideMenuBar(true);
      }
      this.openInitialEmptyEditorIfNecessary();
      maximize = (dimensions != null ? dimensions.maximized : void 0) && process.platform !== 'darwin';
      return this.displayWindow({
        maximize: maximize
      });
    };

    Atom.prototype.unloadEditorWindow = function() {
      if (!this.project) {
        return;
      }
      this.state.grammars = this.grammars.serialize();
      this.state.project = this.project.serialize();
      this.state.workspace = this.workspace.serialize();
      this.packages.deactivatePackages();
      this.state.packageStates = this.packages.packageStates;
      this.saveSync();
      return this.windowState = null;
    };

    Atom.prototype.removeEditorWindow = function() {
      var _ref3, _ref4, _ref5;
      if (!this.project) {
        return;
      }
      if ((_ref3 = this.workspace) != null) {
        _ref3.destroy();
      }
      this.workspace = null;
      if ((_ref4 = this.project) != null) {
        _ref4.destroy();
      }
      this.project = null;
      return (_ref5 = this.windowEventHandler) != null ? _ref5.unsubscribe() : void 0;
    };

    Atom.prototype.openInitialEmptyEditorIfNecessary = function() {
      var _ref3;
      if (((_ref3 = this.getLoadSettings().initialPaths) != null ? _ref3.length : void 0) === 0 && this.workspace.getPaneItems().length === 0) {
        return this.workspace.open(null);
      }
    };


    /*
    Section: Messaging the User
     */

    Atom.prototype.beep = function() {
      var _ref3;
      if (this.config.get('core.audioBeep')) {
        shell.beep();
      }
      if ((_ref3 = this.__workspaceView) != null) {
        _ref3.trigger('beep');
      }
      return this.emitter.emit('did-beep');
    };

    Atom.prototype.confirm = function(_arg) {
      var buttonLabels, buttons, callback, chosen, detailedMessage, dialog, message, _ref3;
      _ref3 = _arg != null ? _arg : {}, message = _ref3.message, detailedMessage = _ref3.detailedMessage, buttons = _ref3.buttons;
      if (buttons == null) {
        buttons = {};
      }
      if (_.isArray(buttons)) {
        buttonLabels = buttons;
      } else {
        buttonLabels = Object.keys(buttons);
      }
      dialog = remote.require('dialog');
      chosen = dialog.showMessageBox(this.getCurrentWindow(), {
        type: 'info',
        message: message,
        detail: detailedMessage,
        buttons: buttonLabels
      });
      if (_.isArray(buttons)) {
        return chosen;
      } else {
        callback = buttons[buttonLabels[chosen]];
        return typeof callback === "function" ? callback() : void 0;
      }
    };


    /*
    Section: Managing the Dev Tools
     */

    Atom.prototype.openDevTools = function() {
      return ipc.send('call-window-method', 'openDevTools');
    };

    Atom.prototype.toggleDevTools = function() {
      return ipc.send('call-window-method', 'toggleDevTools');
    };

    Atom.prototype.executeJavaScriptInDevTools = function(code) {
      return ipc.send('call-window-method', 'executeJavaScriptInDevTools', code);
    };


    /*
    Section: Private
     */

    Atom.prototype.deserializeProject = function() {
      var Project, startTime, _ref3;
      Project = require('./project');
      startTime = Date.now();
      if (this.project == null) {
        this.project = (_ref3 = this.deserializers.deserialize(this.state.project)) != null ? _ref3 : new Project();
      }
      return this.deserializeTimings.project = Date.now() - startTime;
    };

    Atom.prototype.deserializeWorkspaceView = function() {
      var Workspace, WorkspaceView, startTime, workspaceElement, _ref3;
      Workspace = require('./workspace');
      if (includeDeprecatedAPIs) {
        WorkspaceView = require('./workspace-view');
      }
      startTime = Date.now();
      this.workspace = (_ref3 = Workspace.deserialize(this.state.workspace)) != null ? _ref3 : new Workspace;
      workspaceElement = this.views.getView(this.workspace);
      this.__workspaceView = workspaceElement.__spacePenView;
      this.deserializeTimings.workspace = Date.now() - startTime;
      this.keymaps.defaultTarget = workspaceElement;
      return document.querySelector(this.workspaceViewParentSelector).appendChild(workspaceElement);
    };

    Atom.prototype.deserializePackageStates = function() {
      var _ref3;
      this.packages.packageStates = (_ref3 = this.state.packageStates) != null ? _ref3 : {};
      return delete this.state.packageStates;
    };

    Atom.prototype.deserializeEditorWindow = function() {
      this.deserializePackageStates();
      this.deserializeProject();
      return this.deserializeWorkspaceView();
    };

    Atom.prototype.loadConfig = function() {
      this.config.setSchema(null, {
        type: 'object',
        properties: _.clone(require('./config-schema'))
      });
      return this.config.load();
    };

    Atom.prototype.loadThemes = function() {
      return this.themes.load();
    };

    Atom.prototype.watchThemes = function() {
      return this.themes.onDidChangeActiveThemes((function(_this) {
        return function() {
          var pack, _i, _len, _ref3;
          _ref3 = _this.packages.getActivePackages();
          for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
            pack = _ref3[_i];
            if (pack.getType() !== 'theme') {
              if (typeof pack.reloadStylesheets === "function") {
                pack.reloadStylesheets();
              }
            }
          }
          return null;
        };
      })(this));
    };

    Atom.prototype.watchProjectPath = function() {
      return this.disposables.add(this.project.onDidChangePaths((function(_this) {
        return function() {
          return _this.constructor.updateLoadSetting('initialPaths', _this.project.getPaths());
        };
      })(this)));
    };

    Atom.prototype.exit = function(status) {
      var app;
      app = remote.require('app');
      app.emit('will-exit');
      return remote.process.exit(status);
    };

    Atom.prototype.setDocumentEdited = function(edited) {
      return ipc.send('call-window-method', 'setDocumentEdited', edited);
    };

    Atom.prototype.setRepresentedFilename = function(filename) {
      return ipc.send('call-window-method', 'setRepresentedFilename', filename);
    };

    Atom.prototype.addProjectFolder = function() {
      return this.pickFolder((function(_this) {
        return function(selectedPaths) {
          var selectedPath, _i, _len, _results;
          if (selectedPaths == null) {
            selectedPaths = [];
          }
          _results = [];
          for (_i = 0, _len = selectedPaths.length; _i < _len; _i++) {
            selectedPath = selectedPaths[_i];
            _results.push(_this.project.addPath(selectedPath));
          }
          return _results;
        };
      })(this));
    };

    Atom.prototype.showSaveDialog = function(callback) {
      return callback(showSaveDialogSync());
    };

    Atom.prototype.showSaveDialogSync = function(defaultPath) {
      var currentWindow, dialog, _ref3;
      if (defaultPath == null) {
        defaultPath = (_ref3 = this.project) != null ? _ref3.getPaths()[0] : void 0;
      }
      currentWindow = this.getCurrentWindow();
      dialog = remote.require('dialog');
      return dialog.showSaveDialog(currentWindow, {
        title: 'Save File',
        defaultPath: defaultPath
      });
    };

    Atom.prototype.saveSync = function() {
      var statePath, stateString, _ref3;
      stateString = JSON.stringify(this.state);
      if (statePath = this.constructor.getStatePath((_ref3 = this.project) != null ? _ref3.getPaths() : void 0, this.mode)) {
        return fs.writeFileSync(statePath, stateString, 'utf8');
      } else {
        return this.getCurrentWindow().loadSettings.windowState = stateString;
      }
    };

    Atom.prototype.crashMainProcess = function() {
      return remote.process.crash();
    };

    Atom.prototype.crashRenderProcess = function() {
      return process.crash();
    };

    Atom.prototype.getUserInitScriptPath = function() {
      var initScriptPath;
      initScriptPath = fs.resolve(this.getConfigDirPath(), 'init', ['js', 'coffee']);
      return initScriptPath != null ? initScriptPath : path.join(this.getConfigDirPath(), 'init.coffee');
    };

    Atom.prototype.requireUserInitScript = function() {
      var error, userInitScriptPath;
      if (userInitScriptPath = this.getUserInitScriptPath()) {
        try {
          if (fs.isFileSync(userInitScriptPath)) {
            return require(userInitScriptPath);
          }
        } catch (_error) {
          error = _error;
          return atom.notifications.addError("Failed to load `" + userInitScriptPath + "`", {
            detail: error.message,
            dismissable: true
          });
        }
      }
    };

    Atom.prototype.requireWithGlobals = function(id, globals) {
      var existingGlobals, key, value;
      if (globals == null) {
        globals = {};
      }
      existingGlobals = {};
      for (key in globals) {
        value = globals[key];
        existingGlobals[key] = window[key];
        window[key] = value;
      }
      require(id);
      for (key in existingGlobals) {
        value = existingGlobals[key];
        if (value === void 0) {
          delete window[key];
        } else {
          window[key] = value;
        }
      }
    };

    Atom.prototype.onUpdateAvailable = function(callback) {
      return this.emitter.on('update-available', callback);
    };

    Atom.prototype.updateAvailable = function(details) {
      return this.emitter.emit('update-available', details);
    };

    Atom.prototype.setBodyPlatformClass = function() {
      return document.body.classList.add("platform-" + process.platform);
    };

    Atom.prototype.setAutoHideMenuBar = function(autoHide) {
      ipc.send('call-window-method', 'setAutoHideMenuBar', autoHide);
      return ipc.send('call-window-method', 'setMenuBarVisibility', !autoHide);
    };

    return Atom;

  })(Model);

  if (includeDeprecatedAPIs) {
    Atom.prototype.registerRepresentationClass = function() {
      return deprecate("Callers should be converted to use atom.deserializers");
    };
    Atom.prototype.registerRepresentationClasses = function() {
      return deprecate("Callers should be converted to use atom.deserializers");
    };
  }

}).call(this);

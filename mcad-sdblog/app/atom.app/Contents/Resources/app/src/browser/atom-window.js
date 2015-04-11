(function() {
  var AtomWindow, BrowserWindow, EventEmitter, app, fs, path, url, _,
    __slice = [].slice;

  BrowserWindow = require('browser-window');

  app = require('app');

  path = require('path');

  fs = require('fs');

  url = require('url');

  _ = require('underscore-plus');

  EventEmitter = require('events').EventEmitter;

  module.exports = AtomWindow = (function() {
    _.extend(AtomWindow.prototype, EventEmitter.prototype);

    AtomWindow.iconPath = path.resolve(__dirname, '..', '..', 'resources', 'atom.png');

    AtomWindow.includeShellLoadTime = true;

    AtomWindow.prototype.browserWindow = null;

    AtomWindow.prototype.loaded = null;

    AtomWindow.prototype.isSpec = null;

    function AtomWindow(settings) {
      var hasPathToOpen, loadSettings, locationsToOpen, options, pathToOpen;
      if (settings == null) {
        settings = {};
      }
      this.resourcePath = settings.resourcePath, pathToOpen = settings.pathToOpen, locationsToOpen = settings.locationsToOpen, this.isSpec = settings.isSpec, this.exitWhenDone = settings.exitWhenDone, this.safeMode = settings.safeMode, this.devMode = settings.devMode, this.apiPreviewMode = settings.apiPreviewMode;
      if (pathToOpen) {
        if (locationsToOpen == null) {
          locationsToOpen = [
            {
              pathToOpen: pathToOpen
            }
          ];
        }
      }
      if (locationsToOpen == null) {
        locationsToOpen = [];
      }
      if (this.resourcePath) {
        this.resourcePath = path.normalize(this.resourcePath);
      }
      options = {
        show: false,
        title: 'Atom',
        'web-preferences': {
          'direct-write': true,
          'subpixel-font-scaling': false
        }
      };
      if (process.platform === 'linux') {
        options.icon = this.constructor.iconPath;
      }
      this.browserWindow = new BrowserWindow(options);
      global.atomApplication.addWindow(this);
      this.handleEvents();
      loadSettings = _.extend({}, settings);
      if (loadSettings.windowState == null) {
        loadSettings.windowState = '{}';
      }
      loadSettings.appVersion = app.getVersion();
      loadSettings.resourcePath = this.resourcePath;
      if (loadSettings.devMode == null) {
        loadSettings.devMode = false;
      }
      if (loadSettings.safeMode == null) {
        loadSettings.safeMode = false;
      }
      if (loadSettings.apiPreviewMode == null) {
        loadSettings.apiPreviewMode = false;
      }
      if (this.constructor.includeShellLoadTime && !this.isSpec) {
        this.constructor.includeShellLoadTime = false;
        if (loadSettings.shellLoadTime == null) {
          loadSettings.shellLoadTime = Date.now() - global.shellStartTime;
        }
      }
      loadSettings.initialPaths = (function() {
        var _base, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = locationsToOpen.length; _i < _len; _i++) {
          pathToOpen = locationsToOpen[_i].pathToOpen;
          if (pathToOpen) {
            if (typeof (_base = fs.statSyncNoException(pathToOpen)).isFile === "function" ? _base.isFile() : void 0) {
              _results.push(path.dirname(pathToOpen));
            } else {
              _results.push(pathToOpen);
            }
          }
        }
        return _results;
      })();
      loadSettings.initialPaths.sort();
      this.browserWindow.loadSettings = loadSettings;
      this.browserWindow.once('window:loaded', (function(_this) {
        return function() {
          _this.emit('window:loaded');
          return _this.loaded = true;
        };
      })(this));
      this.setLoadSettings(loadSettings);
      if (this.isSpec) {
        this.browserWindow.focusOnWebView();
      }
      hasPathToOpen = !(locationsToOpen.length === 1 && (locationsToOpen[0].pathToOpen == null));
      if (hasPathToOpen && !this.isSpecWindow()) {
        this.openLocations(locationsToOpen);
      }
    }

    AtomWindow.prototype.setLoadSettings = function(loadSettingsObj) {
      var loadSettings;
      loadSettings = _.clone(loadSettingsObj);
      delete loadSettings['windowState'];
      return this.browserWindow.loadUrl(url.format({
        protocol: 'file',
        pathname: "" + this.resourcePath + "/static/index.html",
        slashes: true,
        hash: encodeURIComponent(JSON.stringify(loadSettings))
      }));
    };

    AtomWindow.prototype.getLoadSettings = function() {
      var hash;
      hash = url.parse(this.browserWindow.webContents.getUrl()).hash.substr(1);
      return JSON.parse(decodeURIComponent(hash));
    };

    AtomWindow.prototype.hasProjectPath = function() {
      var _ref;
      return ((_ref = this.getLoadSettings().initialPaths) != null ? _ref.length : void 0) > 0;
    };

    AtomWindow.prototype.setupContextMenu = function() {
      var ContextMenu;
      ContextMenu = null;
      return this.browserWindow.on('context-menu', (function(_this) {
        return function(menuTemplate) {
          if (ContextMenu == null) {
            ContextMenu = require('./context-menu');
          }
          return new ContextMenu(menuTemplate, _this);
        };
      })(this));
    };

    AtomWindow.prototype.containsPaths = function(paths) {
      var pathToCheck, _i, _len;
      for (_i = 0, _len = paths.length; _i < _len; _i++) {
        pathToCheck = paths[_i];
        if (!this.containsPath(pathToCheck)) {
          return false;
        }
      }
      return true;
    };

    AtomWindow.prototype.containsPath = function(pathToCheck) {
      var _ref;
      return (_ref = this.getLoadSettings().initialPaths) != null ? _ref.some(function(projectPath) {
        var _base;
        if (!projectPath) {
          return false;
        } else if (!pathToCheck) {
          return false;
        } else if (pathToCheck === projectPath) {
          return true;
        } else if (typeof (_base = fs.statSyncNoException(pathToCheck)).isDirectory === "function" ? _base.isDirectory() : void 0) {
          return false;
        } else if (pathToCheck.indexOf(path.join(projectPath, path.sep)) === 0) {
          return true;
        } else {
          return false;
        }
      }) : void 0;
    };

    AtomWindow.prototype.handleEvents = function() {
      this.browserWindow.on('closed', (function(_this) {
        return function() {
          return global.atomApplication.removeWindow(_this);
        };
      })(this));
      this.browserWindow.on('unresponsive', (function(_this) {
        return function() {
          var chosen, dialog;
          if (_this.isSpec) {
            return;
          }
          dialog = require('dialog');
          chosen = dialog.showMessageBox(_this.browserWindow, {
            type: 'warning',
            buttons: ['Close', 'Keep Waiting'],
            message: 'Editor is not responding',
            detail: 'The editor is not responding. Would you like to force close it or just keep waiting?'
          });
          if (chosen === 0) {
            return _this.browserWindow.destroy();
          }
        };
      })(this));
      this.browserWindow.webContents.on('crashed', (function(_this) {
        return function() {
          var chosen, dialog;
          if (_this.exitWhenDone) {
            global.atomApplication.exit(100);
          }
          dialog = require('dialog');
          chosen = dialog.showMessageBox(_this.browserWindow, {
            type: 'warning',
            buttons: ['Close Window', 'Reload', 'Keep It Open'],
            message: 'The editor has crashed',
            detail: 'Please report this issue to https://github.com/atom/atom'
          });
          switch (chosen) {
            case 0:
              return _this.browserWindow.destroy();
            case 1:
              return _this.browserWindow.restart();
          }
        };
      })(this));
      this.setupContextMenu();
      if (this.isSpec) {
        if (process.platform === 'win32') {
          this.browserWindow.on('close', (function(_this) {
            return function() {
              return _this.isWindowClosing = true;
            };
          })(this));
        }
        return this.browserWindow.on('blur', (function(_this) {
          return function() {
            if (!_this.isWindowClosing) {
              return _this.browserWindow.focusOnWebView();
            }
          };
        })(this));
      }
    };

    AtomWindow.prototype.openPath = function(pathToOpen, initialLine, initialColumn) {
      return this.openLocations([
        {
          pathToOpen: pathToOpen,
          initialLine: initialLine,
          initialColumn: initialColumn
        }
      ]);
    };

    AtomWindow.prototype.openLocations = function(locationsToOpen) {
      if (this.loaded) {
        this.focus();
        return this.sendMessage('open-locations', locationsToOpen);
      } else {
        return this.browserWindow.once('window:loaded', (function(_this) {
          return function() {
            return _this.openLocations(locationsToOpen);
          };
        })(this));
      }
    };

    AtomWindow.prototype.sendMessage = function(message, detail) {
      return this.browserWindow.webContents.send('message', message, detail);
    };

    AtomWindow.prototype.sendCommand = function() {
      var args, command;
      command = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (this.isSpecWindow()) {
        if (!global.atomApplication.sendCommandToFirstResponder(command)) {
          switch (command) {
            case 'window:reload':
              return this.reload();
            case 'window:toggle-dev-tools':
              return this.toggleDevTools();
            case 'window:close':
              return this.close();
          }
        }
      } else if (this.isWebViewFocused()) {
        return this.sendCommandToBrowserWindow.apply(this, [command].concat(__slice.call(args)));
      } else {
        if (!global.atomApplication.sendCommandToFirstResponder(command)) {
          return this.sendCommandToBrowserWindow.apply(this, [command].concat(__slice.call(args)));
        }
      }
    };

    AtomWindow.prototype.sendCommandToBrowserWindow = function() {
      var action, args, command, _ref, _ref1;
      command = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      action = ((_ref = args[0]) != null ? _ref.contextCommand : void 0) ? 'context-command' : 'command';
      return (_ref1 = this.browserWindow.webContents).send.apply(_ref1, [action, command].concat(__slice.call(args)));
    };

    AtomWindow.prototype.getDimensions = function() {
      var height, width, x, y, _ref, _ref1;
      _ref = this.browserWindow.getPosition(), x = _ref[0], y = _ref[1];
      _ref1 = this.browserWindow.getSize(), width = _ref1[0], height = _ref1[1];
      return {
        x: x,
        y: y,
        width: width,
        height: height
      };
    };

    AtomWindow.prototype.close = function() {
      return this.browserWindow.close();
    };

    AtomWindow.prototype.focus = function() {
      return this.browserWindow.focus();
    };

    AtomWindow.prototype.minimize = function() {
      return this.browserWindow.minimize();
    };

    AtomWindow.prototype.maximize = function() {
      return this.browserWindow.maximize();
    };

    AtomWindow.prototype.restore = function() {
      return this.browserWindow.restore();
    };

    AtomWindow.prototype.handlesAtomCommands = function() {
      return !this.isSpecWindow() && this.isWebViewFocused();
    };

    AtomWindow.prototype.isFocused = function() {
      return this.browserWindow.isFocused();
    };

    AtomWindow.prototype.isMinimized = function() {
      return this.browserWindow.isMinimized();
    };

    AtomWindow.prototype.isWebViewFocused = function() {
      return this.browserWindow.isWebViewFocused();
    };

    AtomWindow.prototype.isSpecWindow = function() {
      return this.isSpec;
    };

    AtomWindow.prototype.reload = function() {
      return this.browserWindow.restart();
    };

    AtomWindow.prototype.toggleDevTools = function() {
      return this.browserWindow.toggleDevTools();
    };

    return AtomWindow;

  })();

}).call(this);

(function() {
  var ApplicationMenu, AtomApplication, AtomProtocolHandler, AtomWindow, AutoUpdateManager, BrowserWindow, DefaultSocketPath, EventEmitter, Menu, app, fs, ipc, net, os, path, url, _,
    __slice = [].slice;

  AtomWindow = require('./atom-window');

  ApplicationMenu = require('./application-menu');

  AtomProtocolHandler = require('./atom-protocol-handler');

  AutoUpdateManager = require('./auto-update-manager');

  BrowserWindow = require('browser-window');

  Menu = require('menu');

  app = require('app');

  fs = require('fs-plus');

  ipc = require('ipc');

  path = require('path');

  os = require('os');

  net = require('net');

  url = require('url');

  EventEmitter = require('events').EventEmitter;

  _ = require('underscore-plus');

  DefaultSocketPath = process.platform === 'win32' ? '\\\\.\\pipe\\atom-sock' : path.join(os.tmpdir(), "atom-" + process.env.USER + ".sock");

  module.exports = AtomApplication = (function() {
    _.extend(AtomApplication.prototype, EventEmitter.prototype);

    AtomApplication.open = function(options) {
      var client, createAtomApplication;
      if (options.socketPath == null) {
        options.socketPath = DefaultSocketPath;
      }
      createAtomApplication = function() {
        return new AtomApplication(options);
      };
      if ((process.platform !== 'win32' && !fs.existsSync(options.socketPath)) || options.test) {
        createAtomApplication();
        return;
      }
      client = net.connect({
        path: options.socketPath
      }, function() {
        return client.write(JSON.stringify(options), function() {
          client.end();
          return app.terminate();
        });
      });
      return client.on('error', createAtomApplication);
    };

    AtomApplication.prototype.windows = null;

    AtomApplication.prototype.applicationMenu = null;

    AtomApplication.prototype.atomProtocolHandler = null;

    AtomApplication.prototype.resourcePath = null;

    AtomApplication.prototype.version = null;

    AtomApplication.prototype.exit = function(status) {
      return app.exit(status);
    };

    function AtomApplication(options) {
      this.resourcePath = options.resourcePath, this.version = options.version, this.devMode = options.devMode, this.safeMode = options.safeMode, this.apiPreviewMode = options.apiPreviewMode, this.socketPath = options.socketPath;
      if (this.resourcePath) {
        this.resourcePath = path.normalize(this.resourcePath);
      }
      global.atomApplication = this;
      this.pidsToOpenWindows = {};
      if (this.pathsToOpen == null) {
        this.pathsToOpen = [];
      }
      this.windows = [];
      this.autoUpdateManager = new AutoUpdateManager(this.version);
      this.applicationMenu = new ApplicationMenu(this.version);
      this.atomProtocolHandler = new AtomProtocolHandler(this.resourcePath, this.safeMode);
      this.listenForArgumentsFromNewProcess();
      this.setupJavaScriptArguments();
      this.handleEvents();
      this.openWithOptions(options);
    }

    AtomApplication.prototype.openWithOptions = function(_arg) {
      var apiPreviewMode, devMode, logFile, newWindow, pathsToOpen, pidToKillWhenClosed, safeMode, specDirectory, test, urlToOpen, urlsToOpen, _i, _len, _results;
      pathsToOpen = _arg.pathsToOpen, urlsToOpen = _arg.urlsToOpen, test = _arg.test, pidToKillWhenClosed = _arg.pidToKillWhenClosed, devMode = _arg.devMode, safeMode = _arg.safeMode, apiPreviewMode = _arg.apiPreviewMode, newWindow = _arg.newWindow, specDirectory = _arg.specDirectory, logFile = _arg.logFile;
      if (test) {
        return this.runSpecs({
          exitWhenDone: true,
          resourcePath: this.resourcePath,
          specDirectory: specDirectory,
          logFile: logFile
        });
      } else if (pathsToOpen.length > 0) {
        return this.openPaths({
          pathsToOpen: pathsToOpen,
          pidToKillWhenClosed: pidToKillWhenClosed,
          newWindow: newWindow,
          devMode: devMode,
          safeMode: safeMode,
          apiPreviewMode: apiPreviewMode
        });
      } else if (urlsToOpen.length > 0) {
        _results = [];
        for (_i = 0, _len = urlsToOpen.length; _i < _len; _i++) {
          urlToOpen = urlsToOpen[_i];
          _results.push(this.openUrl({
            urlToOpen: urlToOpen,
            devMode: devMode,
            safeMode: safeMode,
            apiPreviewMode: apiPreviewMode
          }));
        }
        return _results;
      } else {
        return this.openPath({
          pidToKillWhenClosed: pidToKillWhenClosed,
          newWindow: newWindow,
          devMode: devMode,
          safeMode: safeMode,
          apiPreviewMode: apiPreviewMode
        });
      }
    };

    AtomApplication.prototype.removeWindow = function(window) {
      var _ref;
      this.windows.splice(this.windows.indexOf(window), 1);
      if (this.windows.length === 0) {
        return (_ref = this.applicationMenu) != null ? _ref.enableWindowSpecificItems(false) : void 0;
      }
    };

    AtomApplication.prototype.addWindow = function(window) {
      var focusHandler, _ref;
      this.windows.push(window);
      if ((_ref = this.applicationMenu) != null) {
        _ref.addWindow(window.browserWindow);
      }
      window.once('window:loaded', (function(_this) {
        return function() {
          return _this.autoUpdateManager.emitUpdateAvailableEvent(window);
        };
      })(this));
      if (!window.isSpec) {
        focusHandler = (function(_this) {
          return function() {
            return _this.lastFocusedWindow = window;
          };
        })(this);
        window.browserWindow.on('focus', focusHandler);
        return window.browserWindow.once('closed', (function(_this) {
          return function() {
            if (window === _this.lastFocusedWindow) {
              _this.lastFocusedWindow = null;
            }
            return window.browserWindow.removeListener('focus', focusHandler);
          };
        })(this));
      }
    };

    AtomApplication.prototype.listenForArgumentsFromNewProcess = function() {
      var server;
      this.deleteSocketFile();
      server = net.createServer((function(_this) {
        return function(connection) {
          return connection.on('data', function(data) {
            return _this.openWithOptions(JSON.parse(data));
          });
        };
      })(this));
      server.listen(this.socketPath);
      return server.on('error', function(error) {
        return console.error('Application server failed', error);
      });
    };

    AtomApplication.prototype.deleteSocketFile = function() {
      var error;
      if (process.platform === 'win32') {
        return;
      }
      if (fs.existsSync(this.socketPath)) {
        try {
          return fs.unlinkSync(this.socketPath);
        } catch (_error) {
          error = _error;
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }
    };

    AtomApplication.prototype.setupJavaScriptArguments = function() {
      return app.commandLine.appendSwitch('js-flags', '--harmony');
    };

    AtomApplication.prototype.handleEvents = function() {
      var clipboard, getLoadSettings;
      getLoadSettings = (function(_this) {
        return function() {
          var _ref, _ref1, _ref2;
          return {
            devMode: (_ref = _this.focusedWindow()) != null ? _ref.devMode : void 0,
            safeMode: (_ref1 = _this.focusedWindow()) != null ? _ref1.safeMode : void 0,
            apiPreviewMode: (_ref2 = _this.focusedWindow()) != null ? _ref2.apiPreviewMode : void 0
          };
        };
      })(this);
      this.on('application:run-all-specs', function() {
        var _ref;
        return this.runSpecs({
          exitWhenDone: false,
          resourcePath: global.devResourcePath,
          safeMode: (_ref = this.focusedWindow()) != null ? _ref.safeMode : void 0
        });
      });
      this.on('application:run-benchmarks', function() {
        return this.runBenchmarks();
      });
      this.on('application:quit', function() {
        return app.quit();
      });
      this.on('application:new-window', function() {
        var _ref;
        return this.openPath(_.extend({
          windowDimensions: (_ref = this.focusedWindow()) != null ? _ref.getDimensions() : void 0
        }, getLoadSettings()));
      });
      this.on('application:new-file', function() {
        var _ref;
        return ((_ref = this.focusedWindow()) != null ? _ref : this).openPath();
      });
      this.on('application:open', function() {
        return this.promptForPathToOpen('all', getLoadSettings());
      });
      this.on('application:open-file', function() {
        return this.promptForPathToOpen('file', getLoadSettings());
      });
      this.on('application:open-folder', function() {
        return this.promptForPathToOpen('folder', getLoadSettings());
      });
      this.on('application:open-dev', function() {
        return this.promptForPathToOpen('all', {
          devMode: true
        });
      });
      this.on('application:open-safe', function() {
        return this.promptForPathToOpen('all', {
          safeMode: true
        });
      });
      this.on('application:open-api-preview', function() {
        return this.promptForPathToOpen('all', {
          apiPreviewMode: true
        });
      });
      this.on('application:open-dev-api-preview', function() {
        return this.promptForPathToOpen('all', {
          apiPreviewMode: true,
          devMode: true
        });
      });
      this.on('application:inspect', function(_arg) {
        var atomWindow, x, y;
        x = _arg.x, y = _arg.y, atomWindow = _arg.atomWindow;
        if (atomWindow == null) {
          atomWindow = this.focusedWindow();
        }
        return atomWindow != null ? atomWindow.browserWindow.inspectElement(x, y) : void 0;
      });
      this.on('application:open-documentation', function() {
        return require('shell').openExternal('https://atom.io/docs/latest/?app');
      });
      this.on('application:open-discussions', function() {
        return require('shell').openExternal('https://discuss.atom.io');
      });
      this.on('application:open-roadmap', function() {
        return require('shell').openExternal('https://atom.io/roadmap?app');
      });
      this.on('application:open-faq', function() {
        return require('shell').openExternal('https://atom.io/faq');
      });
      this.on('application:open-terms-of-use', function() {
        return require('shell').openExternal('https://atom.io/terms');
      });
      this.on('application:report-issue', function() {
        return require('shell').openExternal('https://github.com/atom/atom/blob/master/CONTRIBUTING.md#submitting-issues');
      });
      this.on('application:search-issues', function() {
        return require('shell').openExternal('https://github.com/issues?q=+is%3Aissue+user%3Aatom');
      });
      this.on('application:install-update', function() {
        return this.autoUpdateManager.install();
      });
      this.on('application:check-for-update', (function(_this) {
        return function() {
          return _this.autoUpdateManager.check();
        };
      })(this));
      if (process.platform === 'darwin') {
        this.on('application:about', function() {
          return Menu.sendActionToFirstResponder('orderFrontStandardAboutPanel:');
        });
        this.on('application:bring-all-windows-to-front', function() {
          return Menu.sendActionToFirstResponder('arrangeInFront:');
        });
        this.on('application:hide', function() {
          return Menu.sendActionToFirstResponder('hide:');
        });
        this.on('application:hide-other-applications', function() {
          return Menu.sendActionToFirstResponder('hideOtherApplications:');
        });
        this.on('application:minimize', function() {
          return Menu.sendActionToFirstResponder('performMiniaturize:');
        });
        this.on('application:unhide-all-applications', function() {
          return Menu.sendActionToFirstResponder('unhideAllApplications:');
        });
        this.on('application:zoom', function() {
          return Menu.sendActionToFirstResponder('zoom:');
        });
      } else {
        this.on('application:minimize', function() {
          var _ref;
          return (_ref = this.focusedWindow()) != null ? _ref.minimize() : void 0;
        });
        this.on('application:zoom', function() {
          var _ref;
          return (_ref = this.focusedWindow()) != null ? _ref.maximize() : void 0;
        });
      }
      this.openPathOnEvent('application:show-settings', 'atom://config');
      this.openPathOnEvent('application:open-your-config', 'atom://.atom/config');
      this.openPathOnEvent('application:open-your-init-script', 'atom://.atom/init-script');
      this.openPathOnEvent('application:open-your-keymap', 'atom://.atom/keymap');
      this.openPathOnEvent('application:open-your-snippets', 'atom://.atom/snippets');
      this.openPathOnEvent('application:open-your-stylesheet', 'atom://.atom/stylesheet');
      this.openPathOnEvent('application:open-license', path.join(this.resourcePath, 'LICENSE.md'));
      app.on('window-all-closed', function() {
        var _ref;
        if ((_ref = process.platform) === 'win32' || _ref === 'linux') {
          return app.quit();
        }
      });
      app.on('will-quit', (function(_this) {
        return function() {
          _this.killAllProcesses();
          return _this.deleteSocketFile();
        };
      })(this));
      app.on('will-exit', (function(_this) {
        return function() {
          _this.killAllProcesses();
          return _this.deleteSocketFile();
        };
      })(this));
      app.on('open-file', (function(_this) {
        return function(event, pathToOpen) {
          event.preventDefault();
          return _this.openPath({
            pathToOpen: pathToOpen
          });
        };
      })(this));
      app.on('open-url', (function(_this) {
        return function(event, urlToOpen) {
          event.preventDefault();
          return _this.openUrl({
            urlToOpen: urlToOpen,
            devMode: _this.devMode,
            safeMode: _this.safeMode,
            apiPreviewMode: _this.apiPreviewMode
          });
        };
      })(this));
      app.on('activate-with-no-open-windows', (function(_this) {
        return function(event) {
          event.preventDefault();
          return _this.emit('application:new-window');
        };
      })(this));
      ipc.on('open', (function(_this) {
        return function(event, options) {
          var window, _ref;
          window = _this.windowForEvent(event);
          if (options != null) {
            if (typeof options.pathsToOpen === 'string') {
              options.pathsToOpen = [options.pathsToOpen];
            }
            if (((_ref = options.pathsToOpen) != null ? _ref.length : void 0) > 0) {
              options.window = window;
              return _this.openPaths(options);
            } else {
              return new AtomWindow(options);
            }
          } else {
            return _this.promptForPathToOpen('all', {
              window: window
            });
          }
        };
      })(this));
      ipc.on('update-application-menu', (function(_this) {
        return function(event, template, keystrokesByCommand) {
          var win;
          win = BrowserWindow.fromWebContents(event.sender);
          return _this.applicationMenu.update(win, template, keystrokesByCommand);
        };
      })(this));
      ipc.on('run-package-specs', (function(_this) {
        return function(event, specDirectory) {
          return _this.runSpecs({
            resourcePath: global.devResourcePath,
            specDirectory: specDirectory,
            exitWhenDone: false
          });
        };
      })(this));
      ipc.on('command', (function(_this) {
        return function(event, command) {
          return _this.emit(command);
        };
      })(this));
      ipc.on('window-command', function() {
        var args, command, event, win;
        event = arguments[0], command = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
        win = BrowserWindow.fromWebContents(event.sender);
        return win.emit.apply(win, [command].concat(__slice.call(args)));
      });
      ipc.on('call-window-method', function() {
        var args, event, method, win;
        event = arguments[0], method = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
        win = BrowserWindow.fromWebContents(event.sender);
        return win[method].apply(win, args);
      });
      ipc.on('pick-folder', (function(_this) {
        return function(event, responseChannel) {
          return _this.promptForPath("folder", function(selectedPaths) {
            return event.sender.send(responseChannel, selectedPaths);
          });
        };
      })(this));
      clipboard = null;
      return ipc.on('write-text-to-selection-clipboard', function(event, selectedText) {
        if (clipboard == null) {
          clipboard = require('../safe-clipboard');
        }
        return clipboard.writeText(selectedText, 'selection');
      });
    };

    AtomApplication.prototype.sendCommand = function() {
      var args, command, focusedWindow;
      command = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (!this.emit.apply(this, [command].concat(__slice.call(args)))) {
        focusedWindow = this.focusedWindow();
        if (focusedWindow != null) {
          return focusedWindow.sendCommand.apply(focusedWindow, [command].concat(__slice.call(args)));
        } else {
          return this.sendCommandToFirstResponder(command);
        }
      }
    };

    AtomApplication.prototype.sendCommandToWindow = function() {
      var args, atomWindow, command;
      command = arguments[0], atomWindow = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      if (!this.emit.apply(this, [command].concat(__slice.call(args)))) {
        if (atomWindow != null) {
          return atomWindow.sendCommand.apply(atomWindow, [command].concat(__slice.call(args)));
        } else {
          return this.sendCommandToFirstResponder(command);
        }
      }
    };

    AtomApplication.prototype.sendCommandToFirstResponder = function(command) {
      if (process.platform !== 'darwin') {
        return false;
      }
      switch (command) {
        case 'core:undo':
          Menu.sendActionToFirstResponder('undo:');
          break;
        case 'core:redo':
          Menu.sendActionToFirstResponder('redo:');
          break;
        case 'core:copy':
          Menu.sendActionToFirstResponder('copy:');
          break;
        case 'core:cut':
          Menu.sendActionToFirstResponder('cut:');
          break;
        case 'core:paste':
          Menu.sendActionToFirstResponder('paste:');
          break;
        case 'core:select-all':
          Menu.sendActionToFirstResponder('selectAll:');
          break;
        default:
          return false;
      }
      return true;
    };

    AtomApplication.prototype.openPathOnEvent = function(eventName, pathToOpen) {
      return this.on(eventName, function() {
        var window;
        if (window = this.focusedWindow()) {
          return window.openPath(pathToOpen);
        } else {
          return this.openPath({
            pathToOpen: pathToOpen
          });
        }
      });
    };

    AtomApplication.prototype.windowForPaths = function(pathsToOpen, devMode) {
      return _.find(this.windows, function(atomWindow) {
        return atomWindow.devMode === devMode && atomWindow.containsPaths(pathsToOpen);
      });
    };

    AtomApplication.prototype.windowForEvent = function(_arg) {
      var sender, window;
      sender = _arg.sender;
      window = BrowserWindow.fromWebContents(sender);
      return _.find(this.windows, function(_arg1) {
        var browserWindow;
        browserWindow = _arg1.browserWindow;
        return window === browserWindow;
      });
    };

    AtomApplication.prototype.focusedWindow = function() {
      return _.find(this.windows, function(atomWindow) {
        return atomWindow.isFocused();
      });
    };

    AtomApplication.prototype.openPath = function(_arg) {
      var apiPreviewMode, devMode, newWindow, pathToOpen, pidToKillWhenClosed, safeMode, window;
      pathToOpen = _arg.pathToOpen, pidToKillWhenClosed = _arg.pidToKillWhenClosed, newWindow = _arg.newWindow, devMode = _arg.devMode, safeMode = _arg.safeMode, apiPreviewMode = _arg.apiPreviewMode, window = _arg.window;
      return this.openPaths({
        pathsToOpen: [pathToOpen],
        pidToKillWhenClosed: pidToKillWhenClosed,
        newWindow: newWindow,
        devMode: devMode,
        safeMode: safeMode,
        apiPreviewMode: apiPreviewMode,
        window: window
      });
    };

    AtomApplication.prototype.openPaths = function(_arg) {
      var apiPreviewMode, bootstrapScript, currentWindow, devMode, existingWindow, locationsToOpen, newWindow, openedWindow, pathToOpen, pathsToOpen, pidToKillWhenClosed, resourcePath, safeMode, stats, window, windowDimensions, _ref;
      _ref = _arg != null ? _arg : {}, pathsToOpen = _ref.pathsToOpen, pidToKillWhenClosed = _ref.pidToKillWhenClosed, newWindow = _ref.newWindow, devMode = _ref.devMode, safeMode = _ref.safeMode, apiPreviewMode = _ref.apiPreviewMode, windowDimensions = _ref.windowDimensions, window = _ref.window;
      pathsToOpen = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = pathsToOpen.length; _i < _len; _i++) {
          pathToOpen = pathsToOpen[_i];
          _results.push(fs.normalize(pathToOpen));
        }
        return _results;
      })();
      locationsToOpen = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = pathsToOpen.length; _i < _len; _i++) {
          pathToOpen = pathsToOpen[_i];
          _results.push(this.locationForPathToOpen(pathToOpen));
        }
        return _results;
      }).call(this);
      if (!(pidToKillWhenClosed || newWindow)) {
        existingWindow = this.windowForPaths(pathsToOpen, devMode);
        currentWindow = window != null ? window : this.lastFocusedWindow;
        stats = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = pathsToOpen.length; _i < _len; _i++) {
            pathToOpen = pathsToOpen[_i];
            _results.push(fs.statSyncNoException(pathToOpen));
          }
          return _results;
        })();
        if (stats.every(function(stat) {
          return typeof stat.isFile === "function" ? stat.isFile() : void 0;
        }) || stats.some(function(stat) {
          return typeof stat.isDirectory === "function" ? stat.isDirectory() : void 0;
        }) && !(currentWindow != null ? currentWindow.hasProjectPath() : void 0)) {
          if (existingWindow == null) {
            existingWindow = currentWindow;
          }
        }
      }
      if (existingWindow != null) {
        openedWindow = existingWindow;
        openedWindow.openLocations(locationsToOpen);
        if (openedWindow.isMinimized()) {
          openedWindow.restore();
        } else {
          openedWindow.focus();
        }
      } else {
        if (devMode) {
          try {
            bootstrapScript = require.resolve(path.join(global.devResourcePath, 'src', 'window-bootstrap'));
            resourcePath = global.devResourcePath;
          } catch (_error) {}
        }
        if (bootstrapScript == null) {
          bootstrapScript = require.resolve('../window-bootstrap');
        }
        if (resourcePath == null) {
          resourcePath = this.resourcePath;
        }
        openedWindow = new AtomWindow({
          locationsToOpen: locationsToOpen,
          bootstrapScript: bootstrapScript,
          resourcePath: resourcePath,
          devMode: devMode,
          safeMode: safeMode,
          apiPreviewMode: apiPreviewMode,
          windowDimensions: windowDimensions
        });
      }
      if (pidToKillWhenClosed != null) {
        this.pidsToOpenWindows[pidToKillWhenClosed] = openedWindow;
      }
      return openedWindow.browserWindow.once('closed', (function(_this) {
        return function() {
          return _this.killProcessForWindow(openedWindow);
        };
      })(this));
    };

    AtomApplication.prototype.killAllProcesses = function() {
      var pid;
      for (pid in this.pidsToOpenWindows) {
        this.killProcess(pid);
      }
    };

    AtomApplication.prototype.killProcessForWindow = function(openedWindow) {
      var pid, trackedWindow, _ref;
      _ref = this.pidsToOpenWindows;
      for (pid in _ref) {
        trackedWindow = _ref[pid];
        if (trackedWindow === openedWindow) {
          this.killProcess(pid);
        }
      }
    };

    AtomApplication.prototype.killProcess = function(pid) {
      var error, parsedPid, _ref;
      try {
        parsedPid = parseInt(pid);
        if (isFinite(parsedPid)) {
          process.kill(parsedPid);
        }
      } catch (_error) {
        error = _error;
        if (error.code !== 'ESRCH') {
          console.log("Killing process " + pid + " failed: " + ((_ref = error.code) != null ? _ref : error.message));
        }
      }
      return delete this.pidsToOpenWindows[pid];
    };

    AtomApplication.prototype.openUrl = function(_arg) {
      var PackageManager, bootstrapScript, devMode, pack, packageName, packagePath, safeMode, urlToOpen, windowDimensions, _ref;
      urlToOpen = _arg.urlToOpen, devMode = _arg.devMode, safeMode = _arg.safeMode;
      if (this.packages == null) {
        PackageManager = require('../package-manager');
        this.packages = new PackageManager({
          configDirPath: process.env.ATOM_HOME,
          devMode: devMode,
          resourcePath: this.resourcePath
        });
      }
      packageName = url.parse(urlToOpen).host;
      pack = _.find(this.packages.getAvailablePackageMetadata(), function(_arg1) {
        var name;
        name = _arg1.name;
        return name === packageName;
      });
      if (pack != null) {
        if (pack.urlMain) {
          packagePath = this.packages.resolvePackagePath(packageName);
          bootstrapScript = path.resolve(packagePath, pack.urlMain);
          windowDimensions = (_ref = this.focusedWindow()) != null ? _ref.getDimensions() : void 0;
          return new AtomWindow({
            bootstrapScript: bootstrapScript,
            resourcePath: this.resourcePath,
            devMode: devMode,
            safeMode: safeMode,
            urlToOpen: urlToOpen,
            windowDimensions: windowDimensions
          });
        } else {
          return console.log("Package '" + pack.name + "' does not have a url main: " + urlToOpen);
        }
      } else {
        return console.log("Opening unknown url: " + urlToOpen);
      }
    };

    AtomApplication.prototype.runSpecs = function(_arg) {
      var bootstrapScript, devMode, error, exitWhenDone, isSpec, logFile, resourcePath, safeMode, specDirectory;
      exitWhenDone = _arg.exitWhenDone, resourcePath = _arg.resourcePath, specDirectory = _arg.specDirectory, logFile = _arg.logFile, safeMode = _arg.safeMode;
      if (resourcePath !== this.resourcePath && !fs.existsSync(resourcePath)) {
        resourcePath = this.resourcePath;
      }
      try {
        bootstrapScript = require.resolve(path.resolve(global.devResourcePath, 'spec', 'spec-bootstrap'));
      } catch (_error) {
        error = _error;
        bootstrapScript = require.resolve(path.resolve(__dirname, '..', '..', 'spec', 'spec-bootstrap'));
      }
      isSpec = true;
      devMode = true;
      if (safeMode == null) {
        safeMode = false;
      }
      return new AtomWindow({
        bootstrapScript: bootstrapScript,
        resourcePath: resourcePath,
        exitWhenDone: exitWhenDone,
        isSpec: isSpec,
        devMode: devMode,
        specDirectory: specDirectory,
        logFile: logFile,
        safeMode: safeMode
      });
    };

    AtomApplication.prototype.runBenchmarks = function(_arg) {
      var bootstrapScript, devMode, error, exitWhenDone, isSpec, specDirectory, _ref;
      _ref = _arg != null ? _arg : {}, exitWhenDone = _ref.exitWhenDone, specDirectory = _ref.specDirectory;
      try {
        bootstrapScript = require.resolve(path.resolve(global.devResourcePath, 'benchmark', 'benchmark-bootstrap'));
      } catch (_error) {
        error = _error;
        bootstrapScript = require.resolve(path.resolve(__dirname, '..', '..', 'benchmark', 'benchmark-bootstrap'));
      }
      if (specDirectory == null) {
        specDirectory = path.dirname(bootstrapScript);
      }
      isSpec = true;
      devMode = true;
      return new AtomWindow({
        bootstrapScript: bootstrapScript,
        resourcePath: this.resourcePath,
        exitWhenDone: exitWhenDone,
        isSpec: isSpec,
        specDirectory: specDirectory,
        devMode: devMode
      });
    };

    AtomApplication.prototype.locationForPathToOpen = function(pathToOpen) {
      var fileToOpen, initialColumn, initialLine, _ref;
      if (!pathToOpen) {
        return {
          pathToOpen: pathToOpen
        };
      }
      if (fs.existsSync(pathToOpen)) {
        return {
          pathToOpen: pathToOpen
        };
      }
      _ref = path.basename(pathToOpen).split(':'), fileToOpen = _ref[0], initialLine = _ref[1], initialColumn = _ref[2];
      if (!initialLine) {
        return {
          pathToOpen: pathToOpen
        };
      }
      if (!(parseInt(initialLine) > 0)) {
        return {
          pathToOpen: pathToOpen
        };
      }
      if (initialLine) {
        initialLine -= 1;
      }
      if (initialColumn) {
        initialColumn -= 1;
      }
      pathToOpen = path.join(path.dirname(pathToOpen), fileToOpen);
      return {
        pathToOpen: pathToOpen,
        initialLine: initialLine,
        initialColumn: initialColumn
      };
    };

    AtomApplication.prototype.promptForPathToOpen = function(type, _arg) {
      var apiPreviewMode, devMode, safeMode, window;
      devMode = _arg.devMode, safeMode = _arg.safeMode, apiPreviewMode = _arg.apiPreviewMode, window = _arg.window;
      return this.promptForPath(type, (function(_this) {
        return function(pathsToOpen) {
          return _this.openPaths({
            pathsToOpen: pathsToOpen,
            devMode: devMode,
            safeMode: safeMode,
            apiPreviewMode: apiPreviewMode,
            window: window
          });
        };
      })(this));
    };

    AtomApplication.prototype.promptForPath = function(type, callback) {
      var dialog, openOptions, parentWindow, projectPath, properties, _ref;
      properties = (function() {
        switch (type) {
          case 'file':
            return ['openFile'];
          case 'folder':
            return ['openDirectory'];
          case 'all':
            return ['openFile', 'openDirectory'];
          default:
            throw new Error("" + type + " is an invalid type for promptForPath");
        }
      })();
      parentWindow = process.platform === 'darwin' ? null : BrowserWindow.getFocusedWindow();
      openOptions = {
        properties: properties.concat(['multiSelections', 'createDirectory']),
        title: 'Open'
      };
      if (process.platform === 'linux') {
        if (projectPath = (_ref = this.lastFocusedWindow) != null ? _ref.projectPath : void 0) {
          openOptions.defaultPath = projectPath;
        }
      }
      dialog = require('dialog');
      return dialog.showOpenDialog(parentWindow, openOptions, callback);
    };

    return AtomApplication;

  })();

}).call(this);

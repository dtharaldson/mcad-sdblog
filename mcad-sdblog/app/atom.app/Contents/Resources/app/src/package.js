(function() {
  var CSON, CompositeDisposable, Emitter, EmitterMixin, ModuleCache, Package, Q, ScopedProperties, async, deprecate, fs, includeDeprecatedAPIs, packagesCache, path, _, _ref, _ref1, _ref2, _ref3,
    __slice = [].slice;

  path = require('path');

  _ = require('underscore-plus');

  async = require('async');

  CSON = require('season');

  fs = require('fs-plus');

  _ref = require('event-kit'), Emitter = _ref.Emitter, CompositeDisposable = _ref.CompositeDisposable;

  Q = require('q');

  _ref1 = require('grim'), includeDeprecatedAPIs = _ref1.includeDeprecatedAPIs, deprecate = _ref1.deprecate;

  ModuleCache = require('./module-cache');

  ScopedProperties = require('./scoped-properties');

  packagesCache = (_ref2 = (_ref3 = require('../package.json')) != null ? _ref3._atomPackages : void 0) != null ? _ref2 : {};

  module.exports = Package = (function() {
    Package.isBundledPackagePath = function(packagePath) {
      if (atom.packages.devMode) {
        if (!atom.packages.resourcePath.startsWith("" + process.resourcesPath + path.sep)) {
          return false;
        }
      }
      if (this.resourcePathWithTrailingSlash == null) {
        this.resourcePathWithTrailingSlash = "" + atom.packages.resourcePath + path.sep;
      }
      return packagePath != null ? packagePath.startsWith(this.resourcePathWithTrailingSlash) : void 0;
    };

    Package.loadMetadata = function(packagePath, ignoreErrors) {
      var error, metadata, metadataPath, packageName, _ref4;
      if (ignoreErrors == null) {
        ignoreErrors = false;
      }
      packageName = path.basename(packagePath);
      if (this.isBundledPackagePath(packagePath)) {
        metadata = (_ref4 = packagesCache[packageName]) != null ? _ref4.metadata : void 0;
      }
      if (metadata == null) {
        if (metadataPath = CSON.resolve(path.join(packagePath, 'package'))) {
          try {
            metadata = CSON.readFileSync(metadataPath);
          } catch (_error) {
            error = _error;
            if (!ignoreErrors) {
              throw error;
            }
          }
        }
      }
      if (metadata == null) {
        metadata = {};
      }
      metadata.name = packageName;
      if (includeDeprecatedAPIs && (metadata.stylesheetMain != null)) {
        deprecate("Use the `mainStyleSheet` key instead of `stylesheetMain` in the `package.json` of `" + packageName + "`", {
          packageName: packageName
        });
        metadata.mainStyleSheet = metadata.stylesheetMain;
      }
      if (includeDeprecatedAPIs && (metadata.stylesheets != null)) {
        deprecate("Use the `styleSheets` key instead of `stylesheets` in the `package.json` of `" + packageName + "`", {
          packageName: packageName
        });
        metadata.styleSheets = metadata.stylesheets;
      }
      return metadata;
    };

    Package.prototype.keymaps = null;

    Package.prototype.menus = null;

    Package.prototype.stylesheets = null;

    Package.prototype.stylesheetDisposables = null;

    Package.prototype.grammars = null;

    Package.prototype.settings = null;

    Package.prototype.mainModulePath = null;

    Package.prototype.resolvedMainModulePath = false;

    Package.prototype.mainModule = null;


    /*
    Section: Construction
     */

    function Package(path, metadata) {
      var _ref4, _ref5;
      this.path = path;
      this.metadata = metadata;
      this.emitter = new Emitter;
      if (this.metadata == null) {
        this.metadata = Package.loadMetadata(this.path);
      }
      this.bundledPackage = Package.isBundledPackagePath(this.path);
      this.name = (_ref4 = (_ref5 = this.metadata) != null ? _ref5.name : void 0) != null ? _ref4 : path.basename(this.path);
      ModuleCache.add(this.path, this.metadata);
      this.reset();
    }


    /*
    Section: Event Subscription
     */

    Package.prototype.onDidDeactivate = function(callback) {
      return this.emitter.on('did-deactivate', callback);
    };


    /*
    Section: Instance Methods
     */

    Package.prototype.enable = function() {
      return atom.config.removeAtKeyPath('core.disabledPackages', this.name);
    };

    Package.prototype.disable = function() {
      return atom.config.pushAtKeyPath('core.disabledPackages', this.name);
    };

    Package.prototype.isTheme = function() {
      var _ref4;
      return ((_ref4 = this.metadata) != null ? _ref4.theme : void 0) != null;
    };

    Package.prototype.measure = function(key, fn) {
      var startTime, value;
      startTime = Date.now();
      value = fn();
      this[key] = Date.now() - startTime;
      return value;
    };

    Package.prototype.getType = function() {
      return 'atom';
    };

    Package.prototype.getStyleSheetPriority = function() {
      return 0;
    };

    Package.prototype.load = function() {
      this.measure('loadTime', (function(_this) {
        return function() {
          var error;
          try {
            _this.loadKeymaps();
            _this.loadMenus();
            _this.loadStylesheets();
            _this.settingsPromise = _this.loadSettings();
            if (!_this.hasActivationCommands()) {
              return _this.requireMainModule();
            }
          } catch (_error) {
            error = _error;
            return _this.handleError("Failed to load the " + _this.name + " package", error);
          }
        };
      })(this));
      return this;
    };

    Package.prototype.reset = function() {
      this.stylesheets = [];
      this.keymaps = [];
      this.menus = [];
      this.grammars = [];
      return this.settings = [];
    };

    Package.prototype.activate = function() {
      if (this.grammarsPromise == null) {
        this.grammarsPromise = this.loadGrammars();
      }
      if (this.activationDeferred == null) {
        this.activationDeferred = Q.defer();
        this.measure('activateTime', (function(_this) {
          return function() {
            var error;
            try {
              _this.activateResources();
              if (_this.hasActivationCommands()) {
                return _this.subscribeToActivationCommands();
              } else {
                return _this.activateNow();
              }
            } catch (_error) {
              error = _error;
              return _this.handleError("Failed to activate the " + _this.name + " package", error);
            }
          };
        })(this));
      }
      return Q.all([this.grammarsPromise, this.settingsPromise, this.activationDeferred.promise]);
    };

    Package.prototype.activateNow = function() {
      var error, _base, _ref4, _ref5;
      try {
        this.activateConfig();
        this.activateStylesheets();
        if (this.requireMainModule()) {
          if (typeof (_base = this.mainModule).activate === "function") {
            _base.activate((_ref4 = atom.packages.getPackageState(this.name)) != null ? _ref4 : {});
          }
          this.mainActivated = true;
          this.activateServices();
        }
      } catch (_error) {
        error = _error;
        this.handleError("Failed to activate the " + this.name + " package", error);
      }
      return (_ref5 = this.activationDeferred) != null ? _ref5.resolve() : void 0;
    };

    Package.prototype.activateConfig = function() {
      var _base;
      if (this.configActivated) {
        return;
      }
      this.requireMainModule();
      if (this.mainModule != null) {
        if ((this.mainModule.config != null) && typeof this.mainModule.config === 'object') {
          atom.config.setSchema(this.name, {
            type: 'object',
            properties: this.mainModule.config
          });
        } else if (includeDeprecatedAPIs && (this.mainModule.configDefaults != null) && typeof this.mainModule.configDefaults === 'object') {
          deprecate("Use a config schema instead. See the configuration section\nof https://atom.io/docs/latest/hacking-atom-package-word-count and\nhttps://atom.io/docs/api/latest/Config for more details");
          atom.config.setDefaults(this.name, this.mainModule.configDefaults);
        }
        if (typeof (_base = this.mainModule).activateConfig === "function") {
          _base.activateConfig();
        }
      }
      return this.configActivated = true;
    };

    Package.prototype.activateStylesheets = function() {
      var context, match, priority, source, sourcePath, _i, _len, _ref4, _ref5;
      if (this.stylesheetsActivated) {
        return;
      }
      this.stylesheetDisposables = new CompositeDisposable;
      priority = this.getStyleSheetPriority();
      _ref4 = this.stylesheets;
      for (_i = 0, _len = _ref4.length; _i < _len; _i++) {
        _ref5 = _ref4[_i], sourcePath = _ref5[0], source = _ref5[1];
        if (match = path.basename(sourcePath).match(/[^.]*\.([^.]*)\./)) {
          context = match[1];
        } else if (this.metadata.theme === 'syntax') {
          context = 'atom-text-editor';
        } else {
          context = void 0;
        }
        this.stylesheetDisposables.add(atom.styles.addStyleSheet(source, {
          sourcePath: sourcePath,
          priority: priority,
          context: context
        }));
      }
      return this.stylesheetsActivated = true;
    };

    Package.prototype.activateResources = function() {
      var error, grammar, keymapPath, map, menuPath, settings, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _ref10, _ref11, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9;
      this.activationDisposables = new CompositeDisposable;
      _ref4 = this.keymaps;
      for (_i = 0, _len = _ref4.length; _i < _len; _i++) {
        _ref5 = _ref4[_i], keymapPath = _ref5[0], map = _ref5[1];
        this.activationDisposables.add(atom.keymaps.add(keymapPath, map));
      }
      _ref6 = this.menus;
      for (_j = 0, _len1 = _ref6.length; _j < _len1; _j++) {
        _ref7 = _ref6[_j], menuPath = _ref7[0], map = _ref7[1];
        if (map['context-menu'] != null) {
          try {
            this.activationDisposables.add(atom.contextMenu.add(map['context-menu']));
          } catch (_error) {
            error = _error;
            if (error.code === 'EBADSELECTOR') {
              error.message += " in " + menuPath;
              error.stack += "\n  at " + menuPath + ":1:1";
            }
            throw error;
          }
        }
      }
      _ref8 = this.menus;
      for (_k = 0, _len2 = _ref8.length; _k < _len2; _k++) {
        _ref9 = _ref8[_k], menuPath = _ref9[0], map = _ref9[1];
        if (map['menu'] != null) {
          this.activationDisposables.add(atom.menu.add(map['menu']));
        }
      }
      if (!this.grammarsActivated) {
        _ref10 = this.grammars;
        for (_l = 0, _len3 = _ref10.length; _l < _len3; _l++) {
          grammar = _ref10[_l];
          grammar.activate();
        }
        this.grammarsActivated = true;
      }
      _ref11 = this.settings;
      for (_m = 0, _len4 = _ref11.length; _m < _len4; _m++) {
        settings = _ref11[_m];
        settings.activate();
      }
      return this.settingsActivated = true;
    };

    Package.prototype.activateServices = function() {
      var methodName, name, servicesByVersion, version, versions, _ref4, _ref5;
      _ref4 = this.metadata.providedServices;
      for (name in _ref4) {
        versions = _ref4[name].versions;
        servicesByVersion = {};
        for (version in versions) {
          methodName = versions[version];
          if (typeof this.mainModule[methodName] === 'function') {
            servicesByVersion[version] = this.mainModule[methodName]();
          }
        }
        this.activationDisposables.add(atom.packages.serviceHub.provide(name, servicesByVersion));
      }
      _ref5 = this.metadata.consumedServices;
      for (name in _ref5) {
        versions = _ref5[name].versions;
        for (version in versions) {
          methodName = versions[version];
          if (typeof this.mainModule[methodName] === 'function') {
            this.activationDisposables.add(atom.packages.serviceHub.consume(name, version, this.mainModule[methodName].bind(this.mainModule)));
          }
        }
      }
    };

    Package.prototype.loadKeymaps = function() {
      var keymapObject, keymapPath;
      if (this.bundledPackage && (packagesCache[this.name] != null)) {
        this.keymaps = (function() {
          var _ref4, _results;
          _ref4 = packagesCache[this.name].keymaps;
          _results = [];
          for (keymapPath in _ref4) {
            keymapObject = _ref4[keymapPath];
            _results.push(["" + atom.packages.resourcePath + path.sep + keymapPath, keymapObject]);
          }
          return _results;
        }).call(this);
      } else {
        this.keymaps = this.getKeymapPaths().map(function(keymapPath) {
          var _ref4;
          return [keymapPath, (_ref4 = CSON.readFileSync(keymapPath)) != null ? _ref4 : {}];
        });
      }
    };

    Package.prototype.loadMenus = function() {
      var menuObject, menuPath;
      if (this.bundledPackage && (packagesCache[this.name] != null)) {
        this.menus = (function() {
          var _ref4, _results;
          _ref4 = packagesCache[this.name].menus;
          _results = [];
          for (menuPath in _ref4) {
            menuObject = _ref4[menuPath];
            _results.push(["" + atom.packages.resourcePath + path.sep + menuPath, menuObject]);
          }
          return _results;
        }).call(this);
      } else {
        this.menus = this.getMenuPaths().map(function(menuPath) {
          var _ref4;
          return [menuPath, (_ref4 = CSON.readFileSync(menuPath)) != null ? _ref4 : {}];
        });
      }
    };

    Package.prototype.getKeymapPaths = function() {
      var keymapsDirPath;
      keymapsDirPath = path.join(this.path, 'keymaps');
      if (this.metadata.keymaps) {
        return this.metadata.keymaps.map(function(name) {
          return fs.resolve(keymapsDirPath, name, ['json', 'cson', '']);
        });
      } else {
        return fs.listSync(keymapsDirPath, ['cson', 'json']);
      }
    };

    Package.prototype.getMenuPaths = function() {
      var menusDirPath;
      menusDirPath = path.join(this.path, 'menus');
      if (this.metadata.menus) {
        return this.metadata.menus.map(function(name) {
          return fs.resolve(menusDirPath, name, ['json', 'cson', '']);
        });
      } else {
        return fs.listSync(menusDirPath, ['cson', 'json']);
      }
    };

    Package.prototype.loadStylesheets = function() {
      return this.stylesheets = this.getStylesheetPaths().map(function(stylesheetPath) {
        return [stylesheetPath, atom.themes.loadStylesheet(stylesheetPath, true)];
      });
    };

    Package.prototype.getStylesheetsPath = function() {
      if (includeDeprecatedAPIs && fs.isDirectorySync(path.join(this.path, 'stylesheets'))) {
        deprecate("Store package style sheets in the `styles/` directory instead of `stylesheets/` in the `" + this.name + "` package", {
          packageName: this.name
        });
        return path.join(this.path, 'stylesheets');
      } else {
        return path.join(this.path, 'styles');
      }
    };

    Package.prototype.getStylesheetPaths = function() {
      var indexStylesheet, stylesheetDirPath;
      stylesheetDirPath = this.getStylesheetsPath();
      if (this.metadata.mainStyleSheet) {
        return [fs.resolve(this.path, this.metadata.mainStyleSheet)];
      } else if (this.metadata.styleSheets) {
        return this.metadata.styleSheets.map(function(name) {
          return fs.resolve(stylesheetDirPath, name, ['css', 'less', '']);
        });
      } else if (indexStylesheet = fs.resolve(this.path, 'index', ['css', 'less'])) {
        return [indexStylesheet];
      } else {
        return fs.listSync(stylesheetDirPath, ['css', 'less']);
      }
    };

    Package.prototype.loadGrammarsSync = function() {
      var error, grammar, grammarPath, grammarPaths, grammarsDirPath, _i, _len, _ref4;
      if (this.grammarsLoaded) {
        return;
      }
      grammarsDirPath = path.join(this.path, 'grammars');
      grammarPaths = fs.listSync(grammarsDirPath, ['json', 'cson']);
      for (_i = 0, _len = grammarPaths.length; _i < _len; _i++) {
        grammarPath = grammarPaths[_i];
        try {
          grammar = atom.grammars.readGrammarSync(grammarPath);
          grammar.packageName = this.name;
          this.grammars.push(grammar);
          grammar.activate();
        } catch (_error) {
          error = _error;
          console.warn("Failed to load grammar: " + grammarPath, (_ref4 = error.stack) != null ? _ref4 : error);
        }
      }
      this.grammarsLoaded = true;
      return this.grammarsActivated = true;
    };

    Package.prototype.loadGrammars = function() {
      var deferred, grammarsDirPath, loadGrammar;
      if (this.grammarsLoaded) {
        return Q();
      }
      loadGrammar = (function(_this) {
        return function(grammarPath, callback) {
          return atom.grammars.readGrammar(grammarPath, function(error, grammar) {
            var detail, stack;
            if (error != null) {
              detail = "" + error.message + " in " + grammarPath;
              stack = "" + error.stack + "\n  at " + grammarPath + ":1:1";
              atom.notifications.addFatalError("Failed to load a " + _this.name + " package grammar", {
                stack: stack,
                detail: detail,
                dismissable: true
              });
            } else {
              grammar.packageName = _this.name;
              _this.grammars.push(grammar);
              if (_this.grammarsActivated) {
                grammar.activate();
              }
            }
            return callback();
          });
        };
      })(this);
      deferred = Q.defer();
      grammarsDirPath = path.join(this.path, 'grammars');
      fs.list(grammarsDirPath, ['json', 'cson'], function(error, grammarPaths) {
        if (grammarPaths == null) {
          grammarPaths = [];
        }
        return async.each(grammarPaths, loadGrammar, function() {
          return deferred.resolve();
        });
      });
      return deferred.promise;
    };

    Package.prototype.loadSettings = function() {
      var deferred, loadSettingsFile, settingsDirPath;
      this.settings = [];
      loadSettingsFile = (function(_this) {
        return function(settingsPath, callback) {
          return ScopedProperties.load(settingsPath, function(error, settings) {
            var detail, stack;
            if (error != null) {
              detail = "" + error.message + " in " + settingsPath;
              stack = "" + error.stack + "\n  at " + settingsPath + ":1:1";
              atom.notifications.addFatalError("Failed to load the " + _this.name + " package settings", {
                stack: stack,
                detail: detail,
                dismissable: true
              });
            } else {
              _this.settings.push(settings);
              if (_this.settingsActivated) {
                settings.activate();
              }
            }
            return callback();
          });
        };
      })(this);
      deferred = Q.defer();
      if (includeDeprecatedAPIs && fs.isDirectorySync(path.join(this.path, 'scoped-properties'))) {
        settingsDirPath = path.join(this.path, 'scoped-properties');
        deprecate("Store package settings files in the `settings/` directory instead of `scoped-properties/`", {
          packageName: this.name
        });
      } else {
        settingsDirPath = path.join(this.path, 'settings');
      }
      fs.list(settingsDirPath, ['json', 'cson'], function(error, settingsPaths) {
        if (settingsPaths == null) {
          settingsPaths = [];
        }
        return async.each(settingsPaths, loadSettingsFile, function() {
          return deferred.resolve();
        });
      });
      return deferred.promise;
    };

    Package.prototype.serialize = function() {
      var e, _ref4;
      if (this.mainActivated) {
        try {
          return (_ref4 = this.mainModule) != null ? typeof _ref4.serialize === "function" ? _ref4.serialize() : void 0 : void 0;
        } catch (_error) {
          e = _error;
          return console.error("Error serializing package '" + this.name + "'", e.stack);
        }
      }
    };

    Package.prototype.deactivate = function() {
      var e, _ref4, _ref5, _ref6;
      if ((_ref4 = this.activationDeferred) != null) {
        _ref4.reject();
      }
      this.activationDeferred = null;
      if ((_ref5 = this.activationCommandSubscriptions) != null) {
        _ref5.dispose();
      }
      this.deactivateResources();
      this.deactivateConfig();
      if (this.mainActivated) {
        try {
          if ((_ref6 = this.mainModule) != null) {
            if (typeof _ref6.deactivate === "function") {
              _ref6.deactivate();
            }
          }
        } catch (_error) {
          e = _error;
          console.error("Error deactivating package '" + this.name + "'", e.stack);
        }
      }
      if (includeDeprecatedAPIs) {
        this.emit('deactivated');
      }
      return this.emitter.emit('did-deactivate');
    };

    Package.prototype.deactivateConfig = function() {
      var _ref4;
      if ((_ref4 = this.mainModule) != null) {
        if (typeof _ref4.deactivateConfig === "function") {
          _ref4.deactivateConfig();
        }
      }
      return this.configActivated = false;
    };

    Package.prototype.deactivateResources = function() {
      var grammar, settings, _i, _j, _len, _len1, _ref4, _ref5, _ref6, _ref7;
      _ref4 = this.grammars;
      for (_i = 0, _len = _ref4.length; _i < _len; _i++) {
        grammar = _ref4[_i];
        grammar.deactivate();
      }
      _ref5 = this.settings;
      for (_j = 0, _len1 = _ref5.length; _j < _len1; _j++) {
        settings = _ref5[_j];
        settings.deactivate();
      }
      if ((_ref6 = this.stylesheetDisposables) != null) {
        _ref6.dispose();
      }
      if ((_ref7 = this.activationDisposables) != null) {
        _ref7.dispose();
      }
      this.stylesheetsActivated = false;
      this.grammarsActivated = false;
      return this.settingsActivated = false;
    };

    Package.prototype.reloadStylesheets = function() {
      var error, oldSheets, _ref4;
      oldSheets = _.clone(this.stylesheets);
      try {
        this.loadStylesheets();
      } catch (_error) {
        error = _error;
        this.handleError("Failed to reload the " + this.name + " package stylesheets", error);
      }
      if ((_ref4 = this.stylesheetDisposables) != null) {
        _ref4.dispose();
      }
      this.stylesheetDisposables = new CompositeDisposable;
      this.stylesheetsActivated = false;
      return this.activateStylesheets();
    };

    Package.prototype.requireMainModule = function() {
      var mainModulePath;
      if (this.mainModuleRequired) {
        return this.mainModule;
      }
      if (!this.isCompatible()) {
        console.warn("Failed to require the main module of '" + this.name + "' because it requires an incompatible native module.\nRun `apm rebuild` in the package directory to resolve.");
        return;
      }
      mainModulePath = this.getMainModulePath();
      if (fs.isFileSync(mainModulePath)) {
        this.mainModuleRequired = true;
        return this.mainModule = require(mainModulePath);
      }
    };

    Package.prototype.getMainModulePath = function() {
      var mainModulePath;
      if (this.resolvedMainModulePath) {
        return this.mainModulePath;
      }
      this.resolvedMainModulePath = true;
      if (this.bundledPackage && (packagesCache[this.name] != null)) {
        if (packagesCache[this.name].main) {
          return this.mainModulePath = "" + atom.packages.resourcePath + path.sep + packagesCache[this.name].main;
        } else {
          return this.mainModulePath = null;
        }
      } else {
        mainModulePath = this.metadata.main ? path.join(this.path, this.metadata.main) : path.join(this.path, 'index');
        return this.mainModulePath = fs.resolveExtension(mainModulePath, [""].concat(__slice.call(_.keys(require.extensions))));
      }
    };

    Package.prototype.hasActivationCommands = function() {
      var commands, selector, _ref4;
      _ref4 = this.getActivationCommands();
      for (selector in _ref4) {
        commands = _ref4[selector];
        if (commands.length > 0) {
          return true;
        }
      }
      return false;
    };

    Package.prototype.subscribeToActivationCommands = function() {
      var command, commands, selector, _fn, _i, _len, _ref4;
      this.activationCommandSubscriptions = new CompositeDisposable;
      _ref4 = this.getActivationCommands();
      for (selector in _ref4) {
        commands = _ref4[selector];
        _fn = (function(_this) {
          return function(selector, command) {
            var error, metadataPath;
            try {
              _this.activationCommandSubscriptions.add(atom.commands.add(selector, command, function() {}));
            } catch (_error) {
              error = _error;
              if (error.code === 'EBADSELECTOR') {
                metadataPath = path.join(_this.path, 'package.json');
                error.message += " in " + metadataPath;
                error.stack += "\n  at " + metadataPath + ":1:1";
              }
              throw error;
            }
            return _this.activationCommandSubscriptions.add(atom.commands.onWillDispatch(function(event) {
              var currentTarget;
              if (event.type !== command) {
                return;
              }
              currentTarget = event.target;
              while (currentTarget) {
                if (currentTarget.webkitMatchesSelector(selector)) {
                  _this.activationCommandSubscriptions.dispose();
                  _this.activateNow();
                  break;
                }
                currentTarget = currentTarget.parentElement;
              }
            }));
          };
        })(this);
        for (_i = 0, _len = commands.length; _i < _len; _i++) {
          command = commands[_i];
          _fn(selector, command);
        }
      }
    };

    Package.prototype.getActivationCommands = function() {
      var commands, eventName, selector, _base, _base1, _base2, _base3, _i, _len, _ref4, _ref5, _ref6, _ref7;
      if (this.activationCommands != null) {
        return this.activationCommands;
      }
      this.activationCommands = {};
      if (this.metadata.activationCommands != null) {
        _ref4 = this.metadata.activationCommands;
        for (selector in _ref4) {
          commands = _ref4[selector];
          if ((_base = this.activationCommands)[selector] == null) {
            _base[selector] = [];
          }
          if (_.isString(commands)) {
            this.activationCommands[selector].push(commands);
          } else if (_.isArray(commands)) {
            (_ref5 = this.activationCommands[selector]).push.apply(_ref5, commands);
          }
        }
      }
      if (includeDeprecatedAPIs && (this.metadata.activationEvents != null)) {
        deprecate("Use `activationCommands` instead of `activationEvents` in your package.json\nCommands should be grouped by selector as follows:\n```json\n  \"activationCommands\": {\n    \"atom-workspace\": [\"foo:bar\", \"foo:baz\"],\n    \"atom-text-editor\": [\"foo:quux\"]\n  }\n```");
        if (_.isArray(this.metadata.activationEvents)) {
          _ref6 = this.metadata.activationEvents;
          for (_i = 0, _len = _ref6.length; _i < _len; _i++) {
            eventName = _ref6[_i];
            if ((_base1 = this.activationCommands)['atom-workspace'] == null) {
              _base1['atom-workspace'] = [];
            }
            this.activationCommands['atom-workspace'].push(eventName);
          }
        } else if (_.isString(this.metadata.activationEvents)) {
          eventName = this.metadata.activationEvents;
          if ((_base2 = this.activationCommands)['atom-workspace'] == null) {
            _base2['atom-workspace'] = [];
          }
          this.activationCommands['atom-workspace'].push(eventName);
        } else {
          _ref7 = this.metadata.activationEvents;
          for (eventName in _ref7) {
            selector = _ref7[eventName];
            if (selector == null) {
              selector = 'atom-workspace';
            }
            if ((_base3 = this.activationCommands)[selector] == null) {
              _base3[selector] = [];
            }
            this.activationCommands[selector].push(eventName);
          }
        }
      }
      return this.activationCommands;
    };

    Package.prototype.isNativeModule = function(modulePath) {
      var error;
      try {
        return fs.listSync(path.join(modulePath, 'build', 'Release'), ['.node']).length > 0;
      } catch (_error) {
        error = _error;
        return false;
      }
    };

    Package.prototype.getNativeModuleDependencyPaths = function() {
      var nativeModulePaths, traversePath;
      nativeModulePaths = [];
      traversePath = (function(_this) {
        return function(nodeModulesPath) {
          var modulePath, _i, _len, _ref4;
          try {
            _ref4 = fs.listSync(nodeModulesPath);
            for (_i = 0, _len = _ref4.length; _i < _len; _i++) {
              modulePath = _ref4[_i];
              if (_this.isNativeModule(modulePath)) {
                nativeModulePaths.push(modulePath);
              }
              traversePath(path.join(modulePath, 'node_modules'));
            }
          } catch (_error) {}
        };
      })(this);
      traversePath(path.join(this.path, 'node_modules'));
      return nativeModulePaths;
    };

    Package.prototype.getIncompatibleNativeModules = function() {
      var error, incompatibleNativeModules, localStorageKey, nativeModulePath, version, _i, _len, _ref4, _ref5;
      localStorageKey = "installed-packages:" + this.name + ":" + this.metadata.version;
      if (!atom.inDevMode()) {
        try {
          incompatibleNativeModules = ((_ref4 = JSON.parse(global.localStorage.getItem(localStorageKey))) != null ? _ref4 : {}).incompatibleNativeModules;
        } catch (_error) {}
        if (incompatibleNativeModules != null) {
          return incompatibleNativeModules;
        }
      }
      incompatibleNativeModules = [];
      _ref5 = this.getNativeModuleDependencyPaths();
      for (_i = 0, _len = _ref5.length; _i < _len; _i++) {
        nativeModulePath = _ref5[_i];
        try {
          require(nativeModulePath);
        } catch (_error) {
          error = _error;
          try {
            version = require("" + nativeModulePath + "/package.json").version;
          } catch (_error) {}
          incompatibleNativeModules.push({
            path: nativeModulePath,
            name: path.basename(nativeModulePath),
            version: version,
            error: error.message
          });
        }
      }
      global.localStorage.setItem(localStorageKey, JSON.stringify({
        incompatibleNativeModules: incompatibleNativeModules
      }));
      return incompatibleNativeModules;
    };

    Package.prototype.isCompatible = function() {
      if (this.compatible != null) {
        return this.compatible;
      }
      if (this.path.indexOf(path.join(atom.packages.resourcePath, 'node_modules') + path.sep) === 0) {
        return this.compatible = true;
      } else if (this.getMainModulePath()) {
        this.incompatibleModules = this.getIncompatibleNativeModules();
        return this.compatible = this.incompatibleModules.length === 0;
      } else {
        return this.compatible = true;
      }
    };

    Package.prototype.handleError = function(message, error) {
      var detail, location, stack, _ref4;
      if (error.filename && error.location && (error instanceof SyntaxError)) {
        location = "" + error.filename + ":" + (error.location.first_line + 1) + ":" + (error.location.first_column + 1);
        detail = "" + error.message + " in " + location;
        stack = "SyntaxError: " + error.message + "\n  at " + location;
      } else if (error.less && error.filename && (error.column != null) && (error.line != null)) {
        location = "" + error.filename + ":" + error.line + ":" + error.column;
        detail = "" + error.message + " in " + location;
        stack = "LessError: " + error.message + "\n  at " + location;
      } else {
        detail = error.message;
        stack = (_ref4 = error.stack) != null ? _ref4 : error;
      }
      return atom.notifications.addFatalError(message, {
        stack: stack,
        detail: detail,
        dismissable: true
      });
    };

    return Package;

  })();

  if (includeDeprecatedAPIs) {
    EmitterMixin = require('emissary').Emitter;
    EmitterMixin.includeInto(Package);
    Package.prototype.on = function(eventName) {
      switch (eventName) {
        case 'deactivated':
          deprecate('Use Package::onDidDeactivate instead');
          break;
        default:
          deprecate('Package::on is deprecated. Use event subscription methods instead.');
      }
      return EmitterMixin.prototype.on.apply(this, arguments);
    };
  }

}).call(this);

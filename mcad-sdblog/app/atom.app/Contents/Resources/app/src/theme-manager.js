(function() {
  var CompositeDisposable, Disposable, Emitter, EmitterMixin, File, Grim, Q, ThemeManager, fs, path, _, _ref;

  path = require('path');

  _ = require('underscore-plus');

  _ref = require('event-kit'), Emitter = _ref.Emitter, Disposable = _ref.Disposable, CompositeDisposable = _ref.CompositeDisposable;

  File = require('pathwatcher').File;

  fs = require('fs-plus');

  Q = require('q');

  Grim = require('grim');

  module.exports = ThemeManager = (function() {
    function ThemeManager(_arg) {
      var stylesElement;
      this.packageManager = _arg.packageManager, this.resourcePath = _arg.resourcePath, this.configDirPath = _arg.configDirPath, this.safeMode = _arg.safeMode;
      this.emitter = new Emitter;
      this.styleSheetDisposablesBySourcePath = {};
      this.lessCache = null;
      this.initialLoadComplete = false;
      this.packageManager.registerPackageActivator(this, ['theme']);
      this.sheetsByStyleElement = new WeakMap;
      stylesElement = document.head.querySelector('atom-styles');
      stylesElement.onDidAddStyleElement(this.styleElementAdded.bind(this));
      stylesElement.onDidRemoveStyleElement(this.styleElementRemoved.bind(this));
      stylesElement.onDidUpdateStyleElement(this.styleElementUpdated.bind(this));
    }

    ThemeManager.prototype.styleElementAdded = function(styleElement) {
      var sheet;
      sheet = styleElement.sheet;
      this.sheetsByStyleElement.set(styleElement, sheet);
      if (Grim.includeDeprecatedAPIs) {
        this.emit('stylesheet-added', sheet);
      }
      this.emitter.emit('did-add-stylesheet', sheet);
      if (Grim.includeDeprecatedAPIs) {
        this.emit('stylesheets-changed');
      }
      return this.emitter.emit('did-change-stylesheets');
    };

    ThemeManager.prototype.styleElementRemoved = function(styleElement) {
      var sheet;
      sheet = this.sheetsByStyleElement.get(styleElement);
      if (Grim.includeDeprecatedAPIs) {
        this.emit('stylesheet-removed', sheet);
      }
      this.emitter.emit('did-remove-stylesheet', sheet);
      if (Grim.includeDeprecatedAPIs) {
        this.emit('stylesheets-changed');
      }
      return this.emitter.emit('did-change-stylesheets');
    };

    ThemeManager.prototype.styleElementUpdated = function(_arg) {
      var sheet;
      sheet = _arg.sheet;
      if (Grim.includeDeprecatedAPIs) {
        this.emit('stylesheet-removed', sheet);
      }
      this.emitter.emit('did-remove-stylesheet', sheet);
      if (Grim.includeDeprecatedAPIs) {
        this.emit('stylesheet-added', sheet);
      }
      this.emitter.emit('did-add-stylesheet', sheet);
      if (Grim.includeDeprecatedAPIs) {
        this.emit('stylesheets-changed');
      }
      return this.emitter.emit('did-change-stylesheets');
    };


    /*
    Section: Event Subscription
     */

    ThemeManager.prototype.onDidChangeActiveThemes = function(callback) {
      this.emitter.on('did-change-active-themes', callback);
      return this.emitter.on('did-reload-all', callback);
    };


    /*
    Section: Accessing Available Themes
     */

    ThemeManager.prototype.getAvailableNames = function() {
      return this.getLoadedNames();
    };


    /*
    Section: Accessing Loaded Themes
     */

    ThemeManager.prototype.getLoadedThemeNames = function() {
      var theme, _i, _len, _ref1, _results;
      _ref1 = this.getLoadedThemes();
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        theme = _ref1[_i];
        _results.push(theme.name);
      }
      return _results;
    };

    ThemeManager.prototype.getLoadedThemes = function() {
      var pack, _i, _len, _ref1, _results;
      _ref1 = this.packageManager.getLoadedPackages();
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        pack = _ref1[_i];
        if (pack.isTheme()) {
          _results.push(pack);
        }
      }
      return _results;
    };


    /*
    Section: Accessing Active Themes
     */

    ThemeManager.prototype.getActiveThemeNames = function() {
      var theme, _i, _len, _ref1, _results;
      _ref1 = this.getActiveThemes();
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        theme = _ref1[_i];
        _results.push(theme.name);
      }
      return _results;
    };

    ThemeManager.prototype.getActiveThemes = function() {
      var pack, _i, _len, _ref1, _results;
      _ref1 = this.packageManager.getActivePackages();
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        pack = _ref1[_i];
        if (pack.isTheme()) {
          _results.push(pack);
        }
      }
      return _results;
    };

    ThemeManager.prototype.activatePackages = function() {
      return this.activateThemes();
    };


    /*
    Section: Managing Enabled Themes
     */

    ThemeManager.prototype.getEnabledThemeNames = function() {
      var builtInThemeNames, themeNames, _ref1;
      themeNames = (_ref1 = atom.config.get('core.themes')) != null ? _ref1 : [];
      if (!_.isArray(themeNames)) {
        themeNames = [themeNames];
      }
      themeNames = themeNames.filter(function(themeName) {
        if (themeName && typeof themeName === 'string') {
          if (atom.packages.resolvePackagePath(themeName)) {
            return true;
          }
          console.warn("Enabled theme '" + themeName + "' is not installed.");
        }
        return false;
      });
      if (themeNames.length < 2) {
        builtInThemeNames = ['atom-dark-syntax', 'atom-dark-ui', 'atom-light-syntax', 'atom-light-ui', 'base16-tomorrow-dark-theme', 'base16-tomorrow-light-theme', 'solarized-dark-syntax', 'solarized-light-syntax'];
        themeNames = _.intersection(themeNames, builtInThemeNames);
        if (themeNames.length === 0) {
          themeNames = ['atom-dark-syntax', 'atom-dark-ui'];
        } else if (themeNames.length === 1) {
          if (_.endsWith(themeNames[0], '-ui')) {
            themeNames.unshift('atom-dark-syntax');
          } else {
            themeNames.push('atom-dark-ui');
          }
        }
      }
      return themeNames.reverse();
    };


    /*
    Section: Private
     */

    ThemeManager.prototype.requireStylesheet = function(stylesheetPath) {
      var content, fullPath;
      if (fullPath = this.resolveStylesheet(stylesheetPath)) {
        content = this.loadStylesheet(fullPath);
        return this.applyStylesheet(fullPath, content);
      } else {
        throw new Error("Could not find a file at path '" + stylesheetPath + "'");
      }
    };

    ThemeManager.prototype.unwatchUserStylesheet = function() {
      var _ref1, _ref2;
      if ((_ref1 = this.userStylsheetSubscriptions) != null) {
        _ref1.dispose();
      }
      this.userStylsheetSubscriptions = null;
      this.userStylesheetFile = null;
      if ((_ref2 = this.userStyleSheetDisposable) != null) {
        _ref2.dispose();
      }
      return this.userStyleSheetDisposable = null;
    };

    ThemeManager.prototype.loadUserStylesheet = function() {
      var error, message, reloadStylesheet, userStylesheetContents, userStylesheetPath;
      this.unwatchUserStylesheet();
      userStylesheetPath = atom.styles.getUserStyleSheetPath();
      if (!fs.isFileSync(userStylesheetPath)) {
        return;
      }
      try {
        this.userStylesheetFile = new File(userStylesheetPath);
        this.userStylsheetSubscriptions = new CompositeDisposable();
        reloadStylesheet = (function(_this) {
          return function() {
            return _this.loadUserStylesheet();
          };
        })(this);
        this.userStylsheetSubscriptions.add(this.userStylesheetFile.onDidChange(reloadStylesheet));
        this.userStylsheetSubscriptions.add(this.userStylesheetFile.onDidRename(reloadStylesheet));
        this.userStylsheetSubscriptions.add(this.userStylesheetFile.onDidDelete(reloadStylesheet));
      } catch (_error) {
        error = _error;
        message = "Unable to watch path: `" + (path.basename(userStylesheetPath)) + "`. Make sure\nyou have permissions to `" + userStylesheetPath + "`.\n\nOn linux there are currently problems with watch sizes. See\n[this document][watches] for more info.\n[watches]:https://github.com/atom/atom/blob/master/docs/build-instructions/linux.md#typeerror-unable-to-watch-path";
        atom.notifications.addError(message, {
          dismissable: true
        });
      }
      try {
        userStylesheetContents = this.loadStylesheet(userStylesheetPath, true);
      } catch (_error) {
        return;
      }
      return this.userStyleSheetDisposable = atom.styles.addStyleSheet(userStylesheetContents, {
        sourcePath: userStylesheetPath,
        priority: 2
      });
    };

    ThemeManager.prototype.loadBaseStylesheets = function() {
      this.requireStylesheet('../static/bootstrap');
      return this.reloadBaseStylesheets();
    };

    ThemeManager.prototype.reloadBaseStylesheets = function() {
      var nativeStylesheetPath;
      this.requireStylesheet('../static/atom');
      if (nativeStylesheetPath = fs.resolveOnLoadPath(process.platform, ['css', 'less'])) {
        return this.requireStylesheet(nativeStylesheetPath);
      }
    };

    ThemeManager.prototype.stylesheetElementForId = function(id) {
      return document.head.querySelector("atom-styles style[source-path=\"" + id + "\"]");
    };

    ThemeManager.prototype.resolveStylesheet = function(stylesheetPath) {
      if (path.extname(stylesheetPath).length > 0) {
        return fs.resolveOnLoadPath(stylesheetPath);
      } else {
        return fs.resolveOnLoadPath(stylesheetPath, ['css', 'less']);
      }
    };

    ThemeManager.prototype.loadStylesheet = function(stylesheetPath, importFallbackVariables) {
      if (path.extname(stylesheetPath) === '.less') {
        return this.loadLessStylesheet(stylesheetPath, importFallbackVariables);
      } else {
        return fs.readFileSync(stylesheetPath, 'utf8');
      }
    };

    ThemeManager.prototype.loadLessStylesheet = function(lessStylesheetPath, importFallbackVariables) {
      var LessCompileCache, baseVarImports, detail, error, less, message;
      if (importFallbackVariables == null) {
        importFallbackVariables = false;
      }
      if (this.lessCache == null) {
        LessCompileCache = require('./less-compile-cache');
        this.lessCache = new LessCompileCache({
          resourcePath: this.resourcePath,
          importPaths: this.getImportPaths()
        });
      }
      try {
        if (importFallbackVariables) {
          baseVarImports = "@import \"variables/ui-variables\";\n@import \"variables/syntax-variables\";";
          less = fs.readFileSync(lessStylesheetPath, 'utf8');
          return this.lessCache.cssForFile(lessStylesheetPath, [baseVarImports, less].join('\n'));
        } else {
          return this.lessCache.read(lessStylesheetPath);
        }
      } catch (_error) {
        error = _error;
        error.less = true;
        if (error.line != null) {
          if (importFallbackVariables) {
            error.line -= 2;
          }
          message = "Error compiling Less stylesheet: `" + lessStylesheetPath + "`";
          detail = "Line number: " + error.line + "\n" + error.message;
        } else {
          message = "Error loading Less stylesheet: `" + lessStylesheetPath + "`";
          detail = error.message;
        }
        atom.notifications.addError(message, {
          detail: detail,
          dismissable: true
        });
        throw error;
      }
    };

    ThemeManager.prototype.removeStylesheet = function(stylesheetPath) {
      var _ref1;
      return (_ref1 = this.styleSheetDisposablesBySourcePath[stylesheetPath]) != null ? _ref1.dispose() : void 0;
    };

    ThemeManager.prototype.applyStylesheet = function(path, text) {
      return this.styleSheetDisposablesBySourcePath[path] = atom.styles.addStyleSheet(text, {
        sourcePath: path
      });
    };

    ThemeManager.prototype.stringToId = function(string) {
      return string.replace(/\\/g, '/');
    };

    ThemeManager.prototype.activateThemes = function() {
      var deferred;
      deferred = Q.defer();
      atom.config.observe('core.themes', (function(_this) {
        return function() {
          var promises, themeName, _i, _len, _ref1;
          _this.deactivateThemes();
          _this.refreshLessCache();
          promises = [];
          _ref1 = _this.getEnabledThemeNames();
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            themeName = _ref1[_i];
            if (_this.packageManager.resolvePackagePath(themeName)) {
              promises.push(_this.packageManager.activatePackage(themeName));
            } else {
              console.warn("Failed to activate theme '" + themeName + "' because it isn't installed.");
            }
          }
          return Q.all(promises).then(function() {
            _this.addActiveThemeClasses();
            _this.refreshLessCache();
            _this.loadUserStylesheet();
            _this.reloadBaseStylesheets();
            _this.initialLoadComplete = true;
            if (Grim.includeDeprecatedAPIs) {
              _this.emit('reloaded');
            }
            _this.emitter.emit('did-change-active-themes');
            return deferred.resolve();
          });
        };
      })(this));
      return deferred.promise;
    };

    ThemeManager.prototype.deactivateThemes = function() {
      var pack, _i, _len, _ref1;
      this.removeActiveThemeClasses();
      this.unwatchUserStylesheet();
      _ref1 = this.getActiveThemes();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        pack = _ref1[_i];
        this.packageManager.deactivatePackage(pack.name);
      }
      return null;
    };

    ThemeManager.prototype.isInitialLoadComplete = function() {
      return this.initialLoadComplete;
    };

    ThemeManager.prototype.addActiveThemeClasses = function() {
      var pack, workspaceElement, _i, _len, _ref1;
      workspaceElement = atom.views.getView(atom.workspace);
      _ref1 = this.getActiveThemes();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        pack = _ref1[_i];
        workspaceElement.classList.add("theme-" + pack.name);
      }
    };

    ThemeManager.prototype.removeActiveThemeClasses = function() {
      var pack, workspaceElement, _i, _len, _ref1;
      workspaceElement = atom.views.getView(atom.workspace);
      _ref1 = this.getActiveThemes();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        pack = _ref1[_i];
        workspaceElement.classList.remove("theme-" + pack.name);
      }
    };

    ThemeManager.prototype.refreshLessCache = function() {
      var _ref1;
      return (_ref1 = this.lessCache) != null ? _ref1.setImportPaths(this.getImportPaths()) : void 0;
    };

    ThemeManager.prototype.getImportPaths = function() {
      var activeThemes, deprecatedPath, theme, themeName, themePath, themePaths, _i, _len, _ref1;
      activeThemes = this.getActiveThemes();
      if (activeThemes.length > 0) {
        themePaths = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = activeThemes.length; _i < _len; _i++) {
            theme = activeThemes[_i];
            if (theme) {
              _results.push(theme.getStylesheetsPath());
            }
          }
          return _results;
        })();
      } else {
        themePaths = [];
        _ref1 = this.getEnabledThemeNames();
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          themeName = _ref1[_i];
          if (themePath = this.packageManager.resolvePackagePath(themeName)) {
            deprecatedPath = path.join(themePath, 'stylesheets');
            if (fs.isDirectorySync(deprecatedPath)) {
              themePaths.push(deprecatedPath);
            } else {
              themePaths.push(path.join(themePath, 'styles'));
            }
          }
        }
      }
      return themePaths.filter(function(themePath) {
        return fs.isDirectorySync(themePath);
      });
    };

    return ThemeManager;

  })();

  if (Grim.includeDeprecatedAPIs) {
    EmitterMixin = require('emissary').Emitter;
    EmitterMixin.includeInto(ThemeManager);
    ThemeManager.prototype.on = function(eventName) {
      switch (eventName) {
        case 'reloaded':
          Grim.deprecate('Use ThemeManager::onDidChangeActiveThemes instead');
          break;
        case 'stylesheet-added':
          Grim.deprecate('Use ThemeManager::onDidAddStylesheet instead');
          break;
        case 'stylesheet-removed':
          Grim.deprecate('Use ThemeManager::onDidRemoveStylesheet instead');
          break;
        case 'stylesheet-updated':
          Grim.deprecate('Use ThemeManager::onDidUpdateStylesheet instead');
          break;
        case 'stylesheets-changed':
          Grim.deprecate('Use ThemeManager::onDidChangeStylesheets instead');
          break;
        default:
          Grim.deprecate('ThemeManager::on is deprecated. Use event subscription methods instead.');
      }
      return EmitterMixin.prototype.on.apply(this, arguments);
    };
    ThemeManager.prototype.onDidReloadAll = function(callback) {
      Grim.deprecate("Use `::onDidChangeActiveThemes` instead.");
      return this.onDidChangeActiveThemes(callback);
    };
    ThemeManager.prototype.onDidAddStylesheet = function(callback) {
      Grim.deprecate("Use atom.styles.onDidAddStyleElement instead");
      return this.emitter.on('did-add-stylesheet', callback);
    };
    ThemeManager.prototype.onDidRemoveStylesheet = function(callback) {
      Grim.deprecate("Use atom.styles.onDidRemoveStyleElement instead");
      return this.emitter.on('did-remove-stylesheet', callback);
    };
    ThemeManager.prototype.onDidUpdateStylesheet = function(callback) {
      Grim.deprecate("Use atom.styles.onDidUpdateStyleElement instead");
      return this.emitter.on('did-update-stylesheet', callback);
    };
    ThemeManager.prototype.onDidChangeStylesheets = function(callback) {
      Grim.deprecate("Use atom.styles.onDidAdd/RemoveStyleElement instead");
      return this.emitter.on('did-change-stylesheets', callback);
    };
    ThemeManager.prototype.getUserStylesheetPath = function() {
      Grim.deprecate("Call atom.styles.getUserStyleSheetPath() instead");
      return atom.styles.getUserStyleSheetPath();
    };
    ThemeManager.prototype.getLoadedNames = function() {
      Grim.deprecate("Use `::getLoadedThemeNames` instead.");
      return this.getLoadedThemeNames();
    };
    ThemeManager.prototype.getActiveNames = function() {
      Grim.deprecate("Use `::getActiveThemeNames` instead.");
      return this.getActiveThemeNames();
    };
    ThemeManager.prototype.setEnabledThemes = function(enabledThemeNames) {
      Grim.deprecate("Use `atom.config.set('core.themes', arrayOfThemeNames)` instead");
      return atom.config.set('core.themes', enabledThemeNames);
    };
  }

}).call(this);

(function() {
  var CSON, Color, CompositeDisposable, Config, Disposable, Emitter, EmitterMixin, Grim, ScopeDescriptor, ScopedPropertyStore, async, fs, isPlainObject, path, pathWatcher, splitKeyPath, withoutEmptyObjects, _, _ref;

  _ = require('underscore-plus');

  fs = require('fs-plus');

  EmitterMixin = require('emissary').Emitter;

  _ref = require('event-kit'), CompositeDisposable = _ref.CompositeDisposable, Disposable = _ref.Disposable, Emitter = _ref.Emitter;

  CSON = require('season');

  path = require('path');

  async = require('async');

  pathWatcher = require('pathwatcher');

  Grim = require('grim');

  Color = require('./color');

  ScopedPropertyStore = require('scoped-property-store');

  ScopeDescriptor = require('./scope-descriptor');

  module.exports = Config = (function() {
    EmitterMixin.includeInto(Config);

    Config.schemaEnforcers = {};

    Config.addSchemaEnforcer = function(typeName, enforcerFunction) {
      var _base;
      if ((_base = this.schemaEnforcers)[typeName] == null) {
        _base[typeName] = [];
      }
      return this.schemaEnforcers[typeName].push(enforcerFunction);
    };

    Config.addSchemaEnforcers = function(filters) {
      var enforcerFunction, functions, name, typeName;
      for (typeName in filters) {
        functions = filters[typeName];
        for (name in functions) {
          enforcerFunction = functions[name];
          this.addSchemaEnforcer(typeName, enforcerFunction);
        }
      }
    };

    Config.executeSchemaEnforcers = function(keyPath, value, schema) {
      var e, enforcer, enforcerFunctions, error, type, types, _i, _j, _len, _len1;
      error = null;
      types = schema.type;
      if (!Array.isArray(types)) {
        types = [types];
      }
      for (_i = 0, _len = types.length; _i < _len; _i++) {
        type = types[_i];
        try {
          enforcerFunctions = this.schemaEnforcers[type].concat(this.schemaEnforcers['*']);
          for (_j = 0, _len1 = enforcerFunctions.length; _j < _len1; _j++) {
            enforcer = enforcerFunctions[_j];
            value = enforcer.call(this, keyPath, value, schema);
          }
          error = null;
          break;
        } catch (_error) {
          e = _error;
          error = e;
        }
      }
      if (error != null) {
        throw error;
      }
      return value;
    };

    function Config(_arg) {
      var _ref1;
      _ref1 = _arg != null ? _arg : {}, this.configDirPath = _ref1.configDirPath, this.resourcePath = _ref1.resourcePath;
      this.emitter = new Emitter;
      this.schema = {
        type: 'object',
        properties: {}
      };
      this.defaultSettings = {};
      this.settings = {};
      this.scopedSettingsStore = new ScopedPropertyStore;
      this.configFileHasErrors = false;
      this.configFilePath = fs.resolve(this.configDirPath, 'config', ['json', 'cson']);
      if (this.configFilePath == null) {
        this.configFilePath = path.join(this.configDirPath, 'config.cson');
      }
      this.transactDepth = 0;
      this.debouncedSave = _.debounce(this.save, 100);
      this.debouncedLoad = _.debounce(this.loadUserConfig, 100);
    }


    /*
    Section: Config Subscription
     */

    Config.prototype.observe = function() {
      var callback, keyPath, options, scopeDescriptor;
      if (arguments.length === 2) {
        keyPath = arguments[0], callback = arguments[1];
      } else if (Grim.includeDeprecatedAPIs && arguments.length === 3 && (_.isArray(arguments[0]) || arguments[0] instanceof ScopeDescriptor)) {
        Grim.deprecate("Passing a scope descriptor as the first argument to Config::observe is deprecated.\nPass a `scope` in an options hash as the third argument instead.");
        scopeDescriptor = arguments[0], keyPath = arguments[1], callback = arguments[2];
      } else if (arguments.length === 3 && (_.isString(arguments[0]) && _.isObject(arguments[1]))) {
        keyPath = arguments[0], options = arguments[1], callback = arguments[2];
        scopeDescriptor = options.scope;
        if (Grim.includeDeprecatedAPIs && (options.callNow != null)) {
          Grim.deprecate("Config::observe no longer takes a `callNow` option. Use ::onDidChange instead.\nNote that ::onDidChange passes its callback different arguments.\nSee https://atom.io/docs/api/latest/Config");
        }
      } else {
        console.error('An unsupported form of Config::observe is being used. See https://atom.io/docs/api/latest/Config for details');
        return;
      }
      if (scopeDescriptor != null) {
        return this.observeScopedKeyPath(scopeDescriptor, keyPath, callback);
      } else {
        return this.observeKeyPath(keyPath, options != null ? options : {}, callback);
      }
    };

    Config.prototype.onDidChange = function() {
      var callback, keyPath, options, scopeDescriptor;
      if (arguments.length === 1) {
        callback = arguments[0];
      } else if (arguments.length === 2) {
        keyPath = arguments[0], callback = arguments[1];
      } else if (Grim.includeDeprecatedAPIs && _.isArray(arguments[0]) || arguments[0] instanceof ScopeDescriptor) {
        Grim.deprecate("Passing a scope descriptor as the first argument to Config::onDidChange is deprecated.\nPass a `scope` in an options hash as the third argument instead.");
        scopeDescriptor = arguments[0], keyPath = arguments[1], callback = arguments[2];
      } else {
        keyPath = arguments[0], options = arguments[1], callback = arguments[2];
        scopeDescriptor = options.scope;
      }
      if (scopeDescriptor != null) {
        return this.onDidChangeScopedKeyPath(scopeDescriptor, keyPath, callback);
      } else {
        return this.onDidChangeKeyPath(keyPath, callback);
      }
    };


    /*
    Section: Managing Settings
     */

    Config.prototype.get = function() {
      var keyPath, options, scope, value;
      if (arguments.length > 1) {
        if (typeof arguments[0] === 'string' || (arguments[0] == null)) {
          keyPath = arguments[0], options = arguments[1];
          scope = options.scope;
        } else if (Grim.includeDeprecatedAPIs) {
          Grim.deprecate("Passing a scope descriptor as the first argument to Config::get is deprecated.\nPass a `scope` in an options hash as the final argument instead.");
          scope = arguments[0], keyPath = arguments[1];
        }
      } else {
        keyPath = arguments[0];
      }
      if (scope != null) {
        value = this.getRawScopedValue(scope, keyPath, options);
        return value != null ? value : this.getRawValue(keyPath, options);
      } else {
        return this.getRawValue(keyPath, options);
      }
    };

    Config.prototype.getAll = function(keyPath, options) {
      var globalValue, result, scope, scopeDescriptor, sources;
      if (options != null) {
        scope = options.scope, sources = options.sources;
      }
      result = [];
      if (scope != null) {
        scopeDescriptor = ScopeDescriptor.fromObject(scope);
        result = result.concat(this.scopedSettingsStore.getAll(scopeDescriptor.getScopeChain(), keyPath, options));
      }
      if (globalValue = this.getRawValue(keyPath, options)) {
        result.push({
          scopeSelector: '*',
          value: globalValue
        });
      }
      return result;
    };

    Config.prototype.set = function() {
      var e, keyPath, options, scopeSelector, shouldSave, source, value, _ref1, _ref2;
      if (Grim.includeDeprecatedAPIs && ((_ref1 = arguments[0]) != null ? _ref1[0] : void 0) === '.') {
        Grim.deprecate("Passing a scope selector as the first argument to Config::set is deprecated.\nPass a `scopeSelector` in an options hash as the final argument instead.");
        scopeSelector = arguments[0], keyPath = arguments[1], value = arguments[2];
        shouldSave = true;
      } else {
        keyPath = arguments[0], value = arguments[1], options = arguments[2];
        scopeSelector = options != null ? options.scopeSelector : void 0;
        source = options != null ? options.source : void 0;
        shouldSave = (_ref2 = options != null ? options.save : void 0) != null ? _ref2 : true;
      }
      if (source && !scopeSelector) {
        throw new Error("::set with a 'source' and no 'sourceSelector' is not yet implemented!");
      }
      if (source == null) {
        source = this.getUserConfigPath();
      }
      if (value !== void 0) {
        try {
          value = this.makeValueConformToSchema(keyPath, value);
        } catch (_error) {
          e = _error;
          return false;
        }
      }
      if (scopeSelector != null) {
        this.setRawScopedValue(keyPath, value, source, scopeSelector);
      } else {
        this.setRawValue(keyPath, value);
      }
      if (source === this.getUserConfigPath() && shouldSave && !this.configFileHasErrors) {
        this.debouncedSave();
      }
      return true;
    };

    Config.prototype.unset = function(keyPath, options) {
      var scopeSelector, settings, source, _ref1;
      if (Grim.includeDeprecatedAPIs && typeof options === 'string') {
        Grim.deprecate("Passing a scope selector as the first argument to Config::unset is deprecated.\nPass a `scopeSelector` in an options hash as the second argument instead.");
        scopeSelector = keyPath;
        keyPath = options;
      } else {
        _ref1 = options != null ? options : {}, scopeSelector = _ref1.scopeSelector, source = _ref1.source;
      }
      if (source == null) {
        source = this.getUserConfigPath();
      }
      if (scopeSelector != null) {
        if (keyPath != null) {
          settings = this.scopedSettingsStore.propertiesForSourceAndSelector(source, scopeSelector);
          if (_.valueForKeyPath(settings, keyPath) != null) {
            this.scopedSettingsStore.removePropertiesForSourceAndSelector(source, scopeSelector);
            _.setValueForKeyPath(settings, keyPath, void 0);
            settings = withoutEmptyObjects(settings);
            if (settings != null) {
              this.set(null, settings, {
                scopeSelector: scopeSelector,
                source: source,
                priority: this.priorityForSource(source)
              });
            }
            return this.debouncedSave();
          }
        } else {
          this.scopedSettingsStore.removePropertiesForSourceAndSelector(source, scopeSelector);
          return this.emitChangeEvent();
        }
      } else {
        for (scopeSelector in this.scopedSettingsStore.propertiesForSource(source)) {
          this.unset(keyPath, {
            scopeSelector: scopeSelector,
            source: source
          });
        }
        if ((keyPath != null) && source === this.getUserConfigPath()) {
          return this.set(keyPath, _.valueForKeyPath(this.defaultSettings, keyPath));
        }
      }
    };

    Config.prototype.getSources = function() {
      return _.uniq(_.pluck(this.scopedSettingsStore.propertySets, 'source')).sort();
    };

    Config.prototype.getSchema = function(keyPath) {
      var key, keys, schema, _i, _len, _ref1;
      keys = splitKeyPath(keyPath);
      schema = this.schema;
      for (_i = 0, _len = keys.length; _i < _len; _i++) {
        key = keys[_i];
        if (schema == null) {
          break;
        }
        schema = (_ref1 = schema.properties) != null ? _ref1[key] : void 0;
      }
      return schema;
    };

    Config.prototype.getUserConfigPath = function() {
      return this.configFilePath;
    };

    Config.prototype.transact = function(callback) {
      this.transactDepth++;
      try {
        return callback();
      } finally {
        this.transactDepth--;
        this.emitChangeEvent();
      }
    };


    /*
    Section: Internal methods used by core
     */

    Config.prototype.pushAtKeyPath = function(keyPath, value) {
      var arrayValue, result, _ref1;
      arrayValue = (_ref1 = this.get(keyPath)) != null ? _ref1 : [];
      result = arrayValue.push(value);
      this.set(keyPath, arrayValue);
      return result;
    };

    Config.prototype.unshiftAtKeyPath = function(keyPath, value) {
      var arrayValue, result, _ref1;
      arrayValue = (_ref1 = this.get(keyPath)) != null ? _ref1 : [];
      result = arrayValue.unshift(value);
      this.set(keyPath, arrayValue);
      return result;
    };

    Config.prototype.removeAtKeyPath = function(keyPath, value) {
      var arrayValue, result, _ref1;
      arrayValue = (_ref1 = this.get(keyPath)) != null ? _ref1 : [];
      result = _.remove(arrayValue, value);
      this.set(keyPath, arrayValue);
      return result;
    };

    Config.prototype.setSchema = function(keyPath, schema) {
      var key, properties, rootSchema, _i, _len, _ref1;
      if (!isPlainObject(schema)) {
        throw new Error("Error loading schema for " + keyPath + ": schemas can only be objects!");
      }
      if (!typeof (schema.type != null)) {
        throw new Error("Error loading schema for " + keyPath + ": schema objects must have a type attribute");
      }
      rootSchema = this.schema;
      if (keyPath) {
        _ref1 = splitKeyPath(keyPath);
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          key = _ref1[_i];
          rootSchema.type = 'object';
          if (rootSchema.properties == null) {
            rootSchema.properties = {};
          }
          properties = rootSchema.properties;
          if (properties[key] == null) {
            properties[key] = {};
          }
          rootSchema = properties[key];
        }
      }
      _.extend(rootSchema, schema);
      this.setDefaults(keyPath, this.extractDefaultsFromSchema(schema));
      this.setScopedDefaultsFromSchema(keyPath, schema);
      return this.resetSettingsForSchemaChange();
    };

    Config.prototype.load = function() {
      this.initializeConfigDirectory();
      this.loadUserConfig();
      return this.observeUserConfig();
    };


    /*
    Section: Private methods managing the user's config file
     */

    Config.prototype.initializeConfigDirectory = function(done) {
      var onConfigDirFile, queue, templateConfigDirPath;
      if (fs.existsSync(this.configDirPath)) {
        return;
      }
      fs.makeTreeSync(this.configDirPath);
      queue = async.queue(function(_arg, callback) {
        var destinationPath, sourcePath;
        sourcePath = _arg.sourcePath, destinationPath = _arg.destinationPath;
        return fs.copy(sourcePath, destinationPath, callback);
      });
      queue.drain = done;
      templateConfigDirPath = fs.resolve(this.resourcePath, 'dot-atom');
      onConfigDirFile = (function(_this) {
        return function(sourcePath) {
          var destinationPath, relativePath;
          relativePath = sourcePath.substring(templateConfigDirPath.length + 1);
          destinationPath = path.join(_this.configDirPath, relativePath);
          return queue.push({
            sourcePath: sourcePath,
            destinationPath: destinationPath
          });
        };
      })(this);
      return fs.traverseTree(templateConfigDirPath, onConfigDirFile, function(path) {
        return true;
      });
    };

    Config.prototype.loadUserConfig = function() {
      var detail, error, message, userConfig;
      if (!fs.existsSync(this.configFilePath)) {
        fs.makeTreeSync(path.dirname(this.configFilePath));
        CSON.writeFileSync(this.configFilePath, {});
      }
      try {
        userConfig = CSON.readFileSync(this.configFilePath);
        this.resetUserSettings(userConfig);
        return this.configFileHasErrors = false;
      } catch (_error) {
        error = _error;
        this.configFileHasErrors = true;
        message = "Failed to load `" + (path.basename(this.configFilePath)) + "`";
        detail = error.location != null ? error.stack : error.message;
        return this.notifyFailure(message, detail);
      }
    };

    Config.prototype.observeUserConfig = function() {
      var error;
      try {
        return this.watchSubscription != null ? this.watchSubscription : this.watchSubscription = pathWatcher.watch(this.configFilePath, (function(_this) {
          return function(eventType) {
            if (eventType === 'change' && (_this.watchSubscription != null)) {
              return _this.debouncedLoad();
            }
          };
        })(this));
      } catch (_error) {
        error = _error;
        return this.notifyFailure("Unable to watch path: `" + (path.basename(this.configFilePath)) + "`. Make sure you have permissions to\n`" + this.configFilePath + "`. On linux there are currently problems with watch\nsizes. See [this document][watches] for more info.\n[watches]:https://github.com/atom/atom/blob/master/docs/build-instructions/linux.md#typeerror-unable-to-watch-path");
      }
    };

    Config.prototype.unobserveUserConfig = function() {
      var _ref1;
      if ((_ref1 = this.watchSubscription) != null) {
        _ref1.close();
      }
      return this.watchSubscription = null;
    };

    Config.prototype.notifyFailure = function(errorMessage, detail) {
      return atom.notifications.addError(errorMessage, {
        detail: detail,
        dismissable: true
      });
    };

    Config.prototype.save = function() {
      var allSettings, detail, error, message;
      allSettings = {
        '*': this.settings
      };
      allSettings = _.extend(allSettings, this.scopedSettingsStore.propertiesForSource(this.getUserConfigPath()));
      try {
        return CSON.writeFileSync(this.configFilePath, allSettings);
      } catch (_error) {
        error = _error;
        message = "Failed to save `" + (path.basename(this.configFilePath)) + "`";
        detail = error.message;
        return this.notifyFailure(message, detail);
      }
    };


    /*
    Section: Private methods managing global settings
     */

    Config.prototype.resetUserSettings = function(newSettings) {
      var scopedSettings;
      if (!isPlainObject(newSettings)) {
        this.settings = {};
        this.emitChangeEvent();
        return;
      }
      if (newSettings.global != null) {
        newSettings['*'] = newSettings.global;
        delete newSettings.global;
      }
      if (newSettings['*'] != null) {
        scopedSettings = newSettings;
        newSettings = newSettings['*'];
        delete scopedSettings['*'];
        this.resetUserScopedSettings(scopedSettings);
      }
      return this.transact((function(_this) {
        return function() {
          var key, value;
          _this.settings = {};
          for (key in newSettings) {
            value = newSettings[key];
            _this.set(key, value, {
              save: false
            });
          }
        };
      })(this));
    };

    Config.prototype.getRawValue = function(keyPath, options) {
      var defaultValue, value, _ref1, _ref2;
      if (!((options != null ? (_ref1 = options.excludeSources) != null ? _ref1.indexOf(this.getUserConfigPath()) : void 0 : void 0) >= 0)) {
        value = _.valueForKeyPath(this.settings, keyPath);
      }
      if (!((options != null ? (_ref2 = options.sources) != null ? _ref2.length : void 0 : void 0) > 0)) {
        defaultValue = _.valueForKeyPath(this.defaultSettings, keyPath);
      }
      if (value != null) {
        value = this.deepClone(value);
        if (isPlainObject(value) && isPlainObject(defaultValue)) {
          _.defaults(value, defaultValue);
        }
      } else {
        value = this.deepClone(defaultValue);
      }
      return value;
    };

    Config.prototype.setRawValue = function(keyPath, value) {
      var defaultValue;
      defaultValue = _.valueForKeyPath(this.defaultSettings, keyPath);
      if (_.isEqual(defaultValue, value)) {
        value = void 0;
      }
      if (keyPath != null) {
        _.setValueForKeyPath(this.settings, keyPath, value);
      } else {
        this.settings = value;
      }
      return this.emitChangeEvent();
    };

    Config.prototype.observeKeyPath = function(keyPath, options, callback) {
      callback(this.get(keyPath));
      return this.onDidChangeKeyPath(keyPath, function(event) {
        return callback(event.newValue);
      });
    };

    Config.prototype.onDidChangeKeyPath = function(keyPath, callback) {
      var oldValue;
      oldValue = this.get(keyPath);
      return this.emitter.on('did-change', (function(_this) {
        return function() {
          var event, newValue;
          newValue = _this.get(keyPath);
          if (!_.isEqual(oldValue, newValue)) {
            event = {
              oldValue: oldValue,
              newValue: newValue
            };
            oldValue = newValue;
            return callback(event);
          }
        };
      })(this));
    };

    Config.prototype.isSubKeyPath = function(keyPath, subKeyPath) {
      var pathSubTokens, pathTokens;
      if (!((keyPath != null) && (subKeyPath != null))) {
        return false;
      }
      pathSubTokens = splitKeyPath(subKeyPath);
      pathTokens = splitKeyPath(keyPath).slice(0, pathSubTokens.length);
      return _.isEqual(pathTokens, pathSubTokens);
    };

    Config.prototype.setRawDefault = function(keyPath, value) {
      _.setValueForKeyPath(this.defaultSettings, keyPath, value);
      return this.emitChangeEvent();
    };

    Config.prototype.setDefaults = function(keyPath, defaults) {
      var childValue, e, key, keys;
      if ((defaults != null) && isPlainObject(defaults)) {
        keys = splitKeyPath(keyPath);
        for (key in defaults) {
          childValue = defaults[key];
          if (!defaults.hasOwnProperty(key)) {
            continue;
          }
          this.setDefaults(keys.concat([key]).join('.'), childValue);
        }
      } else {
        try {
          defaults = this.makeValueConformToSchema(keyPath, defaults);
          this.setRawDefault(keyPath, defaults);
        } catch (_error) {
          e = _error;
          console.warn("'" + keyPath + "' could not set the default. Attempted default: " + (JSON.stringify(defaults)) + "; Schema: " + (JSON.stringify(this.getSchema(keyPath))));
        }
      }
    };

    Config.prototype.deepClone = function(object) {
      if (object instanceof Color) {
        return object.clone();
      } else if (_.isArray(object)) {
        return object.map((function(_this) {
          return function(value) {
            return _this.deepClone(value);
          };
        })(this));
      } else if (isPlainObject(object)) {
        return _.mapObject(object, (function(_this) {
          return function(key, value) {
            return [key, _this.deepClone(value)];
          };
        })(this));
      } else {
        return object;
      }
    };

    Config.prototype.setScopedDefaultsFromSchema = function(keyPath, schema) {
      var childValue, key, keys, scope, scopeSchema, scopedDefaults, _ref1, _ref2;
      if ((schema.scopes != null) && isPlainObject(schema.scopes)) {
        scopedDefaults = {};
        _ref1 = schema.scopes;
        for (scope in _ref1) {
          scopeSchema = _ref1[scope];
          if (!scopeSchema.hasOwnProperty('default')) {
            continue;
          }
          scopedDefaults[scope] = {};
          _.setValueForKeyPath(scopedDefaults[scope], keyPath, scopeSchema["default"]);
        }
        this.scopedSettingsStore.addProperties('schema-default', scopedDefaults);
      }
      if (schema.type === 'object' && (schema.properties != null) && isPlainObject(schema.properties)) {
        keys = splitKeyPath(keyPath);
        _ref2 = schema.properties;
        for (key in _ref2) {
          childValue = _ref2[key];
          if (!schema.properties.hasOwnProperty(key)) {
            continue;
          }
          this.setScopedDefaultsFromSchema(keys.concat([key]).join('.'), childValue);
        }
      }
    };

    Config.prototype.extractDefaultsFromSchema = function(schema) {
      var defaults, key, properties, value;
      if (schema["default"] != null) {
        return schema["default"];
      } else if (schema.type === 'object' && (schema.properties != null) && isPlainObject(schema.properties)) {
        defaults = {};
        properties = schema.properties || {};
        for (key in properties) {
          value = properties[key];
          defaults[key] = this.extractDefaultsFromSchema(value);
        }
        return defaults;
      }
    };

    Config.prototype.makeValueConformToSchema = function(keyPath, value, options) {
      var e, schema;
      if (options != null ? options.suppressException : void 0) {
        try {
          return this.makeValueConformToSchema(keyPath, value);
        } catch (_error) {
          e = _error;
          return void 0;
        }
      } else {
        if (schema = this.getSchema(keyPath)) {
          value = this.constructor.executeSchemaEnforcers(keyPath, value, schema);
        }
        return value;
      }
    };

    Config.prototype.resetSettingsForSchemaChange = function(source) {
      if (source == null) {
        source = this.getUserConfigPath();
      }
      return this.transact((function(_this) {
        return function() {
          var priority, scopeSelector, selectorsAndSettings, settings;
          _this.settings = _this.makeValueConformToSchema(null, _this.settings, {
            suppressException: true
          });
          priority = _this.priorityForSource(source);
          selectorsAndSettings = _this.scopedSettingsStore.propertiesForSource(source);
          _this.scopedSettingsStore.removePropertiesForSource(source);
          for (scopeSelector in selectorsAndSettings) {
            settings = selectorsAndSettings[scopeSelector];
            settings = _this.makeValueConformToSchema(null, settings, {
              suppressException: true
            });
            _this.setRawScopedValue(null, settings, source, scopeSelector);
          }
        };
      })(this));
    };


    /*
    Section: Private Scoped Settings
     */

    Config.prototype.priorityForSource = function(source) {
      if (source === this.getUserConfigPath()) {
        return 1000;
      } else {
        return 0;
      }
    };

    Config.prototype.emitChangeEvent = function() {
      if (!(this.transactDepth > 0)) {
        return this.emitter.emit('did-change');
      }
    };

    Config.prototype.resetUserScopedSettings = function(newScopedSettings) {
      var priority, scopeSelector, settings, source, validatedSettings;
      source = this.getUserConfigPath();
      priority = this.priorityForSource(source);
      this.scopedSettingsStore.removePropertiesForSource(source);
      for (scopeSelector in newScopedSettings) {
        settings = newScopedSettings[scopeSelector];
        settings = this.makeValueConformToSchema(null, settings, {
          suppressException: true
        });
        validatedSettings = {};
        validatedSettings[scopeSelector] = withoutEmptyObjects(settings);
        if (validatedSettings[scopeSelector] != null) {
          this.scopedSettingsStore.addProperties(source, validatedSettings, {
            priority: priority
          });
        }
      }
      return this.emitChangeEvent();
    };

    Config.prototype.setRawScopedValue = function(keyPath, value, source, selector, options) {
      var newValue, settingsBySelector;
      if (keyPath != null) {
        newValue = {};
        _.setValueForKeyPath(newValue, keyPath, value);
        value = newValue;
      }
      settingsBySelector = {};
      settingsBySelector[selector] = value;
      this.scopedSettingsStore.addProperties(source, settingsBySelector, {
        priority: this.priorityForSource(source)
      });
      return this.emitChangeEvent();
    };

    Config.prototype.getRawScopedValue = function(scopeDescriptor, keyPath, options) {
      scopeDescriptor = ScopeDescriptor.fromObject(scopeDescriptor);
      return this.scopedSettingsStore.getPropertyValue(scopeDescriptor.getScopeChain(), keyPath, options);
    };

    Config.prototype.observeScopedKeyPath = function(scope, keyPath, callback) {
      callback(this.get(keyPath, {
        scope: scope
      }));
      return this.onDidChangeScopedKeyPath(scope, keyPath, function(event) {
        return callback(event.newValue);
      });
    };

    Config.prototype.onDidChangeScopedKeyPath = function(scope, keyPath, callback) {
      var oldValue;
      oldValue = this.get(keyPath, {
        scope: scope
      });
      return this.emitter.on('did-change', (function(_this) {
        return function() {
          var event, newValue;
          newValue = _this.get(keyPath, {
            scope: scope
          });
          if (!_.isEqual(oldValue, newValue)) {
            event = {
              oldValue: oldValue,
              newValue: newValue
            };
            oldValue = newValue;
            return callback(event);
          }
        };
      })(this));
    };

    return Config;

  })();

  Config.addSchemaEnforcers({
    'integer': {
      coerce: function(keyPath, value, schema) {
        value = parseInt(value);
        if (isNaN(value) || !isFinite(value)) {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " cannot be coerced into an int");
        }
        return value;
      }
    },
    'number': {
      coerce: function(keyPath, value, schema) {
        value = parseFloat(value);
        if (isNaN(value) || !isFinite(value)) {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " cannot be coerced into a number");
        }
        return value;
      }
    },
    'boolean': {
      coerce: function(keyPath, value, schema) {
        switch (typeof value) {
          case 'string':
            if (value.toLowerCase() === 'true') {
              return true;
            } else if (value.toLowerCase() === 'false') {
              return false;
            } else {
              throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " must be a boolean or the string 'true' or 'false'");
            }
            break;
          case 'boolean':
            return value;
          default:
            throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " must be a boolean or the string 'true' or 'false'");
        }
      }
    },
    'string': {
      validate: function(keyPath, value, schema) {
        if (typeof value !== 'string') {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " must be a string");
        }
        return value;
      }
    },
    'null': {
      coerce: function(keyPath, value, schema) {
        if (value !== (void 0) && value !== null) {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " must be null");
        }
        return value;
      }
    },
    'object': {
      coerce: function(keyPath, value, schema) {
        var childSchema, error, newValue, prop, propValue;
        if (!isPlainObject(value)) {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " must be an object");
        }
        if (schema.properties == null) {
          return value;
        }
        newValue = {};
        for (prop in value) {
          propValue = value[prop];
          childSchema = schema.properties[prop];
          if (childSchema != null) {
            try {
              newValue[prop] = this.executeSchemaEnforcers("" + keyPath + "." + prop, propValue, childSchema);
            } catch (_error) {
              error = _error;
              console.warn("Error setting item in object: " + error.message);
            }
          } else {
            newValue[prop] = propValue;
          }
        }
        return newValue;
      }
    },
    'array': {
      coerce: function(keyPath, value, schema) {
        var error, item, itemSchema, newValue, _i, _len;
        if (!Array.isArray(value)) {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " must be an array");
        }
        itemSchema = schema.items;
        if (itemSchema != null) {
          newValue = [];
          for (_i = 0, _len = value.length; _i < _len; _i++) {
            item = value[_i];
            try {
              newValue.push(this.executeSchemaEnforcers(keyPath, item, itemSchema));
            } catch (_error) {
              error = _error;
              console.warn("Error setting item in array: " + error.message);
            }
          }
          return newValue;
        } else {
          return value;
        }
      }
    },
    'color': {
      coerce: function(keyPath, value, schema) {
        var color;
        color = Color.parse(value);
        if (color == null) {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " cannot be coerced into a color");
        }
        return color;
      }
    },
    '*': {
      coerceMinimumAndMaximum: function(keyPath, value, schema) {
        if (typeof value !== 'number') {
          return value;
        }
        if ((schema.minimum != null) && typeof schema.minimum === 'number') {
          value = Math.max(value, schema.minimum);
        }
        if ((schema.maximum != null) && typeof schema.maximum === 'number') {
          value = Math.min(value, schema.maximum);
        }
        return value;
      },
      validateEnum: function(keyPath, value, schema) {
        var possibleValue, possibleValues, _i, _len;
        possibleValues = schema["enum"];
        if (!((possibleValues != null) && Array.isArray(possibleValues) && possibleValues.length)) {
          return value;
        }
        for (_i = 0, _len = possibleValues.length; _i < _len; _i++) {
          possibleValue = possibleValues[_i];
          if (_.isEqual(possibleValue, value)) {
            return value;
          }
        }
        throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " is not one of " + (JSON.stringify(possibleValues)));
      }
    }
  });

  isPlainObject = function(value) {
    return _.isObject(value) && !_.isArray(value) && !_.isFunction(value) && !_.isString(value) && !(value instanceof Color);
  };

  splitKeyPath = function(keyPath) {
    var char, i, keyPathArray, startIndex, _i, _len;
    if (keyPath == null) {
      return [];
    }
    startIndex = 0;
    keyPathArray = [];
    for (i = _i = 0, _len = keyPath.length; _i < _len; i = ++_i) {
      char = keyPath[i];
      if (char === '.' && (i === 0 || keyPath[i - 1] !== '\\')) {
        keyPathArray.push(keyPath.substring(startIndex, i));
        startIndex = i + 1;
      }
    }
    keyPathArray.push(keyPath.substr(startIndex, keyPath.length));
    return keyPathArray;
  };

  withoutEmptyObjects = function(object) {
    var key, newValue, resultObject, value;
    resultObject = void 0;
    if (isPlainObject(object)) {
      for (key in object) {
        value = object[key];
        newValue = withoutEmptyObjects(value);
        if (newValue != null) {
          if (resultObject == null) {
            resultObject = {};
          }
          resultObject[key] = newValue;
        }
      }
    } else {
      resultObject = object;
    }
    return resultObject;
  };

  if (Grim.includeDeprecatedAPIs) {
    Config.prototype.restoreDefault = function(scopeSelector, keyPath) {
      Grim.deprecate("Use ::unset instead.");
      this.unset(scopeSelector, keyPath);
      return this.get(keyPath);
    };
    Config.prototype.getDefault = function() {
      var keyPath, scope, scopeSelector;
      Grim.deprecate("Use `::get(keyPath, {scope, excludeSources: [atom.config.getUserConfigPath()]})` instead");
      if (arguments.length === 1) {
        keyPath = arguments[0];
      } else {
        scopeSelector = arguments[0], keyPath = arguments[1];
        scope = [scopeSelector];
      }
      return this.get(keyPath, {
        scope: scope,
        excludeSources: [this.getUserConfigPath()]
      });
    };
    Config.prototype.isDefault = function() {
      var keyPath, scope, scopeSelector;
      Grim.deprecate("Use `not ::get(keyPath, {scope, sources: [atom.config.getUserConfigPath()]})?` instead");
      if (arguments.length === 1) {
        keyPath = arguments[0];
      } else {
        scopeSelector = arguments[0], keyPath = arguments[1];
        scope = [scopeSelector];
      }
      return this.get(keyPath, {
        scope: scope,
        sources: [this.getUserConfigPath()]
      }) == null;
    };
    Config.prototype.getSettings = function() {
      Grim.deprecate("Use ::get(keyPath) instead");
      return _.deepExtend({}, this.settings, this.defaultSettings);
    };
    Config.prototype.getInt = function(keyPath) {
      Grim.deprecate('Config::getInt is no longer necessary. Use ::get instead.\nMake sure the config option you are accessing has specified an `integer`\nschema. See the schema section of\nhttps://atom.io/docs/api/latest/Config for more info.');
      return parseInt(this.get(keyPath));
    };
    Config.prototype.getPositiveInt = function(keyPath, defaultValue) {
      if (defaultValue == null) {
        defaultValue = 0;
      }
      Grim.deprecate('Config::getPositiveInt is no longer necessary. Use ::get instead.\nMake sure the config option you are accessing has specified an `integer`\nschema with `minimum: 1`. See the schema section of\nhttps://atom.io/docs/api/latest/Config for more info.');
      return Math.max(this.getInt(keyPath), 0) || defaultValue;
    };
    Config.prototype.toggle = function(keyPath) {
      Grim.deprecate('Config::toggle is no longer supported. Please remove from your code.');
      return this.set(keyPath, !this.get(keyPath));
    };
    Config.prototype.unobserve = function(keyPath) {
      return Grim.deprecate('Config::unobserve no longer does anything. Call `.dispose()` on the object returned by Config::observe instead.');
    };
    Config.prototype.addScopedSettings = function(source, selector, value, options) {
      var disposable, settingsBySelector;
      Grim.deprecate("Use ::set instead");
      settingsBySelector = {};
      settingsBySelector[selector] = value;
      disposable = this.scopedSettingsStore.addProperties(source, settingsBySelector, options);
      this.emitChangeEvent();
      return new Disposable((function(_this) {
        return function() {
          disposable.dispose();
          return _this.emitChangeEvent();
        };
      })(this));
    };
    Config.prototype.settingsForScopeDescriptor = function(scopeDescriptor, keyPath) {
      var entries, value, _i, _len, _results;
      Grim.deprecate("Use Config::getAll instead");
      entries = this.getAll(null, {
        scope: scopeDescriptor
      });
      _results = [];
      for (_i = 0, _len = entries.length; _i < _len; _i++) {
        value = entries[_i].value;
        if (_.valueForKeyPath(value, keyPath) != null) {
          _results.push(value);
        }
      }
      return _results;
    };
  }

}).call(this);

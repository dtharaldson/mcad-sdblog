(function() {
  var Emitter, FirstMate, GrammarRegistry, PropertyAccessors, Subscriber, Token, deprecate, includeDeprecatedAPIs, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  Emitter = require('event-kit').Emitter;

  _ref = require('grim'), includeDeprecatedAPIs = _ref.includeDeprecatedAPIs, deprecate = _ref.deprecate;

  FirstMate = require('first-mate');

  Token = require('./token');

  module.exports = GrammarRegistry = (function(_super) {
    __extends(GrammarRegistry, _super);

    GrammarRegistry.deserialize = function(_arg) {
      var grammarOverridesByPath, grammarRegistry;
      grammarOverridesByPath = _arg.grammarOverridesByPath;
      grammarRegistry = new GrammarRegistry();
      grammarRegistry.grammarOverridesByPath = grammarOverridesByPath;
      return grammarRegistry;
    };

    atom.deserializers.add(GrammarRegistry);

    function GrammarRegistry() {
      GrammarRegistry.__super__.constructor.call(this, {
        maxTokensPerLine: 100
      });
    }

    GrammarRegistry.prototype.serialize = function() {
      return {
        deserializer: this.constructor.name,
        grammarOverridesByPath: this.grammarOverridesByPath
      };
    };

    GrammarRegistry.prototype.createToken = function(value, scopes) {
      return new Token({
        value: value,
        scopes: scopes
      });
    };

    GrammarRegistry.prototype.selectGrammar = function(filePath, fileContents) {
      return GrammarRegistry.__super__.selectGrammar.apply(this, arguments);
    };

    GrammarRegistry.prototype.clearObservers = function() {
      if (includeDeprecatedAPIs) {
        this.off();
      }
      return this.emitter = new Emitter;
    };

    return GrammarRegistry;

  })(FirstMate.GrammarRegistry);

  if (includeDeprecatedAPIs) {
    PropertyAccessors = require('property-accessors');
    PropertyAccessors.includeInto(GrammarRegistry);
    Subscriber = require('emissary').Subscriber;
    Subscriber.includeInto(GrammarRegistry);
    atom.deserializers.add({
      name: 'Syntax',
      deserialize: GrammarRegistry.deserialize
    });
    GrammarRegistry.prototype.accessor('propertyStore', function() {
      deprecate("Do not use this. Use a public method on Config");
      return atom.config.scopedSettingsStore;
    });
    GrammarRegistry.prototype.addProperties = function() {
      var args, _ref1;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (args.length === 2) {
        args.unshift(null);
      }
      deprecate('Consider using atom.config.set() instead. A direct (but private) replacement is available at atom.config.addScopedSettings().');
      return (_ref1 = atom.config).addScopedSettings.apply(_ref1, args);
    };
    GrammarRegistry.prototype.removeProperties = function(name) {
      deprecate('atom.config.addScopedSettings() now returns a disposable you can call .dispose() on');
      return atom.config.scopedSettingsStore.removeProperties(name);
    };
    GrammarRegistry.prototype.getProperty = function(scope, keyPath) {
      deprecate('A direct (but private) replacement is available at atom.config.getRawScopedValue().');
      return atom.config.getRawScopedValue(scope, keyPath);
    };
    GrammarRegistry.prototype.propertiesForScope = function(scope, keyPath) {
      deprecate('Use atom.config.getAll instead.');
      return atom.config.settingsForScopeDescriptor(scope, keyPath);
    };
  }

}).call(this);

(function() {
  var DeserializerManager, Disposable, Grim,
    __slice = [].slice;

  Disposable = require('event-kit').Disposable;

  Grim = require('grim');

  module.exports = DeserializerManager = (function() {
    function DeserializerManager() {
      this.deserializers = {};
    }

    DeserializerManager.prototype.add = function() {
      var deserializer, deserializers, _i, _len;
      deserializers = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      for (_i = 0, _len = deserializers.length; _i < _len; _i++) {
        deserializer = deserializers[_i];
        this.deserializers[deserializer.name] = deserializer;
      }
      return new Disposable((function(_this) {
        return function() {
          var _j, _len1;
          for (_j = 0, _len1 = deserializers.length; _j < _len1; _j++) {
            deserializer = deserializers[_j];
            delete _this.deserializers[deserializer.name];
          }
        };
      })(this));
    };

    DeserializerManager.prototype.deserialize = function(state, params) {
      var deserializer, stateVersion, _ref;
      if (state == null) {
        return;
      }
      if (deserializer = this.get(state)) {
        stateVersion = (_ref = typeof state.get === "function" ? state.get('version') : void 0) != null ? _ref : state.version;
        if ((deserializer.version != null) && deserializer.version !== stateVersion) {
          return;
        }
        return deserializer.deserialize(state, params);
      } else {
        return console.warn("No deserializer found for", state);
      }
    };

    DeserializerManager.prototype.get = function(state) {
      var name, _ref;
      if (state == null) {
        return;
      }
      name = (_ref = typeof state.get === "function" ? state.get('deserializer') : void 0) != null ? _ref : state.deserializer;
      return this.deserializers[name];
    };

    return DeserializerManager;

  })();

  if (Grim.includeDeprecatedAPIs) {
    DeserializerManager.prototype.remove = function() {
      var classes, name, _i, _len;
      classes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      Grim.deprecate("Call .dispose() on the Disposable return from ::add instead");
      for (_i = 0, _len = classes.length; _i < _len; _i++) {
        name = classes[_i].name;
        delete this.deserializers[name];
      }
    };
  }

}).call(this);

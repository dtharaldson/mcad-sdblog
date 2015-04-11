(function() {
  var CSON, CompositeDisposable, ScopedProperties;

  CSON = require('season');

  CompositeDisposable = require('event-kit').CompositeDisposable;

  module.exports = ScopedProperties = (function() {
    ScopedProperties.load = function(scopedPropertiesPath, callback) {
      return CSON.readFile(scopedPropertiesPath, function(error, scopedProperties) {
        if (scopedProperties == null) {
          scopedProperties = {};
        }
        if (error != null) {
          return callback(error);
        } else {
          return callback(null, new ScopedProperties(scopedPropertiesPath, scopedProperties));
        }
      });
    };

    function ScopedProperties(path, scopedProperties) {
      this.path = path;
      this.scopedProperties = scopedProperties;
    }

    ScopedProperties.prototype.activate = function() {
      var properties, selector, _ref;
      _ref = this.scopedProperties;
      for (selector in _ref) {
        properties = _ref[selector];
        atom.config.set(null, properties, {
          scopeSelector: selector,
          source: this.path
        });
      }
    };

    ScopedProperties.prototype.deactivate = function() {
      var selector;
      for (selector in this.scopedProperties) {
        atom.config.unset(null, {
          scopeSelector: selector,
          source: this.path
        });
      }
    };

    return ScopedProperties;

  })();

}).call(this);

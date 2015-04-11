(function() {
  var Decoration, Emitter, EmitterMixin, Grim, idCounter, nextId, _,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ = require('underscore-plus');

  Emitter = require('event-kit').Emitter;

  Grim = require('grim');

  idCounter = 0;

  nextId = function() {
    return idCounter++;
  };

  module.exports = Decoration = (function() {
    Decoration.isType = function(decorationProperties, type) {
      if (_.isArray(decorationProperties.type)) {
        return __indexOf.call(decorationProperties.type, type) >= 0;
      } else {
        return type === decorationProperties.type;
      }
    };


    /*
    Section: Construction and Destruction
     */

    function Decoration(marker, displayBuffer, properties) {
      this.marker = marker;
      this.displayBuffer = displayBuffer;
      this.properties = properties;
      this.emitter = new Emitter;
      this.id = nextId();
      this.properties.id = this.id;
      this.flashQueue = null;
      this.destroyed = false;
      this.markerDestroyDisposable = this.marker.onDidDestroy((function(_this) {
        return function() {
          return _this.destroy();
        };
      })(this));
    }

    Decoration.prototype.destroy = function() {
      if (this.destroyed) {
        return;
      }
      this.markerDestroyDisposable.dispose();
      this.markerDestroyDisposable = null;
      this.destroyed = true;
      if (Grim.includeDeprecatedAPIs) {
        this.emit('destroyed');
      }
      this.emitter.emit('did-destroy');
      return this.emitter.dispose();
    };

    Decoration.prototype.isDestroyed = function() {
      return this.destroyed;
    };


    /*
    Section: Event Subscription
     */

    Decoration.prototype.onDidChangeProperties = function(callback) {
      return this.emitter.on('did-change-properties', callback);
    };

    Decoration.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };


    /*
    Section: Decoration Details
     */

    Decoration.prototype.getId = function() {
      return this.id;
    };

    Decoration.prototype.getMarker = function() {
      return this.marker;
    };

    Decoration.prototype.isType = function(type) {
      return Decoration.isType(this.properties, type);
    };


    /*
    Section: Properties
     */

    Decoration.prototype.getProperties = function() {
      return this.properties;
    };

    Decoration.prototype.setProperties = function(newProperties) {
      var oldProperties;
      if (this.destroyed) {
        return;
      }
      oldProperties = this.properties;
      this.properties = newProperties;
      this.properties.id = this.id;
      if (Grim.includeDeprecatedAPIs) {
        this.emit('updated', {
          oldParams: oldProperties,
          newParams: newProperties
        });
      }
      return this.emitter.emit('did-change-properties', {
        oldProperties: oldProperties,
        newProperties: newProperties
      });
    };


    /*
    Section: Private methods
     */

    Decoration.prototype.matchesPattern = function(decorationPattern) {
      var key, value;
      if (decorationPattern == null) {
        return false;
      }
      for (key in decorationPattern) {
        value = decorationPattern[key];
        if (this.properties[key] !== value) {
          return false;
        }
      }
      return true;
    };

    Decoration.prototype.onDidFlash = function(callback) {
      return this.emitter.on('did-flash', callback);
    };

    Decoration.prototype.flash = function(klass, duration) {
      var flashObject;
      if (duration == null) {
        duration = 500;
      }
      flashObject = {
        "class": klass,
        duration: duration
      };
      if (this.flashQueue == null) {
        this.flashQueue = [];
      }
      this.flashQueue.push(flashObject);
      if (Grim.includeDeprecatedAPIs) {
        this.emit('flash');
      }
      return this.emitter.emit('did-flash');
    };

    Decoration.prototype.consumeNextFlash = function() {
      var _ref;
      if (((_ref = this.flashQueue) != null ? _ref.length : void 0) > 0) {
        return this.flashQueue.shift();
      }
      return null;
    };

    return Decoration;

  })();

  if (Grim.includeDeprecatedAPIs) {
    EmitterMixin = require('emissary').Emitter;
    EmitterMixin.includeInto(Decoration);
    Decoration.prototype.on = function(eventName) {
      switch (eventName) {
        case 'updated':
          Grim.deprecate('Use Decoration::onDidChangeProperties instead');
          break;
        case 'destroyed':
          Grim.deprecate('Use Decoration::onDidDestroy instead');
          break;
        case 'flash':
          Grim.deprecate('Use Decoration::onDidFlash instead');
          break;
        default:
          Grim.deprecate('Decoration::on is deprecated. Use event subscription methods instead.');
      }
      return EmitterMixin.prototype.on.apply(this, arguments);
    };
    Decoration.prototype.getParams = function() {
      Grim.deprecate('Use Decoration::getProperties instead');
      return this.getProperties();
    };
    Decoration.prototype.update = function() {
      return function(newProperties) {
        Grim.deprecate('Use Decoration::setProperties instead');
        return this.setProperties(newProperties);
      };
    };
  }

}).call(this);

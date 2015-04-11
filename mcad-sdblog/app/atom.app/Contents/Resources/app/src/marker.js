(function() {
  var CompositeDisposable, Emitter, EmitterMixin, Grim, Marker, _, _ref;

  _ = require('underscore-plus');

  _ref = require('event-kit'), CompositeDisposable = _ref.CompositeDisposable, Emitter = _ref.Emitter;

  Grim = require('grim');

  module.exports = Marker = (function() {
    Marker.prototype.bufferMarkerSubscription = null;

    Marker.prototype.oldHeadBufferPosition = null;

    Marker.prototype.oldHeadScreenPosition = null;

    Marker.prototype.oldTailBufferPosition = null;

    Marker.prototype.oldTailScreenPosition = null;

    Marker.prototype.wasValid = true;

    Marker.prototype.deferredChangeEvents = null;


    /*
    Section: Construction and Destruction
     */

    function Marker(_arg) {
      this.bufferMarker = _arg.bufferMarker, this.displayBuffer = _arg.displayBuffer;
      this.emitter = new Emitter;
      this.disposables = new CompositeDisposable;
      this.id = this.bufferMarker.id;
      this.oldHeadBufferPosition = this.getHeadBufferPosition();
      this.oldHeadScreenPosition = this.getHeadScreenPosition();
      this.oldTailBufferPosition = this.getTailBufferPosition();
      this.oldTailScreenPosition = this.getTailScreenPosition();
      this.wasValid = this.isValid();
      this.disposables.add(this.bufferMarker.onDidDestroy((function(_this) {
        return function() {
          return _this.destroyed();
        };
      })(this)));
      this.disposables.add(this.bufferMarker.onDidChange((function(_this) {
        return function(event) {
          return _this.notifyObservers(event);
        };
      })(this)));
    }

    Marker.prototype.destroy = function() {
      this.bufferMarker.destroy();
      return this.disposables.dispose();
    };

    Marker.prototype.copy = function(properties) {
      return this.displayBuffer.getMarker(this.bufferMarker.copy(properties).id);
    };


    /*
    Section: Event Subscription
     */

    Marker.prototype.onDidChange = function(callback) {
      return this.emitter.on('did-change', callback);
    };

    Marker.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };


    /*
    Section: Marker Details
     */

    Marker.prototype.isValid = function() {
      return this.bufferMarker.isValid();
    };

    Marker.prototype.isDestroyed = function() {
      return this.bufferMarker.isDestroyed();
    };

    Marker.prototype.isReversed = function() {
      return this.bufferMarker.isReversed();
    };

    Marker.prototype.getInvalidationStrategy = function() {
      return this.bufferMarker.getInvalidationStrategy();
    };

    Marker.prototype.getProperties = function() {
      return this.bufferMarker.getProperties();
    };

    Marker.prototype.setProperties = function(properties) {
      return this.bufferMarker.setProperties(properties);
    };

    Marker.prototype.matchesProperties = function(attributes) {
      attributes = this.displayBuffer.translateToBufferMarkerParams(attributes);
      return this.bufferMarker.matchesParams(attributes);
    };


    /*
    Section: Comparing to other markers
     */

    Marker.prototype.isEqual = function(other) {
      if (!(other instanceof this.constructor)) {
        return false;
      }
      return this.bufferMarker.isEqual(other.bufferMarker);
    };

    Marker.prototype.compare = function(other) {
      return this.bufferMarker.compare(other.bufferMarker);
    };


    /*
    Section: Managing the marker's range
     */

    Marker.prototype.getBufferRange = function() {
      return this.bufferMarker.getRange();
    };

    Marker.prototype.setBufferRange = function(bufferRange, properties) {
      return this.bufferMarker.setRange(bufferRange, properties);
    };

    Marker.prototype.getScreenRange = function() {
      return this.displayBuffer.screenRangeForBufferRange(this.getBufferRange(), {
        wrapAtSoftNewlines: true
      });
    };

    Marker.prototype.setScreenRange = function(screenRange, options) {
      return this.setBufferRange(this.displayBuffer.bufferRangeForScreenRange(screenRange), options);
    };

    Marker.prototype.getStartBufferPosition = function() {
      return this.bufferMarker.getStartPosition();
    };

    Marker.prototype.getStartScreenPosition = function() {
      return this.displayBuffer.screenPositionForBufferPosition(this.getStartBufferPosition(), {
        wrapAtSoftNewlines: true
      });
    };

    Marker.prototype.getEndBufferPosition = function() {
      return this.bufferMarker.getEndPosition();
    };

    Marker.prototype.getEndScreenPosition = function() {
      return this.displayBuffer.screenPositionForBufferPosition(this.getEndBufferPosition(), {
        wrapAtSoftNewlines: true
      });
    };

    Marker.prototype.getHeadBufferPosition = function() {
      return this.bufferMarker.getHeadPosition();
    };

    Marker.prototype.setHeadBufferPosition = function(bufferPosition, properties) {
      return this.bufferMarker.setHeadPosition(bufferPosition, properties);
    };

    Marker.prototype.getHeadScreenPosition = function() {
      return this.displayBuffer.screenPositionForBufferPosition(this.getHeadBufferPosition(), {
        wrapAtSoftNewlines: true
      });
    };

    Marker.prototype.setHeadScreenPosition = function(screenPosition, properties) {
      return this.setHeadBufferPosition(this.displayBuffer.bufferPositionForScreenPosition(screenPosition, properties));
    };

    Marker.prototype.getTailBufferPosition = function() {
      return this.bufferMarker.getTailPosition();
    };

    Marker.prototype.setTailBufferPosition = function(bufferPosition) {
      return this.bufferMarker.setTailPosition(bufferPosition);
    };

    Marker.prototype.getTailScreenPosition = function() {
      return this.displayBuffer.screenPositionForBufferPosition(this.getTailBufferPosition(), {
        wrapAtSoftNewlines: true
      });
    };

    Marker.prototype.setTailScreenPosition = function(screenPosition, options) {
      return this.setTailBufferPosition(this.displayBuffer.bufferPositionForScreenPosition(screenPosition, options));
    };

    Marker.prototype.hasTail = function() {
      return this.bufferMarker.hasTail();
    };

    Marker.prototype.plantTail = function() {
      return this.bufferMarker.plantTail();
    };

    Marker.prototype.clearTail = function(properties) {
      return this.bufferMarker.clearTail(properties);
    };


    /*
    Section: Private utility methods
     */

    Marker.prototype.inspect = function() {
      return "Marker(id: " + this.id + ", bufferRange: " + (this.getBufferRange()) + ")";
    };

    Marker.prototype.destroyed = function() {
      delete this.displayBuffer.markers[this.id];
      if (Grim.includeDeprecatedAPIs) {
        this.emit('destroyed');
      }
      this.emitter.emit('did-destroy');
      return this.emitter.dispose();
    };

    Marker.prototype.notifyObservers = function(_arg) {
      var changeEvent, isValid, newHeadBufferPosition, newHeadScreenPosition, newTailBufferPosition, newTailScreenPosition, textChanged;
      textChanged = _arg.textChanged;
      if (textChanged == null) {
        textChanged = false;
      }
      newHeadBufferPosition = this.getHeadBufferPosition();
      newHeadScreenPosition = this.getHeadScreenPosition();
      newTailBufferPosition = this.getTailBufferPosition();
      newTailScreenPosition = this.getTailScreenPosition();
      isValid = this.isValid();
      if (_.isEqual(isValid, this.wasValid) && _.isEqual(newHeadBufferPosition, this.oldHeadBufferPosition) && _.isEqual(newHeadScreenPosition, this.oldHeadScreenPosition) && _.isEqual(newTailBufferPosition, this.oldTailBufferPosition) && _.isEqual(newTailScreenPosition, this.oldTailScreenPosition)) {
        return;
      }
      changeEvent = {
        oldHeadScreenPosition: this.oldHeadScreenPosition,
        newHeadScreenPosition: newHeadScreenPosition,
        oldTailScreenPosition: this.oldTailScreenPosition,
        newTailScreenPosition: newTailScreenPosition,
        oldHeadBufferPosition: this.oldHeadBufferPosition,
        newHeadBufferPosition: newHeadBufferPosition,
        oldTailBufferPosition: this.oldTailBufferPosition,
        newTailBufferPosition: newTailBufferPosition,
        textChanged: textChanged,
        isValid: isValid
      };
      if (this.deferredChangeEvents != null) {
        this.deferredChangeEvents.push(changeEvent);
      } else {
        if (Grim.includeDeprecatedAPIs) {
          this.emit('changed', changeEvent);
        }
        this.emitter.emit('did-change', changeEvent);
      }
      this.oldHeadBufferPosition = newHeadBufferPosition;
      this.oldHeadScreenPosition = newHeadScreenPosition;
      this.oldTailBufferPosition = newTailBufferPosition;
      this.oldTailScreenPosition = newTailScreenPosition;
      return this.wasValid = isValid;
    };

    Marker.prototype.pauseChangeEvents = function() {
      return this.deferredChangeEvents = [];
    };

    Marker.prototype.resumeChangeEvents = function() {
      var deferredChangeEvents, event, _i, _len;
      if (deferredChangeEvents = this.deferredChangeEvents) {
        this.deferredChangeEvents = null;
        for (_i = 0, _len = deferredChangeEvents.length; _i < _len; _i++) {
          event = deferredChangeEvents[_i];
          if (Grim.includeDeprecatedAPIs) {
            this.emit('changed', event);
          }
          this.emitter.emit('did-change', event);
        }
      }
    };

    Marker.prototype.getPixelRange = function() {
      return this.displayBuffer.pixelRangeForScreenRange(this.getScreenRange(), false);
    };

    return Marker;

  })();

  if (Grim.includeDeprecatedAPIs) {
    EmitterMixin = require('emissary').Emitter;
    EmitterMixin.includeInto(Marker);
    Marker.prototype.on = function(eventName) {
      switch (eventName) {
        case 'changed':
          Grim.deprecate("Use Marker::onDidChange instead");
          break;
        case 'destroyed':
          Grim.deprecate("Use Marker::onDidDestroy instead");
          break;
        default:
          Grim.deprecate("Marker::on is deprecated. Use documented event subscription methods instead.");
      }
      return EmitterMixin.prototype.on.apply(this, arguments);
    };
    Marker.prototype.getAttributes = function() {
      Grim.deprecate('Use Marker::getProperties instead');
      return this.getProperties();
    };
    Marker.prototype.setAttributes = function(properties) {
      Grim.deprecate('Use Marker::setProperties instead');
      return this.setProperties(properties);
    };
    Marker.prototype.matchesAttributes = function(attributes) {
      Grim.deprecate('Use Marker::matchesProperties instead');
      return this.matchesProperties(attributes);
    };
  }

}).call(this);

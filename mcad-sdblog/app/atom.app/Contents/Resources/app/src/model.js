(function() {
  var Grim, Model, PropertyAccessors, nextInstanceId;

  Grim = require('grim');

  if (Grim.includeDeprecatedAPIs) {
    module.exports = require('theorist').Model;
    return;
  }

  PropertyAccessors = require('property-accessors');

  nextInstanceId = 1;

  module.exports = Model = (function() {
    PropertyAccessors.includeInto(Model);

    Model.resetNextInstanceId = function() {
      return nextInstanceId = 1;
    };

    Model.prototype.alive = true;

    function Model(params) {
      this.assignId(params != null ? params.id : void 0);
    }

    Model.prototype.assignId = function(id) {
      return this.id != null ? this.id : this.id = id != null ? id : nextInstanceId++;
    };

    Model.prototype.advisedAccessor('id', {
      set: function(id) {
        if (id >= nextInstanceId) {
          return nextInstanceId = id + 1;
        }
      }
    });

    Model.prototype.destroy = function() {
      if (!this.isAlive()) {
        return;
      }
      this.alive = false;
      return typeof this.destroyed === "function" ? this.destroyed() : void 0;
    };

    Model.prototype.isAlive = function() {
      return this.alive;
    };

    Model.prototype.isDestroyed = function() {
      return !this.isAlive();
    };

    return Model;

  })();

}).call(this);

(function() {
  var Emitter, Panel;

  Emitter = require('event-kit').Emitter;

  module.exports = Panel = (function() {

    /*
    Section: Construction and Destruction
     */
    function Panel(_arg) {
      var _ref;
      _ref = _arg != null ? _arg : {}, this.item = _ref.item, this.visible = _ref.visible, this.priority = _ref.priority, this.className = _ref.className;
      this.emitter = new Emitter;
      if (this.visible == null) {
        this.visible = true;
      }
      if (this.priority == null) {
        this.priority = 100;
      }
    }

    Panel.prototype.destroy = function() {
      this.hide();
      this.emitter.emit('did-destroy', this);
      return this.emitter.dispose();
    };


    /*
    Section: Event Subscription
     */

    Panel.prototype.onDidChangeVisible = function(callback) {
      return this.emitter.on('did-change-visible', callback);
    };

    Panel.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };


    /*
    Section: Panel Details
     */

    Panel.prototype.getItem = function() {
      return this.item;
    };

    Panel.prototype.getPriority = function() {
      return this.priority;
    };

    Panel.prototype.getClassName = function() {
      return this.className;
    };

    Panel.prototype.isVisible = function() {
      return this.visible;
    };

    Panel.prototype.hide = function() {
      var wasVisible;
      wasVisible = this.visible;
      this.visible = false;
      if (wasVisible) {
        return this.emitter.emit('did-change-visible', this.visible);
      }
    };

    Panel.prototype.show = function() {
      var wasVisible;
      wasVisible = this.visible;
      this.visible = true;
      if (!wasVisible) {
        return this.emitter.emit('did-change-visible', this.visible);
      }
    };

    return Panel;

  })();

}).call(this);

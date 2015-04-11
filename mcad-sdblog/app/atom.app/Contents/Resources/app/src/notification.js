(function() {
  var Emitter, Notification;

  Emitter = require('event-kit').Emitter;

  module.exports = Notification = (function() {
    function Notification(type, message, options) {
      this.type = type;
      this.message = message;
      this.options = options != null ? options : {};
      this.emitter = new Emitter;
      this.timestamp = new Date();
      this.dismissed = true;
      if (this.isDismissable()) {
        this.dismissed = false;
      }
      this.displayed = false;
    }

    Notification.prototype.onDidDismiss = function(callback) {
      return this.emitter.on('did-dismiss', callback);
    };

    Notification.prototype.onDidDisplay = function(callback) {
      return this.emitter.on('did-display', callback);
    };

    Notification.prototype.getOptions = function() {
      return this.options;
    };

    Notification.prototype.getType = function() {
      return this.type;
    };

    Notification.prototype.getMessage = function() {
      return this.message;
    };

    Notification.prototype.getTimestamp = function() {
      return this.timestamp;
    };

    Notification.prototype.getDetail = function() {
      return this.options.detail;
    };

    Notification.prototype.isEqual = function(other) {
      return this.getMessage() === other.getMessage() && this.getType() === other.getType() && this.getDetail() === other.getDetail();
    };

    Notification.prototype.dismiss = function() {
      if (!(this.isDismissable() && !this.isDismissed())) {
        return;
      }
      this.dismissed = true;
      return this.emitter.emit('did-dismiss', this);
    };

    Notification.prototype.isDismissed = function() {
      return this.dismissed;
    };

    Notification.prototype.isDismissable = function() {
      return !!this.options.dismissable;
    };

    Notification.prototype.wasDisplayed = function() {
      return this.displayed;
    };

    Notification.prototype.setDisplayed = function(displayed) {
      this.displayed = displayed;
      return this.emitter.emit('did-display', this);
    };

    Notification.prototype.getIcon = function() {
      if (this.options.icon != null) {
        return this.options.icon;
      }
      switch (this.type) {
        case 'fatal':
          return 'bug';
        case 'error':
          return 'flame';
        case 'warning':
          return 'alert';
        case 'info':
          return 'info';
        case 'success':
          return 'check';
      }
    };

    return Notification;

  })();

}).call(this);

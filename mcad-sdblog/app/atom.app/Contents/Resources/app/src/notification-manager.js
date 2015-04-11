(function() {
  var Disposable, Emitter, Notification, NotificationManager, _ref;

  _ref = require('event-kit'), Emitter = _ref.Emitter, Disposable = _ref.Disposable;

  Notification = require('../src/notification');

  module.exports = NotificationManager = (function() {
    function NotificationManager() {
      this.notifications = [];
      this.emitter = new Emitter;
    }


    /*
    Section: Events
     */

    NotificationManager.prototype.onDidAddNotification = function(callback) {
      return this.emitter.on('did-add-notification', callback);
    };


    /*
    Section: Adding Notifications
     */

    NotificationManager.prototype.addSuccess = function(message, options) {
      return this.addNotification(new Notification('success', message, options));
    };

    NotificationManager.prototype.addInfo = function(message, options) {
      return this.addNotification(new Notification('info', message, options));
    };

    NotificationManager.prototype.addWarning = function(message, options) {
      return this.addNotification(new Notification('warning', message, options));
    };

    NotificationManager.prototype.addError = function(message, options) {
      return this.addNotification(new Notification('error', message, options));
    };

    NotificationManager.prototype.addFatalError = function(message, options) {
      return this.addNotification(new Notification('fatal', message, options));
    };

    NotificationManager.prototype.add = function(type, message, options) {
      return this.addNotification(new Notification(type, message, options));
    };

    NotificationManager.prototype.addNotification = function(notification) {
      this.notifications.push(notification);
      this.emitter.emit('did-add-notification', notification);
      return notification;
    };


    /*
    Section: Getting Notifications
     */

    NotificationManager.prototype.getNotifications = function() {
      return this.notifications;
    };


    /*
    Section: Managing Notifications
     */

    NotificationManager.prototype.clear = function() {
      return this.notifications = [];
    };

    return NotificationManager;

  })();

}).call(this);

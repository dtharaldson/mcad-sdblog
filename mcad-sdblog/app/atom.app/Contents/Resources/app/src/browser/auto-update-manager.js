(function() {
  var AutoUpdateManager, CheckingState, DownladingState, ErrorState, EventEmitter, IdleState, NoUpdateAvailableState, UnsupportedState, UpdateAvailableState, autoUpdater, path, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __slice = [].slice;

  autoUpdater = null;

  _ = require('underscore-plus');

  EventEmitter = require('events').EventEmitter;

  path = require('path');

  IdleState = 'idle';

  CheckingState = 'checking';

  DownladingState = 'downloading';

  UpdateAvailableState = 'update-available';

  NoUpdateAvailableState = 'no-update-available';

  UnsupportedState = 'unsupported';

  ErrorState = 'error';

  module.exports = AutoUpdateManager = (function() {
    _.extend(AutoUpdateManager.prototype, EventEmitter.prototype);

    function AutoUpdateManager(version) {
      this.version = version;
      this.onUpdateError = __bind(this.onUpdateError, this);
      this.onUpdateNotAvailable = __bind(this.onUpdateNotAvailable, this);
      this.state = IdleState;
      if (process.platform === 'win32') {
        this.feedUrl = 'https://atom.io/api/updates';
      } else {
        this.iconPath = path.resolve(__dirname, '..', '..', 'resources', 'atom.png');
        this.feedUrl = "https://atom.io/api/updates?version=" + this.version;
      }
      process.nextTick((function(_this) {
        return function() {
          return _this.setupAutoUpdater();
        };
      })(this));
    }

    AutoUpdateManager.prototype.setupAutoUpdater = function() {
      if (process.platform === 'win32') {
        autoUpdater = require('./auto-updater-win32');
      } else {
        autoUpdater = require('auto-updater');
      }
      autoUpdater.on('error', (function(_this) {
        return function(event, message) {
          _this.setState(ErrorState);
          return console.error("Error Downloading Update: " + message);
        };
      })(this));
      autoUpdater.setFeedUrl(this.feedUrl);
      autoUpdater.on('checking-for-update', (function(_this) {
        return function() {
          return _this.setState(CheckingState);
        };
      })(this));
      autoUpdater.on('update-not-available', (function(_this) {
        return function() {
          return _this.setState(NoUpdateAvailableState);
        };
      })(this));
      autoUpdater.on('update-available', (function(_this) {
        return function() {
          return _this.setState(DownladingState);
        };
      })(this));
      autoUpdater.on('update-downloaded', (function(_this) {
        return function(event, releaseNotes, releaseVersion) {
          _this.releaseVersion = releaseVersion;
          _this.setState(UpdateAvailableState);
          return _this.emitUpdateAvailableEvent.apply(_this, _this.getWindows());
        };
      })(this));
      if (!/\w{7}/.test(this.version)) {
        this.check({
          hidePopups: true
        });
      }
      switch (process.platform) {
        case 'win32':
          if (!autoUpdater.supportsUpdates()) {
            return this.setState(UnsupportedState);
          }
          break;
        case 'linux':
          return this.setState(UnsupportedState);
      }
    };

    AutoUpdateManager.prototype.emitUpdateAvailableEvent = function() {
      var atomWindow, windows, _i, _len;
      windows = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (this.releaseVersion == null) {
        return;
      }
      for (_i = 0, _len = windows.length; _i < _len; _i++) {
        atomWindow = windows[_i];
        atomWindow.sendMessage('update-available', {
          releaseVersion: this.releaseVersion
        });
      }
    };

    AutoUpdateManager.prototype.setState = function(state) {
      if (this.state === state) {
        return;
      }
      this.state = state;
      return this.emit('state-changed', this.state);
    };

    AutoUpdateManager.prototype.getState = function() {
      return this.state;
    };

    AutoUpdateManager.prototype.check = function(_arg) {
      var hidePopups;
      hidePopups = (_arg != null ? _arg : {}).hidePopups;
      if (!hidePopups) {
        autoUpdater.once('update-not-available', this.onUpdateNotAvailable);
        autoUpdater.once('error', this.onUpdateError);
      }
      return autoUpdater.checkForUpdates();
    };

    AutoUpdateManager.prototype.install = function() {
      return autoUpdater.quitAndInstall();
    };

    AutoUpdateManager.prototype.onUpdateNotAvailable = function() {
      var dialog;
      autoUpdater.removeListener('error', this.onUpdateError);
      dialog = require('dialog');
      return dialog.showMessageBox({
        type: 'info',
        buttons: ['OK'],
        icon: this.iconPath,
        message: 'No update available.',
        title: 'No Update Available',
        detail: "Version " + this.version + " is the latest version."
      });
    };

    AutoUpdateManager.prototype.onUpdateError = function(event, message) {
      var dialog;
      autoUpdater.removeListener('update-not-available', this.onUpdateNotAvailable);
      dialog = require('dialog');
      return dialog.showMessageBox({
        type: 'warning',
        buttons: ['OK'],
        icon: this.iconPath,
        message: 'There was an error checking for updates.',
        title: 'Update Error',
        detail: message
      });
    };

    AutoUpdateManager.prototype.getWindows = function() {
      return global.atomApplication.windows;
    };

    return AutoUpdateManager;

  })();

}).call(this);

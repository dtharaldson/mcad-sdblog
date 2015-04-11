(function() {
  var AutoUpdater, EventEmitter, SquirrelUpdate, _;

  EventEmitter = require('events').EventEmitter;

  _ = require('underscore-plus');

  SquirrelUpdate = require('./squirrel-update');

  AutoUpdater = (function() {
    function AutoUpdater() {}

    _.extend(AutoUpdater.prototype, EventEmitter.prototype);

    AutoUpdater.prototype.setFeedUrl = function(updateUrl) {
      this.updateUrl = updateUrl;
    };

    AutoUpdater.prototype.quitAndInstall = function() {
      if (SquirrelUpdate.existsSync()) {
        return SquirrelUpdate.restartAtom(require('app'));
      } else {
        return require('auto-updater').quitAndInstall();
      }
    };

    AutoUpdater.prototype.downloadUpdate = function(callback) {
      return SquirrelUpdate.spawn(['--download', this.updateUrl], function(error, stdout) {
        var json, update, _ref, _ref1;
        if (error != null) {
          return callback(error);
        }
        try {
          json = stdout.trim().split('\n').pop();
          update = (_ref = JSON.parse(json)) != null ? (_ref1 = _ref.releasesToApply) != null ? typeof _ref1.pop === "function" ? _ref1.pop() : void 0 : void 0 : void 0;
        } catch (_error) {
          error = _error;
          error.stdout = stdout;
          return callback(error);
        }
        return callback(null, update);
      });
    };

    AutoUpdater.prototype.installUpdate = function(callback) {
      return SquirrelUpdate.spawn(['--update', this.updateUrl], callback);
    };

    AutoUpdater.prototype.supportsUpdates = function() {
      return SquirrelUpdate.existsSync();
    };

    AutoUpdater.prototype.checkForUpdates = function() {
      if (!this.updateUrl) {
        throw new Error('Update URL is not set');
      }
      this.emit('checking-for-update');
      if (!SquirrelUpdate.existsSync()) {
        this.emit('update-not-available');
        return;
      }
      return this.downloadUpdate((function(_this) {
        return function(error, update) {
          if (error != null) {
            _this.emit('update-not-available');
            return;
          }
          if (update == null) {
            _this.emit('update-not-available');
            return;
          }
          return _this.installUpdate(function(error) {
            if (error != null) {
              _this.emit('update-not-available');
              return;
            }
            _this.emit('update-available');
            return _this.emit('update-downloaded', {}, update.releaseNotes, update.version, new Date(), 'https://atom.io', function() {
              return _this.quitAndInstall();
            });
          });
        };
      })(this));
    };

    return AutoUpdater;

  })();

  module.exports = new AutoUpdater();

}).call(this);

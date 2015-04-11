(function() {
  var CSON, Grim, KeymapManager, fs, jQuery, path;

  fs = require('fs-plus');

  path = require('path');

  KeymapManager = require('atom-keymap');

  CSON = require('season');

  jQuery = require('space-pen').jQuery;

  Grim = require('grim');

  KeymapManager.prototype.onDidLoadBundledKeymaps = function(callback) {
    return this.emitter.on('did-load-bundled-keymaps', callback);
  };

  KeymapManager.prototype.loadBundledKeymaps = function() {
    this.loadKeymap(path.join(this.resourcePath, 'keymaps'));
    if (Grim.includeDeprecatedAPIs) {
      this.emit('bundled-keymaps-loaded');
    }
    return this.emitter.emit('did-load-bundled-keymaps');
  };

  KeymapManager.prototype.getUserKeymapPath = function() {
    var userKeymapPath;
    if (userKeymapPath = CSON.resolve(path.join(this.configDirPath, 'keymap'))) {
      return userKeymapPath;
    } else {
      return path.join(this.configDirPath, 'keymap.cson');
    }
  };

  KeymapManager.prototype.loadUserKeymap = function() {
    var detail, error, message, stack, userKeymapPath;
    userKeymapPath = this.getUserKeymapPath();
    if (!fs.isFileSync(userKeymapPath)) {
      return;
    }
    try {
      return this.loadKeymap(userKeymapPath, {
        watch: true,
        suppressErrors: true
      });
    } catch (_error) {
      error = _error;
      if (error.message.indexOf('Unable to watch path') > -1) {
        message = "Unable to watch path: `" + (path.basename(userKeymapPath)) + "`. Make sure you\nhave permission to read `" + userKeymapPath + "`.\n\nOn linux there are currently problems with watch sizes. See\n[this document][watches] for more info.\n[watches]:https://github.com/atom/atom/blob/master/docs/build-instructions/linux.md#typeerror-unable-to-watch-path";
        return atom.notifications.addError(message, {
          dismissable: true
        });
      } else {
        detail = error.path;
        stack = error.stack;
        return atom.notifications.addFatalError(error.message, {
          detail: detail,
          stack: stack,
          dismissable: true
        });
      }
    }
  };

  KeymapManager.prototype.subscribeToFileReadFailure = function() {
    return this.onDidFailToReadFile((function(_this) {
      return function(error) {
        var detail, message, userKeymapPath;
        userKeymapPath = _this.getUserKeymapPath();
        message = "Failed to load `" + userKeymapPath + "`";
        detail = error.location != null ? error.stack : error.message;
        return atom.notifications.addError(message, {
          detail: detail,
          dismissable: true
        });
      };
    })(this));
  };

  jQuery.Event.prototype.abortKeyBinding = function() {
    var _ref;
    return (_ref = this.originalEvent) != null ? typeof _ref.abortKeyBinding === "function" ? _ref.abortKeyBinding() : void 0 : void 0;
  };

  module.exports = KeymapManager;

}).call(this);

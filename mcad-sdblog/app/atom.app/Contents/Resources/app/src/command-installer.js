(function() {
  var async, fs, path, runas, symlinkCommand, symlinkCommandWithPrivilegeSync, _;

  path = require('path');

  _ = require('underscore-plus');

  async = require('async');

  fs = require('fs-plus');

  runas = null;

  symlinkCommand = function(sourcePath, destinationPath, callback) {
    return fs.unlink(destinationPath, function(error) {
      if ((error != null) && (error != null ? error.code : void 0) !== 'ENOENT') {
        return callback(error);
      } else {
        return fs.makeTree(path.dirname(destinationPath), function(error) {
          if (error != null) {
            return callback(error);
          } else {
            return fs.symlink(sourcePath, destinationPath, callback);
          }
        });
      }
    });
  };

  symlinkCommandWithPrivilegeSync = function(sourcePath, destinationPath) {
    if (runas == null) {
      runas = require('runas');
    }
    if (runas('/bin/rm', ['-f', destinationPath], {
      admin: true
    }) !== 0) {
      throw new Error("Failed to remove '" + destinationPath + "'");
    }
    if (runas('/bin/mkdir', ['-p', path.dirname(destinationPath)], {
      admin: true
    }) !== 0) {
      throw new Error("Failed to create directory '" + destinationPath + "'");
    }
    if (runas('/bin/ln', ['-s', sourcePath, destinationPath], {
      admin: true
    }) !== 0) {
      throw new Error("Failed to symlink '" + sourcePath + "' to '" + destinationPath + "'");
    }
  };

  module.exports = {
    getInstallDirectory: function() {
      return "/usr/local/bin";
    },
    installShellCommandsInteractively: function() {
      var resourcePath, showErrorDialog;
      showErrorDialog = function(error) {
        return atom.confirm({
          message: "Failed to install shell commands",
          detailedMessage: error.message
        });
      };
      resourcePath = atom.getLoadSettings().resourcePath;
      return this.installAtomCommand(resourcePath, true, (function(_this) {
        return function(error) {
          if (error != null) {
            return showErrorDialog(error);
          } else {
            return _this.installApmCommand(resourcePath, true, function(error) {
              if (error != null) {
                return showErrorDialog(error);
              } else {
                return atom.confirm({
                  message: "Commands installed.",
                  detailedMessage: "The shell commands `atom` and `apm` are installed."
                });
              }
            });
          }
        };
      })(this));
    },
    installAtomCommand: function(resourcePath, askForPrivilege, callback) {
      var commandPath;
      commandPath = path.join(resourcePath, 'atom.sh');
      return this.createSymlink(commandPath, askForPrivilege, callback);
    },
    installApmCommand: function(resourcePath, askForPrivilege, callback) {
      var commandPath;
      commandPath = path.join(resourcePath, 'apm', 'node_modules', '.bin', 'apm');
      return this.createSymlink(commandPath, askForPrivilege, callback);
    },
    createSymlink: function(commandPath, askForPrivilege, callback) {
      var commandName, destinationPath;
      if (process.platform !== 'darwin') {
        return;
      }
      commandName = path.basename(commandPath, path.extname(commandPath));
      destinationPath = path.join(this.getInstallDirectory(), commandName);
      return fs.readlink(destinationPath, function(error, realpath) {
        if (realpath === commandPath) {
          callback();
          return;
        }
        return symlinkCommand(commandPath, destinationPath, function(error) {
          if (askForPrivilege && (error != null ? error.code : void 0) === 'EACCES') {
            try {
              error = null;
              symlinkCommandWithPrivilegeSync(commandPath, destinationPath);
            } catch (_error) {
              error = _error;
            }
          }
          return typeof callback === "function" ? callback(error) : void 0;
        });
      });
    }
  };

}).call(this);

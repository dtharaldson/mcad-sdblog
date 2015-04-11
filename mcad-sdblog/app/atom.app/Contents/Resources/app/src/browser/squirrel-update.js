(function() {
  var ChildProcess, addCommandsToPath, appFolder, backgroundKeyPath, binFolder, createShortcuts, directoryKeyPath, environmentKeyPath, exeName, fileKeyPath, fs, getPath, installContextMenu, isAscii, path, regPath, removeCommandsFromPath, removeShortcuts, rootAtomFolder, setxPath, spawn, spawnReg, spawnSetx, spawnUpdate, system32Path, uninstallContextMenu, updateDotExe, updateShortcuts;

  ChildProcess = require('child_process');

  fs = require('fs-plus');

  path = require('path');

  appFolder = path.resolve(process.execPath, '..');

  rootAtomFolder = path.resolve(appFolder, '..');

  binFolder = path.join(rootAtomFolder, 'bin');

  updateDotExe = path.join(rootAtomFolder, 'Update.exe');

  exeName = path.basename(process.execPath);

  if (process.env.SystemRoot) {
    system32Path = path.join(process.env.SystemRoot, 'System32');
    regPath = path.join(system32Path, 'reg.exe');
    setxPath = path.join(system32Path, 'setx.exe');
  } else {
    regPath = 'reg.exe';
    setxPath = 'setx.exe';
  }

  fileKeyPath = 'HKCU\\Software\\Classes\\*\\shell\\Atom';

  directoryKeyPath = 'HKCU\\Software\\Classes\\directory\\shell\\Atom';

  backgroundKeyPath = 'HKCU\\Software\\Classes\\directory\\background\\shell\\Atom';

  environmentKeyPath = 'HKCU\\Environment';

  spawn = function(command, args, callback) {
    var error, spawnedProcess, stdout;
    stdout = '';
    try {
      spawnedProcess = ChildProcess.spawn(command, args);
    } catch (_error) {
      error = _error;
      process.nextTick(function() {
        return typeof callback === "function" ? callback(error, stdout) : void 0;
      });
      return;
    }
    spawnedProcess.stdout.on('data', function(data) {
      return stdout += data;
    });
    error = null;
    spawnedProcess.on('error', function(processError) {
      return error != null ? error : error = processError;
    });
    return spawnedProcess.on('close', function(code, signal) {
      if (code !== 0) {
        if (error == null) {
          error = new Error("Command failed: " + (signal != null ? signal : code));
        }
      }
      if (error != null) {
        if (error.code == null) {
          error.code = code;
        }
      }
      if (error != null) {
        if (error.stdout == null) {
          error.stdout = stdout;
        }
      }
      return typeof callback === "function" ? callback(error, stdout) : void 0;
    });
  };

  spawnReg = function(args, callback) {
    return spawn(regPath, args, callback);
  };

  spawnSetx = function(args, callback) {
    return spawn(setxPath, args, callback);
  };

  spawnUpdate = function(args, callback) {
    return spawn(updateDotExe, args, callback);
  };

  installContextMenu = function(callback) {
    var addToRegistry, installMenu;
    addToRegistry = function(args, callback) {
      args.unshift('add');
      args.push('/f');
      return spawnReg(args, callback);
    };
    installMenu = function(keyPath, arg, callback) {
      var args;
      args = [keyPath, '/ve', '/d', 'Open with Atom'];
      return addToRegistry(args, function() {
        args = [keyPath, '/v', 'Icon', '/d', process.execPath];
        return addToRegistry(args, function() {
          args = ["" + keyPath + "\\command", '/ve', '/d', "" + process.execPath + " \"" + arg + "\""];
          return addToRegistry(args, callback);
        });
      });
    };
    return installMenu(fileKeyPath, '%1', function() {
      return installMenu(directoryKeyPath, '%1', function() {
        return installMenu(backgroundKeyPath, '%V', callback);
      });
    });
  };

  isAscii = function(text) {
    var index;
    index = 0;
    while (index < text.length) {
      if (text.charCodeAt(index) > 127) {
        return false;
      }
      index++;
    }
    return true;
  };

  getPath = function(callback) {
    return spawnReg(['query', environmentKeyPath, '/v', 'Path'], function(error, stdout) {
      var lines, pathEnv, segments, _ref;
      if (error != null) {
        if (error.code === 1) {
          if (stdout.indexOf('ERROR: Registry editing has been disabled by your administrator.') !== -1) {
            return callback(error);
          }
          return callback(null, '');
        } else {
          return callback(error);
        }
      }
      lines = stdout.split(/[\r\n]+/).filter(function(line) {
        return line;
      });
      segments = (_ref = lines[lines.length - 1]) != null ? _ref.split('    ') : void 0;
      if (segments[1] === 'Path' && segments.length >= 3) {
        pathEnv = segments != null ? segments.slice(3).join('    ') : void 0;
        if (isAscii(pathEnv)) {
          return callback(null, pathEnv);
        } else {
          return callback(new Error('PATH contains non-ASCII values'));
        }
      } else {
        return callback(new Error('Registry query for PATH failed'));
      }
    });
  };

  uninstallContextMenu = function(callback) {
    var deleteFromRegistry;
    deleteFromRegistry = function(keyPath, callback) {
      return spawnReg(['delete', keyPath, '/f'], callback);
    };
    return deleteFromRegistry(fileKeyPath, function() {
      return deleteFromRegistry(directoryKeyPath, function() {
        return deleteFromRegistry(backgroundKeyPath, callback);
      });
    });
  };

  addCommandsToPath = function(callback) {
    var addBinToPath, installCommands;
    installCommands = function(callback) {
      var apmCommand, apmCommandPath, apmShCommand, apmShCommandPath, atomCommand, atomCommandPath, atomShCommand, atomShCommandPath, relativeApmPath, relativeApmShPath, relativeAtomPath, relativeAtomShPath;
      atomCommandPath = path.join(binFolder, 'atom.cmd');
      relativeAtomPath = path.relative(binFolder, path.join(appFolder, 'resources', 'cli', 'atom.cmd'));
      atomCommand = "@echo off\r\n\"%~dp0\\" + relativeAtomPath + "\" %*";
      atomShCommandPath = path.join(binFolder, 'atom');
      relativeAtomShPath = path.relative(binFolder, path.join(appFolder, 'resources', 'cli', 'atom.sh'));
      atomShCommand = "#!/bin/sh\r\n\"$0/../" + (relativeAtomShPath.replace(/\\/g, '/')) + "\" \"$@\"";
      apmCommandPath = path.join(binFolder, 'apm.cmd');
      relativeApmPath = path.relative(binFolder, path.join(process.resourcesPath, 'app', 'apm', 'bin', 'apm.cmd'));
      apmCommand = "@echo off\r\n\"%~dp0\\" + relativeApmPath + "\" %*";
      apmShCommandPath = path.join(binFolder, 'apm');
      relativeApmShPath = path.relative(binFolder, path.join(appFolder, 'resources', 'cli', 'apm.sh'));
      apmShCommand = "#!/bin/sh\r\n\"$0/../" + (relativeApmShPath.replace(/\\/g, '/')) + "\" \"$@\"";
      return fs.writeFile(atomCommandPath, atomCommand, function() {
        return fs.writeFile(atomShCommandPath, atomShCommand, function() {
          return fs.writeFile(apmCommandPath, apmCommand, function() {
            return fs.writeFile(apmShCommandPath, apmShCommand, function() {
              return callback();
            });
          });
        });
      });
    };
    addBinToPath = function(pathSegments, callback) {
      var newPathEnv;
      pathSegments.push(binFolder);
      newPathEnv = pathSegments.join(';');
      return spawnSetx(['Path', newPathEnv], callback);
    };
    return installCommands(function(error) {
      if (error != null) {
        return callback(error);
      }
      return getPath(function(error, pathEnv) {
        var pathSegments;
        if (error != null) {
          return callback(error);
        }
        pathSegments = pathEnv.split(/;+/).filter(function(pathSegment) {
          return pathSegment;
        });
        if (pathSegments.indexOf(binFolder) === -1) {
          return addBinToPath(pathSegments, callback);
        } else {
          return callback();
        }
      });
    });
  };

  removeCommandsFromPath = function(callback) {
    return getPath(function(error, pathEnv) {
      var newPathEnv, pathSegments;
      if (error != null) {
        return callback(error);
      }
      pathSegments = pathEnv.split(/;+/).filter(function(pathSegment) {
        return pathSegment && pathSegment !== binFolder;
      });
      newPathEnv = pathSegments.join(';');
      if (pathEnv !== newPathEnv) {
        return spawnSetx(['Path', newPathEnv], callback);
      } else {
        return callback();
      }
    });
  };

  createShortcuts = function(callback) {
    return spawnUpdate(['--createShortcut', exeName], callback);
  };

  updateShortcuts = function(callback) {
    var desktopShortcutPath, homeDirectory;
    if (homeDirectory = fs.getHomeDirectory()) {
      desktopShortcutPath = path.join(homeDirectory, 'Desktop', 'Atom.lnk');
      return fs.exists(desktopShortcutPath, function(desktopShortcutExists) {
        return createShortcuts(function() {
          if (desktopShortcutExists) {
            return callback();
          } else {
            return fs.unlink(desktopShortcutPath, callback);
          }
        });
      });
    } else {
      return createShortcuts(callback);
    }
  };

  removeShortcuts = function(callback) {
    return spawnUpdate(['--removeShortcut', exeName], callback);
  };

  exports.spawn = spawnUpdate;

  exports.existsSync = function() {
    return fs.existsSync(updateDotExe);
  };

  exports.restartAtom = function(app) {
    var args, projectPath, _ref, _ref1;
    if (projectPath = (_ref = global.atomApplication) != null ? (_ref1 = _ref.lastFocusedWindow) != null ? _ref1.projectPath : void 0 : void 0) {
      args = [projectPath];
    }
    app.once('will-quit', function() {
      return spawn(path.join(binFolder, 'atom.cmd'), args);
    });
    return app.quit();
  };

  exports.handleStartupEvent = function(app, squirrelCommand) {
    switch (squirrelCommand) {
      case '--squirrel-install':
        createShortcuts(function() {
          return installContextMenu(function() {
            return addCommandsToPath(function() {
              return app.quit();
            });
          });
        });
        return true;
      case '--squirrel-updated':
        updateShortcuts(function() {
          return installContextMenu(function() {
            return addCommandsToPath(function() {
              return app.quit();
            });
          });
        });
        return true;
      case '--squirrel-uninstall':
        removeShortcuts(function() {
          return uninstallContextMenu(function() {
            return removeCommandsFromPath(function() {
              return app.quit();
            });
          });
        });
        return true;
      case '--squirrel-obsolete':
        app.quit();
        return true;
      default:
        return false;
    }
  };

}).call(this);

(function() {
  var app, crashReporter, fs, nslog, optimist, parseCommandLine, path, setupAtomHome, setupCoffeeCache, setupCrashReporter, start, _ref;

  global.shellStartTime = Date.now();

  crashReporter = require('crash-reporter');

  app = require('app');

  fs = require('fs-plus');

  path = require('path');

  optimist = require('optimist');

  nslog = require('nslog');

  console.log = nslog;

  process.on('uncaughtException', function(error) {
    if (error == null) {
      error = {};
    }
    if (error.message != null) {
      nslog(error.message);
    }
    if (error.stack != null) {
      return nslog(error.stack);
    }
  });

  start = function() {
    var SquirrelUpdate, addPathToOpen, addUrlToOpen, args, squirrelCommand;
    setupAtomHome();
    setupCoffeeCache();
    if (process.platform === 'win32') {
      SquirrelUpdate = require('./squirrel-update');
      squirrelCommand = process.argv[1];
      if (SquirrelUpdate.handleStartupEvent(app, squirrelCommand)) {
        return;
      }
    }
    args = parseCommandLine();
    addPathToOpen = function(event, pathToOpen) {
      event.preventDefault();
      return args.pathsToOpen.push(pathToOpen);
    };
    args.urlsToOpen = [];
    addUrlToOpen = function(event, urlToOpen) {
      event.preventDefault();
      return args.urlsToOpen.push(urlToOpen);
    };
    app.on('open-file', addPathToOpen);
    app.on('open-url', addUrlToOpen);
    app.on('will-finish-launching', function() {
      return setupCrashReporter();
    });
    return app.on('ready', function() {
      var AtomApplication, cwd, _ref;
      app.removeListener('open-file', addPathToOpen);
      app.removeListener('open-url', addUrlToOpen);
      cwd = ((_ref = args.executedFrom) != null ? _ref.toString() : void 0) || process.cwd();
      args.pathsToOpen = args.pathsToOpen.map(function(pathToOpen) {
        pathToOpen = fs.normalize(pathToOpen);
        if (cwd) {
          return path.resolve(cwd, pathToOpen);
        } else {
          return path.resolve(pathToOpen);
        }
      });
      if (args.devMode) {
        AtomApplication = require(path.join(args.resourcePath, 'src', 'browser', 'atom-application'));
      } else {
        AtomApplication = require('./atom-application');
      }
      AtomApplication.open(args);
      if (!args.test) {
        return console.log("App load time: " + (Date.now() - global.shellStartTime) + "ms");
      }
    });
  };

  global.devResourcePath = (_ref = process.env.ATOM_DEV_RESOURCE_PATH) != null ? _ref : path.join(app.getHomeDir(), 'github', 'atom');

  if (global.devResourcePath) {
    global.devResourcePath = path.normalize(global.devResourcePath);
  }

  setupCrashReporter = function() {
    return crashReporter.start({
      productName: 'Atom',
      companyName: 'GitHub'
    });
  };

  setupAtomHome = function() {
    var atomHome;
    if (process.env.ATOM_HOME) {
      return;
    }
    atomHome = path.join(app.getHomeDir(), '.atom');
    try {
      atomHome = fs.realpathSync(atomHome);
    } catch (_error) {}
    return process.env.ATOM_HOME = atomHome;
  };

  setupCoffeeCache = function() {
    var CoffeeCache, cacheDir;
    CoffeeCache = require('coffee-cash');
    cacheDir = path.join(process.env.ATOM_HOME, 'compile-cache');
    if (process.env.USER === 'root' && process.env.SUDO_USER && process.env.SUDO_USER !== process.env.USER) {
      cacheDir = path.join(cacheDir, 'root');
    }
    CoffeeCache.setCacheDirectory(path.join(cacheDir, 'coffee'));
    return CoffeeCache.register();
  };

  parseCommandLine = function() {
    var apiPreviewMode, args, devMode, executedFrom, logFile, newWindow, options, packageDirectoryPath, packageManifest, packageManifestPath, pathsToOpen, pidToKillWhenClosed, resourcePath, safeMode, socketPath, specDirectory, test, version;
    version = app.getVersion();
    options = optimist(process.argv.slice(1));
    options.usage("Atom Editor v" + version + "\n\nUsage: atom [options] [path ...]\n\nOne or more paths to files or folders to open may be specified.\n\nFile paths will open in the current window.\n\nFolder paths will open in an existing window if that folder has already been\nopened or a new window if it hasn't.\n\nEnvironment Variables:\n\n  ATOM_DEV_RESOURCE_PATH  The path from which Atom loads source code in dev mode.\n                          Defaults to `~/github/atom`.\n\n  ATOM_HOME               The root path for all configuration files and folders.\n                          Defaults to `~/.atom`.");
    options.alias('1', 'one').boolean('1').describe('1', 'Run in 1.0 API preview mode.');
    options.alias('d', 'dev').boolean('d').describe('d', 'Run in development mode.');
    options.alias('f', 'foreground').boolean('f').describe('f', 'Keep the browser process in the foreground.');
    options.alias('h', 'help').boolean('h').describe('h', 'Print this usage message.');
    options.alias('l', 'log-file').string('l').describe('l', 'Log all output to file.');
    options.alias('n', 'new-window').boolean('n').describe('n', 'Open a new window.');
    options.alias('r', 'resource-path').string('r').describe('r', 'Set the path to the Atom source directory and enable dev-mode.');
    options.alias('s', 'spec-directory').string('s').describe('s', 'Set the directory from which to run package specs (default: Atom\'s spec directory).');
    options.boolean('safe').describe('safe', 'Do not load packages from ~/.atom/packages or ~/.atom/dev/packages.');
    options.alias('t', 'test').boolean('t').describe('t', 'Run the specified specs and exit with error code on failures.');
    options.alias('v', 'version').boolean('v').describe('v', 'Print the version.');
    options.alias('w', 'wait').boolean('w').describe('w', 'Wait for window to be closed before returning.');
    options.string('socket-path');
    args = options.argv;
    if (args.help) {
      process.stdout.write(options.help());
      process.exit(0);
    }
    if (args.version) {
      process.stdout.write("" + version + "\n");
      process.exit(0);
    }
    executedFrom = args['executed-from'];
    devMode = args['dev'];
    safeMode = args['safe'];
    apiPreviewMode = args['one'];
    pathsToOpen = args._;
    if (executedFrom && pathsToOpen.length === 0) {
      pathsToOpen = [executedFrom];
    }
    test = args['test'];
    specDirectory = args['spec-directory'];
    newWindow = args['new-window'];
    if (args['wait']) {
      pidToKillWhenClosed = args['pid'];
    }
    logFile = args['log-file'];
    socketPath = args['socket-path'];
    if (args['resource-path']) {
      devMode = true;
      resourcePath = args['resource-path'];
    } else {
      if (specDirectory != null) {
        packageDirectoryPath = path.join(specDirectory, '..');
        packageManifestPath = path.join(packageDirectoryPath, 'package.json');
        if (fs.statSyncNoException(packageManifestPath)) {
          try {
            packageManifest = JSON.parse(fs.readFileSync(packageManifestPath));
            if (packageManifest.name === 'atom') {
              resourcePath = packageDirectoryPath;
            }
          } catch (_error) {}
        }
      }
      if (devMode) {
        if (resourcePath == null) {
          resourcePath = global.devResourcePath;
        }
      }
    }
    if (!fs.statSyncNoException(resourcePath)) {
      resourcePath = path.dirname(path.dirname(__dirname));
    }
    if (args['path-environment']) {
      process.env.PATH = args['path-environment'];
    }
    return {
      resourcePath: resourcePath,
      pathsToOpen: pathsToOpen,
      executedFrom: executedFrom,
      test: test,
      version: version,
      pidToKillWhenClosed: pidToKillWhenClosed,
      devMode: devMode,
      apiPreviewMode: apiPreviewMode,
      safeMode: safeMode,
      newWindow: newWindow,
      specDirectory: specDirectory,
      logFile: logFile,
      socketPath: socketPath
    };
  };

  start();

}).call(this);

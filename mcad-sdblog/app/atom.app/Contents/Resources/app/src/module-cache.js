(function() {
  var Module, Range, cache, isAbsolute, isCorePath, loadDependencies, loadExtensions, loadFolderCompatibility, nativeModules, originalFindPath, originalLoad, originalRequire, path, registerBuiltins, resolveFilePath, resolveModulePath, satisfies, semver,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Module = require('module');

  path = require('path');

  semver = require('semver');

  Range = (function(_super) {
    __extends(Range, _super);

    function Range() {
      Range.__super__.constructor.apply(this, arguments);
      this.matchedVersions = new Set();
      this.unmatchedVersions = new Set();
    }

    Range.prototype.test = function(version) {
      var matches;
      if (this.matchedVersions.has(version)) {
        return true;
      }
      if (this.unmatchedVersions.has(version)) {
        return false;
      }
      matches = Range.__super__.test.apply(this, arguments);
      if (matches) {
        this.matchedVersions.add(version);
      } else {
        this.unmatchedVersions.add(version);
      }
      return matches;
    };

    return Range;

  })(semver.Range);

  nativeModules = process.binding('natives');

  cache = {
    builtins: {},
    debug: false,
    dependencies: {},
    extensions: {},
    folders: {},
    ranges: {},
    registered: false,
    resourcePath: null,
    resourcePathWithTrailingSlash: null
  };

  if (process.platform === 'win32') {
    isAbsolute = function(pathToCheck) {
      return pathToCheck && (pathToCheck[1] === ':' || (pathToCheck[0] === '\\' && pathToCheck[1] === '\\'));
    };
  } else {
    isAbsolute = function(pathToCheck) {
      return pathToCheck && pathToCheck[0] === '/';
    };
  }

  isCorePath = function(pathToCheck) {
    return pathToCheck.startsWith(cache.resourcePathWithTrailingSlash);
  };

  loadDependencies = function(modulePath, rootPath, rootMetadata, moduleCache) {
    var childMetadata, childMetadataPath, childPath, error, fs, mainPath, _i, _len, _ref, _ref1;
    fs = require('fs-plus');
    _ref = fs.listSync(path.join(modulePath, 'node_modules'));
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      childPath = _ref[_i];
      if (path.basename(childPath) === '.bin') {
        continue;
      }
      if (rootPath === modulePath && ((_ref1 = rootMetadata.packageDependencies) != null ? _ref1.hasOwnProperty(path.basename(childPath)) : void 0)) {
        continue;
      }
      childMetadataPath = path.join(childPath, 'package.json');
      if (!fs.isFileSync(childMetadataPath)) {
        continue;
      }
      childMetadata = JSON.parse(fs.readFileSync(childMetadataPath));
      if (childMetadata != null ? childMetadata.version : void 0) {
        try {
          mainPath = require.resolve(childPath);
        } catch (_error) {
          error = _error;
          mainPath = null;
        }
        if (mainPath) {
          moduleCache.dependencies.push({
            name: childMetadata.name,
            version: childMetadata.version,
            path: path.relative(rootPath, mainPath)
          });
        }
        loadDependencies(childPath, rootPath, rootMetadata, moduleCache);
      }
    }
  };

  loadFolderCompatibility = function(modulePath, rootPath, rootMetadata, moduleCache) {
    var childPath, dependencies, error, extensions, fs, metadataPath, name, onDirectory, onFile, paths, version, _i, _len, _ref, _ref1, _ref2, _ref3;
    fs = require('fs-plus');
    metadataPath = path.join(modulePath, 'package.json');
    if (!fs.isFileSync(metadataPath)) {
      return;
    }
    dependencies = (_ref = (_ref1 = JSON.parse(fs.readFileSync(metadataPath))) != null ? _ref1.dependencies : void 0) != null ? _ref : {};
    for (name in dependencies) {
      version = dependencies[name];
      try {
        new Range(version);
      } catch (_error) {
        error = _error;
        delete dependencies[name];
      }
    }
    onDirectory = function(childPath) {
      return path.basename(childPath) !== 'node_modules';
    };
    extensions = ['.js', '.coffee', '.json', '.node'];
    paths = {};
    onFile = function(childPath) {
      var relativePath, _ref2;
      if (_ref2 = path.extname(childPath), __indexOf.call(extensions, _ref2) >= 0) {
        relativePath = path.relative(rootPath, path.dirname(childPath));
        return paths[relativePath] = true;
      }
    };
    fs.traverseTreeSync(modulePath, onFile, onDirectory);
    paths = Object.keys(paths);
    if (paths.length > 0 && Object.keys(dependencies).length > 0) {
      moduleCache.folders.push({
        paths: paths,
        dependencies: dependencies
      });
    }
    _ref2 = fs.listSync(path.join(modulePath, 'node_modules'));
    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
      childPath = _ref2[_i];
      if (path.basename(childPath) === '.bin') {
        continue;
      }
      if (rootPath === modulePath && ((_ref3 = rootMetadata.packageDependencies) != null ? _ref3.hasOwnProperty(path.basename(childPath)) : void 0)) {
        continue;
      }
      loadFolderCompatibility(childPath, rootPath, rootMetadata, moduleCache);
    }
  };

  loadExtensions = function(modulePath, rootPath, rootMetadata, moduleCache) {
    var extensions, fs, nodeModulesPath, onDirectory, onFile;
    fs = require('fs-plus');
    extensions = ['.js', '.coffee', '.json', '.node'];
    nodeModulesPath = path.join(rootPath, 'node_modules');
    onFile = function(filePath) {
      var extension, segments, _base, _ref;
      filePath = path.relative(rootPath, filePath);
      segments = filePath.split(path.sep);
      if (__indexOf.call(segments, 'test') >= 0) {
        return;
      }
      if (__indexOf.call(segments, 'tests') >= 0) {
        return;
      }
      if (__indexOf.call(segments, 'spec') >= 0) {
        return;
      }
      if (__indexOf.call(segments, 'specs') >= 0) {
        return;
      }
      if (segments.length > 1 && !((_ref = segments[0]) === 'exports' || _ref === 'lib' || _ref === 'node_modules' || _ref === 'src' || _ref === 'static' || _ref === 'vendor')) {
        return;
      }
      extension = path.extname(filePath);
      if (__indexOf.call(extensions, extension) >= 0) {
        if ((_base = moduleCache.extensions)[extension] == null) {
          _base[extension] = [];
        }
        return moduleCache.extensions[extension].push(filePath);
      }
    };
    onDirectory = function(childPath) {
      var packageName, parentPath, _ref;
      if (rootMetadata.name === 'atom') {
        parentPath = path.dirname(childPath);
        if (parentPath === nodeModulesPath) {
          packageName = path.basename(childPath);
          if ((_ref = rootMetadata.packageDependencies) != null ? _ref.hasOwnProperty(packageName) : void 0) {
            return false;
          }
        }
      }
      return true;
    };
    fs.traverseTreeSync(rootPath, onFile, onDirectory);
  };

  satisfies = function(version, rawRange) {
    var parsedRange;
    if (!(parsedRange = cache.ranges[rawRange])) {
      parsedRange = new Range(rawRange);
      cache.ranges[rawRange] = parsedRange;
    }
    return parsedRange.test(version);
  };

  resolveFilePath = function(relativePath, parentModule) {
    var extension, paths, resolvedPath, resolvedPathWithExtension, _ref, _ref1;
    if (!relativePath) {
      return;
    }
    if (!(parentModule != null ? parentModule.filename : void 0)) {
      return;
    }
    if (!(relativePath[0] === '.' || isAbsolute(relativePath))) {
      return;
    }
    resolvedPath = path.resolve(path.dirname(parentModule.filename), relativePath);
    if (!isCorePath(resolvedPath)) {
      return;
    }
    extension = path.extname(resolvedPath);
    if (extension) {
      if ((_ref = cache.extensions[extension]) != null ? _ref.has(resolvedPath) : void 0) {
        return resolvedPath;
      }
    } else {
      _ref1 = cache.extensions;
      for (extension in _ref1) {
        paths = _ref1[extension];
        resolvedPathWithExtension = "" + resolvedPath + extension;
        if (paths.has(resolvedPathWithExtension)) {
          return resolvedPathWithExtension;
        }
      }
    }
  };

  resolveModulePath = function(relativePath, parentModule) {
    var builtinPath, candidates, folderPath, range, resolvedPath, version, _ref;
    if (!relativePath) {
      return;
    }
    if (!(parentModule != null ? parentModule.filename : void 0)) {
      return;
    }
    if (nativeModules.hasOwnProperty(relativePath)) {
      return;
    }
    if (relativePath[0] === '.') {
      return;
    }
    if (isAbsolute(relativePath)) {
      return;
    }
    folderPath = path.dirname(parentModule.filename);
    range = (_ref = cache.folders[folderPath]) != null ? _ref[relativePath] : void 0;
    if (range == null) {
      if (builtinPath = cache.builtins[relativePath]) {
        return builtinPath;
      } else {
        return;
      }
    }
    candidates = cache.dependencies[relativePath];
    if (candidates == null) {
      return;
    }
    for (version in candidates) {
      resolvedPath = candidates[version];
      if (Module._cache.hasOwnProperty(resolvedPath) || isCorePath(resolvedPath)) {
        if (satisfies(version, range)) {
          return resolvedPath;
        }
      }
    }
  };

  registerBuiltins = function(devMode) {
    var atomCoffeePath, atomShellRoot, builtin, commonBuiltins, commonRoot, fs, rendererBuiltins, rendererRoot, _base, _i, _j, _len, _len1, _results;
    if (devMode || !cache.resourcePath.startsWith("" + process.resourcesPath + path.sep)) {
      fs = require('fs-plus');
      atomCoffeePath = path.join(cache.resourcePath, 'exports', 'atom.coffee');
      if (fs.isFileSync(atomCoffeePath)) {
        cache.builtins.atom = atomCoffeePath;
      }
    }
    if ((_base = cache.builtins).atom == null) {
      _base.atom = path.join(cache.resourcePath, 'exports', 'atom.js');
    }
    atomShellRoot = path.join(process.resourcesPath, 'atom.asar');
    commonRoot = path.join(atomShellRoot, 'common', 'api', 'lib');
    commonBuiltins = ['callbacks-registry', 'clipboard', 'crash-reporter', 'screen', 'shell'];
    for (_i = 0, _len = commonBuiltins.length; _i < _len; _i++) {
      builtin = commonBuiltins[_i];
      cache.builtins[builtin] = path.join(commonRoot, "" + builtin + ".js");
    }
    rendererRoot = path.join(atomShellRoot, 'renderer', 'api', 'lib');
    rendererBuiltins = ['ipc', 'remote'];
    _results = [];
    for (_j = 0, _len1 = rendererBuiltins.length; _j < _len1; _j++) {
      builtin = rendererBuiltins[_j];
      _results.push(cache.builtins[builtin] = path.join(rendererRoot, "" + builtin + ".js"));
    }
    return _results;
  };

  if (cache.debug) {
    cache.findPathCount = 0;
    cache.findPathTime = 0;
    cache.loadCount = 0;
    cache.requireTime = 0;
    global.moduleCache = cache;
    originalLoad = Module.prototype.load;
    Module.prototype.load = function() {
      cache.loadCount++;
      return originalLoad.apply(this, arguments);
    };
    originalRequire = Module.prototype.require;
    Module.prototype.require = function() {
      var exports, startTime;
      startTime = Date.now();
      exports = originalRequire.apply(this, arguments);
      cache.requireTime += Date.now() - startTime;
      return exports;
    };
    originalFindPath = Module._findPath;
    Module._findPath = function(request, paths) {
      var cacheKey, foundPath, startTime;
      cacheKey = JSON.stringify({
        request: request,
        paths: paths
      });
      if (!Module._pathCache[cacheKey]) {
        cache.findPathCount++;
      }
      startTime = Date.now();
      foundPath = originalFindPath.apply(global, arguments);
      cache.findPathTime += Date.now() - startTime;
      return foundPath;
    };
  }

  exports.create = function(modulePath) {
    var fs, metadata, metadataPath, moduleCache;
    fs = require('fs-plus');
    modulePath = fs.realpathSync(modulePath);
    metadataPath = path.join(modulePath, 'package.json');
    metadata = JSON.parse(fs.readFileSync(metadataPath));
    moduleCache = {
      version: 1,
      dependencies: [],
      extensions: {},
      folders: []
    };
    loadDependencies(modulePath, modulePath, metadata, moduleCache);
    loadFolderCompatibility(modulePath, modulePath, metadata, moduleCache);
    loadExtensions(modulePath, modulePath, metadata, moduleCache);
    metadata._atomModuleCache = moduleCache;
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  };

  exports.register = function(_arg) {
    var devMode, originalResolveFilename, resourcePath, _ref;
    _ref = _arg != null ? _arg : {}, resourcePath = _ref.resourcePath, devMode = _ref.devMode;
    if (cache.registered) {
      return;
    }
    originalResolveFilename = Module._resolveFilename;
    Module._resolveFilename = function(relativePath, parentModule) {
      var resolvedPath;
      resolvedPath = resolveModulePath(relativePath, parentModule);
      if (resolvedPath == null) {
        resolvedPath = resolveFilePath(relativePath, parentModule);
      }
      return resolvedPath != null ? resolvedPath : originalResolveFilename(relativePath, parentModule);
    };
    cache.registered = true;
    cache.resourcePath = resourcePath;
    cache.resourcePathWithTrailingSlash = "" + resourcePath + path.sep;
    registerBuiltins(devMode);
  };

  exports.add = function(directoryPath, metadata) {
    var cacheToAdd, dependency, entry, error, extension, filePath, folderPath, paths, _base, _base1, _base2, _i, _j, _k, _l, _len, _len1, _len2, _len3, _name, _name1, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
    if (metadata == null) {
      try {
        metadata = require("" + directoryPath + path.sep + "package.json");
      } catch (_error) {
        error = _error;
        return;
      }
    }
    cacheToAdd = metadata != null ? metadata._atomModuleCache : void 0;
    if (cacheToAdd == null) {
      return;
    }
    _ref1 = (_ref = cacheToAdd.dependencies) != null ? _ref : [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      dependency = _ref1[_i];
      if ((_base = cache.dependencies)[_name = dependency.name] == null) {
        _base[_name] = {};
      }
      if ((_base1 = cache.dependencies[dependency.name])[_name1 = dependency.version] == null) {
        _base1[_name1] = "" + directoryPath + path.sep + dependency.path;
      }
    }
    _ref3 = (_ref2 = cacheToAdd.folders) != null ? _ref2 : [];
    for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
      entry = _ref3[_j];
      _ref4 = entry.paths;
      for (_k = 0, _len2 = _ref4.length; _k < _len2; _k++) {
        folderPath = _ref4[_k];
        if (folderPath) {
          cache.folders["" + directoryPath + path.sep + folderPath] = entry.dependencies;
        } else {
          cache.folders[directoryPath] = entry.dependencies;
        }
      }
    }
    _ref5 = cacheToAdd.extensions;
    for (extension in _ref5) {
      paths = _ref5[extension];
      if ((_base2 = cache.extensions)[extension] == null) {
        _base2[extension] = new Set();
      }
      for (_l = 0, _len3 = paths.length; _l < _len3; _l++) {
        filePath = paths[_l];
        cache.extensions[extension].add("" + directoryPath + path.sep + filePath);
      }
    }
  };

  exports.cache = cache;

}).call(this);

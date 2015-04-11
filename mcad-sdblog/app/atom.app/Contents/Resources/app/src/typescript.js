
/*
Cache for source code transpiled by TypeScript.

Inspired by https://github.com/atom/atom/blob/7a719d585db96ff7d2977db9067e1d9d4d0adf1a/src/babel.coffee
 */

(function() {
  var cacheDir, createOptions, createTypeScriptVersionAndOptionsDigest, crypto, defaultOptions, fs, getCachePath, getCachedJavaScript, jsCacheDir, loadFile, path, register, setCacheDirectory, stats, transpile, tss;

  crypto = require('crypto');

  fs = require('fs-plus');

  path = require('path');

  tss = null;

  stats = {
    hits: 0,
    misses: 0
  };

  defaultOptions = {
    target: 1,
    module: 'commonjs',
    sourceMap: true
  };

  createTypeScriptVersionAndOptionsDigest = function(version, options) {
    var shasum;
    shasum = crypto.createHash('sha1');
    shasum.update('typescript', 'utf8');
    shasum.update('\0', 'utf8');
    shasum.update(version, 'utf8');
    shasum.update('\0', 'utf8');
    shasum.update(JSON.stringify(options));
    return shasum.digest('hex');
  };

  cacheDir = null;

  jsCacheDir = null;

  getCachePath = function(sourceCode) {
    var digest, tssVersion;
    digest = crypto.createHash('sha1').update(sourceCode, 'utf8').digest('hex');
    if (jsCacheDir == null) {
      tssVersion = require('typescript-simple/package.json').version;
      jsCacheDir = path.join(cacheDir, createTypeScriptVersionAndOptionsDigest(tssVersion, defaultOptions));
    }
    return path.join(jsCacheDir, "" + digest + ".js");
  };

  getCachedJavaScript = function(cachePath) {
    var cachedJavaScript;
    if (fs.isFileSync(cachePath)) {
      try {
        cachedJavaScript = fs.readFileSync(cachePath, 'utf8');
        stats.hits++;
        return cachedJavaScript;
      } catch (_error) {}
    }
    return null;
  };

  createOptions = function(filePath) {
    var key, options, value;
    options = {
      filename: filePath
    };
    for (key in defaultOptions) {
      value = defaultOptions[key];
      options[key] = value;
    }
    return options;
  };

  transpile = function(sourceCode, filePath, cachePath) {
    var TypeScriptSimple, js, options;
    options = createOptions(filePath);
    if (tss == null) {
      TypeScriptSimple = require('typescript-simple').TypeScriptSimple;
      tss = new TypeScriptSimple(options, false);
    }
    js = tss.compile(sourceCode, filePath);
    stats.misses++;
    try {
      fs.writeFileSync(cachePath, js);
    } catch (_error) {}
    return js;
  };

  loadFile = function(module, filePath) {
    var cachePath, js, sourceCode, _ref;
    sourceCode = fs.readFileSync(filePath, 'utf8');
    cachePath = getCachePath(sourceCode);
    js = (_ref = getCachedJavaScript(cachePath)) != null ? _ref : transpile(sourceCode, filePath, cachePath);
    return module._compile(js, filePath);
  };

  register = function() {
    return Object.defineProperty(require.extensions, '.ts', {
      enumerable: true,
      writable: false,
      value: loadFile
    });
  };

  setCacheDirectory = function(newCacheDir) {
    if (cacheDir !== newCacheDir) {
      cacheDir = newCacheDir;
      return jsCacheDir = null;
    }
  };

  module.exports = {
    register: register,
    setCacheDirectory: setCacheDirectory,
    getCacheMisses: function() {
      return stats.misses;
    },
    getCacheHits: function() {
      return stats.hits;
    },
    createTypeScriptVersionAndOptionsDigest: createTypeScriptVersionAndOptionsDigest,
    addPathToCache: function(filePath) {
      var cachePath, sourceCode;
      if (path.extname(filePath) !== '.ts') {
        return;
      }
      sourceCode = fs.readFileSync(filePath, 'utf8');
      cachePath = getCachePath(sourceCode);
      return transpile(sourceCode, filePath, cachePath);
    }
  };

}).call(this);

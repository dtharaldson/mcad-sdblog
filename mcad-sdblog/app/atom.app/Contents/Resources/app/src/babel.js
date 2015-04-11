
/*
Cache for source code transpiled by Babel.

Inspired by https://github.com/atom/atom/blob/6b963a562f8d495fbebe6abdbafbc7caf705f2c3/src/coffee-cache.coffee.
 */

(function() {
  var Grim, babel, cacheDir, createBabelVersionAndOptionsDigest, createOptions, crypto, defaultOptions, fs, getCachePath, getCachedJavaScript, jsCacheDir, loadFile, path, register, setCacheDirectory, stats, transpile, updateDigestForJsonValue;

  crypto = require('crypto');

  fs = require('fs-plus');

  path = require('path');

  babel = null;

  Grim = null;

  stats = {
    hits: 0,
    misses: 0
  };

  defaultOptions = {
    sourceMap: 'inline',
    blacklist: ['useStrict'],
    experimental: true,
    optional: ['asyncToGenerator', 'reactCompat']
  };


  /*
  shasum - Hash with an update() method.
  value - Must be a value that could be returned by JSON.parse().
   */

  updateDigestForJsonValue = function(shasum, value) {
    var item, key, keys, type, _i, _j, _len, _len1;
    type = typeof value;
    if (type === 'string') {
      shasum.update('"', 'utf8');
      shasum.update(value, 'utf8');
      return shasum.update('"', 'utf8');
    } else if (type === 'boolean' || type === 'number') {
      return shasum.update(value.toString(), 'utf8');
    } else if (value === null) {
      return shasum.update('null', 'utf8');
    } else if (Array.isArray(value)) {
      shasum.update('[', 'utf8');
      for (_i = 0, _len = value.length; _i < _len; _i++) {
        item = value[_i];
        updateDigestForJsonValue(shasum, item);
        shasum.update(',', 'utf8');
      }
      return shasum.update(']', 'utf8');
    } else {
      keys = Object.keys(value);
      keys.sort();
      shasum.update('{', 'utf8');
      for (_j = 0, _len1 = keys.length; _j < _len1; _j++) {
        key = keys[_j];
        updateDigestForJsonValue(shasum, key);
        shasum.update(': ', 'utf8');
        updateDigestForJsonValue(shasum, value[key]);
        shasum.update(',', 'utf8');
      }
      return shasum.update('}', 'utf8');
    }
  };

  createBabelVersionAndOptionsDigest = function(version, options) {
    var shasum;
    shasum = crypto.createHash('sha1');
    shasum.update('babel-core', 'utf8');
    shasum.update('\0', 'utf8');
    shasum.update(version, 'utf8');
    shasum.update('\0', 'utf8');
    updateDigestForJsonValue(shasum, options);
    return shasum.digest('hex');
  };

  cacheDir = null;

  jsCacheDir = null;

  getCachePath = function(sourceCode) {
    var digest, to5Version;
    digest = crypto.createHash('sha1').update(sourceCode, 'utf8').digest('hex');
    if (jsCacheDir == null) {
      to5Version = require('babel-core/package.json').version;
      jsCacheDir = path.join(cacheDir, createBabelVersionAndOptionsDigest(to5Version, defaultOptions));
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
    var js, options;
    options = createOptions(filePath);
    if (babel == null) {
      babel = require('babel-core');
    }
    js = babel.transform(sourceCode, options).code;
    stats.misses++;
    try {
      fs.writeFileSync(cachePath, js);
    } catch (_error) {}
    return js;
  };

  loadFile = function(module, filePath) {
    var cachePath, deprecation, js, sourceCode, stack, _ref;
    sourceCode = fs.readFileSync(filePath, 'utf8');
    if (sourceCode.startsWith('"use babel"') || sourceCode.startsWith("'use babel'")) {

    } else if (sourceCode.startsWith('"use 6to5"') || sourceCode.startsWith("'use 6to5'")) {
      if (Grim == null) {
        Grim = require('grim');
      }
      stack = [
        {
          fileName: __filename,
          functionName: 'loadFile',
          location: "" + __filename + ":161:5"
        }, {
          fileName: filePath,
          functionName: '<unknown>',
          location: "" + filePath + ":1:1"
        }
      ];
      deprecation = {
        message: "Use the 'use babel' pragma instead of 'use 6to5'",
        stacks: [stack]
      };
      Grim.addSerializedDeprecation(deprecation);
    } else {
      return module._compile(sourceCode, filePath);
    }
    cachePath = getCachePath(sourceCode);
    js = (_ref = getCachedJavaScript(cachePath)) != null ? _ref : transpile(sourceCode, filePath, cachePath);
    return module._compile(js, filePath);
  };

  register = function() {
    return Object.defineProperty(require.extensions, '.js', {
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
    createBabelVersionAndOptionsDigest: createBabelVersionAndOptionsDigest,
    addPathToCache: function(filePath) {
      var cachePath, sourceCode;
      if (path.extname(filePath) !== '.js') {
        return;
      }
      sourceCode = fs.readFileSync(filePath, 'utf8');
      cachePath = getCachePath(sourceCode);
      return transpile(sourceCode, filePath, cachePath);
    }
  };

}).call(this);

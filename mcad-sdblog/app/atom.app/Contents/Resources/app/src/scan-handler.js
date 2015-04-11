(function() {
  var PathScanner, PathSearcher, async, path, processPaths, search, _, _ref;

  _ = require("underscore-plus");

  path = require("path");

  async = require("async");

  _ref = require('scandal'), PathSearcher = _ref.PathSearcher, PathScanner = _ref.PathScanner, search = _ref.search;

  module.exports = function(rootPaths, regexSource, options) {
    var PATHS_COUNTER_SEARCHED_CHUNK, callback, flags, pathsSearched, regex, rootPath, searcher;
    callback = this.async();
    rootPath = rootPaths[0];
    PATHS_COUNTER_SEARCHED_CHUNK = 50;
    pathsSearched = 0;
    searcher = new PathSearcher();
    searcher.on('file-error', function(_arg) {
      var code, message, path;
      code = _arg.code, path = _arg.path, message = _arg.message;
      return emit('scan:file-error', {
        code: code,
        path: path,
        message: message
      });
    });
    searcher.on('results-found', function(result) {
      return emit('scan:result-found', result);
    });
    flags = "g";
    if (options.ignoreCase) {
      flags += "i";
    }
    regex = new RegExp(regexSource, flags);
    return async.each(rootPaths, function(rootPath, next) {
      var options2, scanner;
      options2 = _.extend({}, options, {
        inclusions: processPaths(rootPath, options.inclusions),
        exclusions: processPaths(rootPath, options.exclusions)
      });
      scanner = new PathScanner(rootPath, options2);
      scanner.on('path-found', function() {
        pathsSearched++;
        if (pathsSearched % PATHS_COUNTER_SEARCHED_CHUNK === 0) {
          return emit('scan:paths-searched', pathsSearched);
        }
      });
      return search(regex, scanner, searcher, function() {
        emit('scan:paths-searched', pathsSearched);
        return next();
      });
    }, callback);
  };

  processPaths = function(rootPath, paths) {
    var firstSegment, givenPath, results, rootPathBase, segments, _i, _len;
    if (!((paths != null ? paths.length : void 0) > 0)) {
      return paths;
    }
    rootPathBase = path.basename(rootPath);
    results = [];
    for (_i = 0, _len = paths.length; _i < _len; _i++) {
      givenPath = paths[_i];
      segments = givenPath.split(path.sep);
      firstSegment = segments.shift();
      results.push(givenPath);
      if (firstSegment === rootPathBase) {
        if (segments.length === 0) {
          results.push(path.join("**", "*"));
        } else {
          results.push(path.join.apply(path, segments));
        }
      }
    }
    return results;
  };

}).call(this);

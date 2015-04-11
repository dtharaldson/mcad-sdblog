(function() {
  var LessCache, LessCompileCache, path;

  path = require('path');

  LessCache = require('less-cache');

  module.exports = LessCompileCache = (function() {
    LessCompileCache.cacheDir = path.join(process.env.ATOM_HOME, 'compile-cache', 'less');

    function LessCompileCache(_arg) {
      var importPaths, resourcePath;
      resourcePath = _arg.resourcePath, importPaths = _arg.importPaths;
      this.lessSearchPaths = [path.join(resourcePath, 'static', 'variables'), path.join(resourcePath, 'static')];
      if (importPaths != null) {
        importPaths = importPaths.concat(this.lessSearchPaths);
      } else {
        importPaths = this.lessSearchPaths;
      }
      this.cache = new LessCache({
        cacheDir: this.constructor.cacheDir,
        importPaths: importPaths,
        resourcePath: resourcePath,
        fallbackDir: path.join(resourcePath, 'less-compile-cache')
      });
    }

    LessCompileCache.prototype.setImportPaths = function(importPaths) {
      if (importPaths == null) {
        importPaths = [];
      }
      return this.cache.setImportPaths(importPaths.concat(this.lessSearchPaths));
    };

    LessCompileCache.prototype.read = function(stylesheetPath) {
      return this.cache.readFileSync(stylesheetPath);
    };

    LessCompileCache.prototype.cssForFile = function(stylesheetPath, lessContent) {
      return this.cache.cssForFile(stylesheetPath, lessContent);
    };

    return LessCompileCache;

  })();

}).call(this);

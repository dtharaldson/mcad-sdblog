(function() {
  var CSON, CoffeeCache, babel, path, typescript;

  path = require('path');

  CSON = require('season');

  CoffeeCache = require('coffee-cash');

  babel = require('./babel');

  typescript = require('./typescript');

  exports.addPathToCache = function(filePath, atomHome) {
    var cacheDir;
    if (atomHome == null) {
      atomHome = process.env.ATOM_HOME;
    }
    cacheDir = path.join(atomHome, 'compile-cache');
    if (process.env.USER === 'root' && process.env.SUDO_USER && process.env.SUDO_USER !== process.env.USER) {
      cacheDir = path.join(cacheDir, 'root');
    }
    CoffeeCache.setCacheDirectory(path.join(cacheDir, 'coffee'));
    CSON.setCacheDir(path.join(cacheDir, 'cson'));
    babel.setCacheDirectory(path.join(cacheDir, 'js', 'babel'));
    typescript.setCacheDirectory(path.join(cacheDir, 'ts'));
    switch (path.extname(filePath)) {
      case '.coffee':
        return CoffeeCache.addPathToCache(filePath);
      case '.cson':
        return CSON.readFileSync(filePath);
      case '.js':
        return babel.addPathToCache(filePath);
      case '.ts':
        return typescript.addPathToCache(filePath);
    }
  };

}).call(this);

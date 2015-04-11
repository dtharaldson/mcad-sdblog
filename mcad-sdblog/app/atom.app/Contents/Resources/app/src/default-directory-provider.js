(function() {
  var DefaultDirectoryProvider, Directory, fs, path;

  Directory = require('pathwatcher').Directory;

  fs = require('fs-plus');

  path = require('path');

  module.exports = DefaultDirectoryProvider = (function() {
    function DefaultDirectoryProvider() {}

    DefaultDirectoryProvider.prototype.directoryForURISync = function(uri) {
      var directoryPath, projectPath;
      projectPath = path.normalize(uri);
      directoryPath = !fs.isDirectorySync(projectPath) && fs.isDirectorySync(path.dirname(projectPath)) ? path.dirname(projectPath) : projectPath;
      return new Directory(directoryPath);
    };

    DefaultDirectoryProvider.prototype.directoryForURI = function(uri) {
      return Promise.resolve(this.directoryForURISync(uri));
    };

    return DefaultDirectoryProvider;

  })();

}).call(this);

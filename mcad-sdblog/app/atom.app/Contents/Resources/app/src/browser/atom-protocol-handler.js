(function() {
  var AtomProtocolHandler, app, fs, path, protocol;

  app = require('app');

  fs = require('fs');

  path = require('path');

  protocol = require('protocol');

  module.exports = AtomProtocolHandler = (function() {
    function AtomProtocolHandler(resourcePath, safeMode) {
      this.loadPaths = [];
      if (!safeMode) {
        this.loadPaths.push(path.join(process.env.ATOM_HOME, 'dev', 'packages'));
      }
      this.loadPaths.push(path.join(process.env.ATOM_HOME, 'packages'));
      this.loadPaths.push(path.join(resourcePath, 'node_modules'));
      this.registerAtomProtocol();
    }

    AtomProtocolHandler.prototype.registerAtomProtocol = function() {
      return protocol.registerProtocol('atom', (function(_this) {
        return function(request) {
          var assetsPath, filePath, loadPath, relativePath, _base, _base1, _i, _len, _ref;
          relativePath = path.normalize(request.url.substr(7));
          if (relativePath.indexOf('assets/') === 0) {
            assetsPath = path.join(process.env.ATOM_HOME, relativePath);
            if (typeof (_base = fs.statSyncNoException(assetsPath)).isFile === "function" ? _base.isFile() : void 0) {
              filePath = assetsPath;
            }
          }
          if (!filePath) {
            _ref = _this.loadPaths;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              loadPath = _ref[_i];
              filePath = path.join(loadPath, relativePath);
              if (typeof (_base1 = fs.statSyncNoException(filePath)).isFile === "function" ? _base1.isFile() : void 0) {
                break;
              }
            }
          }
          return new protocol.RequestFileJob(filePath);
        };
      })(this));
    };

    return AtomProtocolHandler;

  })();

}).call(this);

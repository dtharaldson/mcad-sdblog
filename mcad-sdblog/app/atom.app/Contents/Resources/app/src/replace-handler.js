(function() {
  var PathReplacer;

  PathReplacer = require('scandal').PathReplacer;

  module.exports = function(filePaths, regexSource, regexFlags, replacementText) {
    var callback, regex, replacer;
    callback = this.async();
    replacer = new PathReplacer();
    regex = new RegExp(regexSource, regexFlags);
    replacer.on('file-error', function(_arg) {
      var code, message, path;
      code = _arg.code, path = _arg.path, message = _arg.message;
      return emit('replace:file-error', {
        code: code,
        path: path,
        message: message
      });
    });
    replacer.on('path-replaced', function(result) {
      return emit('replace:path-replaced', result);
    });
    return replacer.replacePaths(regex, replacementText, filePaths, function() {
      return callback();
    });
  };

}).call(this);

(function() {
  var BufferedNodeProcess, BufferedProcess, path,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  BufferedProcess = require('./buffered-process');

  path = require('path');

  module.exports = BufferedNodeProcess = (function(_super) {
    __extends(BufferedNodeProcess, _super);

    function BufferedNodeProcess(_arg) {
      var args, command, exit, node, options, stderr, stdout, _ref;
      command = _arg.command, args = _arg.args, options = _arg.options, stdout = _arg.stdout, stderr = _arg.stderr, exit = _arg.exit;
      node = process.platform === 'darwin' ? path.resolve(process.resourcesPath, '..', 'Frameworks', 'Atom Helper.app', 'Contents', 'MacOS', 'Atom Helper') : process.execPath;
      if (options == null) {
        options = {};
      }
      if (options.env == null) {
        options.env = Object.create(process.env);
      }
      options.env['ATOM_SHELL_INTERNAL_RUN_AS_NODE'] = 1;
      args = (_ref = args != null ? args.slice() : void 0) != null ? _ref : [];
      args.unshift(command);
      args.unshift('--no-deprecation');
      BufferedNodeProcess.__super__.constructor.call(this, {
        command: node,
        args: args,
        options: options,
        stdout: stdout,
        stderr: stderr,
        exit: exit
      });
    }

    return BufferedNodeProcess;

  })(BufferedProcess);

}).call(this);

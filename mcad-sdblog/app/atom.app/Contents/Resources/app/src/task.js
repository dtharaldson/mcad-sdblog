(function() {
  var Emitter, Grim, Task, fork, _,
    __slice = [].slice;

  _ = require('underscore-plus');

  fork = require('child_process').fork;

  Emitter = require('emissary').Emitter;

  Grim = require('grim');

  module.exports = Task = (function() {
    Emitter.includeInto(Task);

    Task.once = function() {
      var args, task, taskPath;
      taskPath = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      task = new Task(taskPath);
      task.once('task:completed', function() {
        return task.terminate();
      });
      task.start.apply(task, args);
      return task;
    };

    Task.prototype.callback = null;

    function Task(taskPath) {
      var bootstrap, coffeeCachePath, coffeeCacheRequire, coffeeStackRequire, env, stackCachePath, taskBootstrapRequire;
      coffeeCacheRequire = "require('" + (require.resolve('coffee-cash')) + "')";
      coffeeCachePath = require('coffee-cash').getCacheDirectory();
      coffeeStackRequire = "require('" + (require.resolve('coffeestack')) + "')";
      stackCachePath = require('coffeestack').getCacheDirectory();
      taskBootstrapRequire = "require('" + (require.resolve('./task-bootstrap')) + "');";
      bootstrap = "" + coffeeCacheRequire + ".setCacheDirectory('" + coffeeCachePath + "');\n" + coffeeCacheRequire + ".register();\n" + coffeeStackRequire + ".setCacheDirectory('" + stackCachePath + "');\n" + taskBootstrapRequire;
      bootstrap = bootstrap.replace(/\\/g, "\\\\");
      taskPath = require.resolve(taskPath);
      taskPath = taskPath.replace(/\\/g, "\\\\");
      env = _.extend({}, process.env, {
        taskPath: taskPath,
        userAgent: navigator.userAgent
      });
      this.childProcess = fork('--eval', [bootstrap], {
        env: env,
        cwd: __dirname
      });
      this.on("task:log", function() {
        return console.log.apply(console, arguments);
      });
      this.on("task:warn", function() {
        return console.warn.apply(console, arguments);
      });
      this.on("task:error", function() {
        return console.error.apply(console, arguments);
      });
      this.on("task:deprecations", function(deprecations) {
        var deprecation, _i, _len;
        for (_i = 0, _len = deprecations.length; _i < _len; _i++) {
          deprecation = deprecations[_i];
          Grim.addSerializedDeprecation(deprecation);
        }
      });
      this.on("task:completed", (function(_this) {
        return function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return typeof _this.callback === "function" ? _this.callback.apply(_this, args) : void 0;
        };
      })(this));
      this.handleEvents();
    }

    Task.prototype.handleEvents = function() {
      this.childProcess.removeAllListeners();
      return this.childProcess.on('message', (function(_this) {
        return function(_arg) {
          var args, event;
          event = _arg.event, args = _arg.args;
          if (_this.childProcess != null) {
            return _this.emit.apply(_this, [event].concat(__slice.call(args)));
          }
        };
      })(this));
    };

    Task.prototype.start = function() {
      var args, callback, _i;
      args = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), callback = arguments[_i++];
      if (this.childProcess == null) {
        throw new Error('Cannot start terminated process');
      }
      this.handleEvents();
      if (_.isFunction(callback)) {
        this.callback = callback;
      } else {
        args.push(callback);
      }
      this.send({
        event: 'start',
        args: args
      });
      return void 0;
    };

    Task.prototype.send = function(message) {
      if (this.childProcess != null) {
        this.childProcess.send(message);
      } else {
        throw new Error('Cannot send message to terminated process');
      }
      return void 0;
    };

    Task.prototype.on = function(eventName, callback) {
      return Emitter.prototype.on.call(this, eventName, callback);
    };

    Task.prototype.terminate = function() {
      if (this.childProcess == null) {
        return;
      }
      this.childProcess.removeAllListeners();
      this.childProcess.kill();
      this.childProcess = null;
      return void 0;
    };

    return Task;

  })();

}).call(this);

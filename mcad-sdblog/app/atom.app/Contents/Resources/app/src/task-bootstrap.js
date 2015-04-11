(function() {
  var handleEvents, handler, setupDeprecations, setupGlobals, taskPath, userAgent, _ref,
    __slice = [].slice;

  _ref = process.env, userAgent = _ref.userAgent, taskPath = _ref.taskPath;

  handler = null;

  setupGlobals = function() {
    var console;
    global.attachEvent = function() {};
    console = {
      warn: function() {
        return emit.apply(null, ['task:warn'].concat(__slice.call(arguments)));
      },
      log: function() {
        return emit.apply(null, ['task:log'].concat(__slice.call(arguments)));
      },
      error: function() {
        return emit.apply(null, ['task:error'].concat(__slice.call(arguments)));
      },
      trace: function() {}
    };
    global.__defineGetter__('console', function() {
      return console;
    });
    global.document = {
      createElement: function() {
        return {
          setAttribute: function() {},
          getElementsByTagName: function() {
            return [];
          },
          appendChild: function() {}
        };
      },
      documentElement: {
        insertBefore: function() {},
        removeChild: function() {}
      },
      getElementById: function() {
        return {};
      },
      createComment: function() {
        return {};
      },
      createDocumentFragment: function() {
        return {};
      }
    };
    global.emit = function() {
      var args, event;
      event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return process.send({
        event: event,
        args: args
      });
    };
    global.navigator = {
      userAgent: userAgent
    };
    return global.window = global;
  };

  handleEvents = function() {
    process.on('uncaughtException', function(error) {
      return console.error(error.message, error.stack);
    });
    return process.on('message', function(_arg) {
      var args, async, event, isAsync, result, _ref1;
      _ref1 = _arg != null ? _arg : {}, event = _ref1.event, args = _ref1.args;
      if (event !== 'start') {
        return;
      }
      isAsync = false;
      async = function() {
        isAsync = true;
        return function(result) {
          return emit('task:completed', result);
        };
      };
      result = handler.bind({
        async: async
      }).apply(null, args);
      if (!isAsync) {
        return emit('task:completed', result);
      }
    });
  };

  setupDeprecations = function() {
    var Grim;
    Grim = require('grim');
    return Grim.on('updated', function() {
      var deprecations;
      deprecations = Grim.getDeprecations().map(function(deprecation) {
        return deprecation.serialize();
      });
      Grim.clearDeprecations();
      return emit('task:deprecations', deprecations);
    });
  };

  setupGlobals();

  handleEvents();

  setupDeprecations();

  handler = require(taskPath);

}).call(this);

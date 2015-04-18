(function() {
  var Disposable, Grim, ViewRegistry, find,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  find = require('underscore-plus').find;

  Grim = require('grim');

  Disposable = require('event-kit').Disposable;

  module.exports = ViewRegistry = (function() {
    ViewRegistry.prototype.documentPollingInterval = 200;

    ViewRegistry.prototype.documentUpdateRequested = false;

    ViewRegistry.prototype.performDocumentPollAfterUpdate = false;

    ViewRegistry.prototype.pollIntervalHandle = null;

    function ViewRegistry() {
      this.performDocumentPoll = __bind(this.performDocumentPoll, this);
      this.performDocumentUpdate = __bind(this.performDocumentUpdate, this);
      this.views = new WeakMap;
      this.providers = [];
      this.documentWriters = [];
      this.documentReaders = [];
      this.documentPollers = [];
    }

    ViewRegistry.prototype.addViewProvider = function(modelConstructor, createView) {
      var provider;
      if (arguments.length === 1) {
        Grim.deprecate("atom.views.addViewProvider now takes 2 arguments: a model constructor and a createView function. See docs for details.");
        provider = modelConstructor;
      } else {
        provider = {
          modelConstructor: modelConstructor,
          createView: createView
        };
      }
      this.providers.push(provider);
      return new Disposable((function(_this) {
        return function() {
          return _this.providers = _this.providers.filter(function(p) {
            return p !== provider;
          });
        };
      })(this));
    };

    ViewRegistry.prototype.getView = function(object) {
      var view;
      if (object == null) {
        return;
      }
      if (view = this.views.get(object)) {
        return view;
      } else {
        view = this.createView(object);
        this.views.set(object, view);
        return view;
      }
    };

    ViewRegistry.prototype.createView = function(object) {
      var element, provider, view, viewConstructor, _ref;
      if (object instanceof HTMLElement) {
        return object;
      } else if (object != null ? object.jquery : void 0) {
        return object[0];
      } else if (provider = this.findProvider(object)) {
        element = typeof provider.createView === "function" ? provider.createView(object) : void 0;
        if (element == null) {
          element = new provider.viewConstructor;
                    if ((_ref = typeof element.initialize === "function" ? element.initialize(object) : void 0) != null) {
            _ref;
          } else {
            if (typeof element.setModel === "function") {
              element.setModel(object);
            }
          };
        }
        return element;
      } else if (viewConstructor = object != null ? typeof object.getViewClass === "function" ? object.getViewClass() : void 0 : void 0) {
        view = new viewConstructor(object);
        return view[0];
      } else {
        throw new Error("Can't create a view for " + object.constructor.name + " instance. Please register a view provider.");
      }
    };

    ViewRegistry.prototype.findProvider = function(object) {
      return find(this.providers, function(_arg) {
        var modelConstructor;
        modelConstructor = _arg.modelConstructor;
        return object instanceof modelConstructor;
      });
    };

    ViewRegistry.prototype.updateDocument = function(fn) {
      this.documentWriters.push(fn);
      this.requestDocumentUpdate();
      return new Disposable((function(_this) {
        return function() {
          return _this.documentWriters = _this.documentWriters.filter(function(writer) {
            return writer !== fn;
          });
        };
      })(this));
    };

    ViewRegistry.prototype.readDocument = function(fn) {
      this.documentReaders.push(fn);
      this.requestDocumentUpdate();
      return new Disposable((function(_this) {
        return function() {
          return _this.documentReaders = _this.documentReaders.filter(function(reader) {
            return reader !== fn;
          });
        };
      })(this));
    };

    ViewRegistry.prototype.pollDocument = function(fn) {
      if (this.documentPollers.length === 0) {
        this.startPollingDocument();
      }
      this.documentPollers.push(fn);
      return new Disposable((function(_this) {
        return function() {
          _this.documentPollers = _this.documentPollers.filter(function(poller) {
            return poller !== fn;
          });
          if (_this.documentPollers.length === 0) {
            return _this.stopPollingDocument();
          }
        };
      })(this));
    };

    ViewRegistry.prototype.pollAfterNextUpdate = function() {
      return this.performDocumentPollAfterUpdate = true;
    };

    ViewRegistry.prototype.clearDocumentRequests = function() {
      this.documentReaders = [];
      this.documentWriters = [];
      this.documentPollers = [];
      this.documentUpdateRequested = false;
      return this.stopPollingDocument();
    };

    ViewRegistry.prototype.requestDocumentUpdate = function() {
      if (!this.documentUpdateRequested) {
        this.documentUpdateRequested = true;
        return requestAnimationFrame(this.performDocumentUpdate);
      }
    };

    ViewRegistry.prototype.performDocumentUpdate = function() {
      var reader, writer;
      this.documentUpdateRequested = false;
      while (writer = this.documentWriters.shift()) {
        writer();
      }
      while (reader = this.documentReaders.shift()) {
        reader();
      }
      if (this.performDocumentPollAfterUpdate) {
        this.performDocumentPoll();
      }
      return this.performDocumentPollAfterUpdate = false;
    };

    ViewRegistry.prototype.startPollingDocument = function() {
      return this.pollIntervalHandle = window.setInterval(this.performDocumentPoll, this.documentPollingInterval);
    };

    ViewRegistry.prototype.stopPollingDocument = function() {
      return window.clearInterval(this.pollIntervalHandle);
    };

    ViewRegistry.prototype.performDocumentPoll = function() {
      var poller, _i, _len, _ref;
      if (this.documentUpdateRequested) {
        return this.performDocumentPollAfterUpdate = true;
      } else {
        _ref = this.documentPollers;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          poller = _ref[_i];
          poller();
        }
      }
    };

    return ViewRegistry;

  })();

}).call(this);

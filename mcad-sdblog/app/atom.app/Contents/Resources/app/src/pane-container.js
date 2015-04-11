(function() {
  var CompositeDisposable, Emitter, Grim, ItemRegistry, Model, Pane, PaneAxis, PaneAxisElement, PaneContainer, PaneContainerElement, PaneElement, Serializable, TextEditor, TextEditorElement, find, flatten, _ref, _ref1,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ref = require('underscore-plus'), find = _ref.find, flatten = _ref.flatten;

  Grim = require('grim');

  _ref1 = require('event-kit'), Emitter = _ref1.Emitter, CompositeDisposable = _ref1.CompositeDisposable;

  Serializable = require('serializable');

  Model = require('./model');

  Pane = require('./pane');

  PaneElement = require('./pane-element');

  PaneContainerElement = require('./pane-container-element');

  PaneAxisElement = require('./pane-axis-element');

  PaneAxis = require('./pane-axis');

  TextEditor = require('./text-editor');

  TextEditorElement = require('./text-editor-element');

  ItemRegistry = require('./item-registry');

  module.exports = PaneContainer = (function(_super) {
    __extends(PaneContainer, _super);

    atom.deserializers.add(PaneContainer);

    Serializable.includeInto(PaneContainer);

    PaneContainer.version = 1;

    PaneContainer.prototype.root = null;

    function PaneContainer(params) {
      var _ref2;
      PaneContainer.__super__.constructor.apply(this, arguments);
      if (!Grim.includeDeprecatedAPIs) {
        this.activePane = params != null ? params.activePane : void 0;
      }
      this.emitter = new Emitter;
      this.subscriptions = new CompositeDisposable;
      this.itemRegistry = new ItemRegistry;
      this.registerViewProviders();
      this.setRoot((_ref2 = params != null ? params.root : void 0) != null ? _ref2 : new Pane);
      if (!this.getActivePane()) {
        this.setActivePane(this.getPanes()[0]);
      }
      if (params != null ? params.destroyEmptyPanes : void 0) {
        this.destroyEmptyPanes();
      }
      this.monitorActivePaneItem();
      this.monitorPaneItems();
    }

    PaneContainer.prototype.deserializeParams = function(params) {
      params.root = atom.deserializers.deserialize(params.root, {
        container: this
      });
      params.destroyEmptyPanes = atom.config.get('core.destroyEmptyPanes');
      params.activePane = find(params.root.getPanes(), function(pane) {
        return pane.id === params.activePaneId;
      });
      return params;
    };

    PaneContainer.prototype.serializeParams = function(params) {
      var _ref2;
      return {
        root: (_ref2 = this.root) != null ? _ref2.serialize() : void 0,
        activePaneId: this.activePane.id
      };
    };

    PaneContainer.prototype.registerViewProviders = function() {
      atom.views.addViewProvider(PaneContainer, function(model) {
        return new PaneContainerElement().initialize(model);
      });
      atom.views.addViewProvider(PaneAxis, function(model) {
        return new PaneAxisElement().initialize(model);
      });
      atom.views.addViewProvider(Pane, function(model) {
        return new PaneElement().initialize(model);
      });
      return atom.views.addViewProvider(TextEditor, function(model) {
        return new TextEditorElement().initialize(model);
      });
    };

    PaneContainer.prototype.onDidChangeRoot = function(fn) {
      return this.emitter.on('did-change-root', fn);
    };

    PaneContainer.prototype.observeRoot = function(fn) {
      fn(this.getRoot());
      return this.onDidChangeRoot(fn);
    };

    PaneContainer.prototype.onDidAddPane = function(fn) {
      return this.emitter.on('did-add-pane', fn);
    };

    PaneContainer.prototype.observePanes = function(fn) {
      var pane, _i, _len, _ref2;
      _ref2 = this.getPanes();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        pane = _ref2[_i];
        fn(pane);
      }
      return this.onDidAddPane(function(_arg) {
        var pane;
        pane = _arg.pane;
        return fn(pane);
      });
    };

    PaneContainer.prototype.onDidDestroyPane = function(fn) {
      return this.emitter.on('did-destroy-pane', fn);
    };

    PaneContainer.prototype.onDidChangeActivePane = function(fn) {
      return this.emitter.on('did-change-active-pane', fn);
    };

    PaneContainer.prototype.observeActivePane = function(fn) {
      fn(this.getActivePane());
      return this.onDidChangeActivePane(fn);
    };

    PaneContainer.prototype.onDidAddPaneItem = function(fn) {
      return this.emitter.on('did-add-pane-item', fn);
    };

    PaneContainer.prototype.observePaneItems = function(fn) {
      var item, _i, _len, _ref2;
      _ref2 = this.getPaneItems();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        item = _ref2[_i];
        fn(item);
      }
      return this.onDidAddPaneItem(function(_arg) {
        var item;
        item = _arg.item;
        return fn(item);
      });
    };

    PaneContainer.prototype.onDidChangeActivePaneItem = function(fn) {
      return this.emitter.on('did-change-active-pane-item', fn);
    };

    PaneContainer.prototype.observeActivePaneItem = function(fn) {
      fn(this.getActivePaneItem());
      return this.onDidChangeActivePaneItem(fn);
    };

    PaneContainer.prototype.onWillDestroyPaneItem = function(fn) {
      return this.emitter.on('will-destroy-pane-item', fn);
    };

    PaneContainer.prototype.onDidDestroyPaneItem = function(fn) {
      return this.emitter.on('did-destroy-pane-item', fn);
    };

    PaneContainer.prototype.getRoot = function() {
      return this.root;
    };

    PaneContainer.prototype.setRoot = function(root) {
      this.root = root;
      this.root.setParent(this);
      this.root.setContainer(this);
      this.emitter.emit('did-change-root', this.root);
      if ((this.getActivePane() == null) && this.root instanceof Pane) {
        return this.setActivePane(this.root);
      }
    };

    PaneContainer.prototype.replaceChild = function(oldChild, newChild) {
      if (oldChild !== this.root) {
        throw new Error("Replacing non-existent child");
      }
      return this.setRoot(newChild);
    };

    PaneContainer.prototype.getPanes = function() {
      return this.getRoot().getPanes();
    };

    PaneContainer.prototype.getPaneItems = function() {
      return this.getRoot().getItems();
    };

    PaneContainer.prototype.getActivePane = function() {
      return this.activePane;
    };

    PaneContainer.prototype.setActivePane = function(activePane) {
      if (activePane !== this.activePane) {
        if (__indexOf.call(this.getPanes(), activePane) < 0) {
          throw new Error("Setting active pane that is not present in pane container");
        }
        this.activePane = activePane;
        this.emitter.emit('did-change-active-pane', this.activePane);
      }
      return this.activePane;
    };

    PaneContainer.prototype.getActivePaneItem = function() {
      return this.getActivePane().getActiveItem();
    };

    PaneContainer.prototype.paneForURI = function(uri) {
      return find(this.getPanes(), function(pane) {
        return pane.itemForURI(uri) != null;
      });
    };

    PaneContainer.prototype.paneForItem = function(item) {
      return find(this.getPanes(), function(pane) {
        return __indexOf.call(pane.getItems(), item) >= 0;
      });
    };

    PaneContainer.prototype.saveAll = function() {
      var pane, _i, _len, _ref2;
      _ref2 = this.getPanes();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        pane = _ref2[_i];
        pane.saveItems();
      }
    };

    PaneContainer.prototype.confirmClose = function(options) {
      var allSaved, item, pane, _i, _j, _len, _len1, _ref2, _ref3;
      allSaved = true;
      _ref2 = this.getPanes();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        pane = _ref2[_i];
        _ref3 = pane.getItems();
        for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
          item = _ref3[_j];
          if (!pane.promptToSaveItem(item, options)) {
            allSaved = false;
            break;
          }
        }
      }
      return allSaved;
    };

    PaneContainer.prototype.activateNextPane = function() {
      var currentIndex, nextIndex, panes;
      panes = this.getPanes();
      if (panes.length > 1) {
        currentIndex = panes.indexOf(this.activePane);
        nextIndex = (currentIndex + 1) % panes.length;
        panes[nextIndex].activate();
        return true;
      } else {
        return false;
      }
    };

    PaneContainer.prototype.activatePreviousPane = function() {
      var currentIndex, panes, previousIndex;
      panes = this.getPanes();
      if (panes.length > 1) {
        currentIndex = panes.indexOf(this.activePane);
        previousIndex = currentIndex - 1;
        if (previousIndex < 0) {
          previousIndex = panes.length - 1;
        }
        panes[previousIndex].activate();
        return true;
      } else {
        return false;
      }
    };

    PaneContainer.prototype.destroyEmptyPanes = function() {
      var pane, _i, _len, _ref2;
      _ref2 = this.getPanes();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        pane = _ref2[_i];
        if (pane.items.length === 0) {
          pane.destroy();
        }
      }
    };

    PaneContainer.prototype.willDestroyPaneItem = function(event) {
      return this.emitter.emit('will-destroy-pane-item', event);
    };

    PaneContainer.prototype.didDestroyPaneItem = function(event) {
      return this.emitter.emit('did-destroy-pane-item', event);
    };

    PaneContainer.prototype.didAddPane = function(event) {
      return this.emitter.emit('did-add-pane', event);
    };

    PaneContainer.prototype.didDestroyPane = function(event) {
      return this.emitter.emit('did-destroy-pane', event);
    };

    PaneContainer.prototype.destroyed = function() {
      var pane, _i, _len, _ref2;
      _ref2 = this.getPanes();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        pane = _ref2[_i];
        pane.destroy();
      }
      this.subscriptions.dispose();
      return this.emitter.dispose();
    };

    PaneContainer.prototype.monitorActivePaneItem = function() {
      var childSubscription;
      childSubscription = null;
      return this.subscriptions.add(this.observeActivePane((function(_this) {
        return function(activePane) {
          if (childSubscription != null) {
            _this.subscriptions.remove(childSubscription);
            childSubscription.dispose();
          }
          childSubscription = activePane.observeActiveItem(function(activeItem) {
            return _this.emitter.emit('did-change-active-pane-item', activeItem);
          });
          return _this.subscriptions.add(childSubscription);
        };
      })(this)));
    };

    PaneContainer.prototype.monitorPaneItems = function() {
      return this.subscriptions.add(this.observePanes((function(_this) {
        return function(pane) {
          var index, item, _i, _len, _ref2;
          _ref2 = pane.getItems();
          for (index = _i = 0, _len = _ref2.length; _i < _len; index = ++_i) {
            item = _ref2[index];
            _this.addedPaneItem(item, pane, index);
          }
          pane.onDidAddItem(function(_arg) {
            var index, item;
            item = _arg.item, index = _arg.index;
            return _this.addedPaneItem(item, pane, index);
          });
          return pane.onDidRemoveItem(function(_arg) {
            var item;
            item = _arg.item;
            return _this.removedPaneItem(item);
          });
        };
      })(this)));
    };

    PaneContainer.prototype.addedPaneItem = function(item, pane, index) {
      this.itemRegistry.addItem(item);
      return this.emitter.emit('did-add-pane-item', {
        item: item,
        pane: pane,
        index: index
      });
    };

    PaneContainer.prototype.removedPaneItem = function(item) {
      return this.itemRegistry.removeItem(item);
    };

    return PaneContainer;

  })(Model);

  if (Grim.includeDeprecatedAPIs) {
    PaneContainer.properties({
      activePane: null
    });
    PaneContainer.behavior('activePaneItem', function() {
      return this.$activePane["switch"](function(activePane) {
        return activePane != null ? activePane.$activeItem : void 0;
      }).distinctUntilChanged();
    });
  }

}).call(this);

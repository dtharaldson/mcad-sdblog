(function() {
  var CompositeDisposable, Emitter, Model, PaneAxis, Serializable, flatten, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('event-kit'), Emitter = _ref.Emitter, CompositeDisposable = _ref.CompositeDisposable;

  flatten = require('underscore-plus').flatten;

  Serializable = require('serializable');

  Model = require('./model');

  module.exports = PaneAxis = (function(_super) {
    __extends(PaneAxis, _super);

    atom.deserializers.add(PaneAxis);

    Serializable.includeInto(PaneAxis);

    PaneAxis.prototype.parent = null;

    PaneAxis.prototype.container = null;

    PaneAxis.prototype.orientation = null;

    function PaneAxis(_arg) {
      var child, children, _i, _len;
      this.container = _arg.container, this.orientation = _arg.orientation, children = _arg.children;
      this.emitter = new Emitter;
      this.subscriptionsByChild = new WeakMap;
      this.subscriptions = new CompositeDisposable;
      this.children = [];
      if (children != null) {
        for (_i = 0, _len = children.length; _i < _len; _i++) {
          child = children[_i];
          this.addChild(child);
        }
      }
    }

    PaneAxis.prototype.deserializeParams = function(params) {
      var container;
      container = params.container;
      params.children = params.children.map(function(childState) {
        return atom.deserializers.deserialize(childState, {
          container: container
        });
      });
      return params;
    };

    PaneAxis.prototype.serializeParams = function() {
      return {
        children: this.children.map(function(child) {
          return child.serialize();
        }),
        orientation: this.orientation
      };
    };

    PaneAxis.prototype.getParent = function() {
      return this.parent;
    };

    PaneAxis.prototype.setParent = function(parent) {
      this.parent = parent;
      return this.parent;
    };

    PaneAxis.prototype.getContainer = function() {
      return this.container;
    };

    PaneAxis.prototype.setContainer = function(container) {
      this.container = container;
      return this.container;
    };

    PaneAxis.prototype.getOrientation = function() {
      return this.orientation;
    };

    PaneAxis.prototype.getChildren = function() {
      return this.children.slice();
    };

    PaneAxis.prototype.getPanes = function() {
      return flatten(this.children.map(function(child) {
        return child.getPanes();
      }));
    };

    PaneAxis.prototype.getItems = function() {
      return flatten(this.children.map(function(child) {
        return child.getItems();
      }));
    };

    PaneAxis.prototype.onDidAddChild = function(fn) {
      return this.emitter.on('did-add-child', fn);
    };

    PaneAxis.prototype.onDidRemoveChild = function(fn) {
      return this.emitter.on('did-remove-child', fn);
    };

    PaneAxis.prototype.onDidReplaceChild = function(fn) {
      return this.emitter.on('did-replace-child', fn);
    };

    PaneAxis.prototype.onDidDestroy = function(fn) {
      return this.emitter.on('did-destroy', fn);
    };

    PaneAxis.prototype.addChild = function(child, index) {
      if (index == null) {
        index = this.children.length;
      }
      child.setParent(this);
      child.setContainer(this.container);
      this.subscribeToChild(child);
      this.children.splice(index, 0, child);
      return this.emitter.emit('did-add-child', {
        child: child,
        index: index
      });
    };

    PaneAxis.prototype.removeChild = function(child, replacing) {
      var index;
      if (replacing == null) {
        replacing = false;
      }
      index = this.children.indexOf(child);
      if (index === -1) {
        throw new Error("Removing non-existent child");
      }
      this.unsubscribeFromChild(child);
      this.children.splice(index, 1);
      this.emitter.emit('did-remove-child', {
        child: child,
        index: index
      });
      if (!replacing && this.children.length < 2) {
        return this.reparentLastChild();
      }
    };

    PaneAxis.prototype.replaceChild = function(oldChild, newChild) {
      var index;
      this.unsubscribeFromChild(oldChild);
      this.subscribeToChild(newChild);
      newChild.setParent(this);
      newChild.setContainer(this.container);
      index = this.children.indexOf(oldChild);
      this.children.splice(index, 1, newChild);
      return this.emitter.emit('did-replace-child', {
        oldChild: oldChild,
        newChild: newChild,
        index: index
      });
    };

    PaneAxis.prototype.insertChildBefore = function(currentChild, newChild) {
      var index;
      index = this.children.indexOf(currentChild);
      return this.addChild(newChild, index);
    };

    PaneAxis.prototype.insertChildAfter = function(currentChild, newChild) {
      var index;
      index = this.children.indexOf(currentChild);
      return this.addChild(newChild, index + 1);
    };

    PaneAxis.prototype.reparentLastChild = function() {
      this.parent.replaceChild(this, this.children[0]);
      return this.destroy();
    };

    PaneAxis.prototype.subscribeToChild = function(child) {
      var subscription;
      subscription = child.onDidDestroy((function(_this) {
        return function() {
          return _this.removeChild(child);
        };
      })(this));
      this.subscriptionsByChild.set(child, subscription);
      return this.subscriptions.add(subscription);
    };

    PaneAxis.prototype.unsubscribeFromChild = function(child) {
      var subscription;
      subscription = this.subscriptionsByChild.get(child);
      this.subscriptions.remove(subscription);
      return subscription.dispose();
    };

    PaneAxis.prototype.destroyed = function() {
      this.subscriptions.dispose();
      this.emitter.emit('did-destroy');
      return this.emitter.dispose();
    };

    return PaneAxis;

  })(Model);

}).call(this);

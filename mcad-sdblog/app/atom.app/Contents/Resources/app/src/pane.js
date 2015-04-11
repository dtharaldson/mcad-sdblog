(function() {
  var Emitter, Grim, Model, Pane, PaneAxis, Serializable, TextEditor, compact, extend, find, last, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ref = require('underscore-plus'), find = _ref.find, compact = _ref.compact, extend = _ref.extend, last = _ref.last;

  Emitter = require('event-kit').Emitter;

  Serializable = require('serializable');

  Grim = require('grim');

  Model = require('./model');

  PaneAxis = require('./pane-axis');

  TextEditor = require('./text-editor');

  module.exports = Pane = (function(_super) {
    __extends(Pane, _super);

    atom.deserializers.add(Pane);

    Serializable.includeInto(Pane);

    function Pane(params) {
      var _ref1;
      Pane.__super__.constructor.apply(this, arguments);
      if (!Grim.includeDeprecatedAPIs) {
        this.container = params != null ? params.container : void 0;
        this.activeItem = params != null ? params.activeItem : void 0;
      }
      this.emitter = new Emitter;
      this.itemSubscriptions = new WeakMap;
      this.items = [];
      this.addItems(compact((_ref1 = params != null ? params.items : void 0) != null ? _ref1 : []));
      if (this.getActiveItem() == null) {
        this.setActiveItem(this.items[0]);
      }
    }

    Pane.prototype.serializeParams = function() {
      var activeItemURI, _ref1, _ref2;
      if (typeof ((_ref1 = this.activeItem) != null ? _ref1.getURI : void 0) === 'function') {
        activeItemURI = this.activeItem.getURI();
      } else if (Grim.includeDeprecatedAPIs && typeof ((_ref2 = this.activeItem) != null ? _ref2.getUri : void 0) === 'function') {
        activeItemURI = this.activeItem.getUri();
      }
      return {
        id: this.id,
        items: compact(this.items.map(function(item) {
          return typeof item.serialize === "function" ? item.serialize() : void 0;
        })),
        activeItemURI: activeItemURI,
        focused: this.focused
      };
    };

    Pane.prototype.deserializeParams = function(params) {
      var activeItemURI, activeItemUri, items;
      items = params.items, activeItemURI = params.activeItemURI, activeItemUri = params.activeItemUri;
      if (activeItemURI == null) {
        activeItemURI = activeItemUri;
      }
      params.items = compact(items.map(function(itemState) {
        return atom.deserializers.deserialize(itemState);
      }));
      params.activeItem = find(params.items, function(item) {
        var itemURI;
        if (typeof item.getURI === 'function') {
          itemURI = item.getURI();
        } else if (Grim.includeDeprecatedAPIs && typeof item.getUri === 'function') {
          itemURI = item.getUri();
        }
        return itemURI === activeItemURI;
      });
      return params;
    };

    Pane.prototype.getParent = function() {
      return this.parent;
    };

    Pane.prototype.setParent = function(parent) {
      this.parent = parent;
      return this.parent;
    };

    Pane.prototype.getContainer = function() {
      return this.container;
    };

    Pane.prototype.setContainer = function(container) {
      if (container !== this.container) {
        this.container = container;
        return container.didAddPane({
          pane: this
        });
      }
    };


    /*
    Section: Event Subscription
     */

    Pane.prototype.onDidActivate = function(callback) {
      return this.emitter.on('did-activate', callback);
    };

    Pane.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };

    Pane.prototype.onDidChangeActive = function(callback) {
      return this.container.onDidChangeActivePane((function(_this) {
        return function(activePane) {
          return callback(_this === activePane);
        };
      })(this));
    };

    Pane.prototype.observeActive = function(callback) {
      callback(this.isActive());
      return this.onDidChangeActive(callback);
    };

    Pane.prototype.onDidAddItem = function(callback) {
      return this.emitter.on('did-add-item', callback);
    };

    Pane.prototype.onDidRemoveItem = function(callback) {
      return this.emitter.on('did-remove-item', callback);
    };

    Pane.prototype.onDidMoveItem = function(callback) {
      return this.emitter.on('did-move-item', callback);
    };

    Pane.prototype.observeItems = function(callback) {
      var item, _i, _len, _ref1;
      _ref1 = this.getItems();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        item = _ref1[_i];
        callback(item);
      }
      return this.onDidAddItem(function(_arg) {
        var item;
        item = _arg.item;
        return callback(item);
      });
    };

    Pane.prototype.onDidChangeActiveItem = function(callback) {
      return this.emitter.on('did-change-active-item', callback);
    };

    Pane.prototype.observeActiveItem = function(callback) {
      callback(this.getActiveItem());
      return this.onDidChangeActiveItem(callback);
    };

    Pane.prototype.onWillDestroyItem = function(callback) {
      return this.emitter.on('will-destroy-item', callback);
    };

    Pane.prototype.focus = function() {
      this.focused = true;
      if (!this.isActive()) {
        return this.activate();
      }
    };

    Pane.prototype.blur = function() {
      this.focused = false;
      return true;
    };

    Pane.prototype.isFocused = function() {
      return this.focused;
    };

    Pane.prototype.getPanes = function() {
      return [this];
    };

    Pane.prototype.unsubscribeFromItem = function(item) {
      var _ref1;
      if ((_ref1 = this.itemSubscriptions.get(item)) != null) {
        _ref1.dispose();
      }
      return this.itemSubscriptions["delete"](item);
    };


    /*
    Section: Items
     */

    Pane.prototype.getItems = function() {
      return this.items.slice();
    };

    Pane.prototype.getActiveItem = function() {
      return this.activeItem;
    };

    Pane.prototype.setActiveItem = function(activeItem) {
      if (activeItem !== this.activeItem) {
        this.activeItem = activeItem;
        this.emitter.emit('did-change-active-item', this.activeItem);
      }
      return this.activeItem;
    };

    Pane.prototype.getActiveEditor = function() {
      if (this.activeItem instanceof TextEditor) {
        return this.activeItem;
      }
    };

    Pane.prototype.itemAtIndex = function(index) {
      return this.items[index];
    };

    Pane.prototype.activateNextItem = function() {
      var index;
      index = this.getActiveItemIndex();
      if (index < this.items.length - 1) {
        return this.activateItemAtIndex(index + 1);
      } else {
        return this.activateItemAtIndex(0);
      }
    };

    Pane.prototype.activatePreviousItem = function() {
      var index;
      index = this.getActiveItemIndex();
      if (index > 0) {
        return this.activateItemAtIndex(index - 1);
      } else {
        return this.activateItemAtIndex(this.items.length - 1);
      }
    };

    Pane.prototype.moveItemRight = function() {
      var index, rightItemIndex;
      index = this.getActiveItemIndex();
      rightItemIndex = index + 1;
      if (!(rightItemIndex > this.items.length - 1)) {
        return this.moveItem(this.getActiveItem(), rightItemIndex);
      }
    };

    Pane.prototype.moveItemLeft = function() {
      var index, leftItemIndex;
      index = this.getActiveItemIndex();
      leftItemIndex = index - 1;
      if (!(leftItemIndex < 0)) {
        return this.moveItem(this.getActiveItem(), leftItemIndex);
      }
    };

    Pane.prototype.getActiveItemIndex = function() {
      return this.items.indexOf(this.activeItem);
    };

    Pane.prototype.activateItemAtIndex = function(index) {
      return this.activateItem(this.itemAtIndex(index));
    };

    Pane.prototype.activateItem = function(item) {
      if (item != null) {
        this.addItem(item);
        return this.setActiveItem(item);
      }
    };

    Pane.prototype.addItem = function(item, index) {
      if (index == null) {
        index = this.getActiveItemIndex() + 1;
      }
      if (__indexOf.call(this.items, item) >= 0) {
        return;
      }
      if (typeof item.onDidDestroy === 'function') {
        this.itemSubscriptions.set(item, item.onDidDestroy((function(_this) {
          return function() {
            return _this.removeItem(item, true);
          };
        })(this)));
      } else if (Grim.includeDeprecatedAPIs && typeof item.on === 'function') {
        this.subscribe(item, 'destroyed', (function(_this) {
          return function() {
            return _this.removeItem(item, true);
          };
        })(this));
      }
      this.items.splice(index, 0, item);
      if (Grim.includeDeprecatedAPIs) {
        this.emit('item-added', item, index);
      }
      this.emitter.emit('did-add-item', {
        item: item,
        index: index
      });
      if (this.getActiveItem() == null) {
        this.setActiveItem(item);
      }
      return item;
    };

    Pane.prototype.addItems = function(items, index) {
      var i, item, _i, _len;
      if (index == null) {
        index = this.getActiveItemIndex() + 1;
      }
      items = items.filter((function(_this) {
        return function(item) {
          return !(__indexOf.call(_this.items, item) >= 0);
        };
      })(this));
      for (i = _i = 0, _len = items.length; _i < _len; i = ++_i) {
        item = items[i];
        this.addItem(item, index + i);
      }
      return items;
    };

    Pane.prototype.removeItem = function(item, destroyed) {
      var index, _ref1;
      if (destroyed == null) {
        destroyed = false;
      }
      index = this.items.indexOf(item);
      if (index === -1) {
        return;
      }
      if (Grim.includeDeprecatedAPIs && typeof item.on === 'function') {
        this.unsubscribe(item);
      }
      this.unsubscribeFromItem(item);
      if (item === this.activeItem) {
        if (this.items.length === 1) {
          this.setActiveItem(void 0);
        } else if (index === 0) {
          this.activateNextItem();
        } else {
          this.activatePreviousItem();
        }
      }
      this.items.splice(index, 1);
      if (Grim.includeDeprecatedAPIs) {
        this.emit('item-removed', item, index, destroyed);
      }
      this.emitter.emit('did-remove-item', {
        item: item,
        index: index,
        destroyed: destroyed
      });
      if (destroyed) {
        if ((_ref1 = this.container) != null) {
          _ref1.didDestroyPaneItem({
            item: item,
            index: index,
            pane: this
          });
        }
      }
      if (this.items.length === 0 && atom.config.get('core.destroyEmptyPanes')) {
        return this.destroy();
      }
    };

    Pane.prototype.moveItem = function(item, newIndex) {
      var oldIndex;
      oldIndex = this.items.indexOf(item);
      this.items.splice(oldIndex, 1);
      this.items.splice(newIndex, 0, item);
      if (Grim.includeDeprecatedAPIs) {
        this.emit('item-moved', item, newIndex);
      }
      return this.emitter.emit('did-move-item', {
        item: item,
        oldIndex: oldIndex,
        newIndex: newIndex
      });
    };

    Pane.prototype.moveItemToPane = function(item, pane, index) {
      this.removeItem(item);
      return pane.addItem(item, index);
    };

    Pane.prototype.destroyActiveItem = function() {
      this.destroyItem(this.activeItem);
      return false;
    };

    Pane.prototype.destroyItem = function(item) {
      var index, _ref1;
      index = this.items.indexOf(item);
      if (index !== -1) {
        if (Grim.includeDeprecatedAPIs) {
          this.emit('before-item-destroyed', item);
        }
        this.emitter.emit('will-destroy-item', {
          item: item,
          index: index
        });
        if ((_ref1 = this.container) != null) {
          _ref1.willDestroyPaneItem({
            item: item,
            index: index,
            pane: this
          });
        }
        if (this.promptToSaveItem(item)) {
          this.removeItem(item, true);
          if (typeof item.destroy === "function") {
            item.destroy();
          }
          return true;
        } else {
          return false;
        }
      }
    };

    Pane.prototype.destroyItems = function() {
      var item, _i, _len, _ref1;
      _ref1 = this.getItems();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        item = _ref1[_i];
        this.destroyItem(item);
      }
    };

    Pane.prototype.destroyInactiveItems = function() {
      var item, _i, _len, _ref1;
      _ref1 = this.getItems();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        item = _ref1[_i];
        if (item !== this.activeItem) {
          this.destroyItem(item);
        }
      }
    };

    Pane.prototype.promptToSaveItem = function(item, options) {
      var chosen, uri, _ref1;
      if (options == null) {
        options = {};
      }
      if (!(typeof item.shouldPromptToSave === "function" ? item.shouldPromptToSave(options) : void 0)) {
        return true;
      }
      if (typeof item.getURI === 'function') {
        uri = item.getURI();
      } else if (typeof item.getUri === 'function') {
        uri = item.getUri();
      } else {
        return true;
      }
      chosen = atom.confirm({
        message: "'" + ((_ref1 = typeof item.getTitle === "function" ? item.getTitle() : void 0) != null ? _ref1 : uri) + "' has changes, do you want to save them?",
        detailedMessage: "Your changes will be lost if you close this item without saving.",
        buttons: ["Save", "Cancel", "Don't Save"]
      });
      switch (chosen) {
        case 0:
          return this.saveItem(item, function() {
            return true;
          });
        case 1:
          return false;
        case 2:
          return true;
      }
    };

    Pane.prototype.saveActiveItem = function(nextAction) {
      return this.saveItem(this.getActiveItem(), nextAction);
    };

    Pane.prototype.saveActiveItemAs = function(nextAction) {
      return this.saveItemAs(this.getActiveItem(), nextAction);
    };

    Pane.prototype.saveItem = function(item, nextAction) {
      var error, itemURI;
      if (typeof (item != null ? item.getURI : void 0) === 'function') {
        itemURI = item.getURI();
      } else if (typeof (item != null ? item.getUri : void 0) === 'function') {
        itemURI = item.getUri();
      }
      if (itemURI != null) {
        try {
          if (typeof item.save === "function") {
            item.save();
          }
        } catch (_error) {
          error = _error;
          this.handleSaveError(error);
        }
        return typeof nextAction === "function" ? nextAction() : void 0;
      } else {
        return this.saveItemAs(item, nextAction);
      }
    };

    Pane.prototype.saveItemAs = function(item, nextAction) {
      var error, itemPath, newItemPath;
      if ((item != null ? item.saveAs : void 0) == null) {
        return;
      }
      itemPath = typeof item.getPath === "function" ? item.getPath() : void 0;
      newItemPath = atom.showSaveDialogSync(itemPath);
      if (newItemPath) {
        try {
          item.saveAs(newItemPath);
        } catch (_error) {
          error = _error;
          this.handleSaveError(error);
        }
        return typeof nextAction === "function" ? nextAction() : void 0;
      }
    };

    Pane.prototype.saveItems = function() {
      var item, _i, _len, _ref1;
      _ref1 = this.getItems();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        item = _ref1[_i];
        this.saveItem(item);
      }
    };

    Pane.prototype.itemForURI = function(uri) {
      return find(this.items, function(item) {
        var itemUri;
        if (typeof item.getURI === 'function') {
          itemUri = item.getURI();
        } else if (typeof item.getUri === 'function') {
          itemUri = item.getUri();
        }
        return itemUri === uri;
      });
    };

    Pane.prototype.activateItemForURI = function(uri) {
      var item;
      if (item = this.itemForURI(uri)) {
        this.activateItem(item);
        return true;
      } else {
        return false;
      }
    };

    Pane.prototype.copyActiveItem = function() {
      var _base, _ref1;
      if (this.activeItem != null) {
        return (_ref1 = typeof (_base = this.activeItem).copy === "function" ? _base.copy() : void 0) != null ? _ref1 : atom.deserializers.deserialize(this.activeItem.serialize());
      }
    };


    /*
    Section: Lifecycle
     */

    Pane.prototype.isActive = function() {
      var _ref1;
      return ((_ref1 = this.container) != null ? _ref1.getActivePane() : void 0) === this;
    };

    Pane.prototype.activate = function() {
      var _ref1;
      if (this.isDestroyed()) {
        throw new Error("Pane has been destroyed");
      }
      if ((_ref1 = this.container) != null) {
        _ref1.setActivePane(this);
      }
      if (Grim.includeDeprecatedAPIs) {
        this.emit('activated');
      }
      return this.emitter.emit('did-activate');
    };

    Pane.prototype.destroy = function() {
      var _ref1;
      if (((_ref1 = this.container) != null ? _ref1.isAlive() : void 0) && this.container.getPanes().length === 1) {
        return this.destroyItems();
      } else {
        return Pane.__super__.destroy.apply(this, arguments);
      }
    };

    Pane.prototype.destroyed = function() {
      var item, _i, _len, _ref1, _ref2;
      if (this.isActive()) {
        this.container.activateNextPane();
      }
      this.emitter.emit('did-destroy');
      this.emitter.dispose();
      _ref1 = this.items.slice();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        item = _ref1[_i];
        if (typeof item.destroy === "function") {
          item.destroy();
        }
      }
      return (_ref2 = this.container) != null ? _ref2.didDestroyPane({
        pane: this
      }) : void 0;
    };


    /*
    Section: Splitting
     */

    Pane.prototype.splitLeft = function(params) {
      return this.split('horizontal', 'before', params);
    };

    Pane.prototype.splitRight = function(params) {
      return this.split('horizontal', 'after', params);
    };

    Pane.prototype.splitUp = function(params) {
      return this.split('vertical', 'before', params);
    };

    Pane.prototype.splitDown = function(params) {
      return this.split('vertical', 'after', params);
    };

    Pane.prototype.split = function(orientation, side, params) {
      var newPane;
      if (params != null ? params.copyActiveItem : void 0) {
        if (params.items == null) {
          params.items = [];
        }
        params.items.push(this.copyActiveItem());
      }
      if (this.parent.orientation !== orientation) {
        this.parent.replaceChild(this, new PaneAxis({
          container: this.container,
          orientation: orientation,
          children: [this]
        }));
      }
      newPane = new this.constructor(params);
      switch (side) {
        case 'before':
          this.parent.insertChildBefore(this, newPane);
          break;
        case 'after':
          this.parent.insertChildAfter(this, newPane);
      }
      newPane.activate();
      return newPane;
    };

    Pane.prototype.findLeftmostSibling = function() {
      var leftmostSibling;
      if (this.parent.orientation === 'horizontal') {
        leftmostSibling = this.parent.children[0];
        if (leftmostSibling instanceof PaneAxis) {
          return this;
        } else {
          return leftmostSibling;
        }
      } else {
        return this;
      }
    };

    Pane.prototype.findOrCreateRightmostSibling = function() {
      var rightmostSibling;
      if (this.parent.orientation === 'horizontal') {
        rightmostSibling = last(this.parent.children);
        if (rightmostSibling instanceof PaneAxis) {
          return this.splitRight();
        } else {
          return rightmostSibling;
        }
      } else {
        return this.splitRight();
      }
    };

    Pane.prototype.close = function() {
      if (this.confirmClose()) {
        return this.destroy();
      }
    };

    Pane.prototype.confirmClose = function() {
      var item, _i, _len, _ref1;
      _ref1 = this.getItems();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        item = _ref1[_i];
        if (!this.promptToSaveItem(item)) {
          return false;
        }
      }
      return true;
    };

    Pane.prototype.handleSaveError = function(error) {
      var errorMatch, fileName, _ref1;
      if (error.code === 'EISDIR' || error.message.endsWith('is a directory')) {
        return atom.notifications.addWarning("Unable to save file: " + error.message);
      } else if (error.code === 'EACCES' && (error.path != null)) {
        return atom.notifications.addWarning("Unable to save file: Permission denied '" + error.path + "'");
      } else if (((_ref1 = error.code) === 'EPERM' || _ref1 === 'EBUSY' || _ref1 === 'UNKNOWN' || _ref1 === 'EEXIST') && (error.path != null)) {
        return atom.notifications.addWarning("Unable to save file '" + error.path + "'", {
          detail: error.message
        });
      } else if (error.code === 'EROFS' && (error.path != null)) {
        return atom.notifications.addWarning("Unable to save file: Read-only file system '" + error.path + "'");
      } else if (error.code === 'ENOSPC' && (error.path != null)) {
        return atom.notifications.addWarning("Unable to save file: No space left on device '" + error.path + "'");
      } else if (errorMatch = /ENOTDIR, not a directory '([^']+)'/.exec(error.message)) {
        fileName = errorMatch[1];
        return atom.notifications.addWarning("Unable to save file: A directory in the path '" + fileName + "' could not be written to");
      } else {
        throw error;
      }
    };

    return Pane;

  })(Model);

  if (Grim.includeDeprecatedAPIs) {
    Pane.properties({
      container: void 0,
      activeItem: void 0,
      focused: false
    });
    Pane.behavior('active', function() {
      return this.$container["switch"](function(container) {
        return container != null ? container.$activePane : void 0;
      }).map((function(_this) {
        return function(activePane) {
          return activePane === _this;
        };
      })(this)).distinctUntilChanged();
    });
    Pane.prototype.on = function(eventName) {
      switch (eventName) {
        case 'activated':
          Grim.deprecate("Use Pane::onDidActivate instead");
          break;
        case 'destroyed':
          Grim.deprecate("Use Pane::onDidDestroy instead");
          break;
        case 'item-added':
          Grim.deprecate("Use Pane::onDidAddItem instead");
          break;
        case 'item-removed':
          Grim.deprecate("Use Pane::onDidRemoveItem instead");
          break;
        case 'item-moved':
          Grim.deprecate("Use Pane::onDidMoveItem instead");
          break;
        case 'before-item-destroyed':
          Grim.deprecate("Use Pane::onWillDestroyItem instead");
          break;
        default:
          Grim.deprecate("Subscribing via ::on is deprecated. Use documented event subscription methods instead.");
      }
      return Pane.__super__.on.apply(this, arguments);
    };
    Pane.prototype.behavior = function(behaviorName) {
      switch (behaviorName) {
        case 'active':
          Grim.deprecate("The $active behavior property is deprecated. Use ::observeActive or ::onDidChangeActive instead.");
          break;
        case 'container':
          Grim.deprecate("The $container behavior property is deprecated.");
          break;
        case 'activeItem':
          Grim.deprecate("The $activeItem behavior property is deprecated. Use ::observeActiveItem or ::onDidChangeActiveItem instead.");
          break;
        case 'focused':
          Grim.deprecate("The $focused behavior property is deprecated.");
          break;
        default:
          Grim.deprecate("Pane::behavior is deprecated. Use event subscription methods instead.");
      }
      return Pane.__super__.behavior.apply(this, arguments);
    };
    Pane.prototype.itemForUri = function(uri) {
      Grim.deprecate("Use `::itemForURI` instead.");
      return this.itemForURI(uri);
    };
    Pane.prototype.activateItemForUri = function(uri) {
      Grim.deprecate("Use `::activateItemForURI` instead.");
      return this.activateItemForURI(uri);
    };
  } else {
    Pane.prototype.container = void 0;
    Pane.prototype.activeItem = void 0;
    Pane.prototype.focused = void 0;
  }

}).call(this);

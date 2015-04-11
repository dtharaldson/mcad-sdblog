(function() {
  var $, CompositeDisposable, Delegator, Pane, PaneView, PropertyAccessors, View, deprecate, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  _ref = require('./space-pen-extensions'), $ = _ref.$, View = _ref.View;

  Delegator = require('delegato');

  deprecate = require('grim').deprecate;

  CompositeDisposable = require('event-kit').CompositeDisposable;

  PropertyAccessors = require('property-accessors');

  Pane = require('./pane');

  module.exports = PaneView = (function(_super) {
    __extends(PaneView, _super);

    Delegator.includeInto(PaneView);

    PropertyAccessors.includeInto(PaneView);

    PaneView.delegatesProperties('items', 'activeItem', {
      toProperty: 'model'
    });

    PaneView.delegatesMethods('getItems', 'activateNextItem', 'activatePreviousItem', 'getActiveItemIndex', 'activateItemAtIndex', 'activateItem', 'addItem', 'itemAtIndex', 'moveItem', 'moveItemToPane', 'destroyItem', 'destroyItems', 'destroyActiveItem', 'destroyInactiveItems', 'saveActiveItem', 'saveActiveItemAs', 'saveItem', 'saveItemAs', 'saveItems', 'itemForUri', 'activateItemForUri', 'promptToSaveItem', 'copyActiveItem', 'isActive', 'activate', 'getActiveItem', {
      toProperty: 'model'
    });

    PaneView.prototype.previousActiveItem = null;

    PaneView.prototype.attached = false;

    function PaneView(element) {
      this.element = element;
      this.activeItemModifiedChanged = __bind(this.activeItemModifiedChanged, this);
      this.activeItemTitleChanged = __bind(this.activeItemTitleChanged, this);
      this.onBeforeItemDestroyed = __bind(this.onBeforeItemDestroyed, this);
      this.onItemMoved = __bind(this.onItemMoved, this);
      this.onItemRemoved = __bind(this.onItemRemoved, this);
      this.onItemAdded = __bind(this.onItemAdded, this);
      this.onActiveItemChanged = __bind(this.onActiveItemChanged, this);
      this.onActiveStatusChanged = __bind(this.onActiveStatusChanged, this);
      this.onPaneDestroyed = __bind(this.onPaneDestroyed, this);
      this.itemViews = $(element.itemViews);
      PaneView.__super__.constructor.apply(this, arguments);
    }

    PaneView.prototype.setModel = function(model) {
      this.model = model;
      this.subscriptions = new CompositeDisposable;
      this.subscriptions.add(this.model.observeActiveItem(this.onActiveItemChanged));
      this.subscriptions.add(this.model.onDidAddItem(this.onItemAdded));
      this.subscriptions.add(this.model.onDidRemoveItem(this.onItemRemoved));
      this.subscriptions.add(this.model.onDidMoveItem(this.onItemMoved));
      this.subscriptions.add(this.model.onWillDestroyItem(this.onBeforeItemDestroyed));
      this.subscriptions.add(this.model.observeActive(this.onActiveStatusChanged));
      return this.subscriptions.add(this.model.onDidDestroy(this.onPaneDestroyed));
    };

    PaneView.prototype.afterAttach = function() {
      if (this.container == null) {
        this.container = this.closest('atom-pane-container').view();
      }
      if (!this.attached) {
        this.trigger('pane:attached', [this]);
      }
      return this.attached = true;
    };

    PaneView.prototype.onPaneDestroyed = function() {
      var _ref1;
      if ((_ref1 = this.container) != null) {
        _ref1.trigger('pane:removed', [this]);
      }
      return this.subscriptions.dispose();
    };

    PaneView.prototype.remove = function() {
      if (!this.model.isDestroyed()) {
        return this.model.destroy();
      }
    };

    PaneView.prototype.getModel = function() {
      return this.model;
    };

    PaneView.prototype.removeItem = function(item) {
      deprecate("Use PaneView::destroyItem instead");
      return this.destroyItem(item);
    };

    PaneView.prototype.showItem = function(item) {
      deprecate("Use PaneView::activateItem instead");
      return this.activateItem(item);
    };

    PaneView.prototype.showItemForUri = function(item) {
      deprecate("Use PaneView::activateItemForUri instead");
      return this.activateItemForUri(item);
    };

    PaneView.prototype.showItemAtIndex = function(index) {
      deprecate("Use PaneView::activateItemAtIndex instead");
      return this.activateItemAtIndex(index);
    };

    PaneView.prototype.showNextItem = function() {
      deprecate("Use PaneView::activateNextItem instead");
      return this.activateNextItem();
    };

    PaneView.prototype.showPreviousItem = function() {
      deprecate("Use PaneView::activatePreviousItem instead");
      return this.activatePreviousItem();
    };

    PaneView.prototype.onActiveStatusChanged = function(active) {
      if (active) {
        return this.trigger('pane:became-active');
      } else {
        return this.trigger('pane:became-inactive');
      }
    };

    PaneView.prototype.getNextPane = function() {
      var nextIndex, panes, _ref1;
      panes = (_ref1 = this.container) != null ? _ref1.getPaneViews() : void 0;
      if (!(panes.length > 1)) {
        return;
      }
      nextIndex = (panes.indexOf(this) + 1) % panes.length;
      return panes[nextIndex];
    };

    PaneView.prototype.getActivePaneItem = function() {
      return this.activeItem;
    };

    PaneView.prototype.onActiveItemChanged = function(item) {
      var disposable, _ref1;
      if (this.activeItemDisposables != null) {
        this.activeItemDisposables.dispose();
      }
      this.activeItemDisposables = new CompositeDisposable();
      if (((_ref1 = this.previousActiveItem) != null ? _ref1.off : void 0) != null) {
        this.previousActiveItem.off('title-changed', this.activeItemTitleChanged);
        this.previousActiveItem.off('modified-status-changed', this.activeItemModifiedChanged);
      }
      this.previousActiveItem = item;
      if (item == null) {
        return;
      }
      if (item.onDidChangeTitle != null) {
        disposable = item.onDidChangeTitle(this.activeItemTitleChanged);
        if ((disposable != null ? disposable.dispose : void 0) == null) {
          deprecate('Please return a Disposable object from your ::onDidChangeTitle method!');
        }
        if ((disposable != null ? disposable.dispose : void 0) != null) {
          this.activeItemDisposables.add(disposable);
        }
      } else if (item.on != null) {
        deprecate('If you would like your pane item to support title change behavior, please implement a ::onDidChangeTitle() method. ::on methods for items are no longer supported. If not, ignore this message.');
        disposable = item.on('title-changed', this.activeItemTitleChanged);
        if ((disposable != null ? disposable.dispose : void 0) != null) {
          this.activeItemDisposables.add(disposable);
        }
      }
      if (item.onDidChangeModified != null) {
        disposable = item.onDidChangeModified(this.activeItemModifiedChanged);
        if ((disposable != null ? disposable.dispose : void 0) == null) {
          deprecate('Please return a Disposable object from your ::onDidChangeModified method!');
        }
        if ((disposable != null ? disposable.dispose : void 0) != null) {
          this.activeItemDisposables.add(disposable);
        }
      } else if (item.on != null) {
        deprecate('If you would like your pane item to support modified behavior, please implement a ::onDidChangeModified() method. If not, ignore this message. ::on methods for items are no longer supported.');
        item.on('modified-status-changed', this.activeItemModifiedChanged);
        if ((disposable != null ? disposable.dispose : void 0) != null) {
          this.activeItemDisposables.add(disposable);
        }
      }
      return this.trigger('pane:active-item-changed', [item]);
    };

    PaneView.prototype.onItemAdded = function(_arg) {
      var index, item;
      item = _arg.item, index = _arg.index;
      return this.trigger('pane:item-added', [item, index]);
    };

    PaneView.prototype.onItemRemoved = function(_arg) {
      var destroyed, index, item;
      item = _arg.item, index = _arg.index, destroyed = _arg.destroyed;
      return this.trigger('pane:item-removed', [item, index]);
    };

    PaneView.prototype.onItemMoved = function(_arg) {
      var item, newIndex;
      item = _arg.item, newIndex = _arg.newIndex;
      return this.trigger('pane:item-moved', [item, newIndex]);
    };

    PaneView.prototype.onBeforeItemDestroyed = function(_arg) {
      var item;
      item = _arg.item;
      if (typeof item.off === 'function') {
        this.unsubscribe(item);
      }
      return this.trigger('pane:before-item-destroyed', [item]);
    };

    PaneView.prototype.activeItemTitleChanged = function() {
      return this.trigger('pane:active-item-title-changed');
    };

    PaneView.prototype.activeItemModifiedChanged = function() {
      return this.trigger('pane:active-item-modified-status-changed');
    };

    PaneView.prototype.accessor('activeView', function() {
      var element, _ref1;
      element = atom.views.getView(this.activeItem);
      return (_ref1 = $(element).view()) != null ? _ref1 : element;
    });

    PaneView.prototype.splitLeft = function() {
      var items;
      items = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return atom.views.getView(this.model.splitLeft({
        items: items
      })).__spacePenView;
    };

    PaneView.prototype.splitRight = function() {
      var items;
      items = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return atom.views.getView(this.model.splitRight({
        items: items
      })).__spacePenView;
    };

    PaneView.prototype.splitUp = function() {
      var items;
      items = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return atom.views.getView(this.model.splitUp({
        items: items
      })).__spacePenView;
    };

    PaneView.prototype.splitDown = function() {
      var items;
      items = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return atom.views.getView(this.model.splitDown({
        items: items
      })).__spacePenView;
    };

    PaneView.prototype.getContainer = function() {
      return this.closest('atom-pane-container').view();
    };

    PaneView.prototype.focus = function() {
      return this.element.focus();
    };

    return PaneView;

  })(View);

}).call(this);

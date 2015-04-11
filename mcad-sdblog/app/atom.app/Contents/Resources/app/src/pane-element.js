(function() {
  var $, CompositeDisposable, Grim, PaneElement, PaneView, callAttachHooks, callRemoveHooks, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CompositeDisposable = require('event-kit').CompositeDisposable;

  Grim = require('grim');

  _ref = require('./space-pen-extensions'), $ = _ref.$, callAttachHooks = _ref.callAttachHooks, callRemoveHooks = _ref.callRemoveHooks;

  PaneView = null;

  PaneElement = (function(_super) {
    __extends(PaneElement, _super);

    function PaneElement() {
      return PaneElement.__super__.constructor.apply(this, arguments);
    }

    PaneElement.prototype.attached = false;

    PaneElement.prototype.createdCallback = function() {
      this.attached = false;
      this.subscriptions = new CompositeDisposable;
      this.inlineDisplayStyles = new WeakMap;
      this.initializeContent();
      this.subscribeToDOMEvents();
      if (Grim.includeDeprecatedAPIs) {
        return this.createSpacePenShim();
      }
    };

    PaneElement.prototype.attachedCallback = function() {
      this.attached = true;
      if (this.model.isFocused()) {
        return this.focus();
      }
    };

    PaneElement.prototype.detachedCallback = function() {
      return this.attached = false;
    };

    PaneElement.prototype.initializeContent = function() {
      this.setAttribute('class', 'pane');
      this.setAttribute('tabindex', -1);
      this.appendChild(this.itemViews = document.createElement('div'));
      return this.itemViews.setAttribute('class', 'item-views');
    };

    PaneElement.prototype.subscribeToDOMEvents = function() {
      var handleBlur, handleFocus;
      handleFocus = (function(_this) {
        return function(event) {
          var view;
          _this.model.focus();
          if (event.target === _this && (view = _this.getActiveView())) {
            view.focus();
            return event.stopPropagation();
          }
        };
      })(this);
      handleBlur = (function(_this) {
        return function(event) {
          if (!_this.contains(event.relatedTarget)) {
            return _this.model.blur();
          }
        };
      })(this);
      this.addEventListener('focus', handleFocus, true);
      return this.addEventListener('blur', handleBlur, true);
    };

    PaneElement.prototype.createSpacePenShim = function() {
      if (PaneView == null) {
        PaneView = require('./pane-view');
      }
      return this.__spacePenView = new PaneView(this);
    };

    PaneElement.prototype.initialize = function(model) {
      this.model = model;
      this.subscriptions.add(this.model.onDidActivate(this.activated.bind(this)));
      this.subscriptions.add(this.model.observeActive(this.activeStatusChanged.bind(this)));
      this.subscriptions.add(this.model.observeActiveItem(this.activeItemChanged.bind(this)));
      this.subscriptions.add(this.model.onDidRemoveItem(this.itemRemoved.bind(this)));
      this.subscriptions.add(this.model.onDidDestroy(this.paneDestroyed.bind(this)));
      if (Grim.includeDeprecatedAPIs) {
        this.__spacePenView.setModel(this.model);
      }
      return this;
    };

    PaneElement.prototype.getModel = function() {
      return this.model;
    };

    PaneElement.prototype.activated = function() {
      return this.focus();
    };

    PaneElement.prototype.activeStatusChanged = function(active) {
      if (active) {
        return this.classList.add('active');
      } else {
        return this.classList.remove('active');
      }
    };

    PaneElement.prototype.activeItemChanged = function(item) {
      var child, hasFocus, itemView, _i, _len, _ref1;
      if (item == null) {
        return;
      }
      hasFocus = this.hasFocus();
      itemView = atom.views.getView(item);
      if (!this.itemViews.contains(itemView)) {
        this.itemViews.appendChild(itemView);
        callAttachHooks(itemView);
      }
      _ref1 = this.itemViews.children;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        child = _ref1[_i];
        if (child === itemView) {
          if (this.attached) {
            this.showItemView(child);
          }
        } else {
          this.hideItemView(child);
        }
      }
      if (hasFocus) {
        return itemView.focus();
      }
    };

    PaneElement.prototype.showItemView = function(itemView) {
      var inlineDisplayStyle;
      inlineDisplayStyle = this.inlineDisplayStyles.get(itemView);
      if (inlineDisplayStyle != null) {
        return itemView.style.display = inlineDisplayStyle;
      } else {
        return itemView.style.display = '';
      }
    };

    PaneElement.prototype.hideItemView = function(itemView) {
      var inlineDisplayStyle;
      inlineDisplayStyle = itemView.style.display;
      if (inlineDisplayStyle !== 'none') {
        if (inlineDisplayStyle != null) {
          this.inlineDisplayStyles.set(itemView, inlineDisplayStyle);
        }
        return itemView.style.display = 'none';
      }
    };

    PaneElement.prototype.itemRemoved = function(_arg) {
      var destroyed, index, item, viewToRemove;
      item = _arg.item, index = _arg.index, destroyed = _arg.destroyed;
      if (viewToRemove = atom.views.getView(item)) {
        if (destroyed) {
          callRemoveHooks(viewToRemove);
        }
        return viewToRemove.remove();
      }
    };

    PaneElement.prototype.paneDestroyed = function() {
      return this.subscriptions.dispose();
    };

    PaneElement.prototype.getActiveView = function() {
      return atom.views.getView(this.model.getActiveItem());
    };

    PaneElement.prototype.hasFocus = function() {
      return this === document.activeElement || this.contains(document.activeElement);
    };

    return PaneElement;

  })(HTMLElement);

  atom.commands.add('atom-pane', {
    'pane:save-items': function() {
      return this.getModel().saveItems();
    },
    'pane:show-next-item': function() {
      return this.getModel().activateNextItem();
    },
    'pane:show-previous-item': function() {
      return this.getModel().activatePreviousItem();
    },
    'pane:show-item-1': function() {
      return this.getModel().activateItemAtIndex(0);
    },
    'pane:show-item-2': function() {
      return this.getModel().activateItemAtIndex(1);
    },
    'pane:show-item-3': function() {
      return this.getModel().activateItemAtIndex(2);
    },
    'pane:show-item-4': function() {
      return this.getModel().activateItemAtIndex(3);
    },
    'pane:show-item-5': function() {
      return this.getModel().activateItemAtIndex(4);
    },
    'pane:show-item-6': function() {
      return this.getModel().activateItemAtIndex(5);
    },
    'pane:show-item-7': function() {
      return this.getModel().activateItemAtIndex(6);
    },
    'pane:show-item-8': function() {
      return this.getModel().activateItemAtIndex(7);
    },
    'pane:show-item-9': function() {
      return this.getModel().activateItemAtIndex(8);
    },
    'pane:move-item-right': function() {
      return this.getModel().moveItemRight();
    },
    'pane:move-item-left': function() {
      return this.getModel().moveItemLeft();
    },
    'pane:split-left': function() {
      return this.getModel().splitLeft({
        copyActiveItem: true
      });
    },
    'pane:split-right': function() {
      return this.getModel().splitRight({
        copyActiveItem: true
      });
    },
    'pane:split-up': function() {
      return this.getModel().splitUp({
        copyActiveItem: true
      });
    },
    'pane:split-down': function() {
      return this.getModel().splitDown({
        copyActiveItem: true
      });
    },
    'pane:close': function() {
      return this.getModel().close();
    },
    'pane:close-other-items': function() {
      return this.getModel().destroyInactiveItems();
    }
  });

  module.exports = PaneElement = document.registerElement('atom-pane', {
    prototype: PaneElement.prototype
  });

}).call(this);

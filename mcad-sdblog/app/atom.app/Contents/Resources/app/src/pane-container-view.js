(function() {
  var $, CompositeDisposable, Delegator, PaneContainer, PaneContainerView, PaneView, View, callAttachHooks, deprecate, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  deprecate = require('grim').deprecate;

  Delegator = require('delegato');

  CompositeDisposable = require('event-kit').CompositeDisposable;

  _ref = require('./space-pen-extensions'), $ = _ref.$, View = _ref.View, callAttachHooks = _ref.callAttachHooks;

  PaneView = require('./pane-view');

  PaneContainer = require('./pane-container');

  module.exports = PaneContainerView = (function(_super) {
    __extends(PaneContainerView, _super);

    Delegator.includeInto(PaneContainerView);

    PaneContainerView.delegatesMethod('saveAll', {
      toProperty: 'model'
    });

    PaneContainerView.content = function() {
      return this.div({
        "class": 'panes'
      });
    };

    function PaneContainerView(element) {
      this.element = element;
      this.onActivePaneItemChanged = __bind(this.onActivePaneItemChanged, this);
      PaneContainerView.__super__.constructor.apply(this, arguments);
      this.subscriptions = new CompositeDisposable;
    }

    PaneContainerView.prototype.setModel = function(model) {
      this.model = model;
      return this.subscriptions.add(this.model.onDidChangeActivePaneItem(this.onActivePaneItemChanged));
    };

    PaneContainerView.prototype.getRoot = function() {
      var view, _ref1;
      view = atom.views.getView(this.model.getRoot());
      return (_ref1 = view.__spacePenView) != null ? _ref1 : view;
    };

    PaneContainerView.prototype.onActivePaneItemChanged = function(activeItem) {
      return this.trigger('pane-container:active-pane-item-changed', [activeItem]);
    };

    PaneContainerView.prototype.confirmClose = function() {
      return this.model.confirmClose();
    };

    PaneContainerView.prototype.getPaneViews = function() {
      return this.find('atom-pane').views();
    };

    PaneContainerView.prototype.indexOfPane = function(paneView) {
      return this.getPaneViews().indexOf(paneView.view());
    };

    PaneContainerView.prototype.paneAtIndex = function(index) {
      return this.getPaneViews()[index];
    };

    PaneContainerView.prototype.eachPaneView = function(callback) {
      var paneView, paneViewAttached, _i, _len, _ref1;
      _ref1 = this.getPaneViews();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        paneView = _ref1[_i];
        callback(paneView);
      }
      paneViewAttached = function(e) {
        return callback($(e.target).view());
      };
      this.on('pane:attached', paneViewAttached);
      return {
        off: (function(_this) {
          return function() {
            return _this.off('pane:attached', paneViewAttached);
          };
        })(this)
      };
    };

    PaneContainerView.prototype.getFocusedPane = function() {
      return this.find('atom-pane:has(:focus)').view();
    };

    PaneContainerView.prototype.getActivePane = function() {
      deprecate("Use PaneContainerView::getActivePaneView instead.");
      return this.getActivePaneView();
    };

    PaneContainerView.prototype.getActivePaneView = function() {
      return atom.views.getView(this.model.getActivePane()).__spacePenView;
    };

    PaneContainerView.prototype.getActivePaneItem = function() {
      return this.model.getActivePaneItem();
    };

    PaneContainerView.prototype.getActiveView = function() {
      var _ref1;
      return (_ref1 = this.getActivePaneView()) != null ? _ref1.activeView : void 0;
    };

    PaneContainerView.prototype.paneForUri = function(uri) {
      return atom.views.getView(this.model.paneForURI(uri)).__spacePenView;
    };

    PaneContainerView.prototype.focusNextPaneView = function() {
      return this.model.activateNextPane();
    };

    PaneContainerView.prototype.focusPreviousPaneView = function() {
      return this.model.activatePreviousPane();
    };

    PaneContainerView.prototype.focusPaneViewAbove = function() {
      return this.element.focusPaneViewAbove();
    };

    PaneContainerView.prototype.focusPaneViewBelow = function() {
      return this.element.focusPaneViewBelow();
    };

    PaneContainerView.prototype.focusPaneViewOnLeft = function() {
      return this.element.focusPaneViewOnLeft();
    };

    PaneContainerView.prototype.focusPaneViewOnRight = function() {
      return this.element.focusPaneViewOnRight();
    };

    PaneContainerView.prototype.getPanes = function() {
      deprecate("Use PaneContainerView::getPaneViews() instead");
      return this.getPaneViews();
    };

    return PaneContainerView;

  })(View);

}).call(this);

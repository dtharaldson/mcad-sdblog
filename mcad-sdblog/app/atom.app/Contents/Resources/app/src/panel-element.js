(function() {
  var CompositeDisposable, Panel, PanelElement, callAttachHooks,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CompositeDisposable = require('event-kit').CompositeDisposable;

  callAttachHooks = require('./space-pen-extensions').callAttachHooks;

  Panel = require('./panel');

  PanelElement = (function(_super) {
    __extends(PanelElement, _super);

    function PanelElement() {
      return PanelElement.__super__.constructor.apply(this, arguments);
    }

    PanelElement.prototype.createdCallback = function() {
      return this.subscriptions = new CompositeDisposable;
    };

    PanelElement.prototype.initialize = function(model) {
      var _ref;
      this.model = model;
      this.appendChild(this.getItemView());
      if (this.model.getClassName() != null) {
        (_ref = this.classList).add.apply(_ref, this.model.getClassName().split(' '));
      }
      this.subscriptions.add(this.model.onDidChangeVisible(this.visibleChanged.bind(this)));
      this.subscriptions.add(this.model.onDidDestroy(this.destroyed.bind(this)));
      return this;
    };

    PanelElement.prototype.getModel = function() {
      return this.model != null ? this.model : this.model = new Panel;
    };

    PanelElement.prototype.getItemView = function() {
      return atom.views.getView(this.getModel().getItem());
    };

    PanelElement.prototype.attachedCallback = function() {
      callAttachHooks(this.getItemView());
      return this.visibleChanged(this.getModel().isVisible());
    };

    PanelElement.prototype.visibleChanged = function(visible) {
      if (visible) {
        return this.style.display = null;
      } else {
        return this.style.display = 'none';
      }
    };

    PanelElement.prototype.destroyed = function() {
      var _ref;
      this.subscriptions.dispose();
      return (_ref = this.parentNode) != null ? _ref.removeChild(this) : void 0;
    };

    return PanelElement;

  })(HTMLElement);

  module.exports = PanelElement = document.registerElement('atom-panel', {
    prototype: PanelElement.prototype
  });

}).call(this);

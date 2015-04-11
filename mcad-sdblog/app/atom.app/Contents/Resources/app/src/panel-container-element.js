(function() {
  var CompositeDisposable, PanelContainerElement,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CompositeDisposable = require('event-kit').CompositeDisposable;

  PanelContainerElement = (function(_super) {
    __extends(PanelContainerElement, _super);

    function PanelContainerElement() {
      return PanelContainerElement.__super__.constructor.apply(this, arguments);
    }

    PanelContainerElement.prototype.createdCallback = function() {
      return this.subscriptions = new CompositeDisposable;
    };

    PanelContainerElement.prototype.initialize = function(model) {
      this.model = model;
      this.subscriptions.add(this.model.onDidAddPanel(this.panelAdded.bind(this)));
      this.subscriptions.add(this.model.onDidRemovePanel(this.panelRemoved.bind(this)));
      this.subscriptions.add(this.model.onDidDestroy(this.destroyed.bind(this)));
      this.classList.add(this.model.getLocation());
      return this;
    };

    PanelContainerElement.prototype.getModel = function() {
      return this.model;
    };

    PanelContainerElement.prototype.panelAdded = function(_arg) {
      var index, panel, panelElement, referenceItem;
      panel = _arg.panel, index = _arg.index;
      panelElement = atom.views.getView(panel);
      panelElement.classList.add(this.model.getLocation());
      if (this.model.isModal()) {
        panelElement.classList.add("overlay", "from-top");
      } else {
        panelElement.classList.add("tool-panel", "panel-" + (this.model.getLocation()));
      }
      if (index >= this.childNodes.length) {
        this.appendChild(panelElement);
      } else {
        referenceItem = this.childNodes[index];
        this.insertBefore(panelElement, referenceItem);
      }
      if (this.model.isModal()) {
        this.hideAllPanelsExcept(panel);
        return this.subscriptions.add(panel.onDidChangeVisible((function(_this) {
          return function(visible) {
            if (visible) {
              return _this.hideAllPanelsExcept(panel);
            }
          };
        })(this)));
      }
    };

    PanelContainerElement.prototype.panelRemoved = function(_arg) {
      var index, panel;
      panel = _arg.panel, index = _arg.index;
      return this.removeChild(atom.views.getView(panel));
    };

    PanelContainerElement.prototype.destroyed = function() {
      var _ref;
      this.subscriptions.dispose();
      return (_ref = this.parentNode) != null ? _ref.removeChild(this) : void 0;
    };

    PanelContainerElement.prototype.hideAllPanelsExcept = function(excludedPanel) {
      var panel, _i, _len, _ref;
      _ref = this.model.getPanels();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        panel = _ref[_i];
        if (panel !== excludedPanel) {
          panel.hide();
        }
      }
    };

    return PanelContainerElement;

  })(HTMLElement);

  module.exports = PanelContainerElement = document.registerElement('atom-panel-container', {
    prototype: PanelContainerElement.prototype
  });

}).call(this);

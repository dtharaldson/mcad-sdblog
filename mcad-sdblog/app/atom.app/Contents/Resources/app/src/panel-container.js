(function() {
  var CompositeDisposable, Emitter, PanelContainer, _ref;

  _ref = require('event-kit'), Emitter = _ref.Emitter, CompositeDisposable = _ref.CompositeDisposable;

  module.exports = PanelContainer = (function() {
    function PanelContainer(_arg) {
      this.location = (_arg != null ? _arg : {}).location;
      this.emitter = new Emitter;
      this.subscriptions = new CompositeDisposable;
      this.panels = [];
    }

    PanelContainer.prototype.destroy = function() {
      var panel, _i, _len, _ref1;
      _ref1 = this.getPanels();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        panel = _ref1[_i];
        panel.destroy();
      }
      this.subscriptions.dispose();
      this.emitter.emit('did-destroy', this);
      return this.emitter.dispose();
    };


    /*
    Section: Event Subscription
     */

    PanelContainer.prototype.onDidAddPanel = function(callback) {
      return this.emitter.on('did-add-panel', callback);
    };

    PanelContainer.prototype.onDidRemovePanel = function(callback) {
      return this.emitter.on('did-remove-panel', callback);
    };

    PanelContainer.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };


    /*
    Section: Panels
     */

    PanelContainer.prototype.getLocation = function() {
      return this.location;
    };

    PanelContainer.prototype.isModal = function() {
      return this.location === 'modal';
    };

    PanelContainer.prototype.getPanels = function() {
      return this.panels;
    };

    PanelContainer.prototype.addPanel = function(panel) {
      var index;
      this.subscriptions.add(panel.onDidDestroy(this.panelDestroyed.bind(this)));
      index = this.getPanelIndex(panel);
      if (index === this.panels.length) {
        this.panels.push(panel);
      } else {
        this.panels.splice(index, 0, panel);
      }
      this.emitter.emit('did-add-panel', {
        panel: panel,
        index: index
      });
      return panel;
    };

    PanelContainer.prototype.panelForItem = function(item) {
      var panel, _i, _len, _ref1;
      _ref1 = this.panels;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        panel = _ref1[_i];
        if (panel.getItem() === item) {
          return panel;
        }
      }
      return null;
    };

    PanelContainer.prototype.panelDestroyed = function(panel) {
      var index;
      index = this.panels.indexOf(panel);
      if (index > -1) {
        this.panels.splice(index, 1);
        return this.emitter.emit('did-remove-panel', {
          panel: panel,
          index: index
        });
      }
    };

    PanelContainer.prototype.getPanelIndex = function(panel) {
      var i, p, priority, _i, _j, _len, _ref1, _ref2, _ref3;
      priority = panel.getPriority();
      if ((_ref1 = this.location) === 'bottom' || _ref1 === 'right') {
        _ref2 = this.panels;
        for (i = _i = _ref2.length - 1; _i >= 0; i = _i += -1) {
          p = _ref2[i];
          if (priority < p.getPriority()) {
            return i + 1;
          }
        }
        return 0;
      } else {
        _ref3 = this.panels;
        for (i = _j = 0, _len = _ref3.length; _j < _len; i = ++_j) {
          p = _ref3[i];
          if (priority < p.getPriority()) {
            return i;
          }
        }
        return this.panels.length;
      }
    };

    return PanelContainer;

  })();

}).call(this);

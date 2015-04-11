(function() {
  var CompositeDisposable, PaneAxisElement, callAttachHooks,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CompositeDisposable = require('event-kit').CompositeDisposable;

  callAttachHooks = require('./space-pen-extensions').callAttachHooks;

  PaneAxisElement = (function(_super) {
    __extends(PaneAxisElement, _super);

    function PaneAxisElement() {
      return PaneAxisElement.__super__.constructor.apply(this, arguments);
    }

    PaneAxisElement.prototype.createdCallback = function() {
      return this.subscriptions = new CompositeDisposable;
    };

    PaneAxisElement.prototype.detachedCallback = function() {
      return this.subscriptions.dispose();
    };

    PaneAxisElement.prototype.initialize = function(model) {
      var child, index, _i, _len, _ref;
      this.model = model;
      this.subscriptions.add(this.model.onDidAddChild(this.childAdded.bind(this)));
      this.subscriptions.add(this.model.onDidRemoveChild(this.childRemoved.bind(this)));
      this.subscriptions.add(this.model.onDidReplaceChild(this.childReplaced.bind(this)));
      _ref = this.model.getChildren();
      for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
        child = _ref[index];
        this.childAdded({
          child: child,
          index: index
        });
      }
      switch (this.model.getOrientation()) {
        case 'horizontal':
          this.classList.add('horizontal', 'pane-row');
          break;
        case 'vertical':
          this.classList.add('vertical', 'pane-column');
      }
      return this;
    };

    PaneAxisElement.prototype.childAdded = function(_arg) {
      var child, index, view;
      child = _arg.child, index = _arg.index;
      view = atom.views.getView(child);
      this.insertBefore(view, this.children[index]);
      return callAttachHooks(view);
    };

    PaneAxisElement.prototype.childRemoved = function(_arg) {
      var child, view;
      child = _arg.child;
      view = atom.views.getView(child);
      return view.remove();
    };

    PaneAxisElement.prototype.childReplaced = function(_arg) {
      var focusedElement, index, newChild, oldChild;
      index = _arg.index, oldChild = _arg.oldChild, newChild = _arg.newChild;
      if (this.hasFocus()) {
        focusedElement = document.activeElement;
      }
      this.childRemoved({
        child: oldChild,
        index: index
      });
      this.childAdded({
        child: newChild,
        index: index
      });
      if (document.activeElement === document.body) {
        return focusedElement != null ? focusedElement.focus() : void 0;
      }
    };

    PaneAxisElement.prototype.hasFocus = function() {
      return this === document.activeElement || this.contains(document.activeElement);
    };

    return PaneAxisElement;

  })(HTMLElement);

  module.exports = PaneAxisElement = document.registerElement('atom-pane-axis', {
    prototype: PaneAxisElement.prototype
  });

}).call(this);

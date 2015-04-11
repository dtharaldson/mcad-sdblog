(function() {
  var CompositeDisposable, Grim, PaneContainerElement, PaneContainerView, callAttachHooks, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CompositeDisposable = require('event-kit').CompositeDisposable;

  Grim = require('grim');

  callAttachHooks = require('./space-pen-extensions').callAttachHooks;

  PaneContainerView = null;

  _ = require('underscore-plus');

  module.exports = PaneContainerElement = (function(_super) {
    __extends(PaneContainerElement, _super);

    function PaneContainerElement() {
      return PaneContainerElement.__super__.constructor.apply(this, arguments);
    }

    PaneContainerElement.prototype.createdCallback = function() {
      this.subscriptions = new CompositeDisposable;
      this.classList.add('panes');
      if (Grim.includeDeprecatedAPIs) {
        if (PaneContainerView == null) {
          PaneContainerView = require('./pane-container-view');
        }
        return this.__spacePenView = new PaneContainerView(this);
      }
    };

    PaneContainerElement.prototype.initialize = function(model) {
      this.model = model;
      this.subscriptions.add(this.model.observeRoot(this.rootChanged.bind(this)));
      if (Grim.includeDeprecatedAPIs) {
        this.__spacePenView.setModel(this.model);
      }
      return this;
    };

    PaneContainerElement.prototype.rootChanged = function(root) {
      var focusedElement, view, _ref;
      if (this.hasFocus()) {
        focusedElement = document.activeElement;
      }
      if ((_ref = this.firstChild) != null) {
        _ref.remove();
      }
      if (root != null) {
        view = atom.views.getView(root);
        this.appendChild(view);
        callAttachHooks(view);
        return focusedElement != null ? focusedElement.focus() : void 0;
      }
    };

    PaneContainerElement.prototype.hasFocus = function() {
      return this === document.activeElement || this.contains(document.activeElement);
    };

    PaneContainerElement.prototype.focusPaneViewAbove = function() {
      var _ref;
      return (_ref = this.nearestPaneInDirection('above')) != null ? _ref.focus() : void 0;
    };

    PaneContainerElement.prototype.focusPaneViewBelow = function() {
      var _ref;
      return (_ref = this.nearestPaneInDirection('below')) != null ? _ref.focus() : void 0;
    };

    PaneContainerElement.prototype.focusPaneViewOnLeft = function() {
      var _ref;
      return (_ref = this.nearestPaneInDirection('left')) != null ? _ref.focus() : void 0;
    };

    PaneContainerElement.prototype.focusPaneViewOnRight = function() {
      var _ref;
      return (_ref = this.nearestPaneInDirection('right')) != null ? _ref.focus() : void 0;
    };

    PaneContainerElement.prototype.nearestPaneInDirection = function(direction) {
      var box, distance, paneView, paneViews;
      distance = function(pointA, pointB) {
        var x, y;
        x = pointB.x - pointA.x;
        y = pointB.y - pointA.y;
        return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
      };
      paneView = atom.views.getView(this.model.getActivePane());
      box = this.boundingBoxForPaneView(paneView);
      paneViews = _.toArray(this.querySelectorAll('atom-pane')).filter((function(_this) {
        return function(otherPaneView) {
          var otherBox;
          otherBox = _this.boundingBoxForPaneView(otherPaneView);
          switch (direction) {
            case 'left':
              return otherBox.right.x <= box.left.x;
            case 'right':
              return otherBox.left.x >= box.right.x;
            case 'above':
              return otherBox.bottom.y <= box.top.y;
            case 'below':
              return otherBox.top.y >= box.bottom.y;
          }
        };
      })(this)).sort((function(_this) {
        return function(paneViewA, paneViewB) {
          var boxA, boxB;
          boxA = _this.boundingBoxForPaneView(paneViewA);
          boxB = _this.boundingBoxForPaneView(paneViewB);
          switch (direction) {
            case 'left':
              return distance(box.left, boxA.right) - distance(box.left, boxB.right);
            case 'right':
              return distance(box.right, boxA.left) - distance(box.right, boxB.left);
            case 'above':
              return distance(box.top, boxA.bottom) - distance(box.top, boxB.bottom);
            case 'below':
              return distance(box.bottom, boxA.top) - distance(box.bottom, boxB.top);
          }
        };
      })(this));
      return paneViews[0];
    };

    PaneContainerElement.prototype.boundingBoxForPaneView = function(paneView) {
      var boundingBox;
      boundingBox = paneView.getBoundingClientRect();
      return {
        left: {
          x: boundingBox.left,
          y: boundingBox.top
        },
        right: {
          x: boundingBox.right,
          y: boundingBox.top
        },
        top: {
          x: boundingBox.left,
          y: boundingBox.top
        },
        bottom: {
          x: boundingBox.left,
          y: boundingBox.bottom
        }
      };
    };

    return PaneContainerElement;

  })(HTMLElement);

  module.exports = PaneContainerElement = document.registerElement('atom-pane-container', {
    prototype: PaneContainerElement.prototype
  });

}).call(this);

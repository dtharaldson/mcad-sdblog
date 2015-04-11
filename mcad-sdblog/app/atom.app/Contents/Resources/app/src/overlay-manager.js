(function() {
  var OverlayManager;

  module.exports = OverlayManager = (function() {
    function OverlayManager(presenter, container) {
      this.presenter = presenter;
      this.container = container;
      this.overlaysById = {};
    }

    OverlayManager.prototype.render = function(state) {
      var decorationId, id, overlay, overlayNode, _ref, _ref1, _results;
      _ref = state.content.overlays;
      for (decorationId in _ref) {
        overlay = _ref[decorationId];
        if (this.shouldUpdateOverlay(decorationId, overlay)) {
          this.renderOverlay(state, decorationId, overlay);
        }
      }
      _ref1 = this.overlaysById;
      _results = [];
      for (id in _ref1) {
        overlayNode = _ref1[id].overlayNode;
        if (!state.content.overlays.hasOwnProperty(id)) {
          delete this.overlaysById[id];
          _results.push(overlayNode.remove());
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    OverlayManager.prototype.shouldUpdateOverlay = function(decorationId, overlay) {
      var cachedOverlay, _ref, _ref1, _ref2, _ref3;
      cachedOverlay = this.overlaysById[decorationId];
      if (cachedOverlay == null) {
        return true;
      }
      return ((_ref = cachedOverlay.pixelPosition) != null ? _ref.top : void 0) !== ((_ref1 = overlay.pixelPosition) != null ? _ref1.top : void 0) || ((_ref2 = cachedOverlay.pixelPosition) != null ? _ref2.left : void 0) !== ((_ref3 = overlay.pixelPosition) != null ? _ref3.left : void 0);
    };

    OverlayManager.prototype.measureOverlays = function() {
      var decorationId, itemView, _ref, _results;
      _ref = this.overlaysById;
      _results = [];
      for (decorationId in _ref) {
        itemView = _ref[decorationId].itemView;
        _results.push(this.measureOverlay(decorationId, itemView));
      }
      return _results;
    };

    OverlayManager.prototype.measureOverlay = function(decorationId, itemView) {
      var contentMargin, _ref;
      contentMargin = (_ref = parseInt(getComputedStyle(itemView)['margin-left'])) != null ? _ref : 0;
      return this.presenter.setOverlayDimensions(decorationId, itemView.offsetWidth, itemView.offsetHeight, contentMargin);
    };

    OverlayManager.prototype.renderOverlay = function(state, decorationId, _arg) {
      var cachedOverlay, item, itemView, overlayNode, pixelPosition;
      item = _arg.item, pixelPosition = _arg.pixelPosition;
      itemView = atom.views.getView(item);
      cachedOverlay = this.overlaysById[decorationId];
      if (!(overlayNode = cachedOverlay != null ? cachedOverlay.overlayNode : void 0)) {
        overlayNode = document.createElement('atom-overlay');
        this.container.appendChild(overlayNode);
        this.overlaysById[decorationId] = cachedOverlay = {
          overlayNode: overlayNode,
          itemView: itemView
        };
      }
      if (overlayNode.childNodes.length === 0) {
        overlayNode.appendChild(itemView);
      }
      cachedOverlay.pixelPosition = pixelPosition;
      overlayNode.style.top = pixelPosition.top + 'px';
      return overlayNode.style.left = pixelPosition.left + 'px';
    };

    return OverlayManager;

  })();

}).call(this);

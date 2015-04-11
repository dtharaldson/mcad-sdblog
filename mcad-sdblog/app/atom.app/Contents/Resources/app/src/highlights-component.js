(function() {
  var HighlightsComponent, RegionStyleProperties, SpaceRegex;

  RegionStyleProperties = ['top', 'left', 'right', 'width', 'height'];

  SpaceRegex = /\s+/;

  module.exports = HighlightsComponent = (function() {
    HighlightsComponent.prototype.oldState = null;

    function HighlightsComponent() {
      var insertionPoint;
      this.highlightNodesById = {};
      this.regionNodesByHighlightId = {};
      this.domNode = document.createElement('div');
      this.domNode.classList.add('highlights');
      if (atom.config.get('editor.useShadowDOM')) {
        insertionPoint = document.createElement('content');
        insertionPoint.setAttribute('select', '.underlayer');
        this.domNode.appendChild(insertionPoint);
      }
    }

    HighlightsComponent.prototype.updateSync = function(state) {
      var highlightNode, highlightState, id, newState;
      newState = state.content.highlights;
      if (this.oldState == null) {
        this.oldState = {};
      }
      for (id in this.oldState) {
        if (newState[id] == null) {
          this.highlightNodesById[id].remove();
          delete this.highlightNodesById[id];
          delete this.regionNodesByHighlightId[id];
          delete this.oldState[id];
        }
      }
      for (id in newState) {
        highlightState = newState[id];
        if (this.oldState[id] == null) {
          highlightNode = document.createElement('div');
          highlightNode.classList.add('highlight');
          this.highlightNodesById[id] = highlightNode;
          this.regionNodesByHighlightId[id] = {};
          this.domNode.appendChild(highlightNode);
        }
        this.updateHighlightNode(id, highlightState);
      }
    };

    HighlightsComponent.prototype.updateHighlightNode = function(id, newHighlightState) {
      var highlightNode, oldHighlightState, _base, _ref, _ref1;
      highlightNode = this.highlightNodesById[id];
      oldHighlightState = ((_base = this.oldState)[id] != null ? _base[id] : _base[id] = {
        regions: [],
        flashCount: 0
      });
      if (newHighlightState["class"] !== oldHighlightState["class"]) {
        if (oldHighlightState["class"] != null) {
          if (SpaceRegex.test(oldHighlightState["class"])) {
            (_ref = highlightNode.classList).remove.apply(_ref, oldHighlightState["class"].split(SpaceRegex));
          } else {
            highlightNode.classList.remove(oldHighlightState["class"]);
          }
        }
        if (SpaceRegex.test(newHighlightState["class"])) {
          (_ref1 = highlightNode.classList).add.apply(_ref1, newHighlightState["class"].split(SpaceRegex));
        } else {
          highlightNode.classList.add(newHighlightState["class"]);
        }
        oldHighlightState["class"] = newHighlightState["class"];
      }
      this.updateHighlightRegions(id, newHighlightState);
      return this.flashHighlightNodeIfRequested(id, newHighlightState);
    };

    HighlightsComponent.prototype.updateHighlightRegions = function(id, newHighlightState) {
      var highlightNode, i, newRegionState, oldHighlightState, oldRegionState, property, regionNode, _i, _j, _len, _len1, _ref;
      oldHighlightState = this.oldState[id];
      highlightNode = this.highlightNodesById[id];
      while (oldHighlightState.regions.length > newHighlightState.regions.length) {
        oldHighlightState.regions.pop();
        this.regionNodesByHighlightId[id][oldHighlightState.regions.length].remove();
        delete this.regionNodesByHighlightId[id][oldHighlightState.regions.length];
      }
      _ref = newHighlightState.regions;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        newRegionState = _ref[i];
        if (oldHighlightState.regions[i] == null) {
          oldHighlightState.regions[i] = {};
          regionNode = document.createElement('div');
          regionNode.classList.add('region');
          if (newHighlightState.deprecatedRegionClass != null) {
            regionNode.classList.add(newHighlightState.deprecatedRegionClass);
          }
          this.regionNodesByHighlightId[id][i] = regionNode;
          highlightNode.appendChild(regionNode);
        }
        oldRegionState = oldHighlightState.regions[i];
        regionNode = this.regionNodesByHighlightId[id][i];
        for (_j = 0, _len1 = RegionStyleProperties.length; _j < _len1; _j++) {
          property = RegionStyleProperties[_j];
          if (newRegionState[property] !== oldRegionState[property]) {
            oldRegionState[property] = newRegionState[property];
            if (newRegionState[property] != null) {
              regionNode.style[property] = newRegionState[property] + 'px';
            } else {
              regionNode.style[property] = '';
            }
          }
        }
      }
    };

    HighlightsComponent.prototype.flashHighlightNodeIfRequested = function(id, newHighlightState) {
      var addFlashClass, highlightNode, oldHighlightState, removeFlashClass;
      oldHighlightState = this.oldState[id];
      if (!(newHighlightState.flashCount > oldHighlightState.flashCount)) {
        return;
      }
      highlightNode = this.highlightNodesById[id];
      addFlashClass = (function(_this) {
        return function() {
          highlightNode.classList.add(newHighlightState.flashClass);
          oldHighlightState.flashClass = newHighlightState.flashClass;
          return _this.flashTimeoutId = setTimeout(removeFlashClass, newHighlightState.flashDuration);
        };
      })(this);
      removeFlashClass = (function(_this) {
        return function() {
          highlightNode.classList.remove(oldHighlightState.flashClass);
          oldHighlightState.flashClass = null;
          return clearTimeout(_this.flashTimeoutId);
        };
      })(this);
      if (oldHighlightState.flashClass != null) {
        removeFlashClass();
        requestAnimationFrame(addFlashClass);
      } else {
        addFlashClass();
      }
      return oldHighlightState.flashCount = newHighlightState.flashCount;
    };

    return HighlightsComponent;

  })();

}).call(this);

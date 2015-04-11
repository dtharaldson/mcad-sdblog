(function() {
  var CursorsComponent;

  module.exports = CursorsComponent = (function() {
    CursorsComponent.prototype.oldState = null;

    function CursorsComponent() {
      this.cursorNodesById = {};
      this.domNode = document.createElement('div');
      this.domNode.classList.add('cursors');
    }

    CursorsComponent.prototype.updateSync = function(state) {
      var cursorNode, cursorState, id, newState, _ref;
      newState = state.content;
      if (this.oldState == null) {
        this.oldState = {
          cursors: {}
        };
      }
      if (newState.cursorsVisible !== this.oldState.cursorsVisible) {
        if (newState.cursorsVisible) {
          this.domNode.classList.remove('blink-off');
        } else {
          this.domNode.classList.add('blink-off');
        }
        this.oldState.cursorsVisible = newState.cursorsVisible;
      }
      for (id in this.oldState.cursors) {
        if (newState.cursors[id] == null) {
          this.cursorNodesById[id].remove();
          delete this.cursorNodesById[id];
          delete this.oldState.cursors[id];
        }
      }
      _ref = newState.cursors;
      for (id in _ref) {
        cursorState = _ref[id];
        if (this.oldState.cursors[id] == null) {
          cursorNode = document.createElement('div');
          cursorNode.classList.add('cursor');
          this.cursorNodesById[id] = cursorNode;
          this.domNode.appendChild(cursorNode);
        }
        this.updateCursorNode(id, cursorState);
      }
    };

    CursorsComponent.prototype.updateCursorNode = function(id, newCursorState) {
      var cursorNode, oldCursorState, _base;
      cursorNode = this.cursorNodesById[id];
      oldCursorState = ((_base = this.oldState.cursors)[id] != null ? _base[id] : _base[id] = {});
      if (newCursorState.top !== oldCursorState.top || newCursorState.left !== oldCursorState.left) {
        cursorNode.style['-webkit-transform'] = "translate(" + newCursorState.left + "px, " + newCursorState.top + "px)";
        oldCursorState.top = newCursorState.top;
        oldCursorState.left = newCursorState.left;
      }
      if (newCursorState.height !== oldCursorState.height) {
        cursorNode.style.height = newCursorState.height + 'px';
        oldCursorState.height = newCursorState.height;
      }
      if (newCursorState.width !== oldCursorState.width) {
        cursorNode.style.width = newCursorState.width + 'px';
        return oldCursorState.width = newCursorState.width;
      }
    };

    return CursorsComponent;

  })();

}).call(this);

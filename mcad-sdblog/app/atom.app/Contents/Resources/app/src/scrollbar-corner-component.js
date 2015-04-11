(function() {
  var ScrollbarCornerComponent;

  module.exports = ScrollbarCornerComponent = (function() {
    function ScrollbarCornerComponent() {
      this.domNode = document.createElement('div');
      this.domNode.classList.add('scrollbar-corner');
      this.contentNode = document.createElement('div');
      this.domNode.appendChild(this.contentNode);
    }

    ScrollbarCornerComponent.prototype.updateSync = function(state) {
      var newHorizontalState, newVerticalState;
      if (this.oldState == null) {
        this.oldState = {};
      }
      if (this.newState == null) {
        this.newState = {};
      }
      newHorizontalState = state.horizontalScrollbar;
      newVerticalState = state.verticalScrollbar;
      this.newState.visible = newHorizontalState.visible && newVerticalState.visible;
      this.newState.height = newHorizontalState.height;
      this.newState.width = newVerticalState.width;
      if (this.newState.visible !== this.oldState.visible) {
        if (this.newState.visible) {
          this.domNode.style.display = '';
        } else {
          this.domNode.style.display = 'none';
        }
        this.oldState.visible = this.newState.visible;
      }
      if (this.newState.height !== this.oldState.height) {
        this.domNode.style.height = this.newState.height + 'px';
        this.contentNode.style.height = this.newState.height + 1 + 'px';
        this.oldState.height = this.newState.height;
      }
      if (this.newState.width !== this.oldState.width) {
        this.domNode.style.width = this.newState.width + 'px';
        this.contentNode.style.width = this.newState.width + 1 + 'px';
        return this.oldState.width = this.newState.width;
      }
    };

    return ScrollbarCornerComponent;

  })();

}).call(this);

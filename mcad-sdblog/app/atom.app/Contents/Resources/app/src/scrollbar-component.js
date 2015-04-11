(function() {
  var ScrollbarComponent,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  module.exports = ScrollbarComponent = (function() {
    function ScrollbarComponent(_arg) {
      this.orientation = _arg.orientation, this.onScroll = _arg.onScroll;
      this.onScrollCallback = __bind(this.onScrollCallback, this);
      this.domNode = document.createElement('div');
      this.domNode.classList.add("" + this.orientation + "-scrollbar");
      this.domNode.style['-webkit-transform'] = 'translateZ(0)';
      if (this.orientation === 'horizontal') {
        this.domNode.style.left = 0;
      }
      this.contentNode = document.createElement('div');
      this.contentNode.classList.add("scrollbar-content");
      this.domNode.appendChild(this.contentNode);
      this.domNode.addEventListener('scroll', this.onScrollCallback);
    }

    ScrollbarComponent.prototype.updateSync = function(state) {
      if (this.oldState == null) {
        this.oldState = {};
      }
      switch (this.orientation) {
        case 'vertical':
          this.newState = state.verticalScrollbar;
          this.updateVertical();
          break;
        case 'horizontal':
          this.newState = state.horizontalScrollbar;
          this.updateHorizontal();
      }
      if (this.newState.visible !== this.oldState.visible) {
        if (this.newState.visible) {
          this.domNode.style.display = '';
        } else {
          this.domNode.style.display = 'none';
        }
        return this.oldState.visible = this.newState.visible;
      }
    };

    ScrollbarComponent.prototype.updateVertical = function() {
      if (this.newState.width !== this.oldState.width) {
        this.domNode.style.width = this.newState.width + 'px';
        this.oldState.width = this.newState.width;
      }
      if (this.newState.bottom !== this.oldState.bottom) {
        this.domNode.style.bottom = this.newState.bottom + 'px';
        this.oldState.bottom = this.newState.bottom;
      }
      if (this.newState.scrollHeight !== this.oldState.scrollHeight) {
        this.contentNode.style.height = this.newState.scrollHeight + 'px';
        this.oldState.scrollHeight = this.newState.scrollHeight;
      }
      if (this.newState.scrollTop !== this.oldState.scrollTop) {
        this.domNode.scrollTop = this.newState.scrollTop;
        return this.oldState.scrollTop = this.newState.scrollTop;
      }
    };

    ScrollbarComponent.prototype.updateHorizontal = function() {
      if (this.newState.height !== this.oldState.height) {
        this.domNode.style.height = this.newState.height + 'px';
        this.oldState.height = this.newState.height;
      }
      if (this.newState.right !== this.oldState.right) {
        this.domNode.style.right = this.newState.right + 'px';
        this.oldState.right = this.newState.right;
      }
      if (this.newState.scrollWidth !== this.oldState.scrollWidth) {
        this.contentNode.style.width = this.newState.scrollWidth + 'px';
        this.oldState.scrollWidth = this.newState.scrollWidth;
      }
      if (this.newState.scrollLeft !== this.oldState.scrollLeft) {
        this.domNode.scrollLeft = this.newState.scrollLeft;
        return this.oldState.scrollLeft = this.newState.scrollLeft;
      }
    };

    ScrollbarComponent.prototype.onScrollCallback = function() {
      switch (this.orientation) {
        case 'vertical':
          return this.onScroll(this.domNode.scrollTop);
        case 'horizontal':
          return this.onScroll(this.domNode.scrollLeft);
      }
    };

    return ScrollbarComponent;

  })();

}).call(this);

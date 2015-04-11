(function() {
  var InputComponent;

  module.exports = InputComponent = (function() {
    function InputComponent() {
      this.domNode = document.createElement('input');
      this.domNode.classList.add('hidden-input');
      this.domNode.setAttribute('data-react-skip-selection-restoration', true);
      this.domNode.style['-webkit-transform'] = 'translateZ(0)';
      this.domNode.addEventListener('paste', function(event) {
        return event.preventDefault();
      });
    }

    InputComponent.prototype.updateSync = function(state) {
      var newState;
      if (this.oldState == null) {
        this.oldState = {};
      }
      newState = state.hiddenInput;
      if (newState.top !== this.oldState.top) {
        this.domNode.style.top = newState.top + 'px';
        this.oldState.top = newState.top;
      }
      if (newState.left !== this.oldState.left) {
        this.domNode.style.left = newState.left + 'px';
        this.oldState.left = newState.left;
      }
      if (newState.width !== this.oldState.width) {
        this.domNode.style.width = newState.width + 'px';
        this.oldState.width = newState.width;
      }
      if (newState.height !== this.oldState.height) {
        this.domNode.style.height = newState.height + 'px';
        return this.oldState.height = newState.height;
      }
    };

    return InputComponent;

  })();

}).call(this);

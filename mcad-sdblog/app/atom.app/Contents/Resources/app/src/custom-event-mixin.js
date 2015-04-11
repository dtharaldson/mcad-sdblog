(function() {
  var CustomEventMixin;

  module.exports = CustomEventMixin = {
    componentWillMount: function() {
      return this.customEventListeners = {};
    },
    componentWillUnmount: function() {
      var listener, listeners, name, _i, _j, _len, _len1, _ref;
      _ref = this.customEventListeners;
      for (listeners = _i = 0, _len = _ref.length; _i < _len; listeners = ++_i) {
        name = _ref[listeners];
        for (_j = 0, _len1 = listeners.length; _j < _len1; _j++) {
          listener = listeners[_j];
          this.getDOMNode().removeEventListener(name, listener);
        }
      }
    },
    addCustomEventListeners: function(customEventListeners) {
      var listener, name, _base;
      for (name in customEventListeners) {
        listener = customEventListeners[name];
        if ((_base = this.customEventListeners)[name] == null) {
          _base[name] = [];
        }
        this.customEventListeners[name].push(listener);
        this.getDOMNode().addEventListener(name, listener);
      }
    }
  };

}).call(this);

(function() {
  var Subscriber, SubscriberMixin;

  Subscriber = require('emissary').Subscriber;

  SubscriberMixin = {
    componentDidUnmount: function() {
      return this.unsubscribe();
    }
  };

  Subscriber.extend(SubscriberMixin);

  module.exports = SubscriberMixin;

}).call(this);

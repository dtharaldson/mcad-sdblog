(function() {
  window.measure = function(description, fn) {
    var result, start, value;
    start = Date.now();
    value = fn();
    result = Date.now() - start;
    console.log(description, result);
    return value;
  };

  window.profile = function(description, fn) {
    return measure(description, function() {
      var value;
      console.profile(description);
      value = fn();
      console.profileEnd(description);
      return value;
    });
  };

}).call(this);

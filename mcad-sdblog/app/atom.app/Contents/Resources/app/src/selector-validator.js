(function() {
  var selectorCache, testElement;

  selectorCache = null;

  testElement = null;

  exports.isSelectorValid = function(selector) {
    var cachedValue, selectorError;
    if (selectorCache == null) {
      selectorCache = {};
    }
    cachedValue = selectorCache[selector];
    if (cachedValue != null) {
      return cachedValue;
    }
    if (testElement == null) {
      testElement = document.createElement('div');
    }
    try {
      testElement.querySelector(selector);
      selectorCache[selector] = true;
      return true;
    } catch (_error) {
      selectorError = _error;
      selectorCache[selector] = false;
      return false;
    }
  };

  exports.validateSelector = function(selector) {
    var error;
    if (exports.isSelectorValid(selector)) {
      return;
    }
    error = new Error("'" + selector + "' is not a valid selector");
    error.code = 'EBADSELECTOR';
    throw error;
  };

}).call(this);

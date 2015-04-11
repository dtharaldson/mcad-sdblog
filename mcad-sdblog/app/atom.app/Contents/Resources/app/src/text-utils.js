(function() {
  var hasPairedCharacter, isCombinedCharacter, isCombiningCharacter, isHighSurrogate, isLowSurrogate, isPairedCharacter, isSurrogatePair, isVariationSelector, isVariationSequence;

  isHighSurrogate = function(charCode) {
    return (0xD800 <= charCode && charCode <= 0xDBFF);
  };

  isLowSurrogate = function(charCode) {
    return (0xDC00 <= charCode && charCode <= 0xDFFF);
  };

  isVariationSelector = function(charCode) {
    return (0xFE00 <= charCode && charCode <= 0xFE0F);
  };

  isCombiningCharacter = function(charCode) {
    return (0x0300 <= charCode && charCode <= 0x036F) || (0x1AB0 <= charCode && charCode <= 0x1AFF) || (0x1DC0 <= charCode && charCode <= 0x1DFF) || (0x20D0 <= charCode && charCode <= 0x20FF) || (0xFE20 <= charCode && charCode <= 0xFE2F);
  };

  isSurrogatePair = function(charCodeA, charCodeB) {
    return isHighSurrogate(charCodeA) && isLowSurrogate(charCodeB);
  };

  isVariationSequence = function(charCodeA, charCodeB) {
    return !isVariationSelector(charCodeA) && isVariationSelector(charCodeB);
  };

  isCombinedCharacter = function(charCodeA, charCodeB) {
    return !isCombiningCharacter(charCodeA) && isCombiningCharacter(charCodeB);
  };

  isPairedCharacter = function(string, index) {
    var charCodeA, charCodeB;
    if (index == null) {
      index = 0;
    }
    charCodeA = string.charCodeAt(index);
    charCodeB = string.charCodeAt(index + 1);
    return isSurrogatePair(charCodeA, charCodeB) || isVariationSequence(charCodeA, charCodeB) || isCombinedCharacter(charCodeA, charCodeB);
  };

  hasPairedCharacter = function(string) {
    var index;
    index = 0;
    while (index < string.length) {
      if (isPairedCharacter(string, index)) {
        return true;
      }
      index++;
    }
    return false;
  };

  module.exports = {
    isPairedCharacter: isPairedCharacter,
    hasPairedCharacter: hasPairedCharacter
  };

}).call(this);

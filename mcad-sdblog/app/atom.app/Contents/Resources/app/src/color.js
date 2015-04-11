(function() {
  var Color, ParsedColor, numberToHexString, parseAlpha, parseColor, _;

  _ = require('underscore-plus');

  ParsedColor = null;

  module.exports = Color = (function() {
    Color.parse = function(value) {
      var error, parsedColor;
      if (_.isArray(value) || _.isFunction(value)) {
        return null;
      }
      if (!(_.isObject(value) || _.isString(value))) {
        return null;
      }
      if (ParsedColor == null) {
        ParsedColor = require('color');
      }
      try {
        parsedColor = new ParsedColor(value);
      } catch (_error) {
        error = _error;
        return null;
      }
      return new Color(parsedColor.red(), parsedColor.green(), parsedColor.blue(), parsedColor.alpha());
    };

    function Color(red, green, blue, alpha) {
      Object.defineProperties(this, {
        red: {
          set: function(newRed) {
            return red = parseColor(newRed);
          },
          get: function() {
            return red;
          },
          enumerable: true,
          configurable: false
        },
        green: {
          set: function(newGreen) {
            return green = parseColor(newGreen);
          },
          get: function() {
            return green;
          },
          enumerable: true,
          configurable: false
        },
        blue: {
          set: function(newBlue) {
            return blue = parseColor(newBlue);
          },
          get: function() {
            return blue;
          },
          enumerable: true,
          configurable: false
        },
        alpha: {
          set: function(newAlpha) {
            return alpha = parseAlpha(newAlpha);
          },
          get: function() {
            return alpha;
          },
          enumerable: true,
          configurable: false
        }
      });
      this.red = red;
      this.green = green;
      this.blue = blue;
      this.alpha = alpha;
    }

    Color.prototype.toHexString = function() {
      return "#" + (numberToHexString(this.red)) + (numberToHexString(this.green)) + (numberToHexString(this.blue));
    };

    Color.prototype.toRGBAString = function() {
      return "rgba(" + this.red + ", " + this.green + ", " + this.blue + ", " + this.alpha + ")";
    };

    Color.prototype.isEqual = function(color) {
      if (this === color) {
        return true;
      }
      if (!(color instanceof Color)) {
        color = Color.parse(color);
      }
      if (color == null) {
        return false;
      }
      return color.red === this.red && color.blue === this.blue && color.green === this.green && color.alpha === this.alpha;
    };

    Color.prototype.clone = function() {
      return new Color(this.red, this.green, this.blue, this.alpha);
    };

    return Color;

  })();

  parseColor = function(color) {
    color = parseInt(color);
    if (isNaN(color)) {
      color = 0;
    }
    color = Math.max(color, 0);
    color = Math.min(color, 255);
    return color;
  };

  parseAlpha = function(alpha) {
    alpha = parseFloat(alpha);
    if (isNaN(alpha)) {
      alpha = 1;
    }
    alpha = Math.max(alpha, 0);
    alpha = Math.min(alpha, 1);
    return alpha;
  };

  numberToHexString = function(number) {
    var hex;
    hex = number.toString(16);
    if (number < 10) {
      hex = "0" + hex;
    }
    return hex;
  };

}).call(this);

(function() {
  var Package, Q, ThemePackage,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Q = require('q');

  Package = require('./package');

  module.exports = ThemePackage = (function(_super) {
    __extends(ThemePackage, _super);

    function ThemePackage() {
      return ThemePackage.__super__.constructor.apply(this, arguments);
    }

    ThemePackage.prototype.getType = function() {
      return 'theme';
    };

    ThemePackage.prototype.getStyleSheetPriority = function() {
      return 1;
    };

    ThemePackage.prototype.enable = function() {
      return atom.config.unshiftAtKeyPath('core.themes', this.name);
    };

    ThemePackage.prototype.disable = function() {
      return atom.config.removeAtKeyPath('core.themes', this.name);
    };

    ThemePackage.prototype.load = function() {
      this.loadTime = 0;
      return this;
    };

    ThemePackage.prototype.activate = function() {
      if (this.activationDeferred != null) {
        return this.activationDeferred.promise;
      }
      this.activationDeferred = Q.defer();
      this.measure('activateTime', (function(_this) {
        return function() {
          var error;
          try {
            _this.loadStylesheets();
            return _this.activateNow();
          } catch (_error) {
            error = _error;
            return _this.handleError("Failed to activate the " + _this.name + " theme", error);
          }
        };
      })(this));
      return this.activationDeferred.promise;
    };

    return ThemePackage;

  })(Package);

}).call(this);

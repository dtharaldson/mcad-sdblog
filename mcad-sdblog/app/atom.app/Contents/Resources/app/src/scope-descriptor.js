(function() {
  var ScopeDescriptor;

  module.exports = ScopeDescriptor = (function() {
    ScopeDescriptor.fromObject = function(scopes) {
      if (scopes instanceof ScopeDescriptor) {
        return scopes;
      } else {
        return new ScopeDescriptor({
          scopes: scopes
        });
      }
    };


    /*
    Section: Construction and Destruction
     */

    function ScopeDescriptor(_arg) {
      this.scopes = _arg.scopes;
    }

    ScopeDescriptor.prototype.getScopesArray = function() {
      return this.scopes;
    };

    ScopeDescriptor.prototype.getScopeChain = function() {
      return this.scopes.map(function(scope) {
        if (scope[0] !== '.') {
          scope = "." + scope;
        }
        return scope;
      }).join(' ');
    };

    return ScopeDescriptor;

  })();

}).call(this);

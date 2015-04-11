(function() {
  var ItemRegistry;

  module.exports = ItemRegistry = (function() {
    function ItemRegistry() {
      this.items = new WeakSet;
    }

    ItemRegistry.prototype.addItem = function(item) {
      if (this.hasItem(item)) {
        throw new Error("The workspace can only contain one instance of item " + item);
      }
      return this.items.add(item);
    };

    ItemRegistry.prototype.removeItem = function(item) {
      return this.items["delete"](item);
    };

    ItemRegistry.prototype.hasItem = function(item) {
      return this.items.has(item);
    };

    return ItemRegistry;

  })();

}).call(this);

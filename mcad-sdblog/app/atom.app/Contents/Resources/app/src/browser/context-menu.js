(function() {
  var ContextMenu, Menu;

  Menu = require('menu');

  module.exports = ContextMenu = (function() {
    function ContextMenu(template, atomWindow) {
      var menu;
      this.atomWindow = atomWindow;
      template = this.createClickHandlers(template);
      menu = Menu.buildFromTemplate(template);
      menu.popup(this.atomWindow.browserWindow);
    }

    ContextMenu.prototype.createClickHandlers = function(template) {
      var item, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = template.length; _i < _len; _i++) {
        item = template[_i];
        if (item.command) {
          if (item.commandDetail == null) {
            item.commandDetail = {};
          }
          item.commandDetail.contextCommand = true;
          item.commandDetail.atomWindow = this.atomWindow;
          (function(_this) {
            return (function(item) {
              return item.click = function() {
                return global.atomApplication.sendCommandToWindow(item.command, _this.atomWindow, item.commandDetail);
              };
            });
          })(this)(item);
        } else if (item.submenu) {
          this.createClickHandlers(item.submenu);
        }
        _results.push(item);
      }
      return _results;
    };

    return ContextMenu;

  })();

}).call(this);

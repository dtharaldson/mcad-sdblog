(function() {
  var ApplicationMenu, Menu, app, ipc, _;

  app = require('app');

  ipc = require('ipc');

  Menu = require('menu');

  _ = require('underscore-plus');

  module.exports = ApplicationMenu = (function() {
    function ApplicationMenu(version) {
      this.version = version;
      this.windowTemplates = new WeakMap();
      this.setActiveTemplate(this.getDefaultTemplate());
      global.atomApplication.autoUpdateManager.on('state-changed', (function(_this) {
        return function(state) {
          return _this.showUpdateMenuItem(state);
        };
      })(this));
    }

    ApplicationMenu.prototype.update = function(window, template, keystrokesByCommand) {
      this.translateTemplate(template, keystrokesByCommand);
      this.substituteVersion(template);
      this.windowTemplates.set(window, template);
      if (window === this.lastFocusedWindow) {
        return this.setActiveTemplate(template);
      }
    };

    ApplicationMenu.prototype.setActiveTemplate = function(template) {
      if (!_.isEqual(template, this.activeTemplate)) {
        this.activeTemplate = template;
        this.menu = Menu.buildFromTemplate(_.deepClone(template));
        Menu.setApplicationMenu(this.menu);
      }
      return this.showUpdateMenuItem(global.atomApplication.autoUpdateManager.getState());
    };

    ApplicationMenu.prototype.addWindow = function(window) {
      var focusHandler;
      if (this.lastFocusedWindow == null) {
        this.lastFocusedWindow = window;
      }
      focusHandler = (function(_this) {
        return function() {
          var template;
          _this.lastFocusedWindow = window;
          if (template = _this.windowTemplates.get(window)) {
            return _this.setActiveTemplate(template);
          }
        };
      })(this);
      window.on('focus', focusHandler);
      window.once('closed', (function(_this) {
        return function() {
          if (window === _this.lastFocusedWindow) {
            _this.lastFocusedWindow = null;
          }
          _this.windowTemplates["delete"](window);
          return window.removeListener('focus', focusHandler);
        };
      })(this));
      return this.enableWindowSpecificItems(true);
    };

    ApplicationMenu.prototype.flattenMenuItems = function(menu) {
      var index, item, items, _ref;
      items = [];
      _ref = menu.items || {};
      for (index in _ref) {
        item = _ref[index];
        items.push(item);
        if (item.submenu) {
          items = items.concat(this.flattenMenuItems(item.submenu));
        }
      }
      return items;
    };

    ApplicationMenu.prototype.flattenMenuTemplate = function(template) {
      var item, items, _i, _len;
      items = [];
      for (_i = 0, _len = template.length; _i < _len; _i++) {
        item = template[_i];
        items.push(item);
        if (item.submenu) {
          items = items.concat(this.flattenMenuTemplate(item.submenu));
        }
      }
      return items;
    };

    ApplicationMenu.prototype.enableWindowSpecificItems = function(enable) {
      var item, _i, _len, _ref, _ref1;
      _ref = this.flattenMenuItems(this.menu);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        if ((_ref1 = item.metadata) != null ? _ref1.windowSpecific : void 0) {
          item.enabled = enable;
        }
      }
    };

    ApplicationMenu.prototype.substituteVersion = function(template) {
      var item;
      if ((item = _.find(this.flattenMenuTemplate(template), function(_arg) {
        var label;
        label = _arg.label;
        return label === 'VERSION';
      }))) {
        return item.label = "Version " + this.version;
      }
    };

    ApplicationMenu.prototype.showUpdateMenuItem = function(state) {
      var checkForUpdateItem, checkingForUpdateItem, downloadingUpdateItem, installUpdateItem;
      checkForUpdateItem = _.find(this.flattenMenuItems(this.menu), function(_arg) {
        var label;
        label = _arg.label;
        return label === 'Check for Update';
      });
      checkingForUpdateItem = _.find(this.flattenMenuItems(this.menu), function(_arg) {
        var label;
        label = _arg.label;
        return label === 'Checking for Update';
      });
      downloadingUpdateItem = _.find(this.flattenMenuItems(this.menu), function(_arg) {
        var label;
        label = _arg.label;
        return label === 'Downloading Update';
      });
      installUpdateItem = _.find(this.flattenMenuItems(this.menu), function(_arg) {
        var label;
        label = _arg.label;
        return label === 'Restart and Install Update';
      });
      if (!((checkForUpdateItem != null) && (checkingForUpdateItem != null) && (downloadingUpdateItem != null) && (installUpdateItem != null))) {
        return;
      }
      checkForUpdateItem.visible = false;
      checkingForUpdateItem.visible = false;
      downloadingUpdateItem.visible = false;
      installUpdateItem.visible = false;
      switch (state) {
        case 'idle':
        case 'error':
        case 'no-update-available':
          return checkForUpdateItem.visible = true;
        case 'checking':
          return checkingForUpdateItem.visible = true;
        case 'downloading':
          return downloadingUpdateItem.visible = true;
        case 'update-available':
          return installUpdateItem.visible = true;
      }
    };

    ApplicationMenu.prototype.getDefaultTemplate = function() {
      return [
        {
          label: "Atom",
          submenu: [
            {
              label: "Check for Update",
              metadata: {
                autoUpdate: true
              }
            }, {
              label: 'Reload',
              accelerator: 'Command+R',
              click: (function(_this) {
                return function() {
                  var _ref;
                  return (_ref = _this.focusedWindow()) != null ? _ref.reload() : void 0;
                };
              })(this)
            }, {
              label: 'Close Window',
              accelerator: 'Command+Shift+W',
              click: (function(_this) {
                return function() {
                  var _ref;
                  return (_ref = _this.focusedWindow()) != null ? _ref.close() : void 0;
                };
              })(this)
            }, {
              label: 'Toggle Dev Tools',
              accelerator: 'Command+Alt+I',
              click: (function(_this) {
                return function() {
                  var _ref;
                  return (_ref = _this.focusedWindow()) != null ? _ref.toggleDevTools() : void 0;
                };
              })(this)
            }, {
              label: 'Quit',
              accelerator: 'Command+Q',
              click: function() {
                return app.quit();
              }
            }
          ]
        }
      ];
    };

    ApplicationMenu.prototype.focusedWindow = function() {
      return _.find(global.atomApplication.windows, function(atomWindow) {
        return atomWindow.isFocused();
      });
    };

    ApplicationMenu.prototype.translateTemplate = function(template, keystrokesByCommand) {
      template.forEach((function(_this) {
        return function(item) {
          if (item.metadata == null) {
            item.metadata = {};
          }
          if (item.command) {
            item.accelerator = _this.acceleratorForCommand(item.command, keystrokesByCommand);
            item.click = function() {
              return global.atomApplication.sendCommand(item.command);
            };
            if (!/^application:/.test(item.command)) {
              item.metadata.windowSpecific = true;
            }
          }
          if (item.submenu) {
            return _this.translateTemplate(item.submenu, keystrokesByCommand);
          }
        };
      })(this));
      return template;
    };

    ApplicationMenu.prototype.acceleratorForCommand = function(command, keystrokesByCommand) {
      var firstKeystroke, key, keys, modifiers, _ref;
      firstKeystroke = (_ref = keystrokesByCommand[command]) != null ? _ref[0] : void 0;
      if (!firstKeystroke) {
        return null;
      }
      modifiers = firstKeystroke.split('-');
      key = modifiers.pop();
      modifiers = modifiers.map(function(modifier) {
        return modifier.replace(/shift/ig, "Shift").replace(/cmd/ig, "Command").replace(/ctrl/ig, "Ctrl").replace(/alt/ig, "Alt");
      });
      keys = modifiers.concat([key.toUpperCase()]);
      return keys.join("+");
    };

    return ApplicationMenu;

  })();

}).call(this);

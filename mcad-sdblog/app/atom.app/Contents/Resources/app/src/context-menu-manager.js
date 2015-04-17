(function() {
  var CSON, ContextMenuItemSet, ContextMenuManager, Disposable, Grim, MenuHelpers, calculateSpecificity, fs, path, platformContextMenu, validateSelector, _, _ref, _ref1, _ref2;

  _ = require('underscore-plus');

  path = require('path');

  CSON = require('season');

  fs = require('fs-plus');

  _ref = require('clear-cut'), calculateSpecificity = _ref.calculateSpecificity, validateSelector = _ref.validateSelector;

  Disposable = require('event-kit').Disposable;

  Grim = require('grim');

  MenuHelpers = require('./menu-helpers');

  platformContextMenu = (_ref1 = require('../package.json')) != null ? (_ref2 = _ref1._atomMenu) != null ? _ref2['context-menu'] : void 0 : void 0;

  module.exports = ContextMenuManager = (function() {
    function ContextMenuManager(_arg) {
      this.resourcePath = _arg.resourcePath, this.devMode = _arg.devMode;
      this.definitions = {
        '.overlayer': []
      };
      this.clear();
      atom.keymaps.onDidLoadBundledKeymaps((function(_this) {
        return function() {
          return _this.loadPlatformItems();
        };
      })(this));
    }

    ContextMenuManager.prototype.loadPlatformItems = function() {
      var map, menusDirPath, platformMenuPath;
      if (platformContextMenu != null) {
        return this.add(platformContextMenu);
      } else {
        menusDirPath = path.join(this.resourcePath, 'menus');
        platformMenuPath = fs.resolve(menusDirPath, process.platform, ['cson', 'json']);
        map = CSON.readFileSync(platformMenuPath);
        return this.add(map['context-menu']);
      }
    };

    ContextMenuManager.prototype.add = function(itemsBySelector) {
      var addedItemSets, devMode, itemSet, items, key, selector, value, _ref3;
      if (Grim.includeDeprecatedAPIs) {
        if ((itemsBySelector != null) && typeof itemsBySelector !== 'object') {
          Grim.deprecate("ContextMenuManager::add has changed to take a single object as its\nargument. Please see\nhttps://atom.io/docs/api/latest/ContextMenuManager for more info.");
          itemsBySelector = arguments[1];
          devMode = (_ref3 = arguments[2]) != null ? _ref3.devMode : void 0;
        }
        for (key in itemsBySelector) {
          value = itemsBySelector[key];
          if (!_.isArray(value)) {
            Grim.deprecate("ContextMenuManager::add has changed to take a single object as its\nargument. Please see\nhttps://atom.io/docs/api/latest/ContextMenuManager for more info.");
            itemsBySelector = this.convertLegacyItemsBySelector(itemsBySelector, devMode);
          }
        }
      }
      addedItemSets = [];
      for (selector in itemsBySelector) {
        items = itemsBySelector[selector];
        validateSelector(selector);
        itemSet = new ContextMenuItemSet(selector, items);
        addedItemSets.push(itemSet);
        this.itemSets.push(itemSet);
      }
      return new Disposable((function(_this) {
        return function() {
          var _i, _len;
          for (_i = 0, _len = addedItemSets.length; _i < _len; _i++) {
            itemSet = addedItemSets[_i];
            _this.itemSets.splice(_this.itemSets.indexOf(itemSet), 1);
          }
        };
      })(this));
    };

    ContextMenuManager.prototype.templateForElement = function(target) {
      return this.templateForEvent({
        target: target
      });
    };

    ContextMenuManager.prototype.templateForEvent = function(event) {
      var currentTarget, currentTargetItems, item, itemSet, matchingItemSets, template, _i, _j, _k, _len, _len1, _len2, _ref3;
      template = [];
      currentTarget = event.target;
      while (currentTarget != null) {
        currentTargetItems = [];
        matchingItemSets = this.itemSets.filter(function(itemSet) {
          return currentTarget.webkitMatchesSelector(itemSet.selector);
        });
        for (_i = 0, _len = matchingItemSets.length; _i < _len; _i++) {
          itemSet = matchingItemSets[_i];
          _ref3 = itemSet.items;
          for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
            item = _ref3[_j];
            if (item.devMode && !this.devMode) {
              continue;
            }
            item = Object.create(item);
            if (typeof item.shouldDisplay === 'function') {
              if (!item.shouldDisplay(event)) {
                continue;
              }
            }
            if (typeof item.created === "function") {
              item.created(event);
            }
            MenuHelpers.merge(currentTargetItems, item, itemSet.specificity);
          }
        }
        for (_k = 0, _len2 = currentTargetItems.length; _k < _len2; _k++) {
          item = currentTargetItems[_k];
          MenuHelpers.merge(template, item, false);
        }
        currentTarget = currentTarget.parentElement;
      }
      return template;
    };

    ContextMenuManager.prototype.convertLegacyItemsBySelector = function(legacyItemsBySelector, devMode) {
      var commandsByLabel, itemsBySelector, selector;
      itemsBySelector = {};
      for (selector in legacyItemsBySelector) {
        commandsByLabel = legacyItemsBySelector[selector];
        itemsBySelector[selector] = this.convertLegacyItems(commandsByLabel, devMode);
      }
      return itemsBySelector;
    };

    ContextMenuManager.prototype.convertLegacyItems = function(legacyItems, devMode) {
      var commandOrSubmenu, items, label;
      items = [];
      for (label in legacyItems) {
        commandOrSubmenu = legacyItems[label];
        if (typeof commandOrSubmenu === 'object') {
          items.push({
            label: label,
            submenu: this.convertLegacyItems(commandOrSubmenu, devMode),
            devMode: devMode
          });
        } else if (commandOrSubmenu === '-') {
          items.push({
            type: 'separator'
          });
        } else {
          items.push({
            label: label,
            command: commandOrSubmenu,
            devMode: devMode
          });
        }
      }
      return items;
    };

    ContextMenuManager.prototype.showForEvent = function(event) {
      var menuTemplate;
      this.activeElement = event.target;
      menuTemplate = this.templateForEvent(event);
      if (!((menuTemplate != null ? menuTemplate.length : void 0) > 0)) {
        return;
      }
      atom.getCurrentWindow().emit('context-menu', menuTemplate);
    };

    ContextMenuManager.prototype.clear = function() {
      this.activeElement = null;
      this.itemSets = [];
      return this.add({
        'atom-workspace': [
          {
            label: 'Inspect Element',
            command: 'application:inspect',
            devMode: true,
            created: function(event) {
              var pageX, pageY;
              pageX = event.pageX, pageY = event.pageY;
              return this.commandDetail = {
                x: pageX,
                y: pageY
              };
            }
          }
        ]
      });
    };

    return ContextMenuManager;

  })();

  ContextMenuItemSet = (function() {
    function ContextMenuItemSet(selector, items) {
      this.selector = selector;
      this.items = items;
      this.specificity = calculateSpecificity(this.selector);
    }

    return ContextMenuItemSet;

  })();

}).call(this);

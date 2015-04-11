(function() {
  var ItemSpecificities, cloneMenuItem, findMatchingItemIndex, merge, normalizeLabel, unmerge, _;

  _ = require('underscore-plus');

  ItemSpecificities = new WeakMap;

  merge = function(menu, item, itemSpecificity) {
    var matchingItem, matchingItemIndex, submenuItem, _i, _len, _ref, _ref1;
    if (itemSpecificity == null) {
      itemSpecificity = Infinity;
    }
    item = cloneMenuItem(item);
    if (itemSpecificity) {
      ItemSpecificities.set(item, itemSpecificity);
    }
    matchingItemIndex = findMatchingItemIndex(menu, item);
    if (matchingItemIndex !== -1) {
      matchingItem = menu[matchingItemIndex];
    }
    if (matchingItem != null) {
      if (item.submenu != null) {
        _ref = item.submenu;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          submenuItem = _ref[_i];
          merge(matchingItem.submenu, submenuItem, itemSpecificity);
        }
      } else if (itemSpecificity) {
        if (!(itemSpecificity < ItemSpecificities.get(matchingItem))) {
          menu[matchingItemIndex] = item;
        }
      }
    } else if (!(item.type === 'separator' && ((_ref1 = _.last(menu)) != null ? _ref1.type : void 0) === 'separator')) {
      menu.push(item);
    }
  };

  unmerge = function(menu, item) {
    var matchingItem, matchingItemIndex, submenuItem, _i, _len, _ref, _ref1;
    matchingItemIndex = findMatchingItemIndex(menu, item);
    if (matchingItemIndex !== -1) {
      matchingItem = menu[matchingItemIndex];
    }
    if (matchingItem != null) {
      if (item.submenu != null) {
        _ref = item.submenu;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          submenuItem = _ref[_i];
          unmerge(matchingItem.submenu, submenuItem);
        }
      }
      if (!(((_ref1 = matchingItem.submenu) != null ? _ref1.length : void 0) > 0)) {
        return menu.splice(matchingItemIndex, 1);
      }
    }
  };

  findMatchingItemIndex = function(menu, _arg) {
    var index, item, label, submenu, type, _i, _len;
    type = _arg.type, label = _arg.label, submenu = _arg.submenu;
    if (type === 'separator') {
      return -1;
    }
    for (index = _i = 0, _len = menu.length; _i < _len; index = ++_i) {
      item = menu[index];
      if (normalizeLabel(item.label) === normalizeLabel(label) && (item.submenu != null) === (submenu != null)) {
        return index;
      }
    }
    return -1;
  };

  normalizeLabel = function(label) {
    if (label == null) {
      return void 0;
    }
    if (process.platform === 'darwin') {
      return label;
    } else {
      return label.replace(/\&/g, '');
    }
  };

  cloneMenuItem = function(item) {
    item = _.pick(item, 'type', 'label', 'enabled', 'visible', 'command', 'submenu', 'commandDetail');
    if (item.submenu != null) {
      item.submenu = item.submenu.map(function(submenuItem) {
        return cloneMenuItem(submenuItem);
      });
    }
    return item;
  };

  module.exports = {
    merge: merge,
    unmerge: unmerge,
    normalizeLabel: normalizeLabel,
    cloneMenuItem: cloneMenuItem
  };

}).call(this);

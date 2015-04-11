(function() {
  var CSON, Disposable, MenuHelpers, MenuManager, fs, ipc, path, _;

  path = require('path');

  _ = require('underscore-plus');

  ipc = require('ipc');

  CSON = require('season');

  fs = require('fs-plus');

  Disposable = require('event-kit').Disposable;

  MenuHelpers = require('./menu-helpers');

  module.exports = MenuManager = (function() {
    function MenuManager(_arg) {
      this.resourcePath = _arg.resourcePath;
      this.pendingUpdateOperation = null;
      this.template = [];
      atom.keymaps.onDidLoadBundledKeymaps((function(_this) {
        return function() {
          return _this.loadPlatformItems();
        };
      })(this));
      atom.packages.onDidActivateInitialPackages((function(_this) {
        return function() {
          return _this.sortPackagesMenu();
        };
      })(this));
    }

    MenuManager.prototype.add = function(items) {
      var item, _i, _len;
      items = _.deepClone(items);
      for (_i = 0, _len = items.length; _i < _len; _i++) {
        item = items[_i];
        this.merge(this.template, item);
      }
      this.update();
      return new Disposable((function(_this) {
        return function() {
          return _this.remove(items);
        };
      })(this));
    };

    MenuManager.prototype.remove = function(items) {
      var item, _i, _len;
      for (_i = 0, _len = items.length; _i < _len; _i++) {
        item = items[_i];
        this.unmerge(this.template, item);
      }
      return this.update();
    };

    MenuManager.prototype.includeSelector = function(selector) {
      var element, error, testBody, testDocument, testWorkspace, workspaceClasses, _ref, _ref1;
      try {
        if (document.body.webkitMatchesSelector(selector)) {
          return true;
        }
      } catch (_error) {
        error = _error;
        return false;
      }
      if (this.testEditor == null) {
        testDocument = document.implementation.createDocument(document.namespaceURI, 'html');
        testBody = testDocument.createElement('body');
        (_ref = testBody.classList).add.apply(_ref, this.classesForElement(document.body));
        testWorkspace = testDocument.createElement('atom-workspace');
        workspaceClasses = this.classesForElement(document.body.querySelector('atom-workspace'));
        if (workspaceClasses.length === 0) {
          workspaceClasses = ['workspace'];
        }
        (_ref1 = testWorkspace.classList).add.apply(_ref1, workspaceClasses);
        testBody.appendChild(testWorkspace);
        this.testEditor = testDocument.createElement('atom-text-editor');
        this.testEditor.classList.add('editor');
        testWorkspace.appendChild(this.testEditor);
      }
      element = this.testEditor;
      while (element) {
        if (element.webkitMatchesSelector(selector)) {
          return true;
        }
        element = element.parentElement;
      }
      return false;
    };

    MenuManager.prototype.update = function() {
      if (this.pendingUpdateOperation != null) {
        clearImmediate(this.pendingUpdateOperation);
      }
      return this.pendingUpdateOperation = setImmediate((function(_this) {
        return function() {
          var binding, keystrokesByCommand, _i, _len, _name, _ref;
          keystrokesByCommand = {};
          _ref = atom.keymaps.getKeyBindings();
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            binding = _ref[_i];
            if (!(_this.includeSelector(binding.selector))) {
              continue;
            }
            if (keystrokesByCommand[_name = binding.command] == null) {
              keystrokesByCommand[_name] = [];
            }
            keystrokesByCommand[binding.command].unshift(binding.keystrokes);
          }
          return _this.sendToBrowserProcess(_this.template, keystrokesByCommand);
        };
      })(this));
    };

    MenuManager.prototype.loadPlatformItems = function() {
      var menu, menusDirPath, platformMenuPath;
      menusDirPath = path.join(this.resourcePath, 'menus');
      platformMenuPath = fs.resolve(menusDirPath, process.platform, ['cson', 'json']);
      menu = CSON.readFileSync(platformMenuPath).menu;
      return this.add(menu);
    };

    MenuManager.prototype.merge = function(menu, item) {
      return MenuHelpers.merge(menu, item);
    };

    MenuManager.prototype.unmerge = function(menu, item) {
      return MenuHelpers.unmerge(menu, item);
    };

    MenuManager.prototype.filterMultipleKeystroke = function(keystrokesByCommand) {
      var binding, bindings, filtered, key, _i, _len;
      filtered = {};
      for (key in keystrokesByCommand) {
        bindings = keystrokesByCommand[key];
        for (_i = 0, _len = bindings.length; _i < _len; _i++) {
          binding = bindings[_i];
          if (binding.indexOf(' ') !== -1) {
            continue;
          }
          if (filtered[key] == null) {
            filtered[key] = [];
          }
          filtered[key].push(binding);
        }
      }
      return filtered;
    };

    MenuManager.prototype.sendToBrowserProcess = function(template, keystrokesByCommand) {
      keystrokesByCommand = this.filterMultipleKeystroke(keystrokesByCommand);
      return ipc.send('update-application-menu', template, keystrokesByCommand);
    };

    MenuManager.prototype.classesForElement = function(element) {
      var _ref;
      return (_ref = element != null ? element.classList.toString().split(' ') : void 0) != null ? _ref : [];
    };

    MenuManager.prototype.sortPackagesMenu = function() {
      var packagesMenu;
      packagesMenu = _.find(this.template, function(_arg) {
        var label;
        label = _arg.label;
        return MenuHelpers.normalizeLabel(label) === 'Packages';
      });
      if ((packagesMenu != null ? packagesMenu.submenu : void 0) == null) {
        return;
      }
      packagesMenu.submenu.sort(function(item1, item2) {
        if (item1.label && item2.label) {
          return MenuHelpers.normalizeLabel(item1.label).localeCompare(MenuHelpers.normalizeLabel(item2.label));
        } else {
          return 0;
        }
      });
      return this.update();
    };

    return MenuManager;

  })();

}).call(this);

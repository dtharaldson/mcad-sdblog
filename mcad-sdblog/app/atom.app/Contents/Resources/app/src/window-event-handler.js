(function() {
  var $, Disposable, Subscriber, WindowEventHandler, fs, ipc, path, shell, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __slice = [].slice;

  path = require('path');

  $ = require('./space-pen-extensions').$;

  _ = require('underscore-plus');

  Disposable = require('event-kit').Disposable;

  ipc = require('ipc');

  shell = require('shell');

  Subscriber = require('emissary').Subscriber;

  fs = require('fs-plus');

  module.exports = WindowEventHandler = (function() {
    Subscriber.includeInto(WindowEventHandler);

    function WindowEventHandler() {
      this.focusPrevious = __bind(this.focusPrevious, this);
      this.focusNext = __bind(this.focusNext, this);
      var _ref;
      this.reloadRequested = false;
      this.subscribe(ipc, 'message', function(message, detail) {
        var dirToOpen, initialColumn, initialLine, needsProjectPaths, pathToOpen, releaseVersion, workspaceElement, _i, _len, _ref, _ref1, _ref2;
        switch (message) {
          case 'open-locations':
            needsProjectPaths = ((_ref = atom.project) != null ? _ref.getPaths().length : void 0) === 0;
            for (_i = 0, _len = detail.length; _i < _len; _i++) {
              _ref1 = detail[_i], pathToOpen = _ref1.pathToOpen, initialLine = _ref1.initialLine, initialColumn = _ref1.initialColumn;
              if ((pathToOpen != null) && needsProjectPaths) {
                if (fs.existsSync(pathToOpen)) {
                  atom.project.addPath(pathToOpen);
                } else {
                  dirToOpen = path.dirname(pathToOpen);
                  if (fs.existsSync(dirToOpen)) {
                    atom.project.addPath(dirToOpen);
                  }
                }
              }
              if (!fs.isDirectorySync(pathToOpen)) {
                if ((_ref2 = atom.workspace) != null) {
                  _ref2.open(pathToOpen, {
                    initialLine: initialLine,
                    initialColumn: initialColumn
                  });
                }
              }
            }
            break;
          case 'update-available':
            atom.updateAvailable(detail);
            releaseVersion = detail.releaseVersion;
            detail = [releaseVersion];
            if (workspaceElement = atom.views.getView(atom.workspace)) {
              return atom.commands.dispatch(workspaceElement, "window:update-available", detail);
            }
        }
      });
      this.subscribe(ipc, 'command', function() {
        var activeElement, args, command, workspaceElement;
        command = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        activeElement = document.activeElement;
        if (activeElement === document.body && (workspaceElement = atom.views.getView(atom.workspace))) {
          activeElement = workspaceElement;
        }
        return atom.commands.dispatch(activeElement, command, args[0]);
      });
      this.subscribe(ipc, 'context-command', function() {
        var args, command, _ref;
        command = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return (_ref = $(atom.contextMenu.activeElement)).trigger.apply(_ref, [command].concat(__slice.call(args)));
      });
      this.subscribe($(window), 'focus', function() {
        return document.body.classList.remove('is-blurred');
      });
      this.subscribe($(window), 'blur', function() {
        return document.body.classList.add('is-blurred');
      });
      this.subscribe($(window), 'beforeunload', (function(_this) {
        return function() {
          var confirmed, _ref;
          confirmed = (_ref = atom.workspace) != null ? _ref.confirmClose({
            windowCloseRequested: true
          }) : void 0;
          if (confirmed && !_this.reloadRequested && atom.getCurrentWindow().isWebViewFocused()) {
            atom.hide();
          }
          _this.reloadRequested = false;
          atom.storeDefaultWindowDimensions();
          atom.storeWindowDimensions();
          if (confirmed) {
            atom.unloadEditorWindow();
          }
          return confirmed;
        };
      })(this));
      this.subscribe($(window), 'blur', function() {
        return atom.storeDefaultWindowDimensions();
      });
      this.subscribe($(window), 'unload', function() {
        return atom.removeEditorWindow();
      });
      this.subscribeToCommand($(window), 'window:toggle-full-screen', function() {
        return atom.toggleFullScreen();
      });
      this.subscribeToCommand($(window), 'window:close', function() {
        return atom.close();
      });
      this.subscribeToCommand($(window), 'window:reload', (function(_this) {
        return function() {
          _this.reloadRequested = true;
          return atom.reload();
        };
      })(this));
      this.subscribeToCommand($(window), 'window:toggle-dev-tools', function() {
        return atom.toggleDevTools();
      });
      if ((_ref = process.platform) === 'win32' || _ref === 'linux') {
        this.subscribeToCommand($(window), 'window:toggle-menu-bar', function() {
          return atom.config.set('core.autoHideMenuBar', !atom.config.get('core.autoHideMenuBar'));
        });
      }
      this.subscribeToCommand($(document), 'core:focus-next', this.focusNext);
      this.subscribeToCommand($(document), 'core:focus-previous', this.focusPrevious);
      document.addEventListener('keydown', this.onKeydown);
      document.addEventListener('drop', this.onDrop);
      this.subscribe(new Disposable((function(_this) {
        return function() {
          return document.removeEventListener('drop', _this.onDrop);
        };
      })(this)));
      document.addEventListener('dragover', this.onDragOver);
      this.subscribe(new Disposable((function(_this) {
        return function() {
          return document.removeEventListener('dragover', _this.onDragOver);
        };
      })(this)));
      this.subscribe($(document), 'click', 'a', this.openLink);
      this.subscribe($(document), 'submit', 'form', function(e) {
        return e.preventDefault();
      });
      this.subscribe($(document), 'contextmenu', function(e) {
        e.preventDefault();
        return atom.contextMenu.showForEvent(e);
      });
      this.handleNativeKeybindings();
    }

    WindowEventHandler.prototype.handleNativeKeybindings = function() {
      var bindCommandToAction, menu;
      menu = null;
      bindCommandToAction = (function(_this) {
        return function(command, action) {
          return _this.subscribe($(document), command, function(event) {
            if (event.target.webkitMatchesSelector('.native-key-bindings')) {
              if (menu == null) {
                menu = require('remote').require('menu');
              }
              menu.sendActionToFirstResponder(action);
            }
            return true;
          });
        };
      })(this);
      bindCommandToAction('core:copy', 'copy:');
      bindCommandToAction('core:paste', 'paste:');
      bindCommandToAction('core:undo', 'undo:');
      bindCommandToAction('core:redo', 'redo:');
      return bindCommandToAction('core:select-all', 'selectAll:');
    };

    WindowEventHandler.prototype.onKeydown = function(event) {
      atom.keymaps.handleKeyboardEvent(event);
      return event.stopImmediatePropagation();
    };

    WindowEventHandler.prototype.onDrop = function(event) {
      var pathsToOpen;
      event.preventDefault();
      event.stopPropagation();
      pathsToOpen = _.pluck(event.dataTransfer.files, 'path');
      if (pathsToOpen.length > 0) {
        return atom.open({
          pathsToOpen: pathsToOpen
        });
      }
    };

    WindowEventHandler.prototype.onDragOver = function(event) {
      event.preventDefault();
      return event.stopPropagation();
    };

    WindowEventHandler.prototype.openLink = function(_arg) {
      var currentTarget, location, target;
      target = _arg.target, currentTarget = _arg.currentTarget;
      location = (target != null ? target.getAttribute('href') : void 0) || (currentTarget != null ? currentTarget.getAttribute('href') : void 0);
      if (location && location[0] !== '#' && /^https?:\/\//.test(location)) {
        shell.openExternal(location);
      }
      return false;
    };

    WindowEventHandler.prototype.eachTabIndexedElement = function(callback) {
      var element, tabIndex, _i, _len, _ref;
      _ref = $('[tabindex]');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        element = _ref[_i];
        element = $(element);
        if (element.isDisabled()) {
          continue;
        }
        tabIndex = parseInt(element.attr('tabindex'));
        if (!(tabIndex >= 0)) {
          continue;
        }
        callback(element, tabIndex);
      }
    };

    WindowEventHandler.prototype.focusNext = function() {
      var focusedTabIndex, lowestElement, lowestTabIndex, nextElement, nextTabIndex;
      focusedTabIndex = parseInt($(':focus').attr('tabindex')) || -Infinity;
      nextElement = null;
      nextTabIndex = Infinity;
      lowestElement = null;
      lowestTabIndex = Infinity;
      this.eachTabIndexedElement(function(element, tabIndex) {
        if (tabIndex < lowestTabIndex) {
          lowestTabIndex = tabIndex;
          lowestElement = element;
        }
        if ((focusedTabIndex < tabIndex && tabIndex < nextTabIndex)) {
          nextTabIndex = tabIndex;
          return nextElement = element;
        }
      });
      if (nextElement != null) {
        return nextElement.focus();
      } else if (lowestElement != null) {
        return lowestElement.focus();
      }
    };

    WindowEventHandler.prototype.focusPrevious = function() {
      var focusedTabIndex, highestElement, highestTabIndex, previousElement, previousTabIndex;
      focusedTabIndex = parseInt($(':focus').attr('tabindex')) || Infinity;
      previousElement = null;
      previousTabIndex = -Infinity;
      highestElement = null;
      highestTabIndex = -Infinity;
      this.eachTabIndexedElement(function(element, tabIndex) {
        if (tabIndex > highestTabIndex) {
          highestTabIndex = tabIndex;
          highestElement = element;
        }
        if ((focusedTabIndex > tabIndex && tabIndex > previousTabIndex)) {
          previousTabIndex = tabIndex;
          return previousElement = element;
        }
      });
      if (previousElement != null) {
        return previousElement.focus();
      } else if (highestElement != null) {
        return highestElement.focus();
      }
    };

    return WindowEventHandler;

  })();

}).call(this);

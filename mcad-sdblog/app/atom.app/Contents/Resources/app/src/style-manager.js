(function() {
  var Disposable, Emitter, StyleManager, fs, path, _ref,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  fs = require('fs-plus');

  path = require('path');

  _ref = require('event-kit'), Emitter = _ref.Emitter, Disposable = _ref.Disposable;

  module.exports = StyleManager = (function() {
    function StyleManager() {
      this.emitter = new Emitter;
      this.styleElements = [];
      this.styleElementsBySourcePath = {};
    }


    /*
    Section: Event Subscription
     */

    StyleManager.prototype.observeStyleElements = function(callback) {
      var styleElement, _i, _len, _ref1;
      _ref1 = this.getStyleElements();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        styleElement = _ref1[_i];
        callback(styleElement);
      }
      return this.onDidAddStyleElement(callback);
    };

    StyleManager.prototype.onDidAddStyleElement = function(callback) {
      return this.emitter.on('did-add-style-element', callback);
    };

    StyleManager.prototype.onDidRemoveStyleElement = function(callback) {
      return this.emitter.on('did-remove-style-element', callback);
    };

    StyleManager.prototype.onDidUpdateStyleElement = function(callback) {
      return this.emitter.on('did-update-style-element', callback);
    };


    /*
    Section: Reading Style Elements
     */

    StyleManager.prototype.getStyleElements = function() {
      return this.styleElements.slice();
    };

    StyleManager.prototype.addStyleSheet = function(source, params) {
      var context, priority, sourcePath, styleElement, updated;
      sourcePath = params != null ? params.sourcePath : void 0;
      context = params != null ? params.context : void 0;
      priority = params != null ? params.priority : void 0;
      if ((sourcePath != null) && (styleElement = this.styleElementsBySourcePath[sourcePath])) {
        updated = true;
      } else {
        styleElement = document.createElement('style');
        if (sourcePath != null) {
          styleElement.sourcePath = sourcePath;
          styleElement.setAttribute('source-path', sourcePath);
        }
        if (context != null) {
          styleElement.context = context;
          styleElement.setAttribute('context', context);
        }
        if (priority != null) {
          styleElement.priority = priority;
          styleElement.setAttribute('priority', priority);
        }
      }
      styleElement.textContent = source;
      if (updated) {
        this.emitter.emit('did-update-style-element', styleElement);
      } else {
        this.addStyleElement(styleElement);
      }
      return new Disposable((function(_this) {
        return function() {
          return _this.removeStyleElement(styleElement);
        };
      })(this));
    };

    StyleManager.prototype.addStyleElement = function(styleElement) {
      var existingElement, index, insertIndex, priority, sourcePath, _base, _i, _len, _ref1;
      sourcePath = styleElement.sourcePath, priority = styleElement.priority;
      if (priority != null) {
        _ref1 = this.styleElements;
        for (index = _i = 0, _len = _ref1.length; _i < _len; index = ++_i) {
          existingElement = _ref1[index];
          if (existingElement.priority > priority) {
            insertIndex = index;
            break;
          }
        }
      }
      if (insertIndex == null) {
        insertIndex = this.styleElements.length;
      }
      this.styleElements.splice(insertIndex, 0, styleElement);
      if (sourcePath != null) {
        if ((_base = this.styleElementsBySourcePath)[sourcePath] == null) {
          _base[sourcePath] = styleElement;
        }
      }
      return this.emitter.emit('did-add-style-element', styleElement);
    };

    StyleManager.prototype.removeStyleElement = function(styleElement) {
      var index;
      index = this.styleElements.indexOf(styleElement);
      if (index !== -1) {
        this.styleElements.splice(index, 1);
        if (styleElement.sourcePath != null) {
          delete this.styleElementsBySourcePath[styleElement.sourcePath];
        }
        return this.emitter.emit('did-remove-style-element', styleElement);
      }
    };

    StyleManager.prototype.getSnapshot = function() {
      return this.styleElements.slice();
    };

    StyleManager.prototype.restoreSnapshot = function(styleElementsToRestore) {
      var existingStyleElements, styleElement, _i, _j, _len, _len1, _ref1;
      _ref1 = this.getStyleElements();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        styleElement = _ref1[_i];
        if (__indexOf.call(styleElementsToRestore, styleElement) < 0) {
          this.removeStyleElement(styleElement);
        }
      }
      existingStyleElements = this.getStyleElements();
      for (_j = 0, _len1 = styleElementsToRestore.length; _j < _len1; _j++) {
        styleElement = styleElementsToRestore[_j];
        if (__indexOf.call(existingStyleElements, styleElement) < 0) {
          this.addStyleElement(styleElement);
        }
      }
    };


    /*
    Section: Paths
     */

    StyleManager.prototype.getUserStyleSheetPath = function() {
      var stylesheetPath;
      stylesheetPath = fs.resolve(path.join(atom.getConfigDirPath(), 'styles'), ['css', 'less']);
      if (fs.isFileSync(stylesheetPath)) {
        return stylesheetPath;
      } else {
        return path.join(atom.getConfigDirPath(), 'styles.less');
      }
    };

    return StyleManager;

  })();

}).call(this);

(function() {
  var CompositeDisposable, Emitter, StylesElement, includeDeprecatedAPIs, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('event-kit'), Emitter = _ref.Emitter, CompositeDisposable = _ref.CompositeDisposable;

  includeDeprecatedAPIs = require('grim').includeDeprecatedAPIs;

  StylesElement = (function(_super) {
    __extends(StylesElement, _super);

    function StylesElement() {
      return StylesElement.__super__.constructor.apply(this, arguments);
    }

    StylesElement.prototype.subscriptions = null;

    StylesElement.prototype.context = null;

    StylesElement.prototype.onDidAddStyleElement = function(callback) {
      return this.emitter.on('did-add-style-element', callback);
    };

    StylesElement.prototype.onDidRemoveStyleElement = function(callback) {
      return this.emitter.on('did-remove-style-element', callback);
    };

    StylesElement.prototype.onDidUpdateStyleElement = function(callback) {
      return this.emitter.on('did-update-style-element', callback);
    };

    StylesElement.prototype.createdCallback = function() {
      this.emitter = new Emitter;
      return this.styleElementClonesByOriginalElement = new WeakMap;
    };

    StylesElement.prototype.attachedCallback = function() {
      var styleElement, _i, _len, _ref1;
      if (includeDeprecatedAPIs && this.context === 'atom-text-editor') {
        _ref1 = this.children;
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          styleElement = _ref1[_i];
          this.upgradeDeprecatedSelectors(styleElement);
        }
      }
      return this.initialize();
    };

    StylesElement.prototype.detachedCallback = function() {
      this.subscriptions.dispose();
      return this.subscriptions = null;
    };

    StylesElement.prototype.attributeChangedCallback = function(attrName, oldVal, newVal) {
      if (attrName === 'context') {
        return this.contextChanged();
      }
    };

    StylesElement.prototype.initialize = function() {
      var _ref1;
      if (this.subscriptions != null) {
        return;
      }
      this.subscriptions = new CompositeDisposable;
      this.context = (_ref1 = this.getAttribute('context')) != null ? _ref1 : void 0;
      this.subscriptions.add(atom.styles.observeStyleElements(this.styleElementAdded.bind(this)));
      this.subscriptions.add(atom.styles.onDidRemoveStyleElement(this.styleElementRemoved.bind(this)));
      return this.subscriptions.add(atom.styles.onDidUpdateStyleElement(this.styleElementUpdated.bind(this)));
    };

    StylesElement.prototype.contextChanged = function() {
      var child, styleElement, _i, _j, _len, _len1, _ref1, _ref2;
      if (this.subscriptions == null) {
        return;
      }
      _ref1 = Array.prototype.slice.call(this.children);
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        child = _ref1[_i];
        this.styleElementRemoved(child);
      }
      this.context = this.getAttribute('context');
      _ref2 = atom.styles.getStyleElements();
      for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
        styleElement = _ref2[_j];
        this.styleElementAdded(styleElement);
      }
    };

    StylesElement.prototype.styleElementAdded = function(styleElement) {
      var child, insertBefore, priority, styleElementClone, _i, _len, _ref1;
      if (!this.styleElementMatchesContext(styleElement)) {
        return;
      }
      styleElementClone = styleElement.cloneNode(true);
      styleElementClone.sourcePath = styleElement.sourcePath;
      styleElementClone.context = styleElement.context;
      styleElementClone.priority = styleElement.priority;
      this.styleElementClonesByOriginalElement.set(styleElement, styleElementClone);
      priority = styleElement.priority;
      if (priority != null) {
        _ref1 = this.children;
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          child = _ref1[_i];
          if (child.priority > priority) {
            insertBefore = child;
            break;
          }
        }
      }
      this.insertBefore(styleElementClone, insertBefore);
      if (includeDeprecatedAPIs && this.context === 'atom-text-editor') {
        this.upgradeDeprecatedSelectors(styleElementClone);
      }
      return this.emitter.emit('did-add-style-element', styleElementClone);
    };

    StylesElement.prototype.styleElementRemoved = function(styleElement) {
      var styleElementClone, _ref1;
      if (!this.styleElementMatchesContext(styleElement)) {
        return;
      }
      styleElementClone = (_ref1 = this.styleElementClonesByOriginalElement.get(styleElement)) != null ? _ref1 : styleElement;
      styleElementClone.remove();
      return this.emitter.emit('did-remove-style-element', styleElementClone);
    };

    StylesElement.prototype.styleElementUpdated = function(styleElement) {
      var styleElementClone;
      if (!this.styleElementMatchesContext(styleElement)) {
        return;
      }
      styleElementClone = this.styleElementClonesByOriginalElement.get(styleElement);
      styleElementClone.textContent = styleElement.textContent;
      return this.emitter.emit('did-update-style-element', styleElementClone);
    };

    StylesElement.prototype.styleElementMatchesContext = function(styleElement) {
      return (this.context == null) || styleElement.context === this.context;
    };

    StylesElement.prototype.upgradeDeprecatedSelectors = function(styleElement) {
      var inputSelector, outputSelector, rule, upgradedSelectors, warning, _i, _j, _len, _len1, _ref1, _ref2;
      if (styleElement.sheet == null) {
        return;
      }
      upgradedSelectors = [];
      _ref1 = styleElement.sheet.cssRules;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        rule = _ref1[_i];
        if (rule.selectorText == null) {
          continue;
        }
        if (/\:host/.test(rule.selectorText)) {
          continue;
        }
        inputSelector = rule.selectorText;
        outputSelector = rule.selectorText.replace(/\.editor-colors($|[ >])/g, ':host$1').replace(/\.editor([:.][^ ,>]+)/g, ':host($1)').replace(/\.editor($|[ ,>])/g, ':host$1');
        if (inputSelector !== outputSelector) {
          rule.selectorText = outputSelector;
          upgradedSelectors.push({
            inputSelector: inputSelector,
            outputSelector: outputSelector
          });
        }
      }
      if (upgradedSelectors.length > 0) {
        warning = "Upgraded the following syntax theme selectors in `" + styleElement.sourcePath + "` for shadow DOM compatibility:\n\n";
        for (_j = 0, _len1 = upgradedSelectors.length; _j < _len1; _j++) {
          _ref2 = upgradedSelectors[_j], inputSelector = _ref2.inputSelector, outputSelector = _ref2.outputSelector;
          warning += "`" + inputSelector + "` => `" + outputSelector + "`\n";
        }
        warning += "\nSee the upgrade guide for information on removing this warning.";
        return console.warn(warning);
      }
    };

    return StylesElement;

  })(HTMLElement);

  module.exports = StylesElement = document.registerElement('atom-styles', {
    prototype: StylesElement.prototype
  });

}).call(this);

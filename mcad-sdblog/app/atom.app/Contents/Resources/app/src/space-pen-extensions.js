(function() {
  var AddEventListener, CommandDisposablesByElement, HandlersByOriginalHandler, JQueryCleanData, JQueryContains, JQueryEventAdd, JQueryEventRemove, JQueryTrigger, NativeEventNames, RemoveEventListener, SpacePen, SpacePenCallRemoveHooks, Subscriber, getKeystroke, humanizeKeystrokes, jQuery, nativeEvent, requireBootstrapTooltip, tooltipDefaults, _, _i, _len, _ref;

  _ = require('underscore-plus');

  SpacePen = require('space-pen');

  Subscriber = require('emissary').Subscriber;

  Subscriber.includeInto(SpacePen.View);

  jQuery = SpacePen.jQuery;

  JQueryCleanData = jQuery.cleanData;

  jQuery.cleanData = function(elements) {
    var element, _i, _len, _ref;
    for (_i = 0, _len = elements.length; _i < _len; _i++) {
      element = elements[_i];
      if ((_ref = jQuery(element).view()) != null) {
        if (typeof _ref.unsubscribe === "function") {
          _ref.unsubscribe();
        }
      }
    }
    return JQueryCleanData(elements);
  };

  SpacePenCallRemoveHooks = SpacePen.callRemoveHooks;

  SpacePen.callRemoveHooks = function(element) {
    var view, _i, _len, _ref;
    _ref = SpacePen.viewsForElement(element);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      view = _ref[_i];
      if (typeof view.unsubscribe === "function") {
        view.unsubscribe();
      }
    }
    return SpacePenCallRemoveHooks(element);
  };

  NativeEventNames = new Set;

  _ref = ["blur", "focus", "focusin", "focusout", "load", "resize", "scroll", "unload", "click", "dblclick", "mousedown", "mouseup", "mousemove", "mouseover", "mouseout", "mouseenter", "mouseleave", "change", "select", "submit", "keydown", "keypress", "keyup", "error", "contextmenu", "textInput", "textinput", "beforeunload"];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    nativeEvent = _ref[_i];
    NativeEventNames.add(nativeEvent);
  }

  JQueryTrigger = jQuery.fn.trigger;

  jQuery.fn.trigger = function(eventName, data) {
    var element, _j, _len1;
    if (NativeEventNames.has(eventName) || typeof eventName === 'object') {
      return JQueryTrigger.call(this, eventName, data);
    } else {
      if (data == null) {
        data = {};
      }
      data.jQueryTrigger = true;
      for (_j = 0, _len1 = this.length; _j < _len1; _j++) {
        element = this[_j];
        atom.commands.dispatch(element, eventName, data);
      }
      return this;
    }
  };

  HandlersByOriginalHandler = new WeakMap;

  CommandDisposablesByElement = new WeakMap;

  AddEventListener = function(element, type, listener) {
    var disposable, disposablesByListener, disposablesByType;
    if (NativeEventNames.has(type)) {
      return element.addEventListener(type, listener);
    } else {
      disposable = atom.commands.add(element, type, listener);
      if (!(disposablesByType = CommandDisposablesByElement.get(element))) {
        disposablesByType = {};
        CommandDisposablesByElement.set(element, disposablesByType);
      }
      if (!(disposablesByListener = disposablesByType[type])) {
        disposablesByListener = new WeakMap;
        disposablesByType[type] = disposablesByListener;
      }
      return disposablesByListener.set(listener, disposable);
    }
  };

  RemoveEventListener = function(element, type, listener) {
    var _ref1, _ref2, _ref3;
    if (NativeEventNames.has(type)) {
      return element.removeEventListener(type, listener);
    } else {
      return (_ref1 = CommandDisposablesByElement.get(element)) != null ? (_ref2 = _ref1[type]) != null ? (_ref3 = _ref2.get(listener)) != null ? _ref3.dispose() : void 0 : void 0 : void 0;
    }
  };

  JQueryEventAdd = jQuery.event.add;

  jQuery.event.add = function(elem, types, originalHandler, data, selector) {
    var handler;
    handler = function(event) {
      var detail, _ref1;
      if (arguments.length === 1 && (((_ref1 = event.originalEvent) != null ? _ref1.detail : void 0) != null)) {
        detail = event.originalEvent.detail;
        if (Array.isArray(detail)) {
          return originalHandler.apply(this, [event].concat(detail));
        } else {
          return originalHandler.call(this, event, detail);
        }
      } else {
        return originalHandler.apply(this, arguments);
      }
    };
    HandlersByOriginalHandler.set(originalHandler, handler);
    return JQueryEventAdd.call(this, elem, types, handler, data, selector, (typeof atom !== "undefined" && atom !== null ? atom.commands : void 0) != null ? AddEventListener : void 0);
  };

  JQueryEventRemove = jQuery.event.remove;

  jQuery.event.remove = function(elem, types, originalHandler, selector, mappedTypes) {
    var handler, _ref1;
    if (originalHandler != null) {
      handler = (_ref1 = HandlersByOriginalHandler.get(originalHandler)) != null ? _ref1 : originalHandler;
    }
    return JQueryEventRemove(elem, types, handler, selector, mappedTypes, (typeof atom !== "undefined" && atom !== null ? atom.commands : void 0) != null ? RemoveEventListener : void 0);
  };

  JQueryContains = jQuery.contains;

  jQuery.contains = function(a, b) {
    var currentNode, shadowRoot;
    shadowRoot = null;
    currentNode = b;
    while (currentNode) {
      if (currentNode instanceof ShadowRoot && a.contains(currentNode.host)) {
        return true;
      }
      currentNode = currentNode.parentNode;
    }
    return JQueryContains.call(this, a, b);
  };

  tooltipDefaults = {
    delay: {
      show: 1000,
      hide: 100
    },
    container: 'body',
    html: true,
    placement: 'auto top',
    viewportPadding: 2
  };

  humanizeKeystrokes = function(keystroke) {
    var keystrokes, stroke;
    keystrokes = keystroke.split(' ');
    keystrokes = (function() {
      var _j, _len1, _results;
      _results = [];
      for (_j = 0, _len1 = keystrokes.length; _j < _len1; _j++) {
        stroke = keystrokes[_j];
        _results.push(_.humanizeKeystroke(stroke));
      }
      return _results;
    })();
    return keystrokes.join(' ');
  };

  getKeystroke = function(bindings) {
    if (bindings != null ? bindings.length : void 0) {
      return "<span class=\"keystroke\">" + (humanizeKeystrokes(bindings[0].keystrokes)) + "</span>";
    } else {
      return '';
    }
  };

  requireBootstrapTooltip = _.once(function() {
    return atom.requireWithGlobals('bootstrap/js/tooltip', {
      jQuery: jQuery
    });
  });

  jQuery.fn.setTooltip = function(tooltipOptions, _arg) {
    var bindings, command, commandElement, _ref1;
    _ref1 = _arg != null ? _arg : {}, command = _ref1.command, commandElement = _ref1.commandElement;
    requireBootstrapTooltip();
    if (_.isString(tooltipOptions)) {
      tooltipOptions = {
        title: tooltipOptions
      };
    }
    if (commandElement) {
      bindings = atom.keymaps.findKeyBindings({
        command: command,
        target: commandElement[0]
      });
    } else if (command) {
      bindings = atom.keymaps.findKeyBindings({
        command: command
      });
    }
    tooltipOptions.title = "" + tooltipOptions.title + " " + (getKeystroke(bindings));
    return this.tooltip(jQuery.extend({}, tooltipDefaults, tooltipOptions));
  };

  jQuery.fn.hideTooltip = function() {
    var tip;
    tip = this.data('bs.tooltip');
    if (tip) {
      tip.leave({
        currentTarget: this
      });
      return tip.hide();
    }
  };

  jQuery.fn.destroyTooltip = function() {
    this.hideTooltip();
    requireBootstrapTooltip();
    return this.tooltip('destroy');
  };

  jQuery(document.body).on('show.bs.tooltip', function(_arg) {
    var target, windowHandler;
    target = _arg.target;
    windowHandler = function() {
      return jQuery(target).hideTooltip();
    };
    jQuery(window).one('resize', windowHandler);
    return jQuery(target).one('hide.bs.tooltip', function() {
      return jQuery(window).off('resize', windowHandler);
    });
  });

  jQuery.fn.setTooltip.getKeystroke = getKeystroke;

  jQuery.fn.setTooltip.humanizeKeystrokes = humanizeKeystrokes;

  Object.defineProperty(jQuery.fn, 'element', {
    get: function() {
      return this[0];
    }
  });

  module.exports = SpacePen;

}).call(this);

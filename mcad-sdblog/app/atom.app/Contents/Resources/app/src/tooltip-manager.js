(function() {
  var $, Disposable, TooltipManager, getKeystroke, humanizeKeystrokes, requireBootstrapTooltip, _;

  _ = require('underscore-plus');

  Disposable = require('event-kit').Disposable;

  $ = require('./space-pen-extensions').$;

  module.exports = TooltipManager = (function() {
    function TooltipManager() {}

    TooltipManager.prototype.defaults = {
      delay: {
        show: 1000,
        hide: 100
      },
      container: 'body',
      html: true,
      placement: 'auto top',
      viewportPadding: 2
    };

    TooltipManager.prototype.add = function(target, options) {
      var $target, bindings, keyBindingCommand, keyBindingTarget, keystroke;
      requireBootstrapTooltip();
      keyBindingCommand = options.keyBindingCommand, keyBindingTarget = options.keyBindingTarget;
      if (keyBindingCommand != null) {
        bindings = atom.keymaps.findKeyBindings({
          command: keyBindingCommand,
          target: keyBindingTarget
        });
        keystroke = getKeystroke(bindings);
        if ((options.title != null) && (keystroke != null)) {
          options.title += " " + getKeystroke(bindings);
        } else if (keystroke != null) {
          options.title = getKeystroke(bindings);
        }
      }
      $target = $(target);
      $target.tooltip(_.defaults(options, this.defaults));
      return new Disposable(function() {
        var tooltip;
        tooltip = $target.data('bs.tooltip');
        tooltip.leave({
          currentTarget: target
        });
        tooltip.hide();
        return $target.tooltip('destroy');
      });
    };

    return TooltipManager;

  })();

  humanizeKeystrokes = function(keystroke) {
    var keystrokes, stroke;
    keystrokes = keystroke.split(' ');
    keystrokes = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = keystrokes.length; _i < _len; _i++) {
        stroke = keystrokes[_i];
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

    }
  };

  requireBootstrapTooltip = _.once(function() {
    return atom.requireWithGlobals('bootstrap/js/tooltip', {
      jQuery: $
    });
  });

}).call(this);

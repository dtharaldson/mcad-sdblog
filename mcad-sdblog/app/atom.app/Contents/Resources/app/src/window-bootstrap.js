(function() {
  var Atom, windowFocused;

  require('./window');

  Atom = require('./atom');

  window.atom = Atom.loadOrCreate('editor');

  atom.initialize();

  atom.startEditorWindow();

  windowFocused = function() {
    window.removeEventListener('focus', windowFocused);
    return setTimeout((function() {
      return document.querySelector('atom-workspace').focus();
    }), 0);
  };

  window.addEventListener('focus', windowFocused);

}).call(this);

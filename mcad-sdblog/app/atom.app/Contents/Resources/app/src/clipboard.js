(function() {
  var Clipboard, clipboard, crypto;

  crypto = require('crypto');

  clipboard = require('./safe-clipboard');

  module.exports = Clipboard = (function() {
    function Clipboard() {}

    Clipboard.prototype.metadata = null;

    Clipboard.prototype.signatureForMetadata = null;

    Clipboard.prototype.md5 = function(text) {
      return crypto.createHash('md5').update(text, 'utf8').digest('hex');
    };

    Clipboard.prototype.write = function(text, metadata) {
      this.signatureForMetadata = this.md5(text);
      this.metadata = metadata;
      return clipboard.writeText(text);
    };

    Clipboard.prototype.read = function() {
      return clipboard.readText();
    };

    Clipboard.prototype.readWithMetadata = function() {
      var text;
      text = this.read();
      if (this.signatureForMetadata === this.md5(text)) {
        return {
          text: text,
          metadata: this.metadata
        };
      } else {
        return {
          text: text
        };
      }
    };

    return Clipboard;

  })();

}).call(this);

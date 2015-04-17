(function() {
  module.exports = process.platform === 'linux' && process.type === 'renderer' ? require('remote').require('clipboard') : require('clipboard');

}).call(this);

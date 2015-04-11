(function() {
  var Fold, Point, Range, _ref;

  _ref = require('text-buffer'), Point = _ref.Point, Range = _ref.Range;

  module.exports = Fold = (function() {
    Fold.prototype.id = null;

    Fold.prototype.displayBuffer = null;

    Fold.prototype.marker = null;

    function Fold(displayBuffer, marker) {
      this.displayBuffer = displayBuffer;
      this.marker = marker;
      this.id = this.marker.id;
      this.displayBuffer.foldsByMarkerId[this.marker.id] = this;
      this.updateDisplayBuffer();
      this.marker.onDidDestroy((function(_this) {
        return function() {
          return _this.destroyed();
        };
      })(this));
      this.marker.onDidChange((function(_this) {
        return function(_arg) {
          var isValid;
          isValid = _arg.isValid;
          if (!isValid) {
            return _this.destroy();
          }
        };
      })(this));
    }

    Fold.prototype.isInsideLargerFold = function() {
      var largestContainingFoldMarker;
      largestContainingFoldMarker = this.displayBuffer.findFoldMarker({
        containsRange: this.getBufferRange()
      });
      return largestContainingFoldMarker && !largestContainingFoldMarker.getRange().isEqual(this.getBufferRange());
    };

    Fold.prototype.destroy = function() {
      return this.marker.destroy();
    };

    Fold.prototype.getBufferRange = function(_arg) {
      var includeNewline, nextFold, nextRange, range;
      includeNewline = (_arg != null ? _arg : {}).includeNewline;
      range = this.marker.getRange();
      if (range.end.row > range.start.row && (nextFold = this.displayBuffer.largestFoldStartingAtBufferRow(range.end.row))) {
        nextRange = nextFold.getBufferRange();
        range = new Range(range.start, nextRange.end);
      }
      if (includeNewline) {
        range = range.copy();
        range.end.row++;
        range.end.column = 0;
      }
      return range;
    };

    Fold.prototype.getBufferRowRange = function() {
      var end, start, _ref1;
      _ref1 = this.getBufferRange(), start = _ref1.start, end = _ref1.end;
      return [start.row, end.row];
    };

    Fold.prototype.getStartRow = function() {
      return this.getBufferRange().start.row;
    };

    Fold.prototype.getEndRow = function() {
      return this.getBufferRange().end.row;
    };

    Fold.prototype.inspect = function() {
      return "Fold(" + (this.getStartRow()) + ", " + (this.getEndRow()) + ")";
    };

    Fold.prototype.getBufferRowCount = function() {
      return this.getEndRow() - this.getStartRow() + 1;
    };

    Fold.prototype.isContainedByFold = function(fold) {
      return this.isContainedByRange(fold.getBufferRange());
    };

    Fold.prototype.updateDisplayBuffer = function() {
      if (!this.isInsideLargerFold()) {
        return this.displayBuffer.updateScreenLines(this.getStartRow(), this.getEndRow() + 1, 0, {
          updateMarkers: true
        });
      }
    };

    Fold.prototype.destroyed = function() {
      delete this.displayBuffer.foldsByMarkerId[this.marker.id];
      return this.updateDisplayBuffer();
    };

    return Fold;

  })();

}).call(this);

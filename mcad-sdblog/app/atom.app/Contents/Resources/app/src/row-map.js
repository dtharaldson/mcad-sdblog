(function() {
  var RowMap, spliceWithArray;

  spliceWithArray = require('underscore-plus').spliceWithArray;

  module.exports = RowMap = (function() {
    function RowMap() {
      this.regions = [];
    }

    RowMap.prototype.getRegions = function() {
      return this.regions.slice();
    };

    RowMap.prototype.screenRowRangeForBufferRow = function(targetBufferRow) {
      var bufferRows, region, screenRows, _ref;
      _ref = this.traverseToBufferRow(targetBufferRow), region = _ref.region, bufferRows = _ref.bufferRows, screenRows = _ref.screenRows;
      if ((region != null) && region.bufferRows !== region.screenRows) {
        return [screenRows, screenRows + region.screenRows];
      } else {
        screenRows += targetBufferRow - bufferRows;
        return [screenRows, screenRows + 1];
      }
    };

    RowMap.prototype.bufferRowRangeForScreenRow = function(targetScreenRow) {
      var bufferRows, region, screenRows, _ref;
      _ref = this.traverseToScreenRow(targetScreenRow), region = _ref.region, screenRows = _ref.screenRows, bufferRows = _ref.bufferRows;
      if ((region != null) && region.bufferRows !== region.screenRows) {
        return [bufferRows, bufferRows + region.bufferRows];
      } else {
        bufferRows += targetScreenRow - screenRows;
        return [bufferRows, bufferRows + 1];
      }
    };

    RowMap.prototype.bufferRowRangeForBufferRow = function(targetBufferRow) {
      var bufferRows, region, _ref;
      _ref = this.traverseToBufferRow(targetBufferRow), region = _ref.region, bufferRows = _ref.bufferRows;
      if ((region != null) && region.bufferRows !== region.screenRows) {
        return [bufferRows, bufferRows + region.bufferRows];
      } else {
        return [targetBufferRow, targetBufferRow + 1];
      }
    };

    RowMap.prototype.spliceRegions = function(startBufferRow, bufferRowCount, regions) {
      var bufferRows, count, endBufferRow, followingRows, index, precedingRows, region, _ref;
      endBufferRow = startBufferRow + bufferRowCount;
      _ref = this.traverseToBufferRow(startBufferRow), index = _ref.index, bufferRows = _ref.bufferRows;
      precedingRows = startBufferRow - bufferRows;
      count = 0;
      while (region = this.regions[index + count]) {
        count++;
        bufferRows += region.bufferRows;
        if (bufferRows >= endBufferRow) {
          followingRows = bufferRows - endBufferRow;
          break;
        }
      }
      if (precedingRows > 0) {
        regions.unshift({
          bufferRows: precedingRows,
          screenRows: precedingRows
        });
      }
      if (followingRows > 0) {
        regions.push({
          bufferRows: followingRows,
          screenRows: followingRows
        });
      }
      spliceWithArray(this.regions, index, count, regions);
      return this.mergeAdjacentRectangularRegions(index - 1, index + regions.length);
    };

    RowMap.prototype.traverseToBufferRow = function(targetBufferRow) {
      var bufferRows, index, region, screenRows, _i, _len, _ref;
      bufferRows = 0;
      screenRows = 0;
      _ref = this.regions;
      for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
        region = _ref[index];
        if ((bufferRows + region.bufferRows) > targetBufferRow) {
          return {
            region: region,
            index: index,
            screenRows: screenRows,
            bufferRows: bufferRows
          };
        }
        bufferRows += region.bufferRows;
        screenRows += region.screenRows;
      }
      return {
        index: index,
        screenRows: screenRows,
        bufferRows: bufferRows
      };
    };

    RowMap.prototype.traverseToScreenRow = function(targetScreenRow) {
      var bufferRows, index, region, screenRows, _i, _len, _ref;
      bufferRows = 0;
      screenRows = 0;
      _ref = this.regions;
      for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
        region = _ref[index];
        if ((screenRows + region.screenRows) > targetScreenRow) {
          return {
            region: region,
            index: index,
            screenRows: screenRows,
            bufferRows: bufferRows
          };
        }
        bufferRows += region.bufferRows;
        screenRows += region.screenRows;
      }
      return {
        index: index,
        screenRows: screenRows,
        bufferRows: bufferRows
      };
    };

    RowMap.prototype.mergeAdjacentRectangularRegions = function(startIndex, endIndex) {
      var index, leftIsRectangular, leftRegion, rightIsRectangular, rightRegion, _i;
      for (index = _i = endIndex; endIndex <= startIndex ? _i <= startIndex : _i >= startIndex; index = endIndex <= startIndex ? ++_i : --_i) {
        if ((0 < index && index < this.regions.length)) {
          leftRegion = this.regions[index - 1];
          rightRegion = this.regions[index];
          leftIsRectangular = leftRegion.bufferRows === leftRegion.screenRows;
          rightIsRectangular = rightRegion.bufferRows === rightRegion.screenRows;
          if (leftIsRectangular && rightIsRectangular) {
            this.regions.splice(index - 1, 2, {
              bufferRows: leftRegion.bufferRows + rightRegion.bufferRows,
              screenRows: leftRegion.screenRows + rightRegion.screenRows
            });
          }
        }
      }
    };

    RowMap.prototype.inspect = function() {
      var bufferRows, screenRows, _i, _len, _ref, _ref1, _results;
      _ref = this.regions;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        _ref1 = _ref[_i], bufferRows = _ref1.bufferRows, screenRows = _ref1.screenRows;
        _results.push("" + bufferRows + ":" + screenRows);
      }
      return _results;
    };

    return RowMap;

  })();

}).call(this);

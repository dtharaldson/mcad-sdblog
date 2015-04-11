(function() {
  var CompositeDisposable, Cursor, Delegator, Directory, DisplayBuffer, Emitter, EmitterMixin, LanguageMode, Model, Point, Range, Selection, Serializable, TextBuffer, TextEditor, TextMateScopeSelector, deprecate, includeDeprecatedAPIs, path, _, _ref, _ref1, _ref2,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  _ = require('underscore-plus');

  path = require('path');

  Serializable = require('serializable');

  Delegator = require('delegato');

  _ref = require('grim'), includeDeprecatedAPIs = _ref.includeDeprecatedAPIs, deprecate = _ref.deprecate;

  EmitterMixin = require('emissary').Emitter;

  _ref1 = require('event-kit'), CompositeDisposable = _ref1.CompositeDisposable, Emitter = _ref1.Emitter;

  _ref2 = TextBuffer = require('text-buffer'), Point = _ref2.Point, Range = _ref2.Range;

  LanguageMode = require('./language-mode');

  DisplayBuffer = require('./display-buffer');

  Cursor = require('./cursor');

  Model = require('./model');

  Selection = require('./selection');

  TextMateScopeSelector = require('first-mate').ScopeSelector;

  Directory = require("pathwatcher").Directory;

  module.exports = TextEditor = (function(_super) {
    __extends(TextEditor, _super);

    Serializable.includeInto(TextEditor);

    atom.deserializers.add(TextEditor);

    Delegator.includeInto(TextEditor);

    TextEditor.prototype.deserializing = false;

    TextEditor.prototype.callDisplayBufferCreatedHook = false;

    TextEditor.prototype.registerEditor = false;

    TextEditor.prototype.buffer = null;

    TextEditor.prototype.languageMode = null;

    TextEditor.prototype.cursors = null;

    TextEditor.prototype.selections = null;

    TextEditor.prototype.suppressSelectionMerging = false;

    TextEditor.prototype.updateBatchDepth = 0;

    TextEditor.prototype.selectionFlashDuration = 500;

    TextEditor.delegatesMethods('suggestedIndentForBufferRow', 'autoIndentBufferRow', 'autoIndentBufferRows', 'autoDecreaseIndentForBufferRow', 'toggleLineCommentForBufferRow', 'toggleLineCommentsForBufferRows', {
      toProperty: 'languageMode'
    });

    function TextEditor(_arg) {
      var buffer, initialColumn, initialLine, marker, registerEditor, softWrapped, suppressCursorCreation, tabLength, _i, _len, _ref3, _ref4, _ref5, _ref6, _ref7;
      this.softTabs = _arg.softTabs, initialLine = _arg.initialLine, initialColumn = _arg.initialColumn, tabLength = _arg.tabLength, softWrapped = _arg.softWrapped, this.displayBuffer = _arg.displayBuffer, buffer = _arg.buffer, registerEditor = _arg.registerEditor, suppressCursorCreation = _arg.suppressCursorCreation, this.mini = _arg.mini, this.placeholderText = _arg.placeholderText, this.gutterVisible = _arg.gutterVisible;
      this.handleMarkerCreated = __bind(this.handleMarkerCreated, this);
      TextEditor.__super__.constructor.apply(this, arguments);
      this.emitter = new Emitter;
      this.disposables = new CompositeDisposable;
      this.cursors = [];
      this.selections = [];
      if (buffer == null) {
        buffer = new TextBuffer;
      }
      if (this.displayBuffer == null) {
        this.displayBuffer = new DisplayBuffer({
          buffer: buffer,
          tabLength: tabLength,
          softWrapped: softWrapped
        });
      }
      this.buffer = this.displayBuffer.buffer;
      this.softTabs = (_ref3 = (_ref4 = (_ref5 = this.usesSoftTabs()) != null ? _ref5 : this.softTabs) != null ? _ref4 : atom.config.get('editor.softTabs')) != null ? _ref3 : true;
      this.updateInvisibles();
      _ref6 = this.findMarkers(this.getSelectionMarkerAttributes());
      for (_i = 0, _len = _ref6.length; _i < _len; _i++) {
        marker = _ref6[_i];
        marker.setProperties({
          preserveFolds: true
        });
        this.addSelection(marker);
      }
      this.subscribeToBuffer();
      this.subscribeToDisplayBuffer();
      if (this.getCursors().length === 0 && !suppressCursorCreation) {
        initialLine = Math.max(parseInt(initialLine) || 0, 0);
        initialColumn = Math.max(parseInt(initialColumn) || 0, 0);
        this.addCursorAtBufferPosition([initialLine, initialColumn]);
      }
      this.languageMode = new LanguageMode(this);
      this.setEncoding(atom.config.get('core.fileEncoding', {
        scope: this.getRootScopeDescriptor()
      }));
      this.disposables.add(this.displayBuffer.onDidChangeScrollTop((function(_this) {
        return function(scrollTop) {
          if (includeDeprecatedAPIs) {
            _this.emit('scroll-top-changed', scrollTop);
          }
          return _this.emitter.emit('did-change-scroll-top', scrollTop);
        };
      })(this)));
      this.disposables.add(this.displayBuffer.onDidChangeScrollLeft((function(_this) {
        return function(scrollLeft) {
          if (includeDeprecatedAPIs) {
            _this.emit('scroll-left-changed', scrollLeft);
          }
          return _this.emitter.emit('did-change-scroll-left', scrollLeft);
        };
      })(this)));
      if (registerEditor) {
        if ((_ref7 = atom.workspace) != null) {
          _ref7.editorAdded(this);
        }
      }
    }

    TextEditor.prototype.serializeParams = function() {
      return {
        id: this.id,
        softTabs: this.softTabs,
        scrollTop: this.scrollTop,
        scrollLeft: this.scrollLeft,
        displayBuffer: this.displayBuffer.serialize()
      };
    };

    TextEditor.prototype.deserializeParams = function(params) {
      params.displayBuffer = DisplayBuffer.deserialize(params.displayBuffer);
      params.registerEditor = true;
      return params;
    };

    TextEditor.prototype.subscribeToBuffer = function() {
      this.buffer.retain();
      this.disposables.add(this.buffer.onDidChangePath((function(_this) {
        return function() {
          if (!(atom.project.getPaths().length > 0)) {
            atom.project.setPaths([path.dirname(_this.getPath())]);
          }
          if (includeDeprecatedAPIs) {
            _this.emit("title-changed");
          }
          _this.emitter.emit('did-change-title', _this.getTitle());
          if (includeDeprecatedAPIs) {
            _this.emit("path-changed");
          }
          return _this.emitter.emit('did-change-path', _this.getPath());
        };
      })(this)));
      this.disposables.add(this.buffer.onDidChangeEncoding((function(_this) {
        return function() {
          return _this.emitter.emit('did-change-encoding', _this.getEncoding());
        };
      })(this)));
      this.disposables.add(this.buffer.onDidDestroy((function(_this) {
        return function() {
          return _this.destroy();
        };
      })(this)));
      if (includeDeprecatedAPIs) {
        this.subscribe(this.buffer.onDidStopChanging((function(_this) {
          return function() {
            return _this.emit("contents-modified");
          };
        })(this)));
        this.subscribe(this.buffer.onDidConflict((function(_this) {
          return function() {
            return _this.emit("contents-conflicted");
          };
        })(this)));
        this.subscribe(this.buffer.onDidChangeModified((function(_this) {
          return function() {
            return _this.emit("modified-status-changed");
          };
        })(this)));
      }
      return this.preserveCursorPositionOnBufferReload();
    };

    TextEditor.prototype.subscribeToDisplayBuffer = function() {
      this.disposables.add(this.displayBuffer.onDidCreateMarker(this.handleMarkerCreated));
      this.disposables.add(this.displayBuffer.onDidUpdateMarkers((function(_this) {
        return function() {
          return _this.mergeIntersectingSelections();
        };
      })(this)));
      this.disposables.add(this.displayBuffer.onDidChangeGrammar((function(_this) {
        return function() {
          return _this.handleGrammarChange();
        };
      })(this)));
      this.disposables.add(this.displayBuffer.onDidTokenize((function(_this) {
        return function() {
          return _this.handleTokenization();
        };
      })(this)));
      this.disposables.add(this.displayBuffer.onDidChange((function(_this) {
        return function(e) {
          if (includeDeprecatedAPIs) {
            _this.emit('screen-lines-changed', e);
          }
          return _this.emitter.emit('did-change', e);
        };
      })(this)));
      if (includeDeprecatedAPIs) {
        this.subscribe(this.displayBuffer.onDidChangeSoftWrapped((function(_this) {
          return function(softWrapped) {
            return _this.emit('soft-wrap-changed', softWrapped);
          };
        })(this)));
        this.subscribe(this.displayBuffer.onDidAddDecoration((function(_this) {
          return function(decoration) {
            return _this.emit('decoration-added', decoration);
          };
        })(this)));
        this.subscribe(this.displayBuffer.onDidRemoveDecoration((function(_this) {
          return function(decoration) {
            return _this.emit('decoration-removed', decoration);
          };
        })(this)));
      }
      return this.subscribeToScopedConfigSettings();
    };

    TextEditor.prototype.subscribeToScopedConfigSettings = function() {
      var scopeDescriptor, subscriptions, _ref3;
      if ((_ref3 = this.scopedConfigSubscriptions) != null) {
        _ref3.dispose();
      }
      this.scopedConfigSubscriptions = subscriptions = new CompositeDisposable;
      scopeDescriptor = this.getRootScopeDescriptor();
      subscriptions.add(atom.config.onDidChange('editor.showInvisibles', {
        scope: scopeDescriptor
      }, (function(_this) {
        return function() {
          return _this.updateInvisibles();
        };
      })(this)));
      return subscriptions.add(atom.config.onDidChange('editor.invisibles', {
        scope: scopeDescriptor
      }, (function(_this) {
        return function() {
          return _this.updateInvisibles();
        };
      })(this)));
    };

    TextEditor.prototype.destroyed = function() {
      var selection, _i, _len, _ref3;
      if (includeDeprecatedAPIs) {
        this.unsubscribe();
      }
      this.disposables.dispose();
      this.scopedConfigSubscriptions.dispose();
      _ref3 = this.getSelections();
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        selection = _ref3[_i];
        selection.destroy();
      }
      this.buffer.release();
      this.displayBuffer.destroy();
      this.languageMode.destroy();
      return this.emitter.emit('did-destroy');
    };


    /*
    Section: Event Subscription
     */

    TextEditor.prototype.onDidChangeTitle = function(callback) {
      return this.emitter.on('did-change-title', callback);
    };

    TextEditor.prototype.onDidChangePath = function(callback) {
      return this.emitter.on('did-change-path', callback);
    };

    TextEditor.prototype.onDidChange = function(callback) {
      return this.emitter.on('did-change', callback);
    };

    TextEditor.prototype.onDidStopChanging = function(callback) {
      return this.getBuffer().onDidStopChanging(callback);
    };

    TextEditor.prototype.onDidChangeCursorPosition = function(callback) {
      return this.emitter.on('did-change-cursor-position', callback);
    };

    TextEditor.prototype.onDidChangeSelectionRange = function(callback) {
      return this.emitter.on('did-change-selection-range', callback);
    };

    TextEditor.prototype.onDidChangeSoftWrapped = function(callback) {
      return this.displayBuffer.onDidChangeSoftWrapped(callback);
    };

    TextEditor.prototype.onDidChangeEncoding = function(callback) {
      return this.emitter.on('did-change-encoding', callback);
    };

    TextEditor.prototype.observeGrammar = function(callback) {
      callback(this.getGrammar());
      return this.onDidChangeGrammar(callback);
    };

    TextEditor.prototype.onDidChangeGrammar = function(callback) {
      return this.emitter.on('did-change-grammar', callback);
    };

    TextEditor.prototype.onDidChangeModified = function(callback) {
      return this.getBuffer().onDidChangeModified(callback);
    };

    TextEditor.prototype.onDidConflict = function(callback) {
      return this.getBuffer().onDidConflict(callback);
    };

    TextEditor.prototype.onWillInsertText = function(callback) {
      return this.emitter.on('will-insert-text', callback);
    };

    TextEditor.prototype.onDidInsertText = function(callback) {
      return this.emitter.on('did-insert-text', callback);
    };

    TextEditor.prototype.onDidSave = function(callback) {
      return this.getBuffer().onDidSave(callback);
    };

    TextEditor.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };

    TextEditor.prototype.observeCursors = function(callback) {
      var cursor, _i, _len, _ref3;
      _ref3 = this.getCursors();
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        cursor = _ref3[_i];
        callback(cursor);
      }
      return this.onDidAddCursor(callback);
    };

    TextEditor.prototype.onDidAddCursor = function(callback) {
      return this.emitter.on('did-add-cursor', callback);
    };

    TextEditor.prototype.onDidRemoveCursor = function(callback) {
      return this.emitter.on('did-remove-cursor', callback);
    };

    TextEditor.prototype.observeSelections = function(callback) {
      var selection, _i, _len, _ref3;
      _ref3 = this.getSelections();
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        selection = _ref3[_i];
        callback(selection);
      }
      return this.onDidAddSelection(callback);
    };

    TextEditor.prototype.onDidAddSelection = function(callback) {
      return this.emitter.on('did-add-selection', callback);
    };

    TextEditor.prototype.onDidRemoveSelection = function(callback) {
      return this.emitter.on('did-remove-selection', callback);
    };

    TextEditor.prototype.observeDecorations = function(callback) {
      return this.displayBuffer.observeDecorations(callback);
    };

    TextEditor.prototype.onDidAddDecoration = function(callback) {
      return this.displayBuffer.onDidAddDecoration(callback);
    };

    TextEditor.prototype.onDidRemoveDecoration = function(callback) {
      return this.displayBuffer.onDidRemoveDecoration(callback);
    };

    TextEditor.prototype.onDidChangePlaceholderText = function(callback) {
      return this.emitter.on('did-change-placeholder-text', callback);
    };

    TextEditor.prototype.onDidChangeCharacterWidths = function(callback) {
      return this.displayBuffer.onDidChangeCharacterWidths(callback);
    };

    TextEditor.prototype.onDidChangeScrollTop = function(callback) {
      return this.emitter.on('did-change-scroll-top', callback);
    };

    TextEditor.prototype.onDidChangeScrollLeft = function(callback) {
      return this.emitter.on('did-change-scroll-left', callback);
    };

    TextEditor.prototype.onDidChangeIcon = function(callback) {
      return this.emitter.on('did-change-icon', callback);
    };

    TextEditor.prototype.getBuffer = function() {
      return this.buffer;
    };

    TextEditor.prototype.getURI = function() {
      return this.buffer.getUri();
    };

    TextEditor.prototype.copy = function() {
      var displayBuffer, marker, newEditor, softTabs, _i, _len, _ref3;
      displayBuffer = this.displayBuffer.copy();
      softTabs = this.getSoftTabs();
      newEditor = new TextEditor({
        buffer: this.buffer,
        displayBuffer: displayBuffer,
        tabLength: this.tabLength,
        softTabs: softTabs,
        suppressCursorCreation: true,
        registerEditor: true
      });
      _ref3 = this.findMarkers({
        editorId: this.id
      });
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        marker = _ref3[_i];
        marker.copy({
          editorId: newEditor.id,
          preserveFolds: true
        });
      }
      return newEditor;
    };

    TextEditor.prototype.setVisible = function(visible) {
      return this.displayBuffer.setVisible(visible);
    };

    TextEditor.prototype.setMini = function(mini) {
      if (mini !== this.mini) {
        this.mini = mini;
        this.updateInvisibles();
        this.emitter.emit('did-change-mini', this.mini);
      }
      return this.mini;
    };

    TextEditor.prototype.isMini = function() {
      return this.mini;
    };

    TextEditor.prototype.onDidChangeMini = function(callback) {
      return this.emitter.on('did-change-mini', callback);
    };

    TextEditor.prototype.setGutterVisible = function(gutterVisible) {
      if (gutterVisible !== this.gutterVisible) {
        this.gutterVisible = gutterVisible;
        this.emitter.emit('did-change-gutter-visible', this.gutterVisible);
      }
      return this.gutterVisible;
    };

    TextEditor.prototype.isGutterVisible = function() {
      var _ref3;
      return (_ref3 = this.gutterVisible) != null ? _ref3 : true;
    };

    TextEditor.prototype.onDidChangeGutterVisible = function(callback) {
      return this.emitter.on('did-change-gutter-visible', callback);
    };

    TextEditor.prototype.setEditorWidthInChars = function(editorWidthInChars) {
      return this.displayBuffer.setEditorWidthInChars(editorWidthInChars);
    };


    /*
    Section: File Details
     */

    TextEditor.prototype.getTitle = function() {
      var sessionPath;
      if (sessionPath = this.getPath()) {
        return path.basename(sessionPath);
      } else {
        return 'untitled';
      }
    };

    TextEditor.prototype.getLongTitle = function() {
      var directory, fileName, sessionPath;
      if (sessionPath = this.getPath()) {
        fileName = path.basename(sessionPath);
        directory = atom.project.relativize(path.dirname(sessionPath));
        directory = directory.length > 0 ? directory : path.basename(path.dirname(sessionPath));
        return "" + fileName + " - " + directory;
      } else {
        return 'untitled';
      }
    };

    TextEditor.prototype.getPath = function() {
      return this.buffer.getPath();
    };

    TextEditor.prototype.getEncoding = function() {
      return this.buffer.getEncoding();
    };

    TextEditor.prototype.setEncoding = function(encoding) {
      return this.buffer.setEncoding(encoding);
    };

    TextEditor.prototype.isModified = function() {
      return this.buffer.isModified();
    };

    TextEditor.prototype.isEmpty = function() {
      return this.buffer.isEmpty();
    };

    TextEditor.prototype.copyPathToClipboard = function() {
      var filePath;
      if (filePath = this.getPath()) {
        return atom.clipboard.write(filePath);
      }
    };


    /*
    Section: File Operations
     */

    TextEditor.prototype.save = function() {
      return this.buffer.save();
    };

    TextEditor.prototype.saveAs = function(filePath) {
      return this.buffer.saveAs(filePath);
    };

    TextEditor.prototype.shouldPromptToSave = function(_arg) {
      var windowCloseRequested;
      windowCloseRequested = (_arg != null ? _arg : {}).windowCloseRequested;
      if (windowCloseRequested) {
        return this.isModified();
      } else {
        return this.isModified() && !this.buffer.hasMultipleEditors();
      }
    };

    TextEditor.prototype.checkoutHeadRevision = function() {
      var filePath;
      if (filePath = this.getPath()) {
        return atom.project.repositoryForDirectory(new Directory(path.dirname(filePath))).then((function(_this) {
          return function(repository) {
            return repository != null ? repository.checkoutHeadForEditor(_this) : void 0;
          };
        })(this));
      } else {
        return Promise.resolve(false);
      }
    };


    /*
    Section: Reading Text
     */

    TextEditor.prototype.getText = function() {
      return this.buffer.getText();
    };

    TextEditor.prototype.getTextInBufferRange = function(range) {
      return this.buffer.getTextInRange(range);
    };

    TextEditor.prototype.getLineCount = function() {
      return this.buffer.getLineCount();
    };

    TextEditor.prototype.getScreenLineCount = function() {
      return this.displayBuffer.getLineCount();
    };

    TextEditor.prototype.getLastBufferRow = function() {
      return this.buffer.getLastRow();
    };

    TextEditor.prototype.getLastScreenRow = function() {
      return this.displayBuffer.getLastRow();
    };

    TextEditor.prototype.lineTextForBufferRow = function(bufferRow) {
      return this.buffer.lineForRow(bufferRow);
    };

    TextEditor.prototype.lineTextForScreenRow = function(screenRow) {
      var _ref3;
      return (_ref3 = this.displayBuffer.tokenizedLineForScreenRow(screenRow)) != null ? _ref3.text : void 0;
    };

    TextEditor.prototype.tokenizedLineForScreenRow = function(screenRow) {
      return this.displayBuffer.tokenizedLineForScreenRow(screenRow);
    };

    TextEditor.prototype.tokenizedLinesForScreenRows = function(start, end) {
      return this.displayBuffer.tokenizedLinesForScreenRows(start, end);
    };

    TextEditor.prototype.bufferRowForScreenRow = function(row) {
      return this.displayBuffer.bufferRowForScreenRow(row);
    };

    TextEditor.prototype.bufferRowsForScreenRows = function(startRow, endRow) {
      return this.displayBuffer.bufferRowsForScreenRows(startRow, endRow);
    };

    TextEditor.prototype.screenRowForBufferRow = function(row) {
      return this.displayBuffer.screenRowForBufferRow(row);
    };

    TextEditor.prototype.getMaxScreenLineLength = function() {
      return this.displayBuffer.getMaxLineLength();
    };

    TextEditor.prototype.getLongestScreenRow = function() {
      return this.displayBuffer.getLongestScreenRow();
    };

    TextEditor.prototype.bufferRangeForBufferRow = function(row, _arg) {
      var includeNewline;
      includeNewline = (_arg != null ? _arg : {}).includeNewline;
      return this.buffer.rangeForRow(row, includeNewline);
    };

    TextEditor.prototype.getTextInRange = function(range) {
      return this.buffer.getTextInRange(range);
    };

    TextEditor.prototype.isBufferRowBlank = function(bufferRow) {
      return this.buffer.isRowBlank(bufferRow);
    };

    TextEditor.prototype.nextNonBlankBufferRow = function(bufferRow) {
      return this.buffer.nextNonBlankRow(bufferRow);
    };

    TextEditor.prototype.getEofBufferPosition = function() {
      return this.buffer.getEndPosition();
    };

    TextEditor.prototype.getCurrentParagraphBufferRange = function() {
      return this.getLastCursor().getCurrentParagraphBufferRange();
    };


    /*
    Section: Mutating Text
     */

    TextEditor.prototype.setText = function(text) {
      return this.buffer.setText(text);
    };

    TextEditor.prototype.setTextInBufferRange = function(range, text, options) {
      return this.getBuffer().setTextInRange(range, text, options);
    };

    TextEditor.prototype.insertText = function(text, options) {
      var cancel, willInsert, willInsertEvent;
      if (options == null) {
        options = {};
      }
      willInsert = true;
      cancel = function() {
        return willInsert = false;
      };
      willInsertEvent = {
        cancel: cancel,
        text: text
      };
      if (includeDeprecatedAPIs) {
        this.emit('will-insert-text', willInsertEvent);
      }
      this.emitter.emit('will-insert-text', willInsertEvent);
      if (willInsert) {
        if (options.autoIndentNewline == null) {
          options.autoIndentNewline = this.shouldAutoIndent();
        }
        if (options.autoDecreaseIndent == null) {
          options.autoDecreaseIndent = this.shouldAutoIndent();
        }
        return this.mutateSelectedText((function(_this) {
          return function(selection) {
            var didInsertEvent, range;
            range = selection.insertText(text, options);
            didInsertEvent = {
              text: text,
              range: range
            };
            if (includeDeprecatedAPIs) {
              _this.emit('did-insert-text', didInsertEvent);
            }
            _this.emitter.emit('did-insert-text', didInsertEvent);
            return range;
          };
        })(this));
      } else {
        return false;
      }
    };

    TextEditor.prototype.insertNewline = function() {
      return this.insertText('\n');
    };

    TextEditor.prototype["delete"] = function() {
      return this.mutateSelectedText(function(selection) {
        return selection["delete"]();
      });
    };

    TextEditor.prototype.backspace = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.backspace();
      });
    };

    TextEditor.prototype.mutateSelectedText = function(fn) {
      return this.mergeIntersectingSelections((function(_this) {
        return function() {
          return _this.transact(function() {
            var index, selection, _i, _len, _ref3, _results;
            _ref3 = _this.getSelectionsOrderedByBufferPosition();
            _results = [];
            for (index = _i = 0, _len = _ref3.length; _i < _len; index = ++_i) {
              selection = _ref3[index];
              _results.push(fn(selection, index));
            }
            return _results;
          });
        };
      })(this));
    };

    TextEditor.prototype.moveLineUp = function() {
      var lastRow, selection;
      selection = this.getSelectedBufferRange();
      if (selection.start.row === 0) {
        return;
      }
      lastRow = this.buffer.getLastRow();
      if (selection.isEmpty() && selection.start.row === lastRow && this.buffer.getLastLine() === '') {
        return;
      }
      return this.transact((function(_this) {
        return function() {
          var bufferRange, endPosition, endRow, fold, foldedRow, foldedRows, insertDelta, insertPosition, lines, precedingBufferRow, precedingScreenRow, row, rows, startRow, _i, _j, _k, _len, _len1, _ref3, _ref4, _results;
          foldedRows = [];
          rows = (function() {
            _results = [];
            for (var _i = _ref3 = selection.start.row, _ref4 = selection.end.row; _ref3 <= _ref4 ? _i <= _ref4 : _i >= _ref4; _ref3 <= _ref4 ? _i++ : _i--){ _results.push(_i); }
            return _results;
          }).apply(this);
          if (selection.start.row !== selection.end.row && selection.end.column === 0) {
            if (!_this.isFoldedAtBufferRow(selection.end.row)) {
              rows.pop();
            }
          }
          precedingScreenRow = _this.screenPositionForBufferPosition([selection.start.row]).translate([-1]);
          precedingBufferRow = _this.bufferPositionForScreenPosition(precedingScreenRow).row;
          if (fold = _this.largestFoldContainingBufferRow(precedingBufferRow)) {
            insertDelta = fold.getBufferRange().getRowCount();
          } else {
            insertDelta = 1;
          }
          for (_j = 0, _len = rows.length; _j < _len; _j++) {
            row = rows[_j];
            if (fold = _this.displayBuffer.largestFoldStartingAtBufferRow(row)) {
              bufferRange = fold.getBufferRange();
              startRow = bufferRange.start.row;
              endRow = bufferRange.end.row;
              foldedRows.push(startRow - insertDelta);
            } else {
              startRow = row;
              endRow = row;
            }
            insertPosition = Point.fromObject([startRow - insertDelta]);
            endPosition = Point.min([endRow + 1], _this.buffer.getEndPosition());
            lines = _this.buffer.getTextInRange([[startRow], endPosition]);
            if (endPosition.row === lastRow && endPosition.column > 0 && !_this.buffer.lineEndingForRow(endPosition.row)) {
              lines = "" + lines + "\n";
            }
            _this.buffer.deleteRows(startRow, endRow);
            if (fold = _this.displayBuffer.largestFoldStartingAtBufferRow(insertPosition.row)) {
              _this.unfoldBufferRow(insertPosition.row);
              foldedRows.push(insertPosition.row + endRow - startRow + fold.getBufferRange().getRowCount());
            }
            _this.buffer.insert(insertPosition, lines);
          }
          for (_k = 0, _len1 = foldedRows.length; _k < _len1; _k++) {
            foldedRow = foldedRows[_k];
            if ((0 <= foldedRow && foldedRow <= _this.getLastBufferRow())) {
              _this.foldBufferRow(foldedRow);
            }
          }
          return _this.setSelectedBufferRange(selection.translate([-insertDelta]), {
            preserveFolds: true,
            autoscroll: true
          });
        };
      })(this));
    };

    TextEditor.prototype.moveLineDown = function() {
      var lastRow, selection;
      selection = this.getSelectedBufferRange();
      lastRow = this.buffer.getLastRow();
      if (selection.end.row === lastRow) {
        return;
      }
      if (selection.end.row === lastRow - 1 && this.buffer.getLastLine() === '') {
        return;
      }
      return this.transact((function(_this) {
        return function() {
          var bufferRange, endPosition, endRow, fold, foldedRow, foldedRows, followingBufferRow, followingScreenRow, insertDelta, insertPosition, lines, row, rows, startRow, _i, _j, _k, _len, _len1, _ref3, _ref4, _results;
          foldedRows = [];
          rows = (function() {
            _results = [];
            for (var _i = _ref3 = selection.end.row, _ref4 = selection.start.row; _ref3 <= _ref4 ? _i <= _ref4 : _i >= _ref4; _ref3 <= _ref4 ? _i++ : _i--){ _results.push(_i); }
            return _results;
          }).apply(this);
          if (selection.start.row !== selection.end.row && selection.end.column === 0) {
            if (!_this.isFoldedAtBufferRow(selection.end.row)) {
              rows.shift();
            }
          }
          followingScreenRow = _this.screenPositionForBufferPosition([selection.end.row]).translate([1]);
          followingBufferRow = _this.bufferPositionForScreenPosition(followingScreenRow).row;
          if (fold = _this.largestFoldContainingBufferRow(followingBufferRow)) {
            insertDelta = fold.getBufferRange().getRowCount();
          } else {
            insertDelta = 1;
          }
          for (_j = 0, _len = rows.length; _j < _len; _j++) {
            row = rows[_j];
            if (fold = _this.displayBuffer.largestFoldStartingAtBufferRow(row)) {
              bufferRange = fold.getBufferRange();
              startRow = bufferRange.start.row;
              endRow = bufferRange.end.row;
              foldedRows.push(endRow + insertDelta);
            } else {
              startRow = row;
              endRow = row;
            }
            if (endRow + 1 === lastRow) {
              endPosition = [endRow, _this.buffer.lineLengthForRow(endRow)];
            } else {
              endPosition = [endRow + 1];
            }
            lines = _this.buffer.getTextInRange([[startRow], endPosition]);
            _this.buffer.deleteRows(startRow, endRow);
            insertPosition = Point.min([startRow + insertDelta], _this.buffer.getEndPosition());
            if (insertPosition.row === _this.buffer.getLastRow() && insertPosition.column > 0) {
              lines = "\n" + lines;
            }
            if (fold = _this.displayBuffer.largestFoldStartingAtBufferRow(insertPosition.row)) {
              _this.unfoldBufferRow(insertPosition.row);
              foldedRows.push(insertPosition.row + fold.getBufferRange().getRowCount());
            }
            _this.buffer.insert(insertPosition, lines);
          }
          for (_k = 0, _len1 = foldedRows.length; _k < _len1; _k++) {
            foldedRow = foldedRows[_k];
            if ((0 <= foldedRow && foldedRow <= _this.getLastBufferRow())) {
              _this.foldBufferRow(foldedRow);
            }
          }
          return _this.setSelectedBufferRange(selection.translate([insertDelta]), {
            preserveFolds: true,
            autoscroll: true
          });
        };
      })(this));
    };

    TextEditor.prototype.duplicateLines = function() {
      return this.transact((function(_this) {
        return function() {
          var delta, endRow, foldEndRow, foldStartRow, foldedRowRanges, rangeToDuplicate, selectedBufferRange, selection, start, startRow, textToDuplicate, _i, _j, _len, _len1, _ref3, _ref4, _ref5;
          _ref3 = _this.getSelectionsOrderedByBufferPosition().reverse();
          for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
            selection = _ref3[_i];
            selectedBufferRange = selection.getBufferRange();
            if (selection.isEmpty()) {
              start = selection.getScreenRange().start;
              selection.selectToScreenPosition([start.row + 1, 0]);
            }
            _ref4 = selection.getBufferRowRange(), startRow = _ref4[0], endRow = _ref4[1];
            endRow++;
            foldedRowRanges = _this.outermostFoldsInBufferRowRange(startRow, endRow).map(function(fold) {
              return fold.getBufferRowRange();
            });
            rangeToDuplicate = [[startRow, 0], [endRow, 0]];
            textToDuplicate = _this.getTextInBufferRange(rangeToDuplicate);
            if (endRow > _this.getLastBufferRow()) {
              textToDuplicate = '\n' + textToDuplicate;
            }
            _this.buffer.insert([endRow, 0], textToDuplicate);
            delta = endRow - startRow;
            selection.setBufferRange(selectedBufferRange.translate([delta, 0]));
            for (_j = 0, _len1 = foldedRowRanges.length; _j < _len1; _j++) {
              _ref5 = foldedRowRanges[_j], foldStartRow = _ref5[0], foldEndRow = _ref5[1];
              _this.createFold(foldStartRow + delta, foldEndRow + delta);
            }
          }
        };
      })(this));
    };

    TextEditor.prototype.replaceSelectedText = function(options, fn) {
      var selectWordIfEmpty;
      if (options == null) {
        options = {};
      }
      selectWordIfEmpty = options.selectWordIfEmpty;
      return this.mutateSelectedText(function(selection) {
        var range, text;
        range = selection.getBufferRange();
        if (selectWordIfEmpty && selection.isEmpty()) {
          selection.selectWord();
        }
        text = selection.getText();
        selection.deleteSelectedText();
        selection.insertText(fn(text));
        return selection.setBufferRange(range);
      });
    };

    TextEditor.prototype.splitSelectionsIntoLines = function() {
      return this.mergeIntersectingSelections((function(_this) {
        return function() {
          var end, range, row, selection, start, _i, _len, _ref3;
          _ref3 = _this.getSelections();
          for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
            selection = _ref3[_i];
            range = selection.getBufferRange();
            if (range.isSingleLine()) {
              continue;
            }
            selection.destroy();
            start = range.start, end = range.end;
            _this.addSelectionForBufferRange([start, [start.row, Infinity]]);
            row = start.row;
            while (++row < end.row) {
              _this.addSelectionForBufferRange([[row, 0], [row, Infinity]]);
            }
            if (end.column !== 0) {
              _this.addSelectionForBufferRange([[end.row, 0], [end.row, end.column]]);
            }
          }
        };
      })(this));
    };

    TextEditor.prototype.transpose = function() {
      return this.mutateSelectedText(function(selection) {
        var text;
        if (selection.isEmpty()) {
          selection.selectRight();
          text = selection.getText();
          selection["delete"]();
          selection.cursor.moveLeft();
          return selection.insertText(text);
        } else {
          return selection.insertText(selection.getText().split('').reverse().join(''));
        }
      });
    };

    TextEditor.prototype.upperCase = function() {
      return this.replaceSelectedText({
        selectWordIfEmpty: true
      }, function(text) {
        return text.toUpperCase();
      });
    };

    TextEditor.prototype.lowerCase = function() {
      return this.replaceSelectedText({
        selectWordIfEmpty: true
      }, function(text) {
        return text.toLowerCase();
      });
    };

    TextEditor.prototype.toggleLineCommentsInSelection = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.toggleLineComments();
      });
    };

    TextEditor.prototype.joinLines = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.joinLines();
      });
    };

    TextEditor.prototype.insertNewlineBelow = function() {
      return this.transact((function(_this) {
        return function() {
          _this.moveToEndOfLine();
          return _this.insertNewline();
        };
      })(this));
    };

    TextEditor.prototype.insertNewlineAbove = function() {
      return this.transact((function(_this) {
        return function() {
          var bufferRow, indentLevel, onFirstLine;
          bufferRow = _this.getCursorBufferPosition().row;
          indentLevel = _this.indentationForBufferRow(bufferRow);
          onFirstLine = bufferRow === 0;
          _this.moveToBeginningOfLine();
          _this.moveLeft();
          _this.insertNewline();
          if (_this.shouldAutoIndent() && _this.indentationForBufferRow(bufferRow) < indentLevel) {
            _this.setIndentationForBufferRow(bufferRow, indentLevel);
          }
          if (onFirstLine) {
            _this.moveUp();
            return _this.moveToEndOfLine();
          }
        };
      })(this));
    };

    TextEditor.prototype.deleteToBeginningOfWord = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToBeginningOfWord();
      });
    };

    TextEditor.prototype.deleteToBeginningOfLine = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToBeginningOfLine();
      });
    };

    TextEditor.prototype.deleteToEndOfLine = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToEndOfLine();
      });
    };

    TextEditor.prototype.deleteToEndOfWord = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToEndOfWord();
      });
    };

    TextEditor.prototype.deleteLine = function() {
      this.mergeSelectionsOnSameRows();
      return this.mutateSelectedText(function(selection) {
        return selection.deleteLine();
      });
    };


    /*
    Section: History
     */

    TextEditor.prototype.undo = function() {
      this.buffer.undo();
      return this.getLastSelection().autoscroll();
    };

    TextEditor.prototype.redo = function() {
      this.buffer.redo(this);
      return this.getLastSelection().autoscroll();
    };

    TextEditor.prototype.transact = function(groupingInterval, fn) {
      return this.buffer.transact(groupingInterval, fn);
    };

    TextEditor.prototype.beginTransaction = function(groupingInterval) {
      return this.buffer.beginTransaction(groupingInterval);
    };

    TextEditor.prototype.commitTransaction = function() {
      return this.buffer.commitTransaction();
    };

    TextEditor.prototype.abortTransaction = function() {
      return this.buffer.abortTransaction();
    };

    TextEditor.prototype.createCheckpoint = function() {
      return this.buffer.createCheckpoint();
    };

    TextEditor.prototype.revertToCheckpoint = function(checkpoint) {
      return this.buffer.revertToCheckpoint(checkpoint);
    };

    TextEditor.prototype.groupChangesSinceCheckpoint = function(checkpoint) {
      return this.buffer.groupChangesSinceCheckpoint(checkpoint);
    };


    /*
    Section: TextEditor Coordinates
     */

    TextEditor.prototype.screenPositionForBufferPosition = function(bufferPosition, options) {
      return this.displayBuffer.screenPositionForBufferPosition(bufferPosition, options);
    };

    TextEditor.prototype.bufferPositionForScreenPosition = function(screenPosition, options) {
      return this.displayBuffer.bufferPositionForScreenPosition(screenPosition, options);
    };

    TextEditor.prototype.screenRangeForBufferRange = function(bufferRange) {
      return this.displayBuffer.screenRangeForBufferRange(bufferRange);
    };

    TextEditor.prototype.bufferRangeForScreenRange = function(screenRange) {
      return this.displayBuffer.bufferRangeForScreenRange(screenRange);
    };

    TextEditor.prototype.clipBufferPosition = function(bufferPosition) {
      return this.buffer.clipPosition(bufferPosition);
    };

    TextEditor.prototype.clipBufferRange = function(range) {
      return this.buffer.clipRange(range);
    };

    TextEditor.prototype.clipScreenPosition = function(screenPosition, options) {
      return this.displayBuffer.clipScreenPosition(screenPosition, options);
    };

    TextEditor.prototype.clipScreenRange = function(range, options) {
      return this.displayBuffer.clipScreenRange(range, options);
    };


    /*
    Section: Decorations
     */

    TextEditor.prototype.decorateMarker = function(marker, decorationParams) {
      if (includeDeprecatedAPIs && decorationParams.type === 'gutter') {
        deprecate("Decorations of `type: 'gutter'` have been renamed to `type: 'line-number'`.");
        decorationParams.type = 'line-number';
      }
      return this.displayBuffer.decorateMarker(marker, decorationParams);
    };

    TextEditor.prototype.decorationsForScreenRowRange = function(startScreenRow, endScreenRow) {
      return this.displayBuffer.decorationsForScreenRowRange(startScreenRow, endScreenRow);
    };

    TextEditor.prototype.getDecorations = function(propertyFilter) {
      return this.displayBuffer.getDecorations(propertyFilter);
    };

    TextEditor.prototype.getLineDecorations = function(propertyFilter) {
      return this.displayBuffer.getLineDecorations(propertyFilter);
    };

    TextEditor.prototype.getLineNumberDecorations = function(propertyFilter) {
      return this.displayBuffer.getLineNumberDecorations(propertyFilter);
    };

    TextEditor.prototype.getHighlightDecorations = function(propertyFilter) {
      return this.displayBuffer.getHighlightDecorations(propertyFilter);
    };

    TextEditor.prototype.getOverlayDecorations = function(propertyFilter) {
      return this.displayBuffer.getOverlayDecorations(propertyFilter);
    };

    TextEditor.prototype.decorationForId = function(id) {
      return this.displayBuffer.decorationForId(id);
    };


    /*
    Section: Markers
     */

    TextEditor.prototype.markBufferRange = function() {
      var args, _ref3;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return (_ref3 = this.displayBuffer).markBufferRange.apply(_ref3, args);
    };

    TextEditor.prototype.markScreenRange = function() {
      var args, _ref3;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return (_ref3 = this.displayBuffer).markScreenRange.apply(_ref3, args);
    };

    TextEditor.prototype.markBufferPosition = function() {
      var args, _ref3;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return (_ref3 = this.displayBuffer).markBufferPosition.apply(_ref3, args);
    };

    TextEditor.prototype.markScreenPosition = function() {
      var args, _ref3;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return (_ref3 = this.displayBuffer).markScreenPosition.apply(_ref3, args);
    };

    TextEditor.prototype.findMarkers = function(properties) {
      return this.displayBuffer.findMarkers(properties);
    };

    TextEditor.prototype.getMarker = function(id) {
      return this.displayBuffer.getMarker(id);
    };

    TextEditor.prototype.getMarkers = function() {
      return this.displayBuffer.getMarkers();
    };

    TextEditor.prototype.getMarkerCount = function() {
      return this.buffer.getMarkerCount();
    };

    TextEditor.prototype.destroyMarker = function() {
      var args, _ref3;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return (_ref3 = this.displayBuffer).destroyMarker.apply(_ref3, args);
    };


    /*
    Section: Cursors
     */

    TextEditor.prototype.getCursorBufferPosition = function() {
      return this.getLastCursor().getBufferPosition();
    };

    TextEditor.prototype.getCursorBufferPositions = function() {
      var cursor, _i, _len, _ref3, _results;
      _ref3 = this.getCursors();
      _results = [];
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        cursor = _ref3[_i];
        _results.push(cursor.getBufferPosition());
      }
      return _results;
    };

    TextEditor.prototype.setCursorBufferPosition = function(position, options) {
      return this.moveCursors(function(cursor) {
        return cursor.setBufferPosition(position, options);
      });
    };

    TextEditor.prototype.getCursorScreenPosition = function() {
      return this.getLastCursor().getScreenPosition();
    };

    TextEditor.prototype.getCursorScreenPositions = function() {
      var cursor, _i, _len, _ref3, _results;
      _ref3 = this.getCursors();
      _results = [];
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        cursor = _ref3[_i];
        _results.push(cursor.getScreenPosition());
      }
      return _results;
    };

    TextEditor.prototype.setCursorScreenPosition = function(position, options) {
      return this.moveCursors(function(cursor) {
        return cursor.setScreenPosition(position, options);
      });
    };

    TextEditor.prototype.addCursorAtBufferPosition = function(bufferPosition, options) {
      this.markBufferPosition(bufferPosition, this.getSelectionMarkerAttributes());
      if ((options != null ? options.autoscroll : void 0) !== false) {
        this.getLastSelection().cursor.autoscroll();
      }
      return this.getLastSelection().cursor;
    };

    TextEditor.prototype.addCursorAtScreenPosition = function(screenPosition, options) {
      this.markScreenPosition(screenPosition, this.getSelectionMarkerAttributes());
      if ((options != null ? options.autoscroll : void 0) !== false) {
        this.getLastSelection().cursor.autoscroll();
      }
      return this.getLastSelection().cursor;
    };

    TextEditor.prototype.hasMultipleCursors = function() {
      return this.getCursors().length > 1;
    };

    TextEditor.prototype.moveUp = function(lineCount) {
      return this.moveCursors(function(cursor) {
        return cursor.moveUp(lineCount, {
          moveToEndOfSelection: true
        });
      });
    };

    TextEditor.prototype.moveDown = function(lineCount) {
      return this.moveCursors(function(cursor) {
        return cursor.moveDown(lineCount, {
          moveToEndOfSelection: true
        });
      });
    };

    TextEditor.prototype.moveLeft = function(columnCount) {
      return this.moveCursors(function(cursor) {
        return cursor.moveLeft(columnCount, {
          moveToEndOfSelection: true
        });
      });
    };

    TextEditor.prototype.moveRight = function(columnCount) {
      return this.moveCursors(function(cursor) {
        return cursor.moveRight(columnCount, {
          moveToEndOfSelection: true
        });
      });
    };

    TextEditor.prototype.moveToBeginningOfLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfLine();
      });
    };

    TextEditor.prototype.moveToBeginningOfScreenLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfScreenLine();
      });
    };

    TextEditor.prototype.moveToFirstCharacterOfLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToFirstCharacterOfLine();
      });
    };

    TextEditor.prototype.moveToEndOfLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToEndOfLine();
      });
    };

    TextEditor.prototype.moveToEndOfScreenLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToEndOfScreenLine();
      });
    };

    TextEditor.prototype.moveToBeginningOfWord = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfWord();
      });
    };

    TextEditor.prototype.moveToEndOfWord = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToEndOfWord();
      });
    };

    TextEditor.prototype.moveToTop = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToTop();
      });
    };

    TextEditor.prototype.moveToBottom = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBottom();
      });
    };

    TextEditor.prototype.moveToBeginningOfNextWord = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfNextWord();
      });
    };

    TextEditor.prototype.moveToPreviousWordBoundary = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToPreviousWordBoundary();
      });
    };

    TextEditor.prototype.moveToNextWordBoundary = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToNextWordBoundary();
      });
    };

    TextEditor.prototype.moveToBeginningOfNextParagraph = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfNextParagraph();
      });
    };

    TextEditor.prototype.moveToBeginningOfPreviousParagraph = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfPreviousParagraph();
      });
    };

    TextEditor.prototype.getLastCursor = function() {
      return _.last(this.cursors);
    };

    TextEditor.prototype.getWordUnderCursor = function(options) {
      return this.getTextInBufferRange(this.getLastCursor().getCurrentWordBufferRange(options));
    };

    TextEditor.prototype.getCursors = function() {
      return this.cursors.slice();
    };

    TextEditor.prototype.getCursorsOrderedByBufferPosition = function() {
      return this.getCursors().sort(function(a, b) {
        return a.compare(b);
      });
    };

    TextEditor.prototype.addCursor = function(marker) {
      var cursor;
      cursor = new Cursor({
        editor: this,
        marker: marker
      });
      this.cursors.push(cursor);
      this.decorateMarker(marker, {
        type: 'line-number',
        "class": 'cursor-line'
      });
      this.decorateMarker(marker, {
        type: 'line-number',
        "class": 'cursor-line-no-selection',
        onlyHead: true,
        onlyEmpty: true
      });
      this.decorateMarker(marker, {
        type: 'line',
        "class": 'cursor-line',
        onlyEmpty: true
      });
      if (includeDeprecatedAPIs) {
        this.emit('cursor-added', cursor);
      }
      this.emitter.emit('did-add-cursor', cursor);
      return cursor;
    };

    TextEditor.prototype.removeCursor = function(cursor) {
      _.remove(this.cursors, cursor);
      if (includeDeprecatedAPIs) {
        this.emit('cursor-removed', cursor);
      }
      return this.emitter.emit('did-remove-cursor', cursor);
    };

    TextEditor.prototype.moveCursors = function(fn) {
      var cursor, _i, _len, _ref3;
      _ref3 = this.getCursors();
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        cursor = _ref3[_i];
        fn(cursor);
      }
      return this.mergeCursors();
    };

    TextEditor.prototype.cursorMoved = function(event) {
      if (includeDeprecatedAPIs) {
        this.emit('cursor-moved', event);
      }
      return this.emitter.emit('did-change-cursor-position', event);
    };

    TextEditor.prototype.mergeCursors = function() {
      var cursor, position, positions, _i, _len, _ref3;
      positions = {};
      _ref3 = this.getCursors();
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        cursor = _ref3[_i];
        position = cursor.getBufferPosition().toString();
        if (positions.hasOwnProperty(position)) {
          cursor.destroy();
        } else {
          positions[position] = true;
        }
      }
    };

    TextEditor.prototype.preserveCursorPositionOnBufferReload = function() {
      var cursorPosition;
      cursorPosition = null;
      this.disposables.add(this.buffer.onWillReload((function(_this) {
        return function() {
          return cursorPosition = _this.getCursorBufferPosition();
        };
      })(this)));
      return this.disposables.add(this.buffer.onDidReload((function(_this) {
        return function() {
          if (cursorPosition) {
            _this.setCursorBufferPosition(cursorPosition);
          }
          return cursorPosition = null;
        };
      })(this)));
    };


    /*
    Section: Selections
     */

    TextEditor.prototype.getSelectedText = function() {
      return this.getLastSelection().getText();
    };

    TextEditor.prototype.getSelectedBufferRange = function() {
      return this.getLastSelection().getBufferRange();
    };

    TextEditor.prototype.getSelectedBufferRanges = function() {
      var selection, _i, _len, _ref3, _results;
      _ref3 = this.getSelections();
      _results = [];
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        selection = _ref3[_i];
        _results.push(selection.getBufferRange());
      }
      return _results;
    };

    TextEditor.prototype.setSelectedBufferRange = function(bufferRange, options) {
      return this.setSelectedBufferRanges([bufferRange], options);
    };

    TextEditor.prototype.setSelectedBufferRanges = function(bufferRanges, options) {
      var selection, selections, _i, _len, _ref3;
      if (options == null) {
        options = {};
      }
      if (!bufferRanges.length) {
        throw new Error("Passed an empty array to setSelectedBufferRanges");
      }
      selections = this.getSelections();
      _ref3 = selections.slice(bufferRanges.length);
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        selection = _ref3[_i];
        selection.destroy();
      }
      return this.mergeIntersectingSelections(options, (function(_this) {
        return function() {
          var bufferRange, i, _j, _len1;
          for (i = _j = 0, _len1 = bufferRanges.length; _j < _len1; i = ++_j) {
            bufferRange = bufferRanges[i];
            bufferRange = Range.fromObject(bufferRange);
            if (selections[i]) {
              selections[i].setBufferRange(bufferRange, options);
            } else {
              _this.addSelectionForBufferRange(bufferRange, options);
            }
          }
        };
      })(this));
    };

    TextEditor.prototype.getSelectedScreenRange = function() {
      return this.getLastSelection().getScreenRange();
    };

    TextEditor.prototype.getSelectedScreenRanges = function() {
      var selection, _i, _len, _ref3, _results;
      _ref3 = this.getSelections();
      _results = [];
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        selection = _ref3[_i];
        _results.push(selection.getScreenRange());
      }
      return _results;
    };

    TextEditor.prototype.setSelectedScreenRange = function(screenRange, options) {
      return this.setSelectedBufferRange(this.bufferRangeForScreenRange(screenRange, options), options);
    };

    TextEditor.prototype.setSelectedScreenRanges = function(screenRanges, options) {
      var selection, selections, _i, _len, _ref3;
      if (options == null) {
        options = {};
      }
      if (!screenRanges.length) {
        throw new Error("Passed an empty array to setSelectedScreenRanges");
      }
      selections = this.getSelections();
      _ref3 = selections.slice(screenRanges.length);
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        selection = _ref3[_i];
        selection.destroy();
      }
      return this.mergeIntersectingSelections(options, (function(_this) {
        return function() {
          var i, screenRange, _j, _len1;
          for (i = _j = 0, _len1 = screenRanges.length; _j < _len1; i = ++_j) {
            screenRange = screenRanges[i];
            screenRange = Range.fromObject(screenRange);
            if (selections[i]) {
              selections[i].setScreenRange(screenRange, options);
            } else {
              _this.addSelectionForScreenRange(screenRange, options);
            }
          }
        };
      })(this));
    };

    TextEditor.prototype.addSelectionForBufferRange = function(bufferRange, options) {
      if (options == null) {
        options = {};
      }
      this.markBufferRange(bufferRange, _.defaults(this.getSelectionMarkerAttributes(), options));
      if (options.autoscroll !== false) {
        this.getLastSelection().autoscroll();
      }
      return this.getLastSelection();
    };

    TextEditor.prototype.addSelectionForScreenRange = function(screenRange, options) {
      if (options == null) {
        options = {};
      }
      this.markScreenRange(screenRange, _.defaults(this.getSelectionMarkerAttributes(), options));
      if (options.autoscroll !== false) {
        this.getLastSelection().autoscroll();
      }
      return this.getLastSelection();
    };

    TextEditor.prototype.selectToBufferPosition = function(position) {
      var lastSelection;
      lastSelection = this.getLastSelection();
      lastSelection.selectToBufferPosition(position);
      return this.mergeIntersectingSelections({
        reversed: lastSelection.isReversed()
      });
    };

    TextEditor.prototype.selectToScreenPosition = function(position) {
      var lastSelection;
      lastSelection = this.getLastSelection();
      lastSelection.selectToScreenPosition(position);
      return this.mergeIntersectingSelections({
        reversed: lastSelection.isReversed()
      });
    };

    TextEditor.prototype.selectUp = function(rowCount) {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectUp(rowCount);
      });
    };

    TextEditor.prototype.selectDown = function(rowCount) {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectDown(rowCount);
      });
    };

    TextEditor.prototype.selectLeft = function(columnCount) {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectLeft(columnCount);
      });
    };

    TextEditor.prototype.selectRight = function(columnCount) {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectRight(columnCount);
      });
    };

    TextEditor.prototype.selectToTop = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToTop();
      });
    };

    TextEditor.prototype.selectToBottom = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToBottom();
      });
    };

    TextEditor.prototype.selectAll = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectAll();
      });
    };

    TextEditor.prototype.selectToBeginningOfLine = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToBeginningOfLine();
      });
    };

    TextEditor.prototype.selectToFirstCharacterOfLine = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToFirstCharacterOfLine();
      });
    };

    TextEditor.prototype.selectToEndOfLine = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToEndOfLine();
      });
    };

    TextEditor.prototype.selectToBeginningOfWord = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToBeginningOfWord();
      });
    };

    TextEditor.prototype.selectToEndOfWord = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToEndOfWord();
      });
    };

    TextEditor.prototype.selectLinesContainingCursors = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectLine();
      });
    };

    TextEditor.prototype.selectWordsContainingCursors = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectWord();
      });
    };

    TextEditor.prototype.selectToPreviousWordBoundary = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToPreviousWordBoundary();
      });
    };

    TextEditor.prototype.selectToNextWordBoundary = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToNextWordBoundary();
      });
    };

    TextEditor.prototype.selectToBeginningOfNextWord = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToBeginningOfNextWord();
      });
    };

    TextEditor.prototype.selectToBeginningOfNextParagraph = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToBeginningOfNextParagraph();
      });
    };

    TextEditor.prototype.selectToBeginningOfPreviousParagraph = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToBeginningOfPreviousParagraph();
      });
    };

    TextEditor.prototype.selectMarker = function(marker) {
      var range;
      if (marker.isValid()) {
        range = marker.getBufferRange();
        this.setSelectedBufferRange(range);
        return range;
      }
    };

    TextEditor.prototype.getLastSelection = function() {
      return _.last(this.selections);
    };

    TextEditor.prototype.getSelections = function() {
      return this.selections.slice();
    };

    TextEditor.prototype.getSelectionsOrderedByBufferPosition = function() {
      return this.getSelections().sort(function(a, b) {
        return a.compare(b);
      });
    };

    TextEditor.prototype.selectionIntersectsBufferRange = function(bufferRange) {
      return _.any(this.getSelections(), function(selection) {
        return selection.intersectsBufferRange(bufferRange);
      });
    };

    TextEditor.prototype.addSelectionBelow = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.addSelectionBelow();
      });
    };

    TextEditor.prototype.addSelectionAbove = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.addSelectionAbove();
      });
    };

    TextEditor.prototype.expandSelectionsForward = function(fn) {
      return this.mergeIntersectingSelections((function(_this) {
        return function() {
          var selection, _i, _len, _ref3;
          _ref3 = _this.getSelections();
          for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
            selection = _ref3[_i];
            fn(selection);
          }
        };
      })(this));
    };

    TextEditor.prototype.expandSelectionsBackward = function(fn) {
      return this.mergeIntersectingSelections({
        reversed: true
      }, (function(_this) {
        return function() {
          var selection, _i, _len, _ref3;
          _ref3 = _this.getSelections();
          for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
            selection = _ref3[_i];
            fn(selection);
          }
        };
      })(this));
    };

    TextEditor.prototype.finalizeSelections = function() {
      var selection, _i, _len, _ref3;
      _ref3 = this.getSelections();
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        selection = _ref3[_i];
        selection.finalize();
      }
    };

    TextEditor.prototype.selectionsForScreenRows = function(startRow, endRow) {
      return this.getSelections().filter(function(selection) {
        return selection.intersectsScreenRowRange(startRow, endRow);
      });
    };

    TextEditor.prototype.mergeIntersectingSelections = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.mergeSelections.apply(this, __slice.call(args).concat([function(previousSelection, currentSelection) {
        var exclusive;
        exclusive = !currentSelection.isEmpty() && !previousSelection.isEmpty();
        return previousSelection.intersectsWith(currentSelection, exclusive);
      }]));
    };

    TextEditor.prototype.mergeSelectionsOnSameRows = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.mergeSelections.apply(this, __slice.call(args).concat([function(previousSelection, currentSelection) {
        var screenRange;
        screenRange = currentSelection.getScreenRange();
        return previousSelection.intersectsScreenRowRange(screenRange.start.row, screenRange.end.row);
      }]));
    };

    TextEditor.prototype.mergeSelections = function() {
      var args, fn, head, mergePredicate, options, reducer, result, tail, _ref3, _ref4;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      mergePredicate = args.pop();
      if (_.isFunction(_.last(args))) {
        fn = args.pop();
      }
      options = (_ref3 = args.pop()) != null ? _ref3 : {};
      if (this.suppressSelectionMerging) {
        return typeof fn === "function" ? fn() : void 0;
      }
      if (fn != null) {
        this.suppressSelectionMerging = true;
        result = fn();
        this.suppressSelectionMerging = false;
      }
      reducer = function(disjointSelections, selection) {
        var adjacentSelection;
        adjacentSelection = _.last(disjointSelections);
        if (mergePredicate(adjacentSelection, selection)) {
          adjacentSelection.merge(selection, options);
          return disjointSelections;
        } else {
          return disjointSelections.concat([selection]);
        }
      };
      _ref4 = this.getSelectionsOrderedByBufferPosition(), head = _ref4[0], tail = 2 <= _ref4.length ? __slice.call(_ref4, 1) : [];
      _.reduce(tail, reducer, [head]);
      if (fn != null) {
        return result;
      }
    };

    TextEditor.prototype.addSelection = function(marker, options) {
      var cursor, selection, selectionBufferRange, _i, _len, _ref3;
      if (options == null) {
        options = {};
      }
      if (!marker.getProperties().preserveFolds) {
        this.destroyFoldsContainingBufferRange(marker.getBufferRange());
      }
      cursor = this.addCursor(marker);
      selection = new Selection(_.extend({
        editor: this,
        marker: marker,
        cursor: cursor
      }, options));
      this.selections.push(selection);
      selectionBufferRange = selection.getBufferRange();
      this.mergeIntersectingSelections({
        preserveFolds: marker.getProperties().preserveFolds
      });
      if (selection.destroyed) {
        _ref3 = this.getSelections();
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          selection = _ref3[_i];
          if (selection.intersectsBufferRange(selectionBufferRange)) {
            return selection;
          }
        }
      } else {
        if (includeDeprecatedAPIs) {
          this.emit('selection-added', selection);
        }
        this.emitter.emit('did-add-selection', selection);
        return selection;
      }
    };

    TextEditor.prototype.removeSelection = function(selection) {
      _.remove(this.selections, selection);
      if (includeDeprecatedAPIs) {
        this.emit('selection-removed', selection);
      }
      return this.emitter.emit('did-remove-selection', selection);
    };

    TextEditor.prototype.clearSelections = function(options) {
      this.consolidateSelections();
      return this.getLastSelection().clear(options);
    };

    TextEditor.prototype.consolidateSelections = function() {
      var selection, selections, _i, _len, _ref3;
      selections = this.getSelections();
      if (selections.length > 1) {
        _ref3 = selections.slice(0, -1);
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          selection = _ref3[_i];
          selection.destroy();
        }
        return true;
      } else {
        return false;
      }
    };

    TextEditor.prototype.selectionRangeChanged = function(event) {
      if (includeDeprecatedAPIs) {
        this.emit('selection-screen-range-changed', event);
      }
      return this.emitter.emit('did-change-selection-range', event);
    };


    /*
    Section: Searching and Replacing
     */

    TextEditor.prototype.scan = function(regex, iterator) {
      return this.buffer.scan(regex, iterator);
    };

    TextEditor.prototype.scanInBufferRange = function(regex, range, iterator) {
      return this.buffer.scanInRange(regex, range, iterator);
    };

    TextEditor.prototype.backwardsScanInBufferRange = function(regex, range, iterator) {
      return this.buffer.backwardsScanInRange(regex, range, iterator);
    };


    /*
    Section: Tab Behavior
     */

    TextEditor.prototype.getSoftTabs = function() {
      return this.softTabs;
    };

    TextEditor.prototype.setSoftTabs = function(softTabs) {
      this.softTabs = softTabs;
      return this.softTabs;
    };

    TextEditor.prototype.toggleSoftTabs = function() {
      return this.setSoftTabs(!this.getSoftTabs());
    };

    TextEditor.prototype.getTabLength = function() {
      return this.displayBuffer.getTabLength();
    };

    TextEditor.prototype.setTabLength = function(tabLength) {
      return this.displayBuffer.setTabLength(tabLength);
    };

    TextEditor.prototype.usesSoftTabs = function() {
      var bufferRow, line, _i, _ref3;
      if (this.getGrammar().scopeName === 'source.makefile') {
        return false;
      }
      for (bufferRow = _i = 0, _ref3 = this.buffer.getLastRow(); 0 <= _ref3 ? _i <= _ref3 : _i >= _ref3; bufferRow = 0 <= _ref3 ? ++_i : --_i) {
        if (this.displayBuffer.tokenizedBuffer.tokenizedLineForRow(bufferRow).isComment()) {
          continue;
        }
        line = this.buffer.lineForRow(bufferRow);
        if (line[0] === ' ') {
          return true;
        }
        if (line[0] === '\t') {
          return false;
        }
      }
      return void 0;
    };

    TextEditor.prototype.getTabText = function() {
      return this.buildIndentString(1);
    };

    TextEditor.prototype.normalizeTabsInBufferRange = function(bufferRange) {
      if (!this.getSoftTabs()) {
        return;
      }
      return this.scanInBufferRange(/\t/g, bufferRange, (function(_this) {
        return function(_arg) {
          var replace;
          replace = _arg.replace;
          return replace(_this.getTabText());
        };
      })(this));
    };


    /*
    Section: Soft Wrap Behavior
     */

    TextEditor.prototype.isSoftWrapped = function(softWrapped) {
      return this.displayBuffer.isSoftWrapped();
    };

    TextEditor.prototype.setSoftWrapped = function(softWrapped) {
      return this.displayBuffer.setSoftWrapped(softWrapped);
    };

    TextEditor.prototype.toggleSoftWrapped = function() {
      return this.setSoftWrapped(!this.isSoftWrapped());
    };

    TextEditor.prototype.getSoftWrapColumn = function() {
      return this.displayBuffer.getSoftWrapColumn();
    };


    /*
    Section: Indentation
     */

    TextEditor.prototype.indentationForBufferRow = function(bufferRow) {
      return this.indentLevelForLine(this.lineTextForBufferRow(bufferRow));
    };

    TextEditor.prototype.setIndentationForBufferRow = function(bufferRow, newLevel, _arg) {
      var endColumn, newIndentString, preserveLeadingWhitespace;
      preserveLeadingWhitespace = (_arg != null ? _arg : {}).preserveLeadingWhitespace;
      if (preserveLeadingWhitespace) {
        endColumn = 0;
      } else {
        endColumn = this.lineTextForBufferRow(bufferRow).match(/^\s*/)[0].length;
      }
      newIndentString = this.buildIndentString(newLevel);
      return this.buffer.setTextInRange([[bufferRow, 0], [bufferRow, endColumn]], newIndentString);
    };

    TextEditor.prototype.indentSelectedRows = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.indentSelectedRows();
      });
    };

    TextEditor.prototype.outdentSelectedRows = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.outdentSelectedRows();
      });
    };

    TextEditor.prototype.indentLevelForLine = function(line) {
      return this.displayBuffer.indentLevelForLine(line);
    };

    TextEditor.prototype.autoIndentSelectedRows = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.autoIndentSelectedRows();
      });
    };

    TextEditor.prototype.indent = function(options) {
      if (options == null) {
        options = {};
      }
      if (options.autoIndent == null) {
        options.autoIndent = this.shouldAutoIndent();
      }
      return this.mutateSelectedText(function(selection) {
        return selection.indent(options);
      });
    };

    TextEditor.prototype.buildIndentString = function(number, column) {
      var tabStopViolation;
      if (column == null) {
        column = 0;
      }
      if (this.getSoftTabs()) {
        tabStopViolation = column % this.getTabLength();
        return _.multiplyString(" ", Math.floor(number * this.getTabLength()) - tabStopViolation);
      } else {
        return _.multiplyString("\t", Math.floor(number));
      }
    };


    /*
    Section: Grammars
     */

    TextEditor.prototype.getGrammar = function() {
      return this.displayBuffer.getGrammar();
    };

    TextEditor.prototype.setGrammar = function(grammar) {
      return this.displayBuffer.setGrammar(grammar);
    };

    TextEditor.prototype.reloadGrammar = function() {
      return this.displayBuffer.reloadGrammar();
    };


    /*
    Section: Managing Syntax Scopes
     */

    TextEditor.prototype.getRootScopeDescriptor = function() {
      return this.displayBuffer.getRootScopeDescriptor();
    };

    TextEditor.prototype.scopeDescriptorForBufferPosition = function(bufferPosition) {
      return this.displayBuffer.scopeDescriptorForBufferPosition(bufferPosition);
    };

    TextEditor.prototype.bufferRangeForScopeAtCursor = function(scopeSelector) {
      return this.displayBuffer.bufferRangeForScopeAtPosition(scopeSelector, this.getCursorBufferPosition());
    };

    TextEditor.prototype.isBufferRowCommented = function(bufferRow) {
      var match, scopeDescriptor;
      if (match = this.lineTextForBufferRow(bufferRow).match(/\S/)) {
        scopeDescriptor = this.tokenForBufferPosition([bufferRow, match.index]).scopes;
        if (this.commentScopeSelector == null) {
          this.commentScopeSelector = new TextMateScopeSelector('comment.*');
        }
        return this.commentScopeSelector.matches(scopeDescriptor);
      }
    };

    TextEditor.prototype.logCursorScope = function() {
      var content, list, scopeDescriptor;
      scopeDescriptor = this.getLastCursor().getScopeDescriptor();
      list = scopeDescriptor.scopes.toString().split(',');
      list = list.map(function(item) {
        return "* " + item;
      });
      content = "Scopes at Cursor\n" + (list.join('\n'));
      return atom.notifications.addInfo(content, {
        dismissable: true
      });
    };

    TextEditor.prototype.tokenForBufferPosition = function(bufferPosition) {
      return this.displayBuffer.tokenForBufferPosition(bufferPosition);
    };


    /*
    Section: Clipboard Operations
     */

    TextEditor.prototype.copySelectedText = function() {
      var maintainClipboard, previousRange, selection, _i, _len, _ref3;
      maintainClipboard = false;
      _ref3 = this.getSelectionsOrderedByBufferPosition();
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        selection = _ref3[_i];
        if (selection.isEmpty()) {
          previousRange = selection.getBufferRange();
          selection.selectLine();
          selection.copy(maintainClipboard, true);
          selection.setBufferRange(previousRange);
        } else {
          selection.copy(maintainClipboard, false);
        }
        maintainClipboard = true;
      }
    };

    TextEditor.prototype.cutSelectedText = function() {
      var maintainClipboard;
      maintainClipboard = false;
      return this.mutateSelectedText(function(selection) {
        if (selection.isEmpty()) {
          selection.selectLine();
          selection.cut(maintainClipboard, true);
        } else {
          selection.cut(maintainClipboard, false);
        }
        return maintainClipboard = true;
      });
    };

    TextEditor.prototype.pasteText = function(options) {
      var clipboardText, metadata, _ref3;
      if (options == null) {
        options = {};
      }
      _ref3 = atom.clipboard.readWithMetadata(), clipboardText = _ref3.text, metadata = _ref3.metadata;
      if (metadata == null) {
        metadata = {};
      }
      options.autoIndent = this.shouldAutoIndentOnPaste();
      return this.mutateSelectedText((function(_this) {
        return function(selection, index) {
          var containsNewlines, cursor, fullLine, indentBasis, newPosition, oldPosition, text, _ref4, _ref5;
          if (((_ref4 = metadata.selections) != null ? _ref4.length : void 0) === _this.getSelections().length) {
            _ref5 = metadata.selections[index], text = _ref5.text, indentBasis = _ref5.indentBasis, fullLine = _ref5.fullLine;
          } else {
            indentBasis = metadata.indentBasis, fullLine = metadata.fullLine;
            text = clipboardText;
          }
          delete options.indentBasis;
          cursor = selection.cursor;
          if (indentBasis != null) {
            containsNewlines = text.indexOf('\n') !== -1;
            if (containsNewlines || !cursor.hasPrecedingCharactersOnLine()) {
              if (options.indentBasis == null) {
                options.indentBasis = indentBasis;
              }
            }
          }
          if (fullLine && selection.isEmpty()) {
            oldPosition = selection.getBufferRange().start;
            selection.setBufferRange([[oldPosition.row, 0], [oldPosition.row, 0]]);
            selection.insertText(text, options);
            newPosition = oldPosition.translate([1, 0]);
            return selection.setBufferRange([newPosition, newPosition]);
          } else {
            return selection.insertText(text, options);
          }
        };
      })(this));
    };

    TextEditor.prototype.cutToEndOfLine = function() {
      var maintainClipboard;
      maintainClipboard = false;
      return this.mutateSelectedText(function(selection) {
        selection.cutToEndOfLine(maintainClipboard);
        return maintainClipboard = true;
      });
    };


    /*
    Section: Folds
     */

    TextEditor.prototype.foldCurrentRow = function() {
      var bufferRow;
      bufferRow = this.bufferPositionForScreenPosition(this.getCursorScreenPosition()).row;
      return this.foldBufferRow(bufferRow);
    };

    TextEditor.prototype.unfoldCurrentRow = function() {
      var bufferRow;
      bufferRow = this.bufferPositionForScreenPosition(this.getCursorScreenPosition()).row;
      return this.unfoldBufferRow(bufferRow);
    };

    TextEditor.prototype.foldBufferRow = function(bufferRow) {
      return this.languageMode.foldBufferRow(bufferRow);
    };

    TextEditor.prototype.unfoldBufferRow = function(bufferRow) {
      return this.displayBuffer.unfoldBufferRow(bufferRow);
    };

    TextEditor.prototype.foldSelectedLines = function() {
      var selection, _i, _len, _ref3;
      _ref3 = this.getSelections();
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        selection = _ref3[_i];
        selection.fold();
      }
    };

    TextEditor.prototype.foldAll = function() {
      return this.languageMode.foldAll();
    };

    TextEditor.prototype.unfoldAll = function() {
      return this.languageMode.unfoldAll();
    };

    TextEditor.prototype.foldAllAtIndentLevel = function(level) {
      return this.languageMode.foldAllAtIndentLevel(level);
    };

    TextEditor.prototype.isFoldableAtBufferRow = function(bufferRow) {
      var _ref3, _ref4;
      return (_ref3 = (_ref4 = this.displayBuffer.tokenizedBuffer.tokenizedLineForRow(bufferRow)) != null ? _ref4.foldable : void 0) != null ? _ref3 : false;
    };

    TextEditor.prototype.isFoldableAtScreenRow = function(screenRow) {
      var bufferRow;
      bufferRow = this.displayBuffer.bufferRowForScreenRow(screenRow);
      return this.isFoldableAtBufferRow(bufferRow);
    };

    TextEditor.prototype.toggleFoldAtBufferRow = function(bufferRow) {
      if (this.isFoldedAtBufferRow(bufferRow)) {
        return this.unfoldBufferRow(bufferRow);
      } else {
        return this.foldBufferRow(bufferRow);
      }
    };

    TextEditor.prototype.isFoldedAtCursorRow = function() {
      return this.isFoldedAtScreenRow(this.getCursorScreenPosition().row);
    };

    TextEditor.prototype.isFoldedAtBufferRow = function(bufferRow) {
      return this.displayBuffer.isFoldedAtBufferRow(bufferRow);
    };

    TextEditor.prototype.isFoldedAtScreenRow = function(screenRow) {
      return this.displayBuffer.isFoldedAtScreenRow(screenRow);
    };

    TextEditor.prototype.createFold = function(startRow, endRow) {
      return this.displayBuffer.createFold(startRow, endRow);
    };

    TextEditor.prototype.destroyFoldWithId = function(id) {
      return this.displayBuffer.destroyFoldWithId(id);
    };

    TextEditor.prototype.destroyFoldsIntersectingBufferRange = function(bufferRange) {
      var fold, row, _i, _j, _len, _ref3, _ref4, _ref5;
      this.destroyFoldsContainingBufferRange(bufferRange);
      for (row = _i = _ref3 = bufferRange.end.row, _ref4 = bufferRange.start.row; _ref3 <= _ref4 ? _i <= _ref4 : _i >= _ref4; row = _ref3 <= _ref4 ? ++_i : --_i) {
        _ref5 = this.displayBuffer.foldsStartingAtBufferRow(row);
        for (_j = 0, _len = _ref5.length; _j < _len; _j++) {
          fold = _ref5[_j];
          fold.destroy();
        }
      }
    };

    TextEditor.prototype.destroyFoldsContainingBufferRange = function(bufferRange) {
      this.unfoldBufferRow(bufferRange.start.row);
      return this.unfoldBufferRow(bufferRange.end.row);
    };

    TextEditor.prototype.largestFoldContainingBufferRow = function(bufferRow) {
      return this.displayBuffer.largestFoldContainingBufferRow(bufferRow);
    };

    TextEditor.prototype.largestFoldStartingAtScreenRow = function(screenRow) {
      return this.displayBuffer.largestFoldStartingAtScreenRow(screenRow);
    };

    TextEditor.prototype.outermostFoldsInBufferRowRange = function(startRow, endRow) {
      return this.displayBuffer.outermostFoldsInBufferRowRange(startRow, endRow);
    };


    /*
    Section: Scrolling the TextEditor
     */

    TextEditor.prototype.scrollToCursorPosition = function(options) {
      var _ref3;
      return this.getLastCursor().autoscroll({
        center: (_ref3 = options != null ? options.center : void 0) != null ? _ref3 : true
      });
    };

    TextEditor.prototype.scrollToBufferPosition = function(bufferPosition, options) {
      return this.displayBuffer.scrollToBufferPosition(bufferPosition, options);
    };

    TextEditor.prototype.scrollToScreenPosition = function(screenPosition, options) {
      return this.displayBuffer.scrollToScreenPosition(screenPosition, options);
    };

    TextEditor.prototype.scrollToTop = function() {
      return this.setScrollTop(0);
    };

    TextEditor.prototype.scrollToBottom = function() {
      return this.setScrollBottom(Infinity);
    };

    TextEditor.prototype.scrollToScreenRange = function(screenRange, options) {
      return this.displayBuffer.scrollToScreenRange(screenRange, options);
    };

    TextEditor.prototype.horizontallyScrollable = function() {
      return this.displayBuffer.horizontallyScrollable();
    };

    TextEditor.prototype.verticallyScrollable = function() {
      return this.displayBuffer.verticallyScrollable();
    };

    TextEditor.prototype.getHorizontalScrollbarHeight = function() {
      return this.displayBuffer.getHorizontalScrollbarHeight();
    };

    TextEditor.prototype.setHorizontalScrollbarHeight = function(height) {
      return this.displayBuffer.setHorizontalScrollbarHeight(height);
    };

    TextEditor.prototype.getVerticalScrollbarWidth = function() {
      return this.displayBuffer.getVerticalScrollbarWidth();
    };

    TextEditor.prototype.setVerticalScrollbarWidth = function(width) {
      return this.displayBuffer.setVerticalScrollbarWidth(width);
    };

    TextEditor.prototype.pageUp = function() {
      var newScrollTop;
      newScrollTop = this.getScrollTop() - this.getHeight();
      this.moveUp(this.getRowsPerPage());
      return this.setScrollTop(newScrollTop);
    };

    TextEditor.prototype.pageDown = function() {
      var newScrollTop;
      newScrollTop = this.getScrollTop() + this.getHeight();
      this.moveDown(this.getRowsPerPage());
      return this.setScrollTop(newScrollTop);
    };

    TextEditor.prototype.selectPageUp = function() {
      return this.selectUp(this.getRowsPerPage());
    };

    TextEditor.prototype.selectPageDown = function() {
      return this.selectDown(this.getRowsPerPage());
    };

    TextEditor.prototype.getRowsPerPage = function() {
      return Math.max(1, Math.ceil(this.getHeight() / this.getLineHeightInPixels()));
    };


    /*
    Section: Config
     */

    TextEditor.prototype.shouldAutoIndent = function() {
      return atom.config.get("editor.autoIndent", {
        scope: this.getRootScopeDescriptor()
      });
    };

    TextEditor.prototype.shouldAutoIndentOnPaste = function() {
      return atom.config.get("editor.autoIndentOnPaste", {
        scope: this.getRootScopeDescriptor()
      });
    };

    TextEditor.prototype.shouldShowInvisibles = function() {
      return !this.mini && atom.config.get('editor.showInvisibles', {
        scope: this.getRootScopeDescriptor()
      });
    };

    TextEditor.prototype.updateInvisibles = function() {
      if (this.shouldShowInvisibles()) {
        return this.displayBuffer.setInvisibles(atom.config.get('editor.invisibles', {
          scope: this.getRootScopeDescriptor()
        }));
      } else {
        return this.displayBuffer.setInvisibles(null);
      }
    };


    /*
    Section: Event Handlers
     */

    TextEditor.prototype.handleTokenization = function() {
      var _ref3;
      return this.softTabs = (_ref3 = this.usesSoftTabs()) != null ? _ref3 : this.softTabs;
    };

    TextEditor.prototype.handleGrammarChange = function() {
      this.updateInvisibles();
      this.subscribeToScopedConfigSettings();
      this.unfoldAll();
      if (includeDeprecatedAPIs) {
        this.emit('grammar-changed');
      }
      return this.emitter.emit('did-change-grammar', this.getGrammar());
    };

    TextEditor.prototype.handleMarkerCreated = function(marker) {
      if (marker.matchesProperties(this.getSelectionMarkerAttributes())) {
        return this.addSelection(marker);
      }
    };


    /*
    Section: TextEditor Rendering
     */

    TextEditor.prototype.getPlaceholderText = function() {
      return this.placeholderText;
    };

    TextEditor.prototype.setPlaceholderText = function(placeholderText) {
      if (this.placeholderText === placeholderText) {
        return;
      }
      this.placeholderText = placeholderText;
      return this.emitter.emit('did-change-placeholder-text', this.placeholderText);
    };

    TextEditor.prototype.getFirstVisibleScreenRow = function(suppressDeprecation) {
      if (!suppressDeprecation) {
        deprecate("This is now a view method. Call TextEditorElement::getFirstVisibleScreenRow instead.");
      }
      return this.getVisibleRowRange()[0];
    };

    TextEditor.prototype.getLastVisibleScreenRow = function(suppressDeprecation) {
      if (!suppressDeprecation) {
        deprecate("This is now a view method. Call TextEditorElement::getLastVisibleScreenRow instead.");
      }
      return this.getVisibleRowRange()[1];
    };

    TextEditor.prototype.pixelPositionForBufferPosition = function(bufferPosition, suppressDeprecation) {
      if (!suppressDeprecation) {
        deprecate("This method is deprecated on the model layer. Use `TextEditorElement::pixelPositionForBufferPosition` instead");
      }
      return this.displayBuffer.pixelPositionForBufferPosition(bufferPosition);
    };

    TextEditor.prototype.pixelPositionForScreenPosition = function(screenPosition, suppressDeprecation) {
      if (!suppressDeprecation) {
        deprecate("This method is deprecated on the model layer. Use `TextEditorElement::pixelPositionForScreenPosition` instead");
      }
      return this.displayBuffer.pixelPositionForScreenPosition(screenPosition);
    };

    TextEditor.prototype.getSelectionMarkerAttributes = function() {
      return {
        type: 'selection',
        editorId: this.id,
        invalidate: 'never'
      };
    };

    TextEditor.prototype.getVerticalScrollMargin = function() {
      return this.displayBuffer.getVerticalScrollMargin();
    };

    TextEditor.prototype.setVerticalScrollMargin = function(verticalScrollMargin) {
      return this.displayBuffer.setVerticalScrollMargin(verticalScrollMargin);
    };

    TextEditor.prototype.getHorizontalScrollMargin = function() {
      return this.displayBuffer.getHorizontalScrollMargin();
    };

    TextEditor.prototype.setHorizontalScrollMargin = function(horizontalScrollMargin) {
      return this.displayBuffer.setHorizontalScrollMargin(horizontalScrollMargin);
    };

    TextEditor.prototype.getLineHeightInPixels = function() {
      return this.displayBuffer.getLineHeightInPixels();
    };

    TextEditor.prototype.setLineHeightInPixels = function(lineHeightInPixels) {
      return this.displayBuffer.setLineHeightInPixels(lineHeightInPixels);
    };

    TextEditor.prototype.batchCharacterMeasurement = function(fn) {
      return this.displayBuffer.batchCharacterMeasurement(fn);
    };

    TextEditor.prototype.getScopedCharWidth = function(scopeNames, char) {
      return this.displayBuffer.getScopedCharWidth(scopeNames, char);
    };

    TextEditor.prototype.setScopedCharWidth = function(scopeNames, char, width) {
      return this.displayBuffer.setScopedCharWidth(scopeNames, char, width);
    };

    TextEditor.prototype.getScopedCharWidths = function(scopeNames) {
      return this.displayBuffer.getScopedCharWidths(scopeNames);
    };

    TextEditor.prototype.clearScopedCharWidths = function() {
      return this.displayBuffer.clearScopedCharWidths();
    };

    TextEditor.prototype.getDefaultCharWidth = function() {
      return this.displayBuffer.getDefaultCharWidth();
    };

    TextEditor.prototype.setDefaultCharWidth = function(defaultCharWidth) {
      return this.displayBuffer.setDefaultCharWidth(defaultCharWidth);
    };

    TextEditor.prototype.setHeight = function(height) {
      return this.displayBuffer.setHeight(height);
    };

    TextEditor.prototype.getHeight = function() {
      return this.displayBuffer.getHeight();
    };

    TextEditor.prototype.getClientHeight = function() {
      return this.displayBuffer.getClientHeight();
    };

    TextEditor.prototype.setWidth = function(width) {
      return this.displayBuffer.setWidth(width);
    };

    TextEditor.prototype.getWidth = function() {
      return this.displayBuffer.getWidth();
    };

    TextEditor.prototype.getScrollTop = function() {
      return this.displayBuffer.getScrollTop();
    };

    TextEditor.prototype.setScrollTop = function(scrollTop) {
      return this.displayBuffer.setScrollTop(scrollTop);
    };

    TextEditor.prototype.getScrollBottom = function() {
      return this.displayBuffer.getScrollBottom();
    };

    TextEditor.prototype.setScrollBottom = function(scrollBottom) {
      return this.displayBuffer.setScrollBottom(scrollBottom);
    };

    TextEditor.prototype.getScrollLeft = function() {
      return this.displayBuffer.getScrollLeft();
    };

    TextEditor.prototype.setScrollLeft = function(scrollLeft) {
      return this.displayBuffer.setScrollLeft(scrollLeft);
    };

    TextEditor.prototype.getScrollRight = function() {
      return this.displayBuffer.getScrollRight();
    };

    TextEditor.prototype.setScrollRight = function(scrollRight) {
      return this.displayBuffer.setScrollRight(scrollRight);
    };

    TextEditor.prototype.getScrollHeight = function() {
      return this.displayBuffer.getScrollHeight();
    };

    TextEditor.prototype.getScrollWidth = function() {
      return this.displayBuffer.getScrollWidth();
    };

    TextEditor.prototype.getVisibleRowRange = function() {
      return this.displayBuffer.getVisibleRowRange();
    };

    TextEditor.prototype.intersectsVisibleRowRange = function(startRow, endRow) {
      return this.displayBuffer.intersectsVisibleRowRange(startRow, endRow);
    };

    TextEditor.prototype.selectionIntersectsVisibleRowRange = function(selection) {
      return this.displayBuffer.selectionIntersectsVisibleRowRange(selection);
    };

    TextEditor.prototype.screenPositionForPixelPosition = function(pixelPosition) {
      return this.displayBuffer.screenPositionForPixelPosition(pixelPosition);
    };

    TextEditor.prototype.pixelRectForScreenRange = function(screenRange) {
      return this.displayBuffer.pixelRectForScreenRange(screenRange);
    };


    /*
    Section: Utility
     */

    TextEditor.prototype.inspect = function() {
      return "<TextEditor " + this.id + ">";
    };

    TextEditor.prototype.logScreenLines = function(start, end) {
      return this.displayBuffer.logLines(start, end);
    };

    return TextEditor;

  })(Model);

  if (includeDeprecatedAPIs) {
    TextEditor.delegatesProperties('$lineHeightInPixels', '$defaultCharWidth', '$height', '$width', '$verticalScrollbarWidth', '$horizontalScrollbarHeight', '$scrollTop', '$scrollLeft', {
      toProperty: 'displayBuffer'
    });
    TextEditor.prototype.getViewClass = function() {
      return require('./text-editor-view');
    };
    TextEditor.prototype.joinLine = function() {
      deprecate("Use TextEditor::joinLines() instead");
      return this.joinLines();
    };
    TextEditor.prototype.scopesAtCursor = function() {
      deprecate('Use editor.getLastCursor().getScopeDescriptor() instead');
      return this.getLastCursor().getScopeDescriptor().getScopesArray();
    };
    TextEditor.prototype.getCursorScopes = function() {
      deprecate('Use editor.getLastCursor().getScopeDescriptor() instead');
      return this.scopesAtCursor();
    };
    TextEditor.prototype.getUri = function() {
      deprecate("Use `::getURI` instead");
      return this.getURI();
    };
    TextEditor.prototype.lineForBufferRow = function(bufferRow) {
      deprecate('Use TextEditor::lineTextForBufferRow(bufferRow) instead');
      return this.lineTextForBufferRow(bufferRow);
    };
    TextEditor.prototype.lineForScreenRow = function(screenRow) {
      deprecate("TextEditor::tokenizedLineForScreenRow(bufferRow) is the new name. But it's private. Try to use TextEditor::lineTextForScreenRow instead");
      return this.tokenizedLineForScreenRow(screenRow);
    };
    TextEditor.prototype.linesForScreenRows = function(start, end) {
      deprecate("Use TextEditor::tokenizedLinesForScreenRows instead");
      return this.tokenizedLinesForScreenRows(start, end);
    };
    TextEditor.prototype.lineLengthForBufferRow = function(row) {
      deprecate("Use editor.lineTextForBufferRow(row).length instead");
      return this.lineTextForBufferRow(row).length;
    };
    TextEditor.prototype.duplicateLine = function() {
      deprecate("Use TextEditor::duplicateLines() instead");
      return this.duplicateLines();
    };
    TextEditor.prototype.scopesForBufferPosition = function(bufferPosition) {
      deprecate('Use ::scopeDescriptorForBufferPosition instead. The return value has changed! It now returns a `ScopeDescriptor`');
      return this.scopeDescriptorForBufferPosition(bufferPosition).getScopesArray();
    };
    TextEditor.prototype.toggleSoftWrap = function() {
      deprecate("Use TextEditor::toggleSoftWrapped instead");
      return this.toggleSoftWrapped();
    };
    TextEditor.prototype.setSoftWrap = function(softWrapped) {
      deprecate("Use TextEditor::setSoftWrapped instead");
      return this.setSoftWrapped(softWrapped);
    };
    TextEditor.prototype.backspaceToBeginningOfWord = function() {
      deprecate("Use TextEditor::deleteToBeginningOfWord() instead");
      return this.deleteToBeginningOfWord();
    };
    TextEditor.prototype.backspaceToBeginningOfLine = function() {
      deprecate("Use TextEditor::deleteToBeginningOfLine() instead");
      return this.deleteToBeginningOfLine();
    };
    TextEditor.prototype.getGutterDecorations = function(propertyFilter) {
      deprecate("Use ::getLineNumberDecorations instead");
      return this.getLineNumberDecorations(propertyFilter);
    };
    TextEditor.prototype.getCursorScreenRow = function() {
      deprecate('Use `editor.getCursorScreenPosition().row` instead');
      return this.getCursorScreenPosition().row;
    };
    TextEditor.prototype.moveCursorUp = function(lineCount) {
      deprecate("Use TextEditor::moveUp() instead");
      return this.moveUp(lineCount);
    };
    TextEditor.prototype.moveCursorDown = function(lineCount) {
      deprecate("Use TextEditor::moveDown() instead");
      return this.moveDown(lineCount);
    };
    TextEditor.prototype.moveCursorLeft = function() {
      deprecate("Use TextEditor::moveLeft() instead");
      return this.moveLeft();
    };
    TextEditor.prototype.moveCursorRight = function() {
      deprecate("Use TextEditor::moveRight() instead");
      return this.moveRight();
    };
    TextEditor.prototype.moveCursorToBeginningOfLine = function() {
      deprecate("Use TextEditor::moveToBeginningOfLine() instead");
      return this.moveToBeginningOfLine();
    };
    TextEditor.prototype.moveCursorToBeginningOfScreenLine = function() {
      deprecate("Use TextEditor::moveToBeginningOfScreenLine() instead");
      return this.moveToBeginningOfScreenLine();
    };
    TextEditor.prototype.moveCursorToFirstCharacterOfLine = function() {
      deprecate("Use TextEditor::moveToFirstCharacterOfLine() instead");
      return this.moveToFirstCharacterOfLine();
    };
    TextEditor.prototype.moveCursorToEndOfLine = function() {
      deprecate("Use TextEditor::moveToEndOfLine() instead");
      return this.moveToEndOfLine();
    };
    TextEditor.prototype.moveCursorToEndOfScreenLine = function() {
      deprecate("Use TextEditor::moveToEndOfScreenLine() instead");
      return this.moveToEndOfScreenLine();
    };
    TextEditor.prototype.moveCursorToBeginningOfWord = function() {
      deprecate("Use TextEditor::moveToBeginningOfWord() instead");
      return this.moveToBeginningOfWord();
    };
    TextEditor.prototype.moveCursorToEndOfWord = function() {
      deprecate("Use TextEditor::moveToEndOfWord() instead");
      return this.moveToEndOfWord();
    };
    TextEditor.prototype.moveCursorToTop = function() {
      deprecate("Use TextEditor::moveToTop() instead");
      return this.moveToTop();
    };
    TextEditor.prototype.moveCursorToBottom = function() {
      deprecate("Use TextEditor::moveToBottom() instead");
      return this.moveToBottom();
    };
    TextEditor.prototype.moveCursorToBeginningOfNextWord = function() {
      deprecate("Use TextEditor::moveToBeginningOfNextWord() instead");
      return this.moveToBeginningOfNextWord();
    };
    TextEditor.prototype.moveCursorToPreviousWordBoundary = function() {
      deprecate("Use TextEditor::moveToPreviousWordBoundary() instead");
      return this.moveToPreviousWordBoundary();
    };
    TextEditor.prototype.moveCursorToNextWordBoundary = function() {
      deprecate("Use TextEditor::moveToNextWordBoundary() instead");
      return this.moveToNextWordBoundary();
    };
    TextEditor.prototype.moveCursorToBeginningOfNextParagraph = function() {
      deprecate("Use TextEditor::moveToBeginningOfNextParagraph() instead");
      return this.moveToBeginningOfNextParagraph();
    };
    TextEditor.prototype.moveCursorToBeginningOfPreviousParagraph = function() {
      deprecate("Use TextEditor::moveToBeginningOfPreviousParagraph() instead");
      return this.moveToBeginningOfPreviousParagraph();
    };
    TextEditor.prototype.getCursor = function() {
      deprecate("Use TextEditor::getLastCursor() instead");
      return this.getLastCursor();
    };
    TextEditor.prototype.selectLine = function() {
      deprecate('Use TextEditor::selectLinesContainingCursors instead');
      return this.selectLinesContainingCursors();
    };
    TextEditor.prototype.selectWord = function() {
      deprecate('Use TextEditor::selectWordsContainingCursors instead');
      return this.selectWordsContainingCursors();
    };
    TextEditor.prototype.getSelection = function(index) {
      if (index != null) {
        deprecate("Use TextEditor::getSelections()[index] instead when getting a specific selection");
        return this.getSelections()[index];
      } else {
        deprecate("Use TextEditor::getLastSelection() instead");
        return this.getLastSelection();
      }
    };
    TextEditor.prototype.getSoftWrapped = function() {
      deprecate("Use TextEditor::isSoftWrapped instead");
      return this.displayBuffer.isSoftWrapped();
    };
    TextEditor.prototype.on = function(eventName) {
      switch (eventName) {
        case 'title-changed':
          deprecate("Use TextEditor::onDidChangeTitle instead");
          break;
        case 'path-changed':
          deprecate("Use TextEditor::onDidChangePath instead");
          break;
        case 'modified-status-changed':
          deprecate("Use TextEditor::onDidChangeModified instead");
          break;
        case 'soft-wrap-changed':
          deprecate("Use TextEditor::onDidChangeSoftWrapped instead");
          break;
        case 'grammar-changed':
          deprecate("Use TextEditor::onDidChangeGrammar instead");
          break;
        case 'character-widths-changed':
          deprecate("Use TextEditor::onDidChangeCharacterWidths instead");
          break;
        case 'contents-modified':
          deprecate("Use TextEditor::onDidStopChanging instead");
          break;
        case 'contents-conflicted':
          deprecate("Use TextEditor::onDidConflict instead");
          break;
        case 'will-insert-text':
          deprecate("Use TextEditor::onWillInsertText instead");
          break;
        case 'did-insert-text':
          deprecate("Use TextEditor::onDidInsertText instead");
          break;
        case 'cursor-added':
          deprecate("Use TextEditor::onDidAddCursor instead");
          break;
        case 'cursor-removed':
          deprecate("Use TextEditor::onDidRemoveCursor instead");
          break;
        case 'cursor-moved':
          deprecate("Use TextEditor::onDidChangeCursorPosition instead");
          break;
        case 'selection-added':
          deprecate("Use TextEditor::onDidAddSelection instead");
          break;
        case 'selection-removed':
          deprecate("Use TextEditor::onDidRemoveSelection instead");
          break;
        case 'selection-screen-range-changed':
          deprecate("Use TextEditor::onDidChangeSelectionRange instead");
          break;
        case 'decoration-added':
          deprecate("Use TextEditor::onDidAddDecoration instead");
          break;
        case 'decoration-removed':
          deprecate("Use TextEditor::onDidRemoveDecoration instead");
          break;
        case 'decoration-updated':
          deprecate("Use Decoration::onDidChangeProperties instead. You will get the decoration back from `TextEditor::decorateMarker()`");
          break;
        case 'decoration-changed':
          deprecate("Use Marker::onDidChange instead. e.g. `editor::decorateMarker(...).getMarker().onDidChange()`");
          break;
        case 'screen-lines-changed':
          deprecate("Use TextEditor::onDidChange instead");
          break;
        case 'scroll-top-changed':
          deprecate("Use TextEditor::onDidChangeScrollTop instead");
          break;
        case 'scroll-left-changed':
          deprecate("Use TextEditor::onDidChangeScrollLeft instead");
          break;
        default:
          deprecate("TextEditor::on is deprecated. Use documented event subscription methods instead.");
      }
      return EmitterMixin.prototype.on.apply(this, arguments);
    };
  }

}).call(this);

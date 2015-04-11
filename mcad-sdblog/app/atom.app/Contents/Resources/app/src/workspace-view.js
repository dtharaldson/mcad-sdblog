(function() {
  var $, $$, Delegator, PaneContainerView, PaneView, Q, TextEditor, View, Workspace, WorkspaceView, deprecate, fs, ipc, logDeprecationWarnings, path, scrollbarStyle, _, _ref, _ref1,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ipc = require('ipc');

  path = require('path');

  Q = require('q');

  _ = require('underscore-plus');

  Delegator = require('delegato');

  _ref = require('grim'), deprecate = _ref.deprecate, logDeprecationWarnings = _ref.logDeprecationWarnings;

  scrollbarStyle = require('scrollbar-style');

  _ref1 = require('./space-pen-extensions'), $ = _ref1.$, $$ = _ref1.$$, View = _ref1.View;

  fs = require('fs-plus');

  Workspace = require('./workspace');

  PaneView = require('./pane-view');

  PaneContainerView = require('./pane-container-view');

  TextEditor = require('./text-editor');

  module.exports = WorkspaceView = (function(_super) {
    __extends(WorkspaceView, _super);

    Delegator.includeInto(WorkspaceView);

    WorkspaceView.delegatesProperty('fullScreen', 'destroyedItemURIs', {
      toProperty: 'model'
    });

    WorkspaceView.delegatesMethods('open', 'openSync', 'saveActivePaneItem', 'saveActivePaneItemAs', 'saveAll', 'destroyActivePaneItem', 'destroyActivePane', 'increaseFontSize', 'decreaseFontSize', {
      toProperty: 'model'
    });

    function WorkspaceView(element) {
      this.element = element;
      if (this.element == null) {
        return atom.views.getView(atom.workspace).__spacePenView;
      }
      WorkspaceView.__super__.constructor.apply(this, arguments);
      this.deprecateViewEvents();
      this.attachedEditorViews = new WeakSet;
    }

    WorkspaceView.prototype.setModel = function(model) {
      this.model = model;
      this.horizontal = this.find('atom-workspace-axis.horizontal');
      this.vertical = this.find('atom-workspace-axis.vertical');
      this.panes = this.find('atom-pane-container').view();
      return this.subscribe(this.model.onDidOpen((function(_this) {
        return function() {
          return _this.trigger('uri-opened');
        };
      })(this)));
    };

    WorkspaceView.prototype.beforeRemove = function() {
      var _ref2;
      return (_ref2 = this.model) != null ? _ref2.destroy() : void 0;
    };


    /*
    Section: Accessing the Workspace Model
     */

    WorkspaceView.prototype.getModel = function() {
      return this.model;
    };


    /*
    Section: Accessing Views
     */

    WorkspaceView.prototype.eachEditorView = function(callback) {
      var attachedCallback, editorView, _i, _len, _ref2;
      _ref2 = this.getEditorViews();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        editorView = _ref2[_i];
        this.attachedEditorViews.add(editorView);
        callback(editorView);
      }
      attachedCallback = (function(_this) {
        return function(e, editorView) {
          if (!_this.attachedEditorViews.has(editorView)) {
            _this.attachedEditorViews.add(editorView);
            if (!editorView.mini) {
              return callback(editorView);
            }
          }
        };
      })(this);
      this.on('editor:attached', attachedCallback);
      return {
        off: (function(_this) {
          return function() {
            return _this.off('editor:attached', attachedCallback);
          };
        })(this)
      };
    };

    WorkspaceView.prototype.eachPaneView = function(callback) {
      return this.panes.eachPaneView(callback);
    };

    WorkspaceView.prototype.getPaneViews = function() {
      return this.panes.getPaneViews();
    };

    WorkspaceView.prototype.getActivePaneView = function() {
      return this.panes.getActivePaneView();
    };

    WorkspaceView.prototype.getActiveView = function() {
      return this.panes.getActiveView();
    };


    /*
    Section: Adding elements to the workspace
     */

    WorkspaceView.prototype.prependToTop = function(element) {
      deprecate('Please use Workspace::addTopPanel() instead');
      return this.vertical.prepend(element);
    };

    WorkspaceView.prototype.appendToTop = function(element) {
      deprecate('Please use Workspace::addTopPanel() instead');
      return this.panes.before(element);
    };

    WorkspaceView.prototype.prependToBottom = function(element) {
      deprecate('Please use Workspace::addBottomPanel() instead');
      return this.panes.after(element);
    };

    WorkspaceView.prototype.appendToBottom = function(element) {
      deprecate('Please use Workspace::addBottomPanel() instead');
      return this.vertical.append(element);
    };

    WorkspaceView.prototype.prependToLeft = function(element) {
      deprecate('Please use Workspace::addLeftPanel() instead');
      return this.horizontal.prepend(element);
    };

    WorkspaceView.prototype.appendToLeft = function(element) {
      deprecate('Please use Workspace::addLeftPanel() instead');
      return this.vertical.before(element);
    };

    WorkspaceView.prototype.prependToRight = function(element) {
      deprecate('Please use Workspace::addRightPanel() instead');
      return this.vertical.after(element);
    };

    WorkspaceView.prototype.appendToRight = function(element) {
      deprecate('Please use Workspace::addRightPanel() instead');
      return this.horizontal.append(element);
    };


    /*
    Section: Focusing pane views
     */

    WorkspaceView.prototype.focusPreviousPaneView = function() {
      return this.model.activatePreviousPane();
    };

    WorkspaceView.prototype.focusNextPaneView = function() {
      return this.model.activateNextPane();
    };

    WorkspaceView.prototype.focusPaneViewAbove = function() {
      return this.panes.focusPaneViewAbove();
    };

    WorkspaceView.prototype.focusPaneViewBelow = function() {
      return this.panes.focusPaneViewBelow();
    };

    WorkspaceView.prototype.focusPaneViewOnLeft = function() {
      return this.panes.focusPaneViewOnLeft();
    };

    WorkspaceView.prototype.focusPaneViewOnRight = function() {
      return this.panes.focusPaneViewOnRight();
    };


    /*
    Section: Private
     */

    WorkspaceView.prototype.confirmClose = function() {
      return this.model.confirmClose();
    };

    WorkspaceView.prototype.getEditorViews = function() {
      var editorElement, _i, _len, _ref2, _results;
      _ref2 = this.panes.element.querySelectorAll('atom-pane > .item-views > atom-text-editor');
      _results = [];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        editorElement = _ref2[_i];
        _results.push($(editorElement).view());
      }
      return _results;
    };


    /*
    Section: Deprecated
     */

    WorkspaceView.prototype.deprecateViewEvents = function() {
      var TextEditorView, originalEditorViewOn, originalPaneViewOn, originalWorkspaceViewOn;
      originalWorkspaceViewOn = this.on;
      this.on = (function(_this) {
        return function(eventName) {
          switch (eventName) {
            case 'beep':
              deprecate('Use Atom::onDidBeep instead');
              break;
            case 'cursor:moved':
              deprecate('Use TextEditor::onDidChangeCursorPosition instead');
              break;
            case 'editor:attached':
              deprecate('Use Workspace::onDidAddTextEditor instead');
              break;
            case 'editor:detached':
              deprecate('Use TextEditor::onDidDestroy instead');
              break;
            case 'editor:will-be-removed':
              deprecate('Use TextEditor::onDidDestroy instead');
              break;
            case 'pane:active-item-changed':
              deprecate('Use Pane::onDidChangeActiveItem instead');
              break;
            case 'pane:active-item-modified-status-changed':
              deprecate('Use Pane::onDidChangeActiveItem and call onDidChangeModified on the active item instead');
              break;
            case 'pane:active-item-title-changed':
              deprecate('Use Pane::onDidChangeActiveItem and call onDidChangeTitle on the active item instead');
              break;
            case 'pane:attached':
              deprecate('Use Workspace::onDidAddPane instead');
              break;
            case 'pane:became-active':
              deprecate('Use Pane::onDidActivate instead');
              break;
            case 'pane:became-inactive':
              deprecate('Use Pane::onDidChangeActive instead');
              break;
            case 'pane:item-added':
              deprecate('Use Pane::onDidAddItem instead');
              break;
            case 'pane:item-moved':
              deprecate('Use Pane::onDidMoveItem instead');
              break;
            case 'pane:item-removed':
              deprecate('Use Pane::onDidRemoveItem instead');
              break;
            case 'pane:removed':
              deprecate('Use Pane::onDidDestroy instead');
              break;
            case 'pane-container:active-pane-item-changed':
              deprecate('Use Workspace::onDidChangeActivePaneItem instead');
              break;
            case 'selection:changed':
              deprecate('Use TextEditor::onDidChangeSelectionRange instead');
              break;
            case 'uri-opened':
              deprecate('Use Workspace::onDidOpen instead');
          }
          return originalWorkspaceViewOn.apply(_this, arguments);
        };
      })(this);
      TextEditorView = require('./text-editor-view');
      originalEditorViewOn = TextEditorView.prototype.on;
      TextEditorView.prototype.on = function(eventName) {
        switch (eventName) {
          case 'cursor:moved':
            deprecate('Use TextEditor::onDidChangeCursorPosition instead');
            break;
          case 'editor:attached':
            deprecate('Use TextEditor::onDidAddTextEditor instead');
            break;
          case 'editor:detached':
            deprecate('Use TextEditor::onDidDestroy instead');
            break;
          case 'editor:will-be-removed':
            deprecate('Use TextEditor::onDidDestroy instead');
            break;
          case 'selection:changed':
            deprecate('Use TextEditor::onDidChangeSelectionRange instead');
        }
        return originalEditorViewOn.apply(this, arguments);
      };
      originalPaneViewOn = PaneView.prototype.on;
      return PaneView.prototype.on = function(eventName) {
        switch (eventName) {
          case 'cursor:moved':
            deprecate('Use TextEditor::onDidChangeCursorPosition instead');
            break;
          case 'editor:attached':
            deprecate('Use TextEditor::onDidAddTextEditor instead');
            break;
          case 'editor:detached':
            deprecate('Use TextEditor::onDidDestroy instead');
            break;
          case 'editor:will-be-removed':
            deprecate('Use TextEditor::onDidDestroy instead');
            break;
          case 'pane:active-item-changed':
            deprecate('Use Pane::onDidChangeActiveItem instead');
            break;
          case 'pane:active-item-modified-status-changed':
            deprecate('Use Pane::onDidChangeActiveItem and call onDidChangeModified on the active item instead');
            break;
          case 'pane:active-item-title-changed':
            deprecate('Use Pane::onDidChangeActiveItem and call onDidChangeTitle on the active item instead');
            break;
          case 'pane:attached':
            deprecate('Use Workspace::onDidAddPane instead');
            break;
          case 'pane:became-active':
            deprecate('Use Pane::onDidActivate instead');
            break;
          case 'pane:became-inactive':
            deprecate('Use Pane::onDidChangeActive instead');
            break;
          case 'pane:item-added':
            deprecate('Use Pane::onDidAddItem instead');
            break;
          case 'pane:item-moved':
            deprecate('Use Pane::onDidMoveItem instead');
            break;
          case 'pane:item-removed':
            deprecate('Use Pane::onDidRemoveItem instead');
            break;
          case 'pane:removed':
            deprecate('Use Pane::onDidDestroy instead');
            break;
          case 'selection:changed':
            deprecate('Use TextEditor::onDidChangeSelectionRange instead');
        }
        return originalPaneViewOn.apply(this, arguments);
      };
    };

    WorkspaceView.prototype.eachPane = function(callback) {
      deprecate("Use WorkspaceView::eachPaneView instead");
      return this.eachPaneView(callback);
    };

    WorkspaceView.prototype.getPanes = function() {
      deprecate("Use WorkspaceView::getPaneViews instead");
      return this.getPaneViews();
    };

    WorkspaceView.prototype.getActivePane = function() {
      deprecate("Use WorkspaceView::getActivePaneView instead");
      return this.getActivePaneView();
    };

    WorkspaceView.prototype.getActivePaneItem = function() {
      deprecate("Use Workspace::getActivePaneItem instead");
      return this.model.getActivePaneItem();
    };

    return WorkspaceView;

  })(View);

}).call(this);

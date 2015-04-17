(function() {
  var $, $$, $$$, CompositeDisposable, Directory, Disposable, Emitter, File, Point, Range, TextBuffer, View, deprecate, includeDeprecatedAPIs, _ref, _ref1, _ref2, _ref3;

  TextBuffer = require('text-buffer');

  Point = TextBuffer.Point, Range = TextBuffer.Range;

  _ref = require('pathwatcher'), File = _ref.File, Directory = _ref.Directory;

  _ref1 = require('event-kit'), Emitter = _ref1.Emitter, Disposable = _ref1.Disposable, CompositeDisposable = _ref1.CompositeDisposable;

  _ref2 = require('grim'), includeDeprecatedAPIs = _ref2.includeDeprecatedAPIs, deprecate = _ref2.deprecate;

  module.exports = {
    BufferedNodeProcess: require('../src/buffered-node-process'),
    BufferedProcess: require('../src/buffered-process'),
    GitRepository: require('../src/git-repository'),
    Notification: require('../src/notification'),
    TextBuffer: TextBuffer,
    Point: Point,
    Range: Range,
    File: File,
    Directory: Directory,
    Emitter: Emitter,
    Disposable: Disposable,
    CompositeDisposable: CompositeDisposable
  };

  if (!process.env.ATOM_SHELL_INTERNAL_RUN_AS_NODE) {
    module.exports.Task = require('../src/task');
    module.exports.TextEditor = require('../src/text-editor');
    if (includeDeprecatedAPIs) {
      _ref3 = require('../src/space-pen-extensions'), $ = _ref3.$, $$ = _ref3.$$, $$$ = _ref3.$$$, View = _ref3.View;
      Object.defineProperty(module.exports, 'Workspace', {
        get: function() {
          deprecate("Requiring `Workspace` from `atom` is no longer supported.\nIf you need this, please open an issue on\nhttps://github.com/atom/atom/issues/new\nAnd let us know what you are using it for.");
          return require('../src/workspace');
        }
      });
      Object.defineProperty(module.exports, 'WorkspaceView', {
        get: function() {
          deprecate("Requiring `WorkspaceView` from `atom` is no longer supported.\nUse `atom.views.getView(atom.workspace)` instead.");
          return require('../src/workspace-view');
        }
      });
      Object.defineProperty(module.exports, '$', {
        get: function() {
          deprecate("Requiring `$` from `atom` is no longer supported.\nIf you are using `space-pen`, please require `$` from `atom-space-pen-views`. Otherwise require `jquery` instead:\n  `{$} = require 'atom-space-pen-views'`\n  or\n  `$ = require 'jquery'`\nAdd `\"atom-space-pen-views\": \"^2.0.3\"` to your package dependencies.\nOr add `\"jquery\": \"^2\"` to your package dependencies.");
          return $;
        }
      });
      Object.defineProperty(module.exports, '$$', {
        get: function() {
          deprecate("Requiring `$$` from `atom` is no longer supported.\nPlease require `atom-space-pen-views` instead:\n  `{$$} = require 'atom-space-pen-views'`\nAdd `\"atom-space-pen-views\": \"^2.0.3\"` to your package dependencies.");
          return $$;
        }
      });
      Object.defineProperty(module.exports, '$$$', {
        get: function() {
          deprecate("Requiring `$$$` from `atom` is no longer supported.\nPlease require `atom-space-pen-views` instead:\n  `{$$$} = require 'atom-space-pen-views'`\nAdd `\"atom-space-pen-views\": \"^2.0.3\"` to your package dependencies.");
          return $$$;
        }
      });
      Object.defineProperty(module.exports, 'View', {
        get: function() {
          deprecate("Requiring `View` from `atom` is no longer supported.\nPlease require `atom-space-pen-views` instead:\n  `{View} = require 'atom-space-pen-views'`\nAdd `\"atom-space-pen-views\": \"^2.0.3\"` to your package dependencies.");
          return View;
        }
      });
      Object.defineProperty(module.exports, 'EditorView', {
        get: function() {
          deprecate("Requiring `EditorView` from `atom` is no longer supported.\nPlease require `TextEditorView` from `atom-space-pen-view` instead:\n  `{TextEditorView} = require 'atom-space-pen-views'`\nAdd `\"atom-space-pen-views\": \"^2.0.3\"` to your package dependencies.");
          return require('../src/text-editor-view');
        }
      });
      Object.defineProperty(module.exports, 'TextEditorView', {
        get: function() {
          deprecate("Requiring `TextEditorView` from `atom` is no longer supported.\nPlease require `TextEditorView` from `atom-space-pen-view` instead:\n  `{TextEditorView} = require 'atom-space-pen-views'`\nAdd `\"atom-space-pen-views\": \"^2.0.3\"` to your package dependencies.");
          return require('../src/text-editor-view');
        }
      });
      Object.defineProperty(module.exports, 'ScrollView', {
        get: function() {
          deprecate("Requiring `ScrollView` from `atom` is no longer supported.\nPlease require `ScrollView` from `atom-space-pen-view` instead:\n  `{ScrollView} = require 'atom-space-pen-views'`\nNote that the API has changed slightly! Please read the docs at https://github.com/atom/atom-space-pen-views\nAdd `\"atom-space-pen-views\": \"^2.0.3\"` to your package dependencies.");
          return require('../src/scroll-view');
        }
      });
      Object.defineProperty(module.exports, 'SelectListView', {
        get: function() {
          deprecate("Requiring `SelectListView` from `atom` is no longer supported.\nPlease require `SelectListView` from `atom-space-pen-view` instead:\n  `{SelectListView} = require 'atom-space-pen-views'`\nNote that the API has changed slightly! Please read the docs at https://github.com/atom/atom-space-pen-views\nAdd `\"atom-space-pen-views\": \"^2.0.3\"` to your package dependencies.");
          return require('../src/select-list-view');
        }
      });
      Object.defineProperty(module.exports, 'React', {
        get: function() {
          deprecate("Please require `react-atom-fork` instead: `React = require 'react-atom-fork'`. Add `\"react-atom-fork\": \"^0.11\"` to your package dependencies.");
          return require('react-atom-fork');
        }
      });
      Object.defineProperty(module.exports, 'Reactionary', {
        get: function() {
          deprecate("Please require `reactionary-atom-fork` instead: `Reactionary = require 'reactionary-atom-fork'`. Add `\"reactionary-atom-fork\": \"^0.9\"` to your package dependencies.");
          return require('reactionary-atom-fork');
        }
      });
    }
  }

  if (includeDeprecatedAPIs) {
    Object.defineProperty(module.exports, 'Git', {
      get: function() {
        deprecate("Please require `GitRepository` instead of `Git`: `{GitRepository} = require 'atom'`");
        return module.exports.GitRepository;
      }
    });
  }

}).call(this);

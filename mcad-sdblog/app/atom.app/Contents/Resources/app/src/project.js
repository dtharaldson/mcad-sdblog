(function() {
  var DefaultDirectoryProvider, Emitter, GitRepositoryProvider, Grim, Model, Project, Q, Serializable, Subscriber, Task, TextBuffer, TextEditor, deprecate, fs, includeDeprecatedAPIs, path, url, _, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  path = require('path');

  url = require('url');

  _ = require('underscore-plus');

  fs = require('fs-plus');

  Q = require('q');

  _ref = require('grim'), includeDeprecatedAPIs = _ref.includeDeprecatedAPIs, deprecate = _ref.deprecate;

  Subscriber = require('emissary').Subscriber;

  Emitter = require('event-kit').Emitter;

  Serializable = require('serializable');

  TextBuffer = require('text-buffer');

  Grim = require('grim');

  DefaultDirectoryProvider = require('./default-directory-provider');

  Model = require('./model');

  TextEditor = require('./text-editor');

  Task = require('./task');

  GitRepositoryProvider = require('./git-repository-provider');

  module.exports = Project = (function(_super) {
    __extends(Project, _super);

    atom.deserializers.add(Project);

    Serializable.includeInto(Project);


    /*
    Section: Construction and Destruction
     */

    function Project(_arg) {
      var buffer, path, paths, _i, _len, _ref1, _ref2;
      _ref1 = _arg != null ? _arg : {}, path = _ref1.path, paths = _ref1.paths, this.buffers = _ref1.buffers;
      this.emitter = new Emitter;
      if (this.buffers == null) {
        this.buffers = [];
      }
      this.rootDirectories = [];
      this.repositories = [];
      this.directoryProviders = [new DefaultDirectoryProvider()];
      atom.packages.serviceHub.consume('atom.directory-provider', '^0.1.0', (function(_this) {
        return function(provider) {
          return _this.directoryProviders.unshift(provider);
        };
      })(this));
      this.repositoryPromisesByPath = new Map();
      this.repositoryProviders = [new GitRepositoryProvider(this)];
      atom.packages.serviceHub.consume('atom.repository-provider', '^0.1.0', (function(_this) {
        return function(provider) {
          _this.repositoryProviders.push(provider);
          if (__indexOf.call(_this.repositories, null) >= 0) {
            return _this.setPaths(_this.getPaths());
          }
        };
      })(this));
      _ref2 = this.buffers;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        buffer = _ref2[_i];
        this.subscribeToBuffer(buffer);
      }
      if (Grim.includeDeprecatedAPIs && (path != null)) {
        Grim.deprecate("Pass 'paths' array instead of 'path' to project constructor");
      }
      if (paths == null) {
        paths = _.compact([path]);
      }
      this.setPaths(paths);
    }

    Project.prototype.destroyed = function() {
      var buffer, _i, _len, _ref1;
      _ref1 = this.getBuffers();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        buffer = _ref1[_i];
        buffer.destroy();
      }
      return this.setPaths([]);
    };

    Project.prototype.destroyUnretainedBuffers = function() {
      var buffer, _i, _len, _ref1;
      _ref1 = this.getBuffers();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        buffer = _ref1[_i];
        if (!buffer.isRetained()) {
          buffer.destroy();
        }
      }
    };


    /*
    Section: Serialization
     */

    Project.prototype.serializeParams = function() {
      return {
        paths: this.getPaths(),
        buffers: _.compact(this.buffers.map(function(buffer) {
          if (buffer.isRetained()) {
            return buffer.serialize();
          }
        }))
      };
    };

    Project.prototype.deserializeParams = function(params) {
      params.buffers = _.compact(params.buffers.map(function(bufferState) {
        var error;
        if (fs.isDirectorySync(bufferState.filePath)) {
          return;
        }
        if (bufferState.filePath) {
          try {
            fs.closeSync(fs.openSync(bufferState.filePath, 'r'));
          } catch (_error) {
            error = _error;
            if (error.code !== 'ENOENT') {
              return;
            }
          }
        }
        return atom.deserializers.deserialize(bufferState);
      }));
      return params;
    };


    /*
    Section: Event Subscription
     */

    Project.prototype.onDidChangePaths = function(callback) {
      return this.emitter.on('did-change-paths', callback);
    };

    Project.prototype.onDidAddBuffer = function(callback) {
      return this.emitter.on('did-add-buffer', callback);
    };


    /*
    Section: Accessing the git repository
     */

    Project.prototype.getRepositories = function() {
      return this.repositories;
    };

    Project.prototype.repositoryForDirectory = function(directory) {
      var pathForDirectory, promise, promises;
      pathForDirectory = directory.getRealPathSync();
      promise = this.repositoryPromisesByPath.get(pathForDirectory);
      if (!promise) {
        promises = this.repositoryProviders.map(function(provider) {
          return provider.repositoryForDirectory(directory);
        });
        promise = Promise.all(promises).then((function(_this) {
          return function(repositories) {
            var repo, _ref1;
            repo = (_ref1 = _.find(repositories, function(repo) {
              return repo != null;
            })) != null ? _ref1 : null;
            if (repo == null) {
              _this.repositoryPromisesByPath["delete"](pathForDirectory);
            }
            return repo;
          };
        })(this));
        this.repositoryPromisesByPath.set(pathForDirectory, promise);
      }
      return promise;
    };


    /*
    Section: Managing Paths
     */

    Project.prototype.getPaths = function() {
      var rootDirectory, _i, _len, _ref1, _results;
      _ref1 = this.rootDirectories;
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        rootDirectory = _ref1[_i];
        _results.push(rootDirectory.getPath());
      }
      return _results;
    };

    Project.prototype.setPaths = function(projectPaths) {
      var projectPath, repository, rootDirectory, _i, _j, _k, _len, _len1, _len2, _ref1, _ref2;
      if (includeDeprecatedAPIs) {
        _ref1 = this.rootDirectories;
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          rootDirectory = _ref1[_i];
          rootDirectory.off();
        }
      }
      _ref2 = this.repositories;
      for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
        repository = _ref2[_j];
        if (repository != null) {
          repository.destroy();
        }
      }
      this.rootDirectories = [];
      this.repositories = [];
      for (_k = 0, _len2 = projectPaths.length; _k < _len2; _k++) {
        projectPath = projectPaths[_k];
        this.addPath(projectPath, {
          emitEvent: false
        });
      }
      if (includeDeprecatedAPIs) {
        this.emit("path-changed");
      }
      return this.emitter.emit('did-change-paths', projectPaths);
    };

    Project.prototype.addPath = function(projectPath, options) {
      var directory, provider, repo, _i, _j, _k, _len, _len1, _len2, _ref1, _ref2, _ref3;
      _ref1 = this.getDirectories();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        directory = _ref1[_i];
        if (directory.contains(projectPath) || directory.getPath() === projectPath) {
          return;
        }
      }
      directory = null;
      _ref2 = this.directoryProviders;
      for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
        provider = _ref2[_j];
        if (directory = typeof provider.directoryForURISync === "function" ? provider.directoryForURISync(projectPath) : void 0) {
          break;
        }
      }
      if (directory === null) {
        throw new Error(projectPath + ' could not be resolved to a directory');
      }
      this.rootDirectories.push(directory);
      repo = null;
      _ref3 = this.repositoryProviders;
      for (_k = 0, _len2 = _ref3.length; _k < _len2; _k++) {
        provider = _ref3[_k];
        if (repo = typeof provider.repositoryForDirectorySync === "function" ? provider.repositoryForDirectorySync(directory) : void 0) {
          break;
        }
      }
      this.repositories.push(repo != null ? repo : null);
      if ((options != null ? options.emitEvent : void 0) !== false) {
        if (includeDeprecatedAPIs) {
          this.emit("path-changed");
        }
        return this.emitter.emit('did-change-paths', this.getPaths());
      }
    };

    Project.prototype.removePath = function(projectPath) {
      var directory, i, indexToRemove, removedDirectory, removedRepository, _i, _len, _ref1;
      if (__indexOf.call(this.getPaths(), projectPath) < 0) {
        projectPath = path.normalize(projectPath);
      }
      indexToRemove = null;
      _ref1 = this.rootDirectories;
      for (i = _i = 0, _len = _ref1.length; _i < _len; i = ++_i) {
        directory = _ref1[i];
        if (directory.getPath() === projectPath) {
          indexToRemove = i;
          break;
        }
      }
      if (indexToRemove != null) {
        removedDirectory = this.rootDirectories.splice(indexToRemove, 1)[0];
        removedRepository = this.repositories.splice(indexToRemove, 1)[0];
        if (includeDeprecatedAPIs) {
          removedDirectory.off();
        }
        if (__indexOf.call(this.repositories, removedRepository) < 0) {
          if (removedRepository != null) {
            removedRepository.destroy();
          }
        }
        if (includeDeprecatedAPIs) {
          this.emit("path-changed");
        }
        this.emitter.emit("did-change-paths", this.getPaths());
        return true;
      } else {
        return false;
      }
    };

    Project.prototype.getDirectories = function() {
      return this.rootDirectories;
    };

    Project.prototype.resolvePath = function(uri) {
      var projectPath;
      if (!uri) {
        return;
      }
      if (uri != null ? uri.match(/[A-Za-z0-9+-.]+:\/\//) : void 0) {
        return uri;
      } else {
        if (fs.isAbsolute(uri)) {
          return path.normalize(fs.absolute(uri));
        } else if (projectPath = this.getPaths()[0]) {
          return path.normalize(fs.absolute(path.join(projectPath, uri)));
        } else {
          return void 0;
        }
      }
    };

    Project.prototype.relativize = function(fullPath) {
      return this.relativizePath(fullPath)[1];
    };

    Project.prototype.relativizePath = function(fullPath) {
      var relativePath, rootDirectory, _i, _len, _ref1;
      _ref1 = this.rootDirectories;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        rootDirectory = _ref1[_i];
        relativePath = rootDirectory.relativize(fullPath);
        if (relativePath !== fullPath) {
          return [rootDirectory.getPath(), relativePath];
        }
      }
      return [null, fullPath];
    };

    Project.prototype.contains = function(pathToCheck) {
      return this.rootDirectories.some(function(dir) {
        return dir.contains(pathToCheck);
      });
    };


    /*
    Section: Private
     */

    Project.prototype.open = function(filePath, options) {
      var error;
      if (options == null) {
        options = {};
      }
      filePath = this.resolvePath(filePath);
      if (filePath != null) {
        try {
          fs.closeSync(fs.openSync(filePath, 'r'));
        } catch (_error) {
          error = _error;
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }
      return this.bufferForPath(filePath).then((function(_this) {
        return function(buffer) {
          return _this.buildEditorForBuffer(buffer, options);
        };
      })(this));
    };

    Project.prototype.getBuffers = function() {
      return this.buffers.slice();
    };

    Project.prototype.isPathModified = function(filePath) {
      var _ref1;
      return (_ref1 = this.findBufferForPath(this.resolvePath(filePath))) != null ? _ref1.isModified() : void 0;
    };

    Project.prototype.findBufferForPath = function(filePath) {
      return _.find(this.buffers, function(buffer) {
        return buffer.getPath() === filePath;
      });
    };

    Project.prototype.bufferForPathSync = function(filePath) {
      var absoluteFilePath, existingBuffer;
      absoluteFilePath = this.resolvePath(filePath);
      if (filePath) {
        existingBuffer = this.findBufferForPath(absoluteFilePath);
      }
      return existingBuffer != null ? existingBuffer : this.buildBufferSync(absoluteFilePath);
    };

    Project.prototype.bufferForPath = function(filePath) {
      var absoluteFilePath, existingBuffer;
      absoluteFilePath = this.resolvePath(filePath);
      if (absoluteFilePath) {
        existingBuffer = this.findBufferForPath(absoluteFilePath);
      }
      return Q(existingBuffer != null ? existingBuffer : this.buildBuffer(absoluteFilePath));
    };

    Project.prototype.bufferForId = function(id) {
      return _.find(this.buffers, function(buffer) {
        return buffer.id === id;
      });
    };

    Project.prototype.buildBufferSync = function(absoluteFilePath) {
      var buffer;
      buffer = new TextBuffer({
        filePath: absoluteFilePath
      });
      this.addBuffer(buffer);
      buffer.loadSync();
      return buffer;
    };

    Project.prototype.buildBuffer = function(absoluteFilePath) {
      var buffer, error;
      if (fs.getSizeSync(absoluteFilePath) >= 2 * 1048576) {
        error = new Error("Atom can only handle files < 2MB for now.");
        error.code = 'EFILETOOLARGE';
        throw error;
      }
      buffer = new TextBuffer({
        filePath: absoluteFilePath
      });
      this.addBuffer(buffer);
      return buffer.load().then(function(buffer) {
        return buffer;
      })["catch"]((function(_this) {
        return function() {
          return _this.removeBuffer(buffer);
        };
      })(this));
    };

    Project.prototype.addBuffer = function(buffer, options) {
      if (options == null) {
        options = {};
      }
      this.addBufferAtIndex(buffer, this.buffers.length, options);
      return this.subscribeToBuffer(buffer);
    };

    Project.prototype.addBufferAtIndex = function(buffer, index, options) {
      if (options == null) {
        options = {};
      }
      this.buffers.splice(index, 0, buffer);
      this.subscribeToBuffer(buffer);
      if (includeDeprecatedAPIs) {
        this.emit('buffer-created', buffer);
      }
      this.emitter.emit('did-add-buffer', buffer);
      return buffer;
    };

    Project.prototype.removeBuffer = function(buffer) {
      var index;
      index = this.buffers.indexOf(buffer);
      if (index !== -1) {
        return this.removeBufferAtIndex(index);
      }
    };

    Project.prototype.removeBufferAtIndex = function(index, options) {
      var buffer;
      if (options == null) {
        options = {};
      }
      buffer = this.buffers.splice(index, 1)[0];
      return buffer != null ? buffer.destroy() : void 0;
    };

    Project.prototype.buildEditorForBuffer = function(buffer, editorOptions) {
      var editor;
      editor = new TextEditor(_.extend({
        buffer: buffer,
        registerEditor: true
      }, editorOptions));
      return editor;
    };

    Project.prototype.eachBuffer = function() {
      var args, buffer, callback, subscriber, _i, _len, _ref1;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (args.length > 1) {
        subscriber = args.shift();
      }
      callback = args.shift();
      _ref1 = this.getBuffers();
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        buffer = _ref1[_i];
        callback(buffer);
      }
      if (subscriber) {
        return subscriber.subscribe(this, 'buffer-created', function(buffer) {
          return callback(buffer);
        });
      } else {
        return this.on('buffer-created', function(buffer) {
          return callback(buffer);
        });
      }
    };

    Project.prototype.subscribeToBuffer = function(buffer) {
      buffer.onDidDestroy((function(_this) {
        return function() {
          return _this.removeBuffer(buffer);
        };
      })(this));
      return buffer.onWillThrowWatchError(function(_arg) {
        var error, handle;
        error = _arg.error, handle = _arg.handle;
        handle();
        return atom.notifications.addWarning("Unable to read file after file `" + error.eventType + "` event.\nMake sure you have permission to access `" + (buffer.getPath()) + "`.", {
          detail: error.message,
          dismissable: true
        });
      });
    };

    return Project;

  })(Model);

  if (includeDeprecatedAPIs) {
    Project.pathForRepositoryUrl = function(repoUrl) {
      var repoName;
      deprecate('::pathForRepositoryUrl will be removed. Please remove from your code.');
      repoName = url.parse(repoUrl).path.split('/').slice(-1)[0];
      repoName = repoName.replace(/\.git$/, '');
      return path.join(atom.config.get('core.projectHome'), repoName);
    };
    Project.prototype.registerOpener = function(opener) {
      deprecate("Use Workspace::addOpener instead");
      return atom.workspace.addOpener(opener);
    };
    Project.prototype.unregisterOpener = function(opener) {
      deprecate("Call .dispose() on the Disposable returned from ::addOpener instead");
      return atom.workspace.unregisterOpener(opener);
    };
    Project.prototype.eachEditor = function(callback) {
      deprecate("Use Workspace::observeTextEditors instead");
      return atom.workspace.observeTextEditors(callback);
    };
    Project.prototype.getEditors = function() {
      deprecate("Use Workspace::getTextEditors instead");
      return atom.workspace.getTextEditors();
    };
    Project.prototype.on = function(eventName) {
      if (eventName === 'path-changed') {
        Grim.deprecate("Use Project::onDidChangePaths instead");
      } else {
        Grim.deprecate("Project::on is deprecated. Use documented event subscription methods instead.");
      }
      return Project.__super__.on.apply(this, arguments);
    };
    Project.prototype.getRepo = function() {
      Grim.deprecate("Use ::getRepositories instead");
      return this.getRepositories()[0];
    };
    Project.prototype.getPath = function() {
      Grim.deprecate("Use ::getPaths instead");
      return this.getPaths()[0];
    };
    Project.prototype.setPath = function(path) {
      Grim.deprecate("Use ::setPaths instead");
      return this.setPaths([path]);
    };
    Project.prototype.getRootDirectory = function() {
      Grim.deprecate("Use ::getDirectories instead");
      return this.getDirectories()[0];
    };
    Project.prototype.resolve = function(uri) {
      Grim.deprecate("Use `Project::getDirectories()[0]?.resolve()` instead");
      return this.resolvePath(uri);
    };
    Project.prototype.scan = function(regex, options, iterator) {
      if (options == null) {
        options = {};
      }
      Grim.deprecate("Use atom.workspace.scan instead of atom.project.scan");
      return atom.workspace.scan(regex, options, iterator);
    };
    Project.prototype.replace = function(regex, replacementText, filePaths, iterator) {
      Grim.deprecate("Use atom.workspace.replace instead of atom.project.replace");
      return atom.workspace.replace(regex, replacementText, filePaths, iterator);
    };
    Project.prototype.openSync = function(filePath, options) {
      if (options == null) {
        options = {};
      }
      deprecate("Use Project::open instead");
      filePath = this.resolvePath(filePath);
      return this.buildEditorForBuffer(this.bufferForPathSync(filePath), options);
    };
  }

}).call(this);

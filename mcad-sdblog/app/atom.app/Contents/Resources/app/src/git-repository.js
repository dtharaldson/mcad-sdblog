(function() {
  var CompositeDisposable, Disposable, Emitter, EmitterMixin, GitRepository, GitUtils, Task, basename, deprecate, fs, includeDeprecatedAPIs, join, _, _ref, _ref1, _ref2;

  _ref = require('path'), basename = _ref.basename, join = _ref.join;

  _ = require('underscore-plus');

  _ref1 = require('event-kit'), Emitter = _ref1.Emitter, Disposable = _ref1.Disposable, CompositeDisposable = _ref1.CompositeDisposable;

  fs = require('fs-plus');

  GitUtils = require('git-utils');

  _ref2 = require('grim'), includeDeprecatedAPIs = _ref2.includeDeprecatedAPIs, deprecate = _ref2.deprecate;

  Task = require('./task');

  module.exports = GitRepository = (function() {
    GitRepository.exists = function(path) {
      var git;
      if (git = this.open(path)) {
        git.destroy();
        return true;
      } else {
        return false;
      }
    };


    /*
    Section: Construction and Destruction
     */

    GitRepository.open = function(path, options) {
      if (!path) {
        return null;
      }
      try {
        return new GitRepository(path, options);
      } catch (_error) {
        return null;
      }
    };

    function GitRepository(path, options) {
      var onWindowFocus, refreshOnWindowFocus, submodulePath, submoduleRepo, _ref3;
      if (options == null) {
        options = {};
      }
      this.emitter = new Emitter;
      this.subscriptions = new CompositeDisposable;
      this.repo = GitUtils.open(path);
      if (this.repo == null) {
        throw new Error("No Git repository found searching path: " + path);
      }
      this.statuses = {};
      this.upstream = {
        ahead: 0,
        behind: 0
      };
      _ref3 = this.repo.submodules;
      for (submodulePath in _ref3) {
        submoduleRepo = _ref3[submodulePath];
        submoduleRepo.upstream = {
          ahead: 0,
          behind: 0
        };
      }
      this.project = options.project, refreshOnWindowFocus = options.refreshOnWindowFocus;
      if (refreshOnWindowFocus == null) {
        refreshOnWindowFocus = true;
      }
      if (refreshOnWindowFocus) {
        onWindowFocus = (function(_this) {
          return function() {
            _this.refreshIndex();
            return _this.refreshStatus();
          };
        })(this);
        window.addEventListener('focus', onWindowFocus);
        this.subscriptions.add(new Disposable(function() {
          return window.removeEventListener('focus', onWindowFocus);
        }));
      }
      if (this.project != null) {
        this.project.getBuffers().forEach((function(_this) {
          return function(buffer) {
            return _this.subscribeToBuffer(buffer);
          };
        })(this));
        this.subscriptions.add(this.project.onDidAddBuffer((function(_this) {
          return function(buffer) {
            return _this.subscribeToBuffer(buffer);
          };
        })(this)));
      }
    }

    GitRepository.prototype.destroy = function() {
      if (this.emitter != null) {
        this.emitter.emit('did-destroy');
        this.emitter.dispose();
        this.emitter = null;
      }
      if (this.statusTask != null) {
        this.statusTask.terminate();
        this.statusTask = null;
      }
      if (this.repo != null) {
        this.repo.release();
        this.repo = null;
      }
      if (this.subscriptions != null) {
        this.subscriptions.dispose();
        return this.subscriptions = null;
      }
    };

    GitRepository.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };


    /*
    Section: Event Subscription
     */

    GitRepository.prototype.onDidChangeStatus = function(callback) {
      return this.emitter.on('did-change-status', callback);
    };

    GitRepository.prototype.onDidChangeStatuses = function(callback) {
      return this.emitter.on('did-change-statuses', callback);
    };


    /*
    Section: Repository Details
     */

    GitRepository.prototype.getType = function() {
      return 'git';
    };

    GitRepository.prototype.getPath = function() {
      return this.path != null ? this.path : this.path = fs.absolute(this.getRepo().getPath());
    };

    GitRepository.prototype.getWorkingDirectory = function() {
      return this.getRepo().getWorkingDirectory();
    };

    GitRepository.prototype.isProjectAtRoot = function() {
      var _ref3;
      return this.projectAtRoot != null ? this.projectAtRoot : this.projectAtRoot = ((_ref3 = this.project) != null ? _ref3.relativize(this.getWorkingDirectory()) : void 0) === '';
    };

    GitRepository.prototype.relativize = function(path) {
      return this.getRepo().relativize(path);
    };

    GitRepository.prototype.hasBranch = function(branch) {
      return this.getReferenceTarget("refs/heads/" + branch) != null;
    };

    GitRepository.prototype.getShortHead = function(path) {
      return this.getRepo(path).getShortHead();
    };

    GitRepository.prototype.isSubmodule = function(path) {
      var repo;
      if (!path) {
        return false;
      }
      repo = this.getRepo(path);
      if (repo.isSubmodule(repo.relativize(path))) {
        return true;
      } else {
        return repo !== this.getRepo() && repo.relativize(join(path, 'dir')) === 'dir';
      }
    };

    GitRepository.prototype.getAheadBehindCount = function(reference, path) {
      return this.getRepo(path).getAheadBehindCount(reference);
    };

    GitRepository.prototype.getCachedUpstreamAheadBehindCount = function(path) {
      var _ref3;
      return (_ref3 = this.getRepo(path).upstream) != null ? _ref3 : this.upstream;
    };

    GitRepository.prototype.getConfigValue = function(key, path) {
      return this.getRepo(path).getConfigValue(key);
    };

    GitRepository.prototype.getOriginURL = function(path) {
      return this.getConfigValue('remote.origin.url', path);
    };

    GitRepository.prototype.getUpstreamBranch = function(path) {
      return this.getRepo(path).getUpstreamBranch();
    };

    GitRepository.prototype.getReferences = function(path) {
      return this.getRepo(path).getReferences();
    };

    GitRepository.prototype.getReferenceTarget = function(reference, path) {
      return this.getRepo(path).getReferenceTarget(reference);
    };


    /*
    Section: Reading Status
     */

    GitRepository.prototype.isPathModified = function(path) {
      return this.isStatusModified(this.getPathStatus(path));
    };

    GitRepository.prototype.isPathNew = function(path) {
      return this.isStatusNew(this.getPathStatus(path));
    };

    GitRepository.prototype.isPathIgnored = function(path) {
      return this.getRepo().isIgnored(this.relativize(path));
    };

    GitRepository.prototype.getDirectoryStatus = function(directoryPath) {
      var directoryStatus, path, status, _ref3;
      directoryPath = "" + (this.relativize(directoryPath)) + "/";
      directoryStatus = 0;
      _ref3 = this.statuses;
      for (path in _ref3) {
        status = _ref3[path];
        if (path.indexOf(directoryPath) === 0) {
          directoryStatus |= status;
        }
      }
      return directoryStatus;
    };

    GitRepository.prototype.getPathStatus = function(path) {
      var currentPathStatus, pathStatus, relativePath, repo, _ref3, _ref4;
      repo = this.getRepo(path);
      relativePath = this.relativize(path);
      currentPathStatus = (_ref3 = this.statuses[relativePath]) != null ? _ref3 : 0;
      pathStatus = (_ref4 = repo.getStatus(repo.relativize(path))) != null ? _ref4 : 0;
      if (repo.isStatusIgnored(pathStatus)) {
        pathStatus = 0;
      }
      if (pathStatus > 0) {
        this.statuses[relativePath] = pathStatus;
      } else {
        delete this.statuses[relativePath];
      }
      if (currentPathStatus !== pathStatus) {
        if (includeDeprecatedAPIs) {
          this.emit('status-changed', path, pathStatus);
        }
        this.emitter.emit('did-change-status', {
          path: path,
          pathStatus: pathStatus
        });
      }
      return pathStatus;
    };

    GitRepository.prototype.getCachedPathStatus = function(path) {
      return this.statuses[this.relativize(path)];
    };

    GitRepository.prototype.isStatusModified = function(status) {
      return this.getRepo().isStatusModified(status);
    };

    GitRepository.prototype.isStatusNew = function(status) {
      return this.getRepo().isStatusNew(status);
    };


    /*
    Section: Retrieving Diffs
     */

    GitRepository.prototype.getDiffStats = function(path) {
      var repo;
      repo = this.getRepo(path);
      return repo.getDiffStats(repo.relativize(path));
    };

    GitRepository.prototype.getLineDiffs = function(path, text) {
      var options, repo;
      options = {
        ignoreEolWhitespace: process.platform === 'win32'
      };
      repo = this.getRepo(path);
      return repo.getLineDiffs(repo.relativize(path), text, options);
    };


    /*
    Section: Checking Out
     */

    GitRepository.prototype.checkoutHead = function(path) {
      var headCheckedOut, repo;
      repo = this.getRepo(path);
      headCheckedOut = repo.checkoutHead(repo.relativize(path));
      if (headCheckedOut) {
        this.getPathStatus(path);
      }
      return headCheckedOut;
    };

    GitRepository.prototype.checkoutReference = function(reference, create) {
      return this.getRepo().checkoutReference(reference, create);
    };


    /*
    Section: Private
     */

    GitRepository.prototype.subscribeToBuffer = function(buffer) {
      var bufferSubscriptions, getBufferPathStatus;
      getBufferPathStatus = (function(_this) {
        return function() {
          var path;
          if (path = buffer.getPath()) {
            return _this.getPathStatus(path);
          }
        };
      })(this);
      bufferSubscriptions = new CompositeDisposable;
      bufferSubscriptions.add(buffer.onDidSave(getBufferPathStatus));
      bufferSubscriptions.add(buffer.onDidReload(getBufferPathStatus));
      bufferSubscriptions.add(buffer.onDidChangePath(getBufferPathStatus));
      bufferSubscriptions.add(buffer.onDidDestroy((function(_this) {
        return function() {
          bufferSubscriptions.dispose();
          return _this.subscriptions.remove(bufferSubscriptions);
        };
      })(this)));
      this.subscriptions.add(bufferSubscriptions);
    };

    GitRepository.prototype.checkoutHeadForEditor = function(editor) {
      var checkoutHead, fileName, filePath;
      filePath = editor.getPath();
      if (!filePath) {
        return;
      }
      fileName = basename(filePath);
      checkoutHead = (function(_this) {
        return function() {
          if (editor.buffer.isModified()) {
            editor.buffer.reload();
          }
          return _this.checkoutHead(filePath);
        };
      })(this);
      if (atom.config.get('editor.confirmCheckoutHeadRevision')) {
        return atom.confirm({
          message: 'Confirm Checkout HEAD Revision',
          detailedMessage: "Are you sure you want to discard all changes to \"" + fileName + "\" since the last Git commit?",
          buttons: {
            OK: checkoutHead,
            Cancel: null
          }
        });
      } else {
        return checkoutHead();
      }
    };

    GitRepository.prototype.getRepo = function(path) {
      var _ref3;
      if (this.repo != null) {
        return (_ref3 = this.repo.submoduleForPath(path)) != null ? _ref3 : this.repo;
      } else {
        throw new Error("Repository has been destroyed");
      }
    };

    GitRepository.prototype.refreshIndex = function() {
      return this.getRepo().refreshIndex();
    };

    GitRepository.prototype.refreshStatus = function() {
      var _ref3;
      if (this.handlerPath == null) {
        this.handlerPath = require.resolve('./repository-status-handler');
      }
      if ((_ref3 = this.statusTask) != null) {
        _ref3.terminate();
      }
      return this.statusTask = Task.once(this.handlerPath, this.getPath(), (function(_this) {
        return function(_arg) {
          var branch, statuses, statusesUnchanged, submodulePath, submoduleRepo, submodules, upstream, _ref4, _ref5, _ref6;
          statuses = _arg.statuses, upstream = _arg.upstream, branch = _arg.branch, submodules = _arg.submodules;
          statusesUnchanged = _.isEqual(statuses, _this.statuses) && _.isEqual(upstream, _this.upstream) && _.isEqual(branch, _this.branch) && _.isEqual(submodules, _this.submodules);
          _this.statuses = statuses;
          _this.upstream = upstream;
          _this.branch = branch;
          _this.submodules = submodules;
          _ref4 = _this.getRepo().submodules;
          for (submodulePath in _ref4) {
            submoduleRepo = _ref4[submodulePath];
            submoduleRepo.upstream = (_ref5 = (_ref6 = submodules[submodulePath]) != null ? _ref6.upstream : void 0) != null ? _ref5 : {
              ahead: 0,
              behind: 0
            };
          }
          if (!statusesUnchanged) {
            if (includeDeprecatedAPIs) {
              _this.emit('statuses-changed');
            }
            return _this.emitter.emit('did-change-statuses');
          }
        };
      })(this));
    };

    return GitRepository;

  })();

  if (includeDeprecatedAPIs) {
    EmitterMixin = require('emissary').Emitter;
    EmitterMixin.includeInto(GitRepository);
    GitRepository.prototype.on = function(eventName) {
      switch (eventName) {
        case 'status-changed':
          deprecate('Use GitRepository::onDidChangeStatus instead');
          break;
        case 'statuses-changed':
          deprecate('Use GitRepository::onDidChangeStatuses instead');
          break;
        default:
          deprecate('GitRepository::on is deprecated. Use event subscription methods instead.');
      }
      return EmitterMixin.prototype.on.apply(this, arguments);
    };
    GitRepository.prototype.getOriginUrl = function(path) {
      deprecate('Use ::getOriginURL instead.');
      return this.getOriginURL(path);
    };
  }

}).call(this);

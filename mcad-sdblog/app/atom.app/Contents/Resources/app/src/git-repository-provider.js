(function() {
  var GitRepository, GitRepositoryProvider, findGitDirectorySync, fs, isValidGitDirectorySync;

  fs = require('fs');

  GitRepository = require('./git-repository');

  findGitDirectorySync = function(directory) {
    var gitDir;
    gitDir = directory.getSubdirectory('.git');
    if ((typeof gitDir.existsSync === "function" ? gitDir.existsSync() : void 0) && isValidGitDirectorySync(gitDir)) {
      return gitDir;
    } else if (directory.isRoot()) {
      return null;
    } else {
      return findGitDirectorySync(directory.getParent());
    }
  };

  isValidGitDirectorySync = function(directory) {
    return directory.getSubdirectory('objects').existsSync() && directory.getFile('HEAD').existsSync() && directory.getSubdirectory('refs').existsSync();
  };

  module.exports = GitRepositoryProvider = (function() {
    function GitRepositoryProvider(project) {
      this.project = project;
      this.pathToRepository = {};
    }

    GitRepositoryProvider.prototype.repositoryForDirectory = function(directory) {
      return Promise.resolve(this.repositoryForDirectorySync(directory));
    };

    GitRepositoryProvider.prototype.repositoryForDirectorySync = function(directory) {
      var gitDir, gitDirPath, repo;
      gitDir = findGitDirectorySync(directory);
      if (!gitDir) {
        return null;
      }
      gitDirPath = gitDir.getPath();
      repo = this.pathToRepository[gitDirPath];
      if (!repo) {
        repo = GitRepository.open(gitDirPath, {
          project: this.project
        });
        if (!repo) {
          return null;
        }
        repo.onDidDestroy((function(_this) {
          return function() {
            return delete _this.pathToRepository[gitDirPath];
          };
        })(this));
        this.pathToRepository[gitDirPath] = repo;
        repo.refreshIndex();
        repo.refreshStatus();
      }
      return repo;
    };

    return GitRepositoryProvider;

  })();

}).call(this);

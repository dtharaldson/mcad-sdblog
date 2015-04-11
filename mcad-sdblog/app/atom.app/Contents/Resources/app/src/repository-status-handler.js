(function() {
  var Git, path;

  Git = require('git-utils');

  path = require('path');

  module.exports = function(repoPath) {
    var absolutePath, branch, filePath, relativePath, repo, status, statuses, submodulePath, submoduleRepo, submodules, upstream, workingDirectoryPath, _ref, _ref1, _ref2;
    repo = Git.open(repoPath);
    upstream = {};
    statuses = {};
    submodules = {};
    branch = null;
    if (repo != null) {
      workingDirectoryPath = repo.getWorkingDirectory();
      _ref = repo.getStatus();
      for (filePath in _ref) {
        status = _ref[filePath];
        statuses[filePath] = status;
      }
      _ref1 = repo.submodules;
      for (submodulePath in _ref1) {
        submoduleRepo = _ref1[submodulePath];
        submodules[submodulePath] = {
          branch: submoduleRepo.getHead(),
          upstream: submoduleRepo.getAheadBehindCount()
        };
        workingDirectoryPath = submoduleRepo.getWorkingDirectory();
        _ref2 = submoduleRepo.getStatus();
        for (filePath in _ref2) {
          status = _ref2[filePath];
          absolutePath = path.join(workingDirectoryPath, filePath);
          relativePath = repo.relativize(absolutePath);
          statuses[relativePath] = status;
        }
      }
      upstream = repo.getAheadBehindCount();
      branch = repo.getHead();
      repo.release();
    }
    return {
      statuses: statuses,
      upstream: upstream,
      branch: branch,
      submodules: submodules
    };
  };

}).call(this);


module.exports = function (grunt) {

  var path = require('path');
  var os = require('os');
  var rm = require('./task-helpers')(grunt).rm;

  grunt.registerTask('partial-clean', 'Delete some of the build files', function () {
    var tmpdir = os.tmpdir();

    rm(grunt.config.get("scout.buildDir"));
    rm(require('../src/less-compile-cache').cacheDir);
    rm(path.join(tmpdir, 'atom-cached-atom-shells'));
    rm('atom-shell');
  });

  grunt.registerTask('clean', 'Delete all the build files', function () {
    var homeDir = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];

    rm('apm/node_modules');
    rm('node_modules');
    rm(path.join(homeDir, ".scout", '.node-gyp'));

    grunt.task.run('partial-clean');
  });
};

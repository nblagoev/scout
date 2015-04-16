
module.exports = function (grunt) {

  var async = require('async');
  var path = require('path');
  var spawn = require('./task-helpers')(grunt).spawn;

  var getAppPath = function () {
    var contentsDir = grunt.config.get('scout.contentsDir');

    switch (process.platform) {
      case 'darwin':
        return path.join(contentsDir, 'MacOS', 'scout');
      case 'linux':
        return path.join(contentsDir, 'scout');
      case 'win32':
        return path.join(contentsDir, 'scout.exe');
    }
  };

  var runCoreSpecs = function (callback) {
    var options;
    var appPath = getAppPath();
    var resourcePath = process.cwd();
    var coreSpecsPath = path.resolve('spec');

    if (process.platform === 'darwin' || process.platform === 'linux') {
      options = {
        cmd: appPath,
        args: ['--test', "--resource-path=" + resourcePath, "--spec-directory=" + coreSpecsPath]
      };
    } else if (process.platform === 'win32') {
      options = {
        cmd: process.env.comspec,
        args: ['/c', appPath, '--test', "--resource-path=" + resourcePath, "--spec-directory=" + coreSpecsPath, "--log-file=ci.log"]
      };
    }

    spawn(options, function (error, results, code) {
      if (process.platform === 'win32') {
        if (error) {
          process.stderr.write(fs.readFileSync('ci.log'));
        }

        fs.unlinkSync('ci.log');
      }

      callback(null, error);
    });
  };

  grunt.registerTask('run-specs', 'Run the specs', function () {
    var done = this.async();
    var startTime = Date.now();

    runCoreSpecs(function (error, results) {
      var elapsedTime = Math.round((Date.now() - startTime) / 100) / 10;
      grunt.log.ok("Total spec time: " + elapsedTime + "s");

      if (results) {
        grunt.log.error("[Error]".red + " core spec failed");
      }
      
      done(!results);
    });
  });
};

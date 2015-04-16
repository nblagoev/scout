
module.exports = function (grunt) {

  var path = require('path');
  var asar = require('asar');
  var rm = require('./task-helpers')(grunt).rm;

  grunt.registerTask('generate-asar', 'Generate asar archive for the app', function () {
    var done = this.async();

    var appDir = grunt.config.get("scout.appDir");
    var target = path.resolve(appDir, '..', 'app.asar');

    grunt.verbose.ok("Generating asar archive from " + appDir + " => " + target);
    asar.createPackageWithOptions(appDir, target, {unpack: "*.node"}, function (err) {
      if (err) {
        done(err);
        return;
      }

      rm(appDir);
      done();
    });
  });
};

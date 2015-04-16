
module.exports = function (grunt) {
  
  var fs = require('fs');
  var path = require('path');
  var spawn = require('./task-helpers')(grunt).spawn;

  var getVersion = function (callback) {
    var inRepository = fs.existsSync(path.resolve(__dirname, '..', '..', '.git'));
    var version = grunt.config.get('pkg').version;

    if (!inRepository) {
      callback(null, version);
    } else {
      var cmd = 'git';
      var args = ['rev-parse', '--short', 'HEAD'];
      spawn({ cmd: cmd, args: args },
        function (error, _arg, code) {
          var stdout = (_arg != null ? _arg : {}).stdout;
          var commitHash = stdout != null ? typeof stdout.trim === "function" ? stdout.trim() : void 0 : void 0;
          var combinedVersion = version + "-" + commitHash;

          callback(error, combinedVersion);
        });
    }
  };

  grunt.registerTask('set-version', 'Set the version in the plist and package.json', function () {
    var done = this.async();

    getVersion(function (error, version) {
      if (error != null) {
        done(error);
        return;
      }

      var appDir = grunt.config.get("scout.appDir");

      // Replace version field of package.json.
      var packageJsonPath = path.join(appDir, 'package.json');
      var packageJson = require(packageJsonPath);
      packageJson.version = version;
      var packageJsonString = JSON.stringify(packageJson);
      fs.writeFileSync(packageJsonPath, packageJsonString);

      var appName = grunt.config.get("scout.appName");

      if (process.platform === 'darwin') {
        var cmd = 'script/set-version';
        var args = [grunt.config.get("scout.buildDir"), version, appName];
        spawn({ cmd: cmd, args: args },
          function (error, result, code) {
            done(error);
          });
      } else if (process.platform === 'win32') {
        var shellAppDir = grunt.config.get("scout.shellAppDir");
        var shellExePath = path.join(shellAppDir, 'scout.exe');

        var strings = {
          CompanyName: "Nikolay Blagoev",
          FileDescription: "Scout",
          LegalCopyright: "Copyright (C) 2015 Nikolay Blagoev. All rights reserved",
          ProductName: "Scout",
          ProductVersion: version,
          OriginalFilename: "scout.exe"
        };

        var rcedit = require('rcedit');
        rcedit(shellExePath, {
          'version-string': strings,
          'file-version': version
        }, done);
      } else {
        done();
      }
    });
  });
};

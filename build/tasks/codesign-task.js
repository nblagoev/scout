
module.exports = function (grunt) {

  var path = require('path');
  var fs = require('fs-plus');
  var spawn = require('./task-helpers')(grunt).spawn;

  var args, cmd;
  var unlockKeychain = function (callback) {
    var XCODE_KEYCHAIN_PASSWORD = process.env.XCODE_KEYCHAIN_PASSWORD;
    var XCODE_KEYCHAIN = process.env.XCODE_KEYCHAIN;
    cmd = 'security';
    args = ['unlock-keychain', '-p', XCODE_KEYCHAIN_PASSWORD, XCODE_KEYCHAIN];

    spawn({ cmd: cmd, args: args },
      function (error) {
        callback(error);
      });
  };

  var signApp = function (callback) {
    var shellAppDir = grunt.config.get("scout.shellAppDir");
    var XCODE_SIGNING_IDENTITY = process.env.XCODE_SIGNING_IDENTITY;

    switch (process.platform) {
      case 'darwin':
        cmd = 'codesign';
        args = ['--deep', '--force', '--verbose', '--sign', XCODE_SIGNING_IDENTITY, shellAppDir];
        spawn({ cmd: cmd, args: args },
          function (error) {
            callback(error);
          });
      case 'win32':
        spawn({ cmd: 'taskkill', args: ['/F', '/IM', 'scout.exe'] },
          function () {
            cmd = process.env.JANKY_SIGNTOOL || 'signtool';
            args = [path.join(grunt.config.get('scout.shellAppDir'), 'scout.exe')];
            spawn({ cmd: cmd, args: args },
              function (error) {
                if (error != null) {
                  return callback(error);
                }

                var setupExePath = path.resolve(grunt.config.get('scout.buildDir'), 'installer', 'ScoutSetup.exe');

                if (fs.isFileSync(setupExePath)) {
                  args = [setupExePath];
                  spawn({ cmd: cmd, args: args },
                    function (error) {
                      callback(error);
                    });
                } else {
                  callback();
                }
              });
          });
      default:
        callback();
    }
  };

  grunt.registerTask('codesign', 'Codesign the app', function () {
    var done = this.async();

    if (process.platform === 'darwin' && process.env.XCODE_KEYCHAIN) {
      unlockKeychain(function (error) {
        if (error) {
          done(error);
        } else {
          signApp(done);
        }
      });
    } else {
      signApp(done);
    }
  });

};


module.exports = function (grunt) {

  var path = require('path');
  var _ = require('underscore-plus');
  var fs = require('fs-plus');
  var runas = null;
  var temp = require('temp');
  var helpers = require('./task-helpers')(grunt);
  var cp = helpers.cp;
  var mkdir = helpers.mkdir;
  var rm = helpers.rm;

  grunt.registerTask('install', 'Install the built application', function () {
    var filled, template;

    var installDir = grunt.config.get('scout.installDir');
    var shellAppDir = grunt.config.get('scout.shellAppDir');

    if (process.platform === 'win32') {
      if (runas == null) {
        runas = require('runas');
      }

      var copyFolder = path.resolve('script', 'copy-folder.cmd');
      if (runas('cmd', ['/c', copyFolder, shellAppDir, installDir], { admin: true }) !== 0) {
        grunt.log.error("Failed to copy " + shellAppDir + " to " + installDir);
      }

      var createShortcut = path.resolve('script', 'create-shortcut.cmd');
      runas('cmd', ['/c', createShortcut, path.join(installDir, 'scout.exe'), 'Scout']);
    } else if (process.platform === 'darwin') {
      rm(installDir);
      mkdir(path.dirname(installDir));

      var tempFolder = temp.path();
      mkdir(tempFolder);
      cp(shellAppDir, tempFolder);
      fs.renameSync(tempFolder, installDir);
    } else {
      var binDir = path.join(installDir, 'bin');
      var shareDir = path.join(installDir, 'share', 'scout');
      var iconName = path.join(shareDir, 'resources', 'app', 'resources', 'scout.png');

      mkdir(binDir);
      //cp('scout.sh', path.join(binDir, 'scout'));
      rm(shareDir);
      mkdir(path.dirname(shareDir));
      cp(shellAppDir, shareDir);

      var tmpDir = process.env.TMPDIR || '/tmp';

      // Create scout.desktop if installation not in temporary folder
      if (installDir.indexOf(tmpDir) !== 0) {
        var desktopFile = path.join('resources', 'linux', 'scout.desktop.in');
        var desktopInstallFile = path.join(installDir, 'share', 'applications', 'scout.desktop');

        var description = grunt.file.readJSON('package.json').description;
        iconName = path.join(shareDir, 'resources', 'app', 'resources', 'scout.png');
        var executable = path.join(shareDir, 'scout');
        var template = _.template(String(fs.readFileSync(desktopFile)));
        var filled = template({
          description: description,
          iconName: iconName,
          executable: executable
        });

        grunt.file.write(desktopInstallFile, filled);
      }

      fs.chmodSync(path.join(shareDir, 'scout'), "755");
    }

  });
};

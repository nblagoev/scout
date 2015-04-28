
module.exports = function (grunt) {

  var fs = require('fs');
  var path = require('path');
  var _ = require('underscore-plus');
  var spawn = require('./task-helpers')(grunt).spawn;

  var fillTemplate = function (filePath, data) {
    var template = _.template(String(fs.readFileSync(filePath + ".in")));
    var filled = template(data);

    var outputPath = path.join(grunt.config.get('scout.buildDir'), path.basename(filePath));
    grunt.file.write(outputPath, filled);
    return outputPath;
  };

  var getInstalledSize = function (buildDir, callback) {
    var cmd = 'du';
    var args = ['-sk', path.join(buildDir, 'Scout')];

    spawn({ cmd: cmd, args: args },
      function (error, _arg) {
        var _ref;
        var stdout = _arg.stdout;
        var installedSize = ((_ref = stdout.split(/\s+/)) != null ? _ref[0] : void 0) || '80000'; // default to 80MB
        callback(null, installedSize);
      });
  };

  grunt.registerTask('mkdeb', 'Create debian package', function () {
    var arch;
    var done = this.async();
    var buildDir = grunt.config.get('scout.buildDir');

    if (process.arch === 'ia32') {
      arch = 'i386';
    } else if (process.arch === 'x64') {
      arch = 'amd64';
    } else {
      done("Unsupported arch " + process.arch);
    }

    var pkg = grunt.config.get('pkg');
    var name = pkg.name;
    var version = pkg.version;
    var description = pkg.description;
    var section = 'devel';
    var maintainer = 'Nikolay Blagoev <nikolay.blagoev@gmail.com>';
    var installDir = '/usr';
    var iconName = 'app';
    var executable = path.join(installDir, 'share', 'scout', 'scout');

    getInstalledSize(buildDir, function (error, installedSize) {
      var data = {
        name: name,
        version: version,
        description: description,
        section: section,
        arch: arch,
        maintainer: maintainer,
        installDir: installDir,
        iconName: iconName,
        installedSize: installedSize,
        executable: executable
      };

      var controlFilePath = fillTemplate(path.join('resources', 'linux', 'debian', 'control'), data);
      var desktopFilePath = fillTemplate(path.join('resources', 'linux', "scout.desktop"), data);
      var icon = path.join('resources', 'app.png');

      var cmd = path.join('script', 'mkdeb');
      var args = [ version, arch, controlFilePath, desktopFilePath, icon, buildDir ];
      spawn({ cmd: cmd, args: args },
        function (error) {
          if (error != null) {
            done(error);
          } else {
            grunt.log.ok("Created " + buildDir + "/scout-" + version + "-" + arch + ".deb");
            done();
          }
        });
    });
  });
};

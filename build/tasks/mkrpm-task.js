
module.exports = function (grunt) {

  var fs = require('fs');
  var path = require('path');
  var _ = require('underscore-plus');
  var helpers = require('./task-helpers')(grunt);

  var spawn = helpers.spawn;
  var rm = helpers.rm;
  var mkdir = helpers.mkdir;

  var fillTemplate = function (filePath, data) {
    var template = _.template(String(fs.readFileSync(filePath + ".in")));
    var filled = template(data);

    var outputPath = path.join(grunt.config.get("scout.buildDir"), path.basename(filePath));
    grunt.file.write(outputPath, filled);
    return outputPath;
  };

  grunt.registerTask('mkrpm', 'Create rpm package', function () {
    var arch;
    var done = this.async();

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
    var buildDir = grunt.config.get("scout.buildDir");

    var rpmDir = path.join(buildDir, 'rpm');
    rm(rpmDir);
    mkdir(rpmDir);

    var installDir = grunt.config.get("scout.installDir");
    var shareDir = path.join(installDir, 'share', 'scout');
    var iconName = path.join(shareDir, 'resources', 'app.png');
    var executable = path.join(shareDir, 'scout');

    var data = {
      name: name,
      version: version,
      description: description,
      installDir: installDir,
      iconName: iconName,
      executable: executable
    };

    var specFilePath = fillTemplate(path.join('resources', 'linux', 'redhat', "scout.spec"), data);
    var desktopFilePath = fillTemplate(path.join('resources', 'linux', "scout.desktop"), data);

    var cmd = path.join('script', 'mkrpm');
    var args = [specFilePath, desktopFilePath, buildDir];
    spawn({ cmd: cmd, args: args },
      function (error) {
        if (error != null) {
          done(error);
        } else {
          grunt.log.ok("Created rpm package in " + rpmDir);
          done();
        }
      });
  });
};

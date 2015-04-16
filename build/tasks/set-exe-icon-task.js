
module.exports = function (grunt) {
  var path = require('path');

  grunt.registerTask('set-exe-icon', 'Set icon of the exe', function () {
    var done = this.async();

    var shellAppDir = grunt.config.get("scout.shellAppDir");
    var shellExePath = path.join(shellAppDir, 'scout.exe');
    var iconPath = path.resolve('resources', 'win', 'app.ico');

    var rcedit = require('rcedit');
    rcedit(shellExePath, { 'icon': iconPath }, done);
  });
};

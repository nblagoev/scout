
module.exports = function (grunt) {
  var path = require('path');
  var cp = require('./task-helpers')(grunt).cp;

  grunt.registerTask('copy-info-plist', 'Copy plist', function () {
    var contentsDir = grunt.config.get('scout.contentsDir');
    var plistPath = path.join(contentsDir, 'Info.plist');
    var helperPlistPath = path.join(contentsDir, 'Frameworks/Scout Helper.app/Contents/Info.plist');

    // Copy custom plist files
    cp('resources/mac/app-Info.plist', plistPath);
    cp('resources/mac/helper-Info.plist', helperPlistPath);
  });
};

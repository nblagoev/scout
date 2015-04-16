
module.exports = function (grunt) {
  var path = require('path');

  grunt.registerTask('output-long-paths', 'Log long paths in the built application', function () {
    var shellAppDir = grunt.config.get("scout.shellAppDir");
    var longPaths = [];

    grunt.file.recurse(shellAppDir, function (absolutePath, rootPath, relativePath, fileName) {
      var fullPath = (relativePath != null) ? path.join(relativePath, fileName) : fileName;

      if (fullPath.length >= 200) {
        longPaths.push(fullPath);
      }
    });

    longPaths.sort(function (longPath1, longPath2) {
      return longPath2.length - longPath1.length;
    });

    longPaths.forEach(function (longPath) {
      grunt.log.error(longPath.length + " character path: " + longPath);
    });
  });
};

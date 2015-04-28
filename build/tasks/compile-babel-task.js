
module.exports = function (grunt) {
  var path = require('path');
  var fs = require('fs');
  var compileFile = require('../../src/babel').compileFile;
  var _ = require('underscore-plus');
  var cp = require('./task-helpers')(grunt).cp;

  grunt.registerTask('compile-babel', 'Compile ES6 JS to ES5', function () {
    var babelConfig = grunt.config.get('compile-babel');
    var src = babelConfig.src;
    var dest = babelConfig.dest;

    var allFiles = _.map(grunt.file.expand(src),
      function (x) {
        return path.resolve(x);
      });

    var srcRoot = path.resolve('.');

    for (var i = 0, len = allFiles.length; i < len; i++) {
      var file = allFiles[i];
      var js = compileFile(file);
      fs.writeFileSync(file.replace(srcRoot, dest), js);
    }
  });
}

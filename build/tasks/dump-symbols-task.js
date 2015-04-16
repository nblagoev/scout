
module.exports = function (grunt) {

  var async = require('async');
  var fs = require('fs-plus');
  var path = require('path');
  var minidump = require('minidump');
  var helpers = require('./task-helpers')(grunt)

  var mkdir = helpers.mkdir;
  var rm = helpers.rm;
  var dumpSymbolTo = function (binaryPath, targetDirectory, callback) {
    minidump.dumpSymbol(binaryPath, function (error, content) {
      if (error != null) {
        return callback(error);
      }

      var moduleLine = /MODULE [^ ]+ [^ ]+ ([0-9A-F]+) (.*)\n/.exec(content);

      if (moduleLine.length !== 3) {
        return callback("Invalid output when dumping symbol for " + binaryPath);
      }

      var filename = moduleLine[2];
      var targetPathDirname = path.join(targetDirectory, filename, moduleLine[1]);
      mkdir(targetPathDirname);
      var targetPath = path.join(targetPathDirname, filename + ".sym");
      fs.writeFile(targetPath, content, callback);
    });
  };

  grunt.registerTask('dump-symbols', 'Dump symbols for native modules', function () {
    var done = this.async();
    var symbolsDir = grunt.config.get('scout.symbolsDir');
    rm(symbolsDir);
    mkdir(symbolsDir);
    var tasks = [];
    var onFile = function (binaryPath) {
      if (/.*\.node$/.test(binaryPath)) {
        tasks.push(dumpSymbolTo.bind(this, binaryPath, symbolsDir));
      }
    };

    var onDirectory = function () {
      return true;
    };

    fs.traverseTreeSync('node_modules', onFile, onDirectory);
    async.parallel(tasks, done);
  });

};

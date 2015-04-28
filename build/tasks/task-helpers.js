
module.exports = function (grunt) {
  
  var fs = require('fs-plus');
  var path = require('path');
  var _ = require('underscore-plus');
  var __slice = [].slice;

  return {

    cp: function (source, destination, _arg) {
      var filter = (_arg != null ? _arg : {}).filter;

      if (!grunt.file.exists(source)) {
        grunt.fatal("Cannot copy non-existent " + source.cyan + " to " + destination.cyan);
      }

      var copyFile = function (sourcePath, destinationPath) {
        if ((typeof filter === "function" ? filter(sourcePath) : void 0) ||
            (filter != null ? typeof filter.test === "function" ? filter.test(sourcePath) : void 0 : void 0)) {
          return;
        }

        var stats = fs.lstatSync(sourcePath);

        if (stats.isSymbolicLink()) {
          grunt.file.mkdir(path.dirname(destinationPath));
          fs.symlinkSync(fs.readlinkSync(sourcePath), destinationPath);
        } else if (stats.isFile()) {
          grunt.file.copy(sourcePath, destinationPath);
        }

        if (grunt.file.exists(destinationPath)) {
          return fs.chmodSync(destinationPath, fs.statSync(sourcePath).mode);
        }
      };

      if (grunt.file.isFile(source)) {
        copyFile(source, destination);
      } else {
        try {
          var onFile = function (sourcePath) {
            var destinationPath = path.join(destination, path.relative(source, sourcePath));
            return copyFile(sourcePath, destinationPath);
          };

          var onDirectory = function (sourcePath) {
            if (fs.isSymbolicLinkSync(sourcePath)) {
              var destinationPath = path.join(destination, path.relative(source, sourcePath));
              copyFile(sourcePath, destinationPath);
              return false;
            } else {
              return true;
            }
          };

          fs.traverseTreeSync(source, onFile, onDirectory);
        } catch (error) {
          grunt.fatal(error);
        }
      }

      grunt.verbose.writeln("Copied " + source.cyan + " to " + destination.cyan + ".");
    },

    mkdir: function () {
      var args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return grunt.file.mkdir.apply(grunt.file, args);
    },

    rm: function () {
      var args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];

      if (grunt.file.exists.apply(grunt.file, args)) {
        grunt.file["delete"].apply(grunt.file, __slice.call(args).concat([{ force: true }]));
      }
    },

    renderTemplate: function (source, target, dict) {
      var contents = fs.readFileSync(source, { encoding: 'utf8' });
      var compiled = _.template(contents);

      return fs.writeFileSync(target, compiled(dict));
    },

    spawn: function (options, callback) {
      var childProcess = require('child_process');
      var stdout = [];
      var stderr = [];
      var error = null;
      var proc = childProcess.spawn(options.cmd, options.args, options.opts);

      proc.stdout.on('data', function (data) {
        stdout.push(data.toString());
      });

      proc.stderr.on('data', function (data) {
        stderr.push(data.toString());
      });

      proc.on('error', function (processError) {
        return error != null ? error : error = processError;
      });

      proc.on('close', function (exitCode, signal) {
        if (exitCode !== 0) {
          if (error == null) {
            error = new Error(signal);
          }
        }

        var results = {
          stderr: stderr.join(''),
          stdout: stdout.join(''),
          code: exitCode
        };

        if (exitCode !== 0) {
          grunt.log.error(results.stderr);
        }

        callback(error, results, exitCode);
      });
    }

  };
};

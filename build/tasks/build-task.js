
module.exports = function (grunt) {

  var fs = require('fs');
  var path = require('path');
  var _ = require('underscore-plus');

  var helpers = require('./task-helpers')(grunt);
  var cp = helpers.cp;
  var mkdir = helpers.mkdir;
  var rm = helpers.rm;

  grunt.registerTask('build', 'Build the application', function () {

    var shellAppDir = grunt.config.get("scout.shellAppDir");
    var buildDir = grunt.config.get("scout.buildDir");
    var appDir = grunt.config.get("scout.appDir");

    rm(shellAppDir);
    rm(path.join(buildDir, 'installer'));
    mkdir(path.dirname(buildDir));

    switch (process.platform) {
      case 'darwin':
        cp("atom-shell/Scout.app", shellAppDir, { filter: /default_app/ });
        break;

      case 'linux':
      case 'win32':
        cp('atom-shell', shellAppDir, { filter: /default_app/ });
        break;
    }

    cp('package.json', path.join(appDir, 'package.json'));

    var nonPackageDirectories = [
      'dot-scout',
      'vendor',
      'resources'
    ];

    var devDependencies = grunt.file.readJSON('package.json').devDependencies;

    var nodeModules = fs.readdirSync('node_modules');
    for (var i = 0, len = nodeModules.length; i < len; i++) {
      var child = nodeModules[i];
      var directory = path.join('node_modules', child);
      nonPackageDirectories.push(directory);
    }

    // Put any paths here that shouldn't end up in the built Scout.app
    // so that it doesn't becomes larger than it needs to be.
    var ignoredPaths = [
      path.join('apm'),
      path.join('less', 'dist'),
      path.join('npm', 'doc'),
      path.join('npm', 'html'),
      path.join('npm', 'man'),
      path.join('npm', 'node_modules', '.bin', 'beep'),
      path.join('npm', 'node_modules', '.bin', 'clear'),
      path.join('npm', 'node_modules', '.bin', 'starwars'),
      path.join('node_modules', 'nan'),
      path.join('build', 'binding.Makefile'),
      path.join('build', 'config.gypi'),
      path.join('build', 'gyp-mac-tool'),
      path.join('build', 'Makefile'),
      path.join('build', 'Release', 'obj.target'),
      path.join('build', 'Release', 'obj'),
      path.join('build', 'Release', '.deps'),
      path.join('vendor', 'apm'),
      path.join('resources', 'mac'),
      path.join('resources', 'win'),

      '.DS_Store',
      '.jshintrc',
      '.npmignore',
      '.pairs',
      '.travis.yml'
    ];

    ignoredPaths = ignoredPaths.map(
      function (ignoredPath) {
        return _.escapeRegExp(ignoredPath);
      });

    // Add .* to avoid matching hunspell_dictionaries.
    ignoredPaths.push(_.escapeRegExp(path.join('spellchecker', 'vendor', 'hunspell') + path.sep) + ".*");
    ignoredPaths.push(_.escapeRegExp(path.join('build', 'Release') + path.sep) + ".*\\.pdb");

    // Ignore *.cc and *.h files from native modules
    ignoredPaths.push(_.escapeRegExp(path.join('keytar', 'src') + path.sep) + ".*\\.(cc|h)*");
    ignoredPaths.push(_.escapeRegExp(path.join('nslog', 'src') + path.sep) + ".*\\.(cc|h)*");
    ignoredPaths.push(_.escapeRegExp(path.join('runas', 'src') + path.sep) + ".*\\.(cc|h)*");
    ignoredPaths.push(_.escapeRegExp(path.join('scrollbar-style', 'src') + path.sep) + ".*\\.(cc|h)*");
    ignoredPaths.push(_.escapeRegExp(path.join('spellchecker', 'src') + path.sep) + ".*\\.(cc|h)*");

    // Ignore build files
    ignoredPaths.push(_.escapeRegExp(path.sep) + "binding\\.gyp$");
    ignoredPaths.push(_.escapeRegExp(path.sep) + ".+\\.target.mk$");
    ignoredPaths.push(_.escapeRegExp(path.sep) + "linker\\.lock$");
    ignoredPaths.push(_.escapeRegExp(path.join('build', 'Release') + path.sep) + ".+\\.node\\.dSYM");

    // Hunspell dictionaries are only not needed on OS X.
    if (process.platform === 'darwin') {
      ignoredPaths.push(path.join('spellchecker', 'vendor', 'hunspell_dictionaries'));
    }

    ignoredPaths = ignoredPaths.map(
      function (ignoredPath) {
        return "(" + ignoredPath + ")";
      });

    var testFolderPattern = new RegExp(_.escapeRegExp(path.sep) + "te?sts?" + _.escapeRegExp(path.sep));
    var exampleFolderPattern = new RegExp(_.escapeRegExp(path.sep) + "examples?" + _.escapeRegExp(path.sep));
    var benchmarkFolderPattern = new RegExp(_.escapeRegExp(path.sep) + "benchmarks?" + _.escapeRegExp(path.sep));

    var nodeModulesFilter = new RegExp(ignoredPaths.join('|'));
    var filterNodeModule = function (pathToCopy) {
      if (benchmarkFolderPattern.test(pathToCopy)) {
        return true;
      }

      pathToCopy = path.resolve(pathToCopy);
      return nodeModulesFilter.test(pathToCopy) || testFolderPattern.test(pathToCopy) || exampleFolderPattern.test(pathToCopy);
    };

    for (var j = 0, len = nonPackageDirectories.length; j < len; j++) {
      var directory = nonPackageDirectories[j];
      cp(directory, path.join(appDir, directory), { filter: filterNodeModule });
    }

    cp('menus', path.join(appDir, 'menus'));
    cp('spec', path.join(appDir, 'spec'));
    cp('src', path.join(appDir, 'src'));
    cp('static', path.join(appDir, 'static'));
    cp('apm', path.join(appDir, 'apm'), { filter: filterNodeModule });

    if (process.platform === 'darwin') {
      grunt.file.recurse(path.join('resources', 'mac'),
        function (sourcePath, rootDirectory, subDirectory, filename) {
          if (subDirectory == null) {
            subDirectory = '';
          }

          if (!/.+\.plist/.test(sourcePath)) {
            return grunt.file.copy(sourcePath, path.resolve(appDir, '..', subDirectory, filename));
          }
        });
    }

    var dependencies = [ 'compile', 'generate-license:save' ];

    if (process.platform === 'darwin') {
      dependencies.push('copy-info-plist');
    }

    if (process.platform === 'win32') {
      dependencies.push('set-exe-icon');
    }

    grunt.task.run.apply(grunt.task, dependencies);
  });
};

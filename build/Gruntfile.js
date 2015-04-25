
module.exports = function (grunt) {

  var fs = require('fs');
  var path = require('path');
  var os = require('os');
  var _ = require('underscore-plus');
  var packageJson = require('../package.json');

  // Add support for obsolete APIs of vm module so we can make some third-party
  // modules work under node v0.11.x.
  require('vm-compatibility-layer');

  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-lesslint');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-csslint');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-build-atom-shell');
  grunt.loadNpmTasks('grunt-atom-shell-installer');
  grunt.loadNpmTasks('grunt-peg');
  grunt.loadTasks('tasks');

  // This allows all subsequent paths to be relative to the root of the repo
  grunt.file.setBase(path.resolve('..'));

  var _version = packageJson.version.split('.');
  var major = _version[0],
      minor = _version[1],
      patch = _version[2];
  var tmpDir = os.tmpdir();

  var appName = process.platform === 'darwin' ? "Scout.app" : "Scout";

  var buildDir = grunt.option('build-dir') || path.join(tmpDir, "scout-build");
  buildDir = path.resolve(buildDir);
  var installDir = grunt.option('install-dir');

  var home = process.env.HOME || process.env.USERPROFILE;
  var atomShellDownloadDir = path.join(home, '.atom-shell');

  var symbolsDir = path.join(buildDir, "Scout.breakpad.syms");
  var shellAppDir = path.join(buildDir, appName);

  var contentsDir, appDir;
  var killCommand;

  if (process.platform === 'win32') {
    contentsDir = shellAppDir;
    appDir = path.join(shellAppDir, 'resources', 'app');
    installDir = installDir || path.join(process.env.ProgramFiles, appName);
    killCommand = "taskkill /F /IM scout.exe";
  } else if (process.platform === 'darwin') {
    contentsDir = path.join(shellAppDir, 'Contents');
    appDir = path.join(contentsDir, 'Resources', 'app');
    installDir = installDir || path.join('/Applications', appName);
    killCommand = "pkill -9 scout";
  } else {
    contentsDir = shellAppDir;
    appDir = path.join(shellAppDir, 'resources', 'app');
    installDir = installDir || (process.env.INSTALL_PREFIX || '/usr/local');
    killCommand = "pkill -9 scout";
  }

  installDir = path.resolve(installDir);

  var opts = {
    name: 'scout',
    pkg: grunt.file.readJSON('package.json'),

    'compile-babel': {
      src: [ 'src/**/*.js', 'static/**/*.js' ],
      dest: appDir
    },

    less: {
      options: {
        paths: ['static/styles', 'vendor/components/font-awesome']
      },

      glob_to_multiple: {
        expand: true,
        src: ['static/**/*.less', 'vendor/components/**/*.less'],
        dest: appDir,
        ext: '.css'
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },

      src: ['src/**/*.js'],
      build: ['build/tasks/**/*.js', 'build/Gruntfile.js'],
      test: ['spec/*.js']
    },

    csslint: {
      options: {
        'adjoining-classes': false,
        'duplicate-background-images': false,
        'box-model': false,
        'box-sizing': false,
        'bulletproof-font-face': false,
        'compatible-vendor-prefixes': false,
        'display-property-grouping': false,
        'fallback-colors': false,
        'font-sizes': false,
        'gradients': false,
        'ids': false,
        'important': false,
        'known-properties': false,
        'outline-none': false,
        'overqualified-elements': false,
        'qualified-headings': false,
        'unique-headings': false,
        'universal-selector': false,
        'vendor-prefix': false
      },
      src: ['static/**/*.css']
    },

    lesslint: {
      src: ['static/**/*.less']
    },

    'build-atom-shell': {
      tag: "v0.22.2",
      nodeVersion: '0.22.0',
      remoteUrl: "https://github.com/atom/atom-shell",
      buildDir: buildDir,
      rebuildPackages: true,
      projectName: 'scout',
      productName: 'Scout'
    },

    'create-windows-installer': {
      appDirectory: shellAppDir,
      outputDirectory: path.join(buildDir, 'installer'),
      authors: packageJson.author,
      iconUrl: packageJson.iconUrl || 'https://raw.githubusercontent.com/atom/atom/master/resources/atom.png'
    },

    bower: {
      install: {
        options: {
          targetDir: 'static/components'
        }
      }
    },

    shell: {
      'kill-app': {
        command: killCommand,
        options: {
          stdout: false,
          stderr: false,
          failOnError: false
        }
      }
    }

  };

  opts['scout'] = {
    appDir: appDir,
    appName: appName,
    symbolsDir: symbolsDir,
    buildDir: buildDir,
    contentsDir: contentsDir,
    installDir: installDir,
    shellAppDir: shellAppDir
  };

  grunt.initConfig(opts);

  grunt.registerTask('compile', ['compile-babel']);
  grunt.registerTask('lint', ['csslint', 'lesslint', 'jshint']);
  grunt.registerTask('test', ['shell:kill-app', 'run-specs']);

  var ciTasks = ['build-atom-shell', 'bower:install', 'build', 'generate-license'];

  if (process.platform !== 'win32') {
    ciTasks.push('dump-symbols');
  }

  ciTasks.push('set-version', 'check-licenses', 'lint', 'generate-asar');

  if (process.platform === 'linux') {
    ciTasks.push('mkdeb');
  }

  //if (process.platform === 'win32') {
  //  ciTasks.push('create-windows-installer');
  //}

  if (process.platform === 'darwin') {
    ciTasks.push('test');
  }

  ciTasks.push('codesign');
  grunt.registerTask('ci', ciTasks);

  var defaultTasks = ['build-atom-shell', 'bower:install', 'build', 'set-version', 'generate-asar', 'install'];

  return grunt.registerTask('default', defaultTasks);
};

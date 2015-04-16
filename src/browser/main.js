"use babel";

global.shellStartTime = Date.now();

// var crashReporter = require('crash-reporter');
var app = require('app');
var url = require('url');
var path = require('path');
var fs = require('fs-plus');
var {spawn} = require('child_process');

var BrowserWindow = require('browser-window');
var Application = require('./application');

// NB: Hack around broken native modules atm
var nslog = console.log;

process.on('uncaughtException', (error) => {
  if (error == null) {
    error = {};
  }

  if (error.message != null) {
    nslog(error.message);
  }

  if (error.stack != null) {
    nslog(error.stack);
  }
});

function parseCommandLine() {
  let version = app.getVersion();

  let yargs = require('yargs')
    .usage("Scout v" + version + "\nUsage: scout [options]")
    .alias('d', 'dev').boolean('d').describe('d', 'Run in development mode.')
    .alias('h', 'help').boolean('h').describe('h', 'Print this usage message.')
    .alias('l', 'log-file').string('l').describe('l', 'Log all output to file.')
    .alias('r', 'resource-path').string('r').describe('r', 'Set the path to the Scout source directory and enable dev-mode.')
    .alias('s', 'spec-directory').string('s').describe('s', 'Set the directory from which to run package specs (default: Scout\'s spec directory).')
    .alias('t', 'test').boolean('t').describe('t', 'Run the specified specs and exit with error code on failures.')
    .alias('v', 'version').boolean('v').describe('v', 'Print the version.')

  let args = yargs.parse(process.argv.slice(1));

  process.stdout.write(JSON.stringify(args) + "\n");

  let help;
  if (args.help) {
    help = "";
    yargs.showHelp((s) => help += s);
    process.stdout.write(help + "\n");
    process.exit(0);
  }

  if (args.version) {
    process.stdout.write(version + "\n");
    process.exit(0);
  }

  let devMode = args['dev'];
  let test = args['test'];
  let exitWhenDone = test;
  let specDirectory = args['spec-directory'] || 'spec/';
  let logFile = args['log-file'];
  let resourcePath;

  if (args['resource-path']) {
    devMode = true;
    resourcePath = args['resource-path'];
  } else {
    // Set resourcePath based on the specDirectory if running specs on atom core
    if (specDirectory != null) {
      let packageDirectoryPath = path.join(specDirectory, '..');
      let packageManifestPath = path.join(packageDirectoryPath, 'package.json');

      if (fs.statSyncNoException(packageManifestPath)) {
        try {
          let packageManifest = JSON.parse(fs.readFileSync(packageManifestPath));
          if (packageManifest.name === 'scout') {
            resourcePath = packageDirectoryPath;
          }
        } catch (_error) {}
      }
    }

    if (devMode && resourcePath == null) {
      resourcePath = global.devResourcePath;
    }
  }

  if (!fs.statSyncNoException(resourcePath)) {
    resourcePath = path.dirname(path.dirname(__dirname));
    resourcePath = path.join(process.resourcesPath, 'app.asar');
  }

  resourcePath = path.resolve(resourcePath);
  return {resourcePath, devMode, test, exitWhenDone, specDirectory, logFile};
}

function setupCrashReporter() {
  crashReporter.start({ productName: 'Scout', companyName: 'Nikolay Blagoev' });
}

function start() {
  // Enable ES6 in the Renderer process
  app.commandLine.appendSwitch('js-flags', '--harmony');

  let args = parseCommandLine();

  if (args.devMode) {
    app.commandLine.appendSwitch('remote-debugging-port', '8315');
  }

  //app.on('will-finish-launching', () => setupCrashReporter());

  // Note: It's important that you don't do anything with Atom Shell
  // unless it's after 'ready', or else mysterious bad things will happen
  // to you.
  app.on('ready', () => {
    require('../babel').register();

    if (args.devMode) {
      Application = require(path.join(args.resourcePath, 'src', 'browser', 'application'));
    } else {
      Application = require('./application');
    }

    global.application = new Application(args);

    if (!args.test) {
      console.log("App load time: " + (Date.now() - global.shellStartTime) + "ms");
    }
  });
}

start();

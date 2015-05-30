"use babel";

global.shellStartTime = Date.now();

// import crashReporter from 'crash-reporter';
import app from 'app';
import url from 'url';
import path from 'path';
import fs from 'fs-plus';
import {spawn} from 'child_process';

import BrowserWindow from 'browser-window';

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
  let logFile = args['log-file'];
  let resourcePath;

  if (args['resource-path']) {
    devMode = true;
    resourcePath = args['resource-path'];
  }

  if (devMode && resourcePath == null) {
    resourcePath = global.devResourcePath;
  }

  if (!fs.statSyncNoException(resourcePath)) {
    resourcePath = path.join(process.resourcesPath, 'app.asar');
  }

  resourcePath = path.resolve(resourcePath);

  return {resourcePath, devMode, test, exitWhenDone, logFile};
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

  // Note: It's important that you don't do anything with Electron
  // unless it's after 'ready', or else mysterious bad things will happen
  // to you.
  app.on('ready', () => {
    require('../babel').register();

    let Application = args.devMode
                      ? require(path.join(args.resourcePath, 'src', 'browser', 'application'))
                      : require('./application');

    global.application = new Application(args);

    if (!args.test) {
      console.log("App load time: " + (Date.now() - global.shellStartTime) + "ms");
    }
  });
}

start();

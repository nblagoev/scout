"use babel";

var Menu = require('menu');
var BrowserWindow = require('browser-window');
var app = require('app');
var fs = require('fs-plus');
var ipc = require('ipc');
var path = require('path');
var os = require('os');
var net = require('net');
var url = require('url');
var {Emitter} = require('event-kit');
var {spawn} = require('child_process');
var AppMenu = require('./appmenu');
var AppWindow = require('./appwindow');

class Application extends Emitter {
  constructor(options) {
    super();
    this.resourcePath = options.resourcePath;
    this.devMode = options.devMode;

    this.pkgJson = require('../../package.json');
    this.windows = [];

    this.handleEvents();

    this.openWithOptions(options);
  }

  /*
   * Registers basic application commands, non-idempotent.
   */
  handleEvents() {
    this.on('application:quit', () => {
      app.quit();
    });

    app.on('window-all-closed', () => {
      if (process.platform === 'win32' || process.platform === 'linux') {
        app.quit();
      }
    });

    ipc.on('call-window-method', (event, method, ...args) => {
      let win = BrowserWindow.fromWebContents(event.sender);
      win[method](...args);
    });
  }

  /**
   * Opens a new window based on the options provided.
   *
   * @param {object} options -
   *   :resourcePath - The path to include specs from.
   *   :devMode - Boolean to determine if the application is running in dev mode.
   *   :test - Boolean to determine if the application is running in test mode.
   *   :exitWhenDone - Boolean to determine whether to automatically exit.
   *   :logfile - The file path to log output to.
   */
  openWithOptions(options) {
    let {test} = options;
    let newWindow = test ? this.openSpecsWindow(options) : this.openWindow(options);

    //newWindow.show();
    this.windows.push(newWindow);
    newWindow.on('closed', () => {
      this.removeAppWindow(newWindow);
    });
  }

  /**
   * Opens up a new {AppWindow} to run specs within.
   *
   * @param {object} options -
   *   :resourcePath - The path to include specs from.
   *   :devMode - Boolean to determine if the application is running in dev mode.
   *   :test - Boolean to determine if the application is running in test mode.
   *   :exitWhenDone - Boolean to determine whether to automatically exit.
   *   :logFile - The file path to log output to.
   */
  openSpecsWindow(options) {
    let {resourcePath, test, exitWhenDone, logFile} = options;

    if (resourcePath !== this.resourcePath && !fs.existsSync(resourcePath)) {
      resourcePath = this.resourcePath;
    }

    let bootstrapScript;

    try {
      bootstrapScript = require.resolve(path.resolve(resourcePath, 'spec', 'spec-bootstrap'));
    } catch (error) {
      bootstrapScript = require.resolve(path.resolve(__dirname, '..', '..', 'spec', 'spec-bootstrap'));
    }

    let isSpec = true;
    let devMode = true;
    let title = "Spec Suite - Scout";

    return new AppWindow({bootstrapScript, exitWhenDone, resourcePath, isSpec, devMode, logFile, title});
  }

  /**
   * Opens up a new {AtomWindow} and runs the application.
   *
   * @param {object} options -
   *   :resourcePath - The path to include specs from.
   *   :devMode - Boolean to determine if the application is running in dev mode.
   *   :test - Boolean to determine if the application is running in test mode.
   *   :exitWhenDone - Boolean to determine whether to automatically exit.
   *   :logFile - The file path to log output to.
   */
  openWindow(options) {
    let {resourcePath, devMode, test, exitWhenDone, logFile} = options;
    if (resourcePath !== this.resourcePath && !fs.existsSync(resourcePath)) {
      resourcePath = this.resourcePath;
    }

    let bootstrapScript;

    try {
      bootstrapScript = require.resolve(path.resolve(resourcePath, 'src', 'renderer', 'window-bootstrap'));
    } catch (error) {
      bootstrapScript = require.resolve(path.resolve(__dirname, '..', '..', 'src', 'renderer', 'window-bootstrap'));
    }

    let appWindow = new AppWindow({bootstrapScript, resourcePath, devMode, exitWhenDone});
    this.menu = new AppMenu({ pkg: this.pkgJson });
    this.menu.attachToWindow(appWindow);

    this.menu.on('application:quit', () => {
      app.quit();
    });

    this.menu.on('window:reload', () => {
      BrowserWindow.getFocusedWindow().reload();
    });

    this.menu.on('window:toggle-full-screen', () => {
      let focusedWindow = BrowserWindow.getFocusedWindow();
      let fullScreen = !focusedWindow.isFullScreen();
      focusedWindow.setFullScreen(fullScreen);
    });

    this.menu.on('window:toggle-dev-tools', () => {
      BrowserWindow.getFocusedWindow().toggleDevTools();
    });

    this.menu.on('application:run-specs', () => {
      let test = true;
      this.openWithOptions({ resourcePath, devMode, test, exitWhenDone, logFile });
    });

    this.menu.on('application:new-window', () => {
      this.openWithOptions({ resourcePath, devMode, exitWhenDone, logFile });
    });

    return appWindow;
  }

  /**
   * Removes the given window from the list of windows, so it can be GC'd.
   *
   * @param {AppWindow} appWindow - The {AppWindow} to be removed.
   */
  removeAppWindow(appWindow) {
    for (let i = 0, len = this.windows.length; i < len; i++) {
      if (this.windows[i] === appWindow) {
        this.windows.splice(i, 1);
      }
    }
  }
}

module.exports = Application;

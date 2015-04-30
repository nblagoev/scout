"use babel";

var ipc = require('ipc');
var os = require('os');
var path = require('path');
var remote = require('remote');
var _ = require('underscore-plus');
var {Emitter} = require('event-kit');

/*
 * An instance of this class is always available as the `scout` global.
 */
class Scout {
  static getCurrentWindow() {
    return remote.getCurrentWindow();
  }

  /*
   * Returns the load settings hash associated with the current window.
   */
  static getLoadSettings() {
    let loadSettings = JSON.parse(decodeURIComponent(location.hash.substr(1)));
    let cloned = _.deepClone(loadSettings);
    return cloned;
  }

  /*
   * Get the directory path to Scout's configuration area.
   *
   * Returns the absolute path to ~/.scout
   */
  static getConfigDirPath() {
    return process.env.SCOUT_HOME;
  }

  /*
   * Get the path to Scout's storage directory.
   *
   * Returns the absolute path to ~/.scout/storage
   */
  static getStorageDirPath() {
    return path.join(this.constructor.getConfigDirPath(), 'storage');
  }

  constructor() {
    this.emitter = new Emitter();
    this.lastUncaughtError = null;
    this.loadTime = -1;
  }

  initialize() {
    window.onerror = () => {
      this.lastUncaughtError = [].slice.call(arguments);
      let [message, url, line, column, originalError] = this.lastUncaughtError;
      let eventObject = {message, url, line, column, originalError};

      let openDevTools = true
      eventObject.preventDefault = () => openDevTools = false;

      this.emitter.emit('will-throw-error', eventObject);

      if (openDevTools) {
        this.openDevTools();
        this.executeJavaScriptInDevTools('DevToolsAPI.showConsole()');
      }

      this.emitter.emit('did-throw-error', {message, url, line, column, originalError});
      console.error(originalError);

      return true;
    };

    let StyleManager = require('./managers/style-manager');
    this.styles = new StyleManager(this.loadSettings.resourcePath);
    this.styles.loadBaseStylesheets();

    require('angular');
    angular.module('scout', ['content-resizer', 'ng-enter']);
    require('./components/ng-enter.directive');
    require('./components/content-resizer.directive');
    require('./components/panel-components.directive');
    require('./components/response-status.directive');
    require('./components/response-time.directive');
    require('./services/status-bar.service');
    require('./services/http.service');
    require('./layout/header.controller');
    require('./layout/status-bar.controller');
    require('./layout/request-panel.controller');
    require('./layout/management-panel.controller');
    require('./layout/response-panel.controller');
  }

  get loadSettings() {
    return this.constructor.getLoadSettings();
  }

  /*
   * Get the current window
   */
  get currentWindow() {
    return this.constructor.getCurrentWindow();
  }

  get version() {
    return this.loadSettings.appVersion;
  }

  get inDevMode() {
    return this.loadSettings.devMode;
  }

  get isSpec() {
    return this.loadSettings.isSpec;
  }

  get configDirPath() {
    return this.constructor.getConfigDirPath();
  }

  /*
   * Determine whether the current version is an official release.
   */
  isReleasedVersion() {
    // Check if the version has a 7-character SHA suffix
    return !/\w{7}/.test(this.version);
  }

  /*
   * Open a new window using the given options.
   *
   * `options` An {Object} with the following keys:
   *   * `newWindow` A {Boolean}, true to always open a new window instead of
   *     reusing existing windows depending on the paths to open.
   *   * `devMode` A {Boolean}, true to open the window in development mode.
   *     Development mode loads the Scout source from the locally cloned
   *     repository
   */
  open(options) {
    ipc.send('open', options);
  }

   /*
    * Close the current window.
    */
  close() {
    this.currentWindow.close();
  }

  /*
   * Get the size of current window.
   *
   * Returns an {Object} in the format `{width: 1000, height: 700}`
   */
  getSize() {
    let [width, height] = this.currentWindow.getSize();
    return {width, height};
  }

  /*
   * Set the size of current window.
   *
   * `width` The {Number} of pixels.
   * `height` The {Number} of pixels.
   */
  setSize(width, height) {
    this.currentWindow.setSize(width, height);
  }

  /*
   * Get the position of current window.
   *
   * Returns an {Object} in the format `{x: 10, y: 20}`
   */
  getPosition() {
    let [x, y] = this.currentWindow.getPosition();
    return {x, y};
  }

  /*
   * Set the position of current window.
   *
   * `x` The {Number} of pixels.
   * `y` The {Number} of pixels.
   */
  setPosition(x, y) {
    ipc.send('call-window-method', 'setPosition', x, y);
  }

  /*
   * Move current window to the center of the screen.
   */
  center() {
    ipc.send('call-window-method', 'center');
  }

  /*
   * Focus the current window.
   */
  focus() {
    ipc.send('call-window-method', 'focus');
    $(window).focus();
  }

  /*
   * Show the current window.
   */
  show() {
    ipc.send('call-window-method', 'show');
  }

  /*
   * Hide the current window.
   */
  hide() {
    ipc.send('call-window-method', 'hide');
  }

  /*
   *  Reload the current window.
   */
  reload() {
    ipc.send('call-window-method', 'restart');
  }

  /*
   * Returns a {Boolean} true when the current window is maximized.
   */
  isMaximixed() {
    return this.currentWindow.isMaximized();
  }

  /*
   * Maximizes the current window.
   */
  maximize() {
    ipc.send('call-window-method', 'maximize');
  }

  /*
   * A flexible way to open a dialog akin to an alert dialog.
   *
   * ## Examples
   *
   * ```javascript
   * scout.confirm({
   *   'message': 'How you feeling?',
   *   'detailedMessage': 'Be honest.',
   *   'buttons': {
   *     'Good': () => window.alert('good to hear');
   *     'Bad': () => window.alert('bummer');
   *   }
   * });
   * ```
   *
   * `options` An {Object} with the following keys:
   *   * `message` The {String} message to display.
   *   * `detailedMessage` (optional) The {String} detailed message to display.
   *   * `buttons` (optional) Either an array of strings or an object where keys are
   *     button names and the values are callbacks to invoke when clicked.
   *
   * Returns the chosen button index {Number} if the buttons option was an array.
   */
  confirm({message, detailedMessage, buttons} = {}) {
    buttons = buttons || {};

    let buttonLabels;
    if (_.isArray(buttons)) {
      buttonLabels = buttons;
    } else {
      buttonLabels = Object.keys(buttons);
    }

    let dialog = remote.require('dialog');
    let chosen = dialog.showMessageBox(this.currentWindow, {
      type: 'info',
      message: message,
      detail: detailedMessage,
      buttons: buttonLabels
    });

    if (_.isArray(buttons)) {
      return chosen;
    } else {
      let callback = buttons[buttonLabels[chosen]];
      return typeof callback === "function" ? callback() : void 0;
    }
  }

  openDevTools() {
    ipc.send('call-window-method', 'openDevTools');
  }

  toggleDevTools() {
    ipc.send('call-window-method', 'toggleDevTools');
  }

  executeJavaScriptInDevTools(code) {
    ipc.send('call-window-method', 'executeJavaScriptInDevTools', code);
  }

  /*
   * Invoke the given callback when there is an unhandled error, but
   * before the devtools pop open
   *
   * * `callback` {Function} to be called whenever there is an unhandled error
   *   * `event` {Object}
   *     * `originalError` {Object} the original error object
   *     * `message` {String} the original error object
   *     * `url` {String} Url to the file where the error originated.
   *     * `line` {Number}
   *     * `column` {Number}
   *     * `preventDefault` {Function} call this to avoid popping up the dev tools.
   *
   * Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
   */
  onWillThrowError(callback) {
    return this.emitter.on('will-throw-error', callback);
  }

  /*
   * Invoke the given callback whenever there is an unhandled error.
   *
   * * `callback` {Function} to be called whenever there is an unhandled error
   *   * `event` {Object}
   *     * `originalError` {Object} the original error object
   *     * `message` {String} the original error object
   *     * `url` {String} Url to the file where the error originated.
   *     * `line` {Number}
   *     * `column` {Number}
   *
   * Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
   */
  onDidThrowError(callback) {
    return this.emitter.on('did-throw-error', callback);
  }

  exit(status) {
    var app = remote.require('app');
    app.emit('will-exit');
    remote.process.exit(status);
  }
}

module.exports = Scout;

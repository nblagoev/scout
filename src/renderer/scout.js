"use babel";

import ipc from 'ipc';
import os from 'os';
import path from 'path';
import remote from 'remote';
import _ from 'underscore-plus';
import {Emitter, CompositeDisposable} from 'event-kit';

import StyleManager from './core/style-manager';
import HttpEnvelope from './core/http-envelope';
import StorageManager from './core/storage-manager';
import HistoryManager from './core/history-manager';
import NotificationManager from './core/notification-manager';
import WindowEventSubscriptions from './window-event-subscriptions';

/*
 * An instance of this class is always available as the `scout` global.
 */
export default class Scout {
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
   * Get the directory path to Scout's storage area.
   *
   * Returns the absolute path to ~/.scout
   */
  static getStorageDirPath() {
    return process.env.SCOUT_HOME;
  }

  constructor() {
    this.emitter = new Emitter();
    this.disposables = new CompositeDisposable();
  }

  initialize() {
    window.onerror = (message, url, line, column, originalError) => {
      let eventObject = {message, url, line, column, originalError};

      let openDevTools = true;
      eventObject.preventDefault = () => openDevTools = false;

      this.emitter.emit('will-throw-error', eventObject);

      if (openDevTools) {
        this.openDevTools();
        this.executeJavaScriptInDevTools('DevToolsAPI.showConsole()');
      }

      this.emitter.emit('did-throw-error', {message, url, line, column, originalError});
    };

    this.loadTime = -1;

    this.storage = new StorageManager({storageDirPath: this.storageDirPath, resourcePath: this.loadSettings.resourcePath});
    this.styles = new StyleManager(this.loadSettings.resourcePath);
    this.notifications = new NotificationManager();
    this.envelope = new HttpEnvelope();
    this.history = new HistoryManager();

    if (this.windowEventSubscriptions) {
      this.windowEventSubscriptions.dispose();
    }

    this.windowEventSubscriptions = new WindowEventSubscriptions();
  }

  /**
   * Schedule the window to be shown and focused on the next tick.
   *
   * This is done in a next tick to prevent a white flicker from occurring
   * if called synchronously.
   */
  displayWindow() {
    setImmediate(() => {
      this.show()
      this.focus()
    });
  }

  startScoutWindow() {
    scout.storage.initialize();

    let config = scout.storage.requireStorageFile("config");
    config.transact(() => {
      let defaults = require("../../config/default.json");
      for (let prop in defaults) {
        if (defaults.hasOwnProperty(prop)) {
          config.setDefaults(prop, defaults[prop]);
        }
      }
    });

    let theme = scout.storage.get('config:theme');
    this.themeDisposable = scout.styles.loadBaseStylesheets(theme);
    this.disposables.add(scout.storage.onDidChange('config:theme', (event) => {
      let disposable = scout.styles.loadBaseStylesheets(event.newValue);
      this.themeDisposable.dispose();
      this.themeDisposable = disposable;
    }));

    require('angular');

    angular.module('scout', ['content-resizer', 'ng-enter', 'angular-json-tree', 'autocomplete-scout']);
    require('./util/split.filter');
    require('./components/scout-canvas.directive');
    require('./components/autocomplete.directive');
    require('./components/json-tree.directive');
    require('./components/notifications.directive');
    require('./components/notification.directive');
    require('./components/ng-enter.directive');
    require('./components/content-resizer.directive');
    require('./components/panel-components.directive');
    require('./components/response-status.directive');
    require('./components/response-time.directive');
    require('./components/raw-preview.directive');
    require('./components/body-editor.directive');
    require('./services/status-bar.service');
    require('./layout/notifications.controller');
    require('./layout/header.controller');
    require('./layout/status-bar.controller');
    require('./layout/request-panel.controller');
    require('./layout/management-panel.controller');
    require('./layout/response-panel.controller');

    let app = document.createElement('scout-canvas');
    document.body.appendChild(app);

    this.displayWindow();
  }

  unloadScoutWindow() {
    // TODO: cleanup and save state
    this.disposables.dispose();
  }

  removeScoutWindow() {
    // TODO: destroy UI elements

    if (this.windowEventSubscriptions) {
      this.windowEventSubscriptions.unsubscribe();
    }
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

  get storageDirPath() {
    return this.constructor.getStorageDirPath();
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
    window.focus();
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

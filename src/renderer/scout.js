
import remote from 'remote'
import _ from 'lodash'
import {Emitter, CompositeDisposable} from 'event-kit'

import StyleManager from './core/style-manager'
import HttpEnvelope from './core/http-envelope'
import StorageManager from './core/storage-manager'
import HistoryManager from './core/history-manager'
import NotificationManager from './core/notification-manager'
import WindowEventSubscriptions from './window-event-subscriptions'

/*
 * An instance of this class is always available as the `scout` global.
 */
export default class Scout {
  static getCurrentWindow() {
    return remote.getCurrentWindow()
  }

  /*
   * Get the directory path to Scout's storage area.
   *
   * Returns the absolute path to ~/.scout
   */
  static getStorageDirPath() {
    return process.env.SCOUT_HOME
  }

  constructor() {
    this.emitter = new Emitter()
    this.disposables = new CompositeDisposable()
  }

  initialize() {
    window.onerror = (message, url, line, column, originalError) => {
      let eventObject = {message, url, line, column, originalError}

      // let openDevTools = true;
      // eventObject.preventDefault = () => openDevTools = false;

      this.emitter.emit('will-throw-error', eventObject)

      // if (openDevTools) {
      //   this.openDevTools();
      //   this.executeJavaScriptInDevTools('DevToolsAPI.showConsole()');
      // }

      this.emitter.emit('did-throw-error', {message, url, line, column, originalError})
    }

    this.loadTime = -1

    let resourcePath = remote.require('app').getAppPath()
    this.storage = new StorageManager({storageDirPath: this.storageDirPath, resourcePath})
    this.styles = new StyleManager(resourcePath)
    this.notifications = new NotificationManager()
    this.envelope = new HttpEnvelope()
    this.history = new HistoryManager()

    if (this.windowEventSubscriptions) {
      this.windowEventSubscriptions.dispose()
    }

    this.windowEventSubscriptions = new WindowEventSubscriptions()

    global.scout.storage.initialize()

    let config = global.scout.storage.requireStorageFile('config')
    config.transact(() => {
      let defaults = require('../config/default.json')
      for (let prop in defaults) {
        if (defaults.hasOwnProperty(prop)) {
          config.setDefaults(prop, defaults[prop])
        }
      }
    })

    let theme = global.scout.storage.get('config:theme')
    this.themeDisposable = global.scout.styles.loadBaseStylesheets(theme)
    this.disposables.add(global.scout.storage.onDidChange('config:theme', (event) => {
      let disposable = global.scout.styles.loadBaseStylesheets(event.newValue)
      this.themeDisposable.dispose()
      this.themeDisposable = disposable
    }))

    require('angular')

    global.angular.module('scout',
        ['content-resizer', 'ng-enter', 'angular-json-tree', 'autocomplete-scout', 'nsPopover'])
    require('./util/split.filter')
    require('./components/scout-canvas.directive')
    require('./components/autocomplete.directive')
    require('./components/json-tree.directive')
    require('./components/notifications.directive')
    require('./components/notification.directive')
    require('./components/ng-enter.directive')
    require('./components/content-resizer.directive')
    require('./components/panel-components.directive')
    require('./components/response-status.directive')
    require('./components/response-time.directive')
    require('./components/raw-preview.directive')
    require('./components/body-editor.directive')
    require('./services/status-bar.service')
    require('./layout/notifications.controller')
    require('./layout/header.controller')
    require('./layout/status-bar.controller')
    require('./layout/request-panel.controller')
    require('./layout/management-panel.controller')
    require('./layout/response-panel.controller')
    require('../vendor/components/nsPopover')

    let app = document.createElement('scout-canvas')
    document.body.appendChild(app)
  }

  unloadScoutWindow() {
    // TODO: cleanup and save state
    this.disposables.dispose()
  }

  removeScoutWindow() {
    // TODO: destroy UI elements

    if (this.windowEventSubscriptions) {
      this.windowEventSubscriptions.unsubscribe()
    }
  }

  get currentWindow() {
    return this.constructor.getCurrentWindow()
  }

  get version() {
    return null
  }

  get storageDirPath() {
    return this.constructor.getStorageDirPath()
  }

  /*
   * Determine whether the current version is an official release.
   */
  isReleasedVersion() {
    // Check if the version has a 7-character SHA suffix
    return !/\w{7}/.test(this.version)
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
    buttons = buttons || {}

    let buttonLabels
    if (_.isArray(buttons)) {
      buttonLabels = buttons
    } else {
      buttonLabels = Object.keys(buttons)
    }

    let dialog = remote.require('dialog')
    let chosen = dialog.showMessageBox(this.currentWindow, {
      type: 'info',
      message: message,
      detail: detailedMessage,
      buttons: buttonLabels
    })

    if (_.isArray(buttons)) {
      return chosen
    } else {
      let callback = buttons[buttonLabels[chosen]]
      return typeof callback === 'function' ? callback() : void 0
    }
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
    return this.emitter.on('will-throw-error', callback)
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
    return this.emitter.on('did-throw-error', callback)
  }

  exit(status) {
    var app = remote.require('app')
    app.emit('will-exit')
    remote.process.exit(status)
  }
}

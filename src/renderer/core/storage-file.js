'use babel';

import path from 'path';
import fs from 'fs-plus';
import async from 'async';
import CSON from 'season';
import _ from 'underscore-plus';
import pathWatcher from 'pathwatcher';
import * as throws from '../../common/throws';
import {CompositeDisposable, Disposable, Emitter} from 'event-kit';

export default class StorageFile {

  constructor(filePath) {
    this.emitter = new Emitter();
    this.schema = { type: 'object', properties: {} };
    this.defaultContent = {};
    this.content = {};
    this.fileHasErrors = false;
    this.filePath = filePath;
    this.transactDepth = 0;
    this.savePending = false;

    this.requestLoad = _.debounce(this.load, 100);
    this.requestSave = () => {
      this.savePending = true;
      debouncedSave.call(this);
    }

    var save = () => {
      this.savePending = false;
      this.save();
    }

    var debouncedSave = _.debounce(save, 100);
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      fs.makeTreeSync(path.dirname(this.filePath));
      CSON.writeFileSync(this.filePath, {});
    }

    try {
      if (!this.savePending) {
        let fileContent = CSON.readFileSync(this.filePath);
        this.resetContent(fileContent);
        this.fileHasErrors = false;
      }
    } catch (error) {
      this.fileHasErrors = true;
      let message = `Failed to load '${path.basename(this.filePath)}'`;
      let detail = (error.location)
        ? error.stack // stack is the output from CSON in this case
        : error.message; // message will be EACCES permission denied, et al

      this.notifyFailure(message, detail);
    }
  }

  observe() {
    try {
      if (!this.watchSubscription) {
        this.watchSubscription = pathWatcher.watch(this.filePath, (eventType) => {
          if (eventType === 'change' && this.watchSubscription) {
            this.requestLoad();
          }
        });
      }
    } catch (error) {
      this.notifyFailure(`
        Unable to watch path: ${path.basename(this.filePath)}.
        Make sure you have permissions to ${this.filePath}.`);
    }
  }

  unobserve() {
    if (this.watchSubscription) {
      this.watchSubscription.close();
      this.watchSubscription = null;
    }
  }

  notifyFailure(errorMessage, detail) {
    scout.notifications.addError(errorMessage, {detail, dismissable: true});
  }

  get(keyPath, {omitDefault, takeDefault} = {}) {
    throws.ifEmpty(keyPath, "keyPath");

    let value = _.valueForKeyPath(this.content, keyPath);
    let defaultValue = (omitDefault !== true) ? _.valueForKeyPath(this.defaultContent, keyPath) : undefined;

    if (takeDefault === true) {
      return this.deepClone(defaultValue);
    }

    if (value) {
      value = this.deepClone(value);

      if (this.isPlainObject(value) && this.isPlainObject(defaultValue)) {
        _.defaults(value, defaultValue);
      }
    } else {
      value = this.deepClone(defaultValue);
    }

    return value;
  }

  set(keyPath, value, {save} = {}) {
    throws.ifEmpty(keyPath, "keyPath");

    let shouldSave = true;

    if (save !== null && save != undefined) {
      shouldSave = save;
    }

    let defaultValue = _.valueForKeyPath(this.defaultContent, keyPath);

    if (_.isEqual(defaultValue, value)) {
      value = undefined;
    }

    _.setValueForKeyPath(this.content, keyPath, value);
    this.emitChangeEvent();

    if (shouldSave && !this.fileHasErrors) {
      this.requestSave();
    }

    return true;
  }

  unset(keyPath, options = {}) {
    throws.ifEmpty(keyPath, "keyPath");
    this.set(keyPath, _.valueForKeyPath(this.defaultContent, keyPath));
  }

  /**
   * Add a listener for changes to a given key path.
   *
   * @param {string} keyPath - name of the key to observe
   * @param {Function} callback({newValue, oldValue, keyPath}) -
   *        called when the value of the key changes.

   * @returns a {Disposable} on which you can call `.dispose()` to unsubscribe.
   */
  onDidChange(keyPath, callback) {
    let oldValue = this.get(keyPath);
    return this.emitter.on('did-change', () => {
      // check for changes here and don't use any arguments passed
      // by the emitter, to allow suppressing the callbacks using `transact()`
      let newValue = this.get(keyPath);
      if (!_.isEqual(oldValue, newValue)) {
        let event = {oldValue, newValue, keyPath};
        // store the old value locally, so it can be used
        // the next time 'did-change' is emitted
        oldValue = newValue;
        callback(event);
      }
    });
  }

  /**
   * Suppress calls to handler functions registered with {::onDidChange}
   * for the duration of `callback`. After `callback` executes, handlers
   * will be called once if the value for their key has changed.
   *
   * @param {Function} callback - {Function} to execute while suppressing calls to handlers.
   */
  transact(callback) {
    this.transactDepth++;
    try {
      callback();
    } finally {
      this.transactDepth--;
      this.emitChangeEvent();
    }
  }

  emitChangeEvent() {
    if (this.transactDepth > 0) {
      return;
    }

    this.emitter.emit('did-change');
  }

  save() {
    try {
      CSON.writeFileSync(this.filePath, this.content);
    } catch (error) {
      let message = `Failed to save '${path.basename(this.filePath)}'`;
      let detail = error.message;
      this.notifyFailure(message, detail);
    }
  }

  resetContent(newContent) {
    if (!this.isPlainObject(newContent)) {
      this.content = {};
      this.emitChangeEvent();
      return;
    }

    this.transact(() => {
      this.content = {};
      for (let key in newContent) {
        if (newContent.hasOwnProperty(key)) {
          this.set(key, newContent[key], {save: false});
        }
      }
    });
  }

  setDefaults(keyPath, defaults) {
    if (defaults && this.isPlainObject(defaults)) {
      let keys = this.splitKeyPath(keyPath);
      for (let key in defaults) {
        if (defaults.hasOwnProperty(key)) {
          let childValue = defaults[key];
          this.setDefaults(keys.concat([key]).join('.'), childValue);
        }
      }
    } else {
      _.setValueForKeyPath(this.defaultContent, keyPath, defaults);
      this.emitChangeEvent();
    }
  }

  deepClone(object) {
    if (_.isArray(object)) {
      return object.map((value) => this.deepClone(value));
    } else if (this.isPlainObject(object)) {
      return _.mapObject(object, (key, value) => [key, this.deepClone(value)]);
    } else {
      return object;
    }
  }

  isPlainObject(value) {
    return _.isObject(value) && !_.isArray(value) && !_.isFunction(value) && !_.isString(value);
  }

  splitKeyPath(keyPath) {
    if (!keyPath) {
      return [];
    }

    let startIndex = 0;
    let keyPathArray = [];
    let len = keyPath.length;

    for (let i = 0; i < len; i++) {
      if (keyPath[i] == '.' && (i == 0 || keyPath[i-1] != '\\')) {
        keyPathArray.push(keyPath.substring(startIndex, i));
        startIndex = i + 1;
      }
    }

    keyPathArray.push(keyPath.substr(startIndex, keyPath.length));
    return keyPathArray;
  }
}

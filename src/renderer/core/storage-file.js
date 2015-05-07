'use babel';

var _ = require('underscore-plus');
var fs = require('fs-plus');
var {CompositeDisposable, Disposable, Emitter} = require('event-kit');
var CSON = require('season');
var path = require('path');
var async = require('async');
var pathWatcher = require('pathwatcher');

class StorageFile {

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

  /**
   * Suppress calls to handler functions registered with {::onDidChange}
   * for the duration of `callback`. After `callback` executes, handlers
   * will be called once if the value for their key has changed.
   *
   * this.param {Function} callback - {Function} to execute while suppressing calls to handlers.
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
    if (transactDepth > 0) {
      return;
    }

    this.emitter.emit('did-change');
  }

  save() {
    try {
      CSON.writeFileSync(this.filePath, allSettings);
    } catch (error) {
      let message = `Failed to save '${path.basename(this.filePath)}'`;
      let detail = error.message;
      this.notifyFailure(message, detail);
    }
  }

  resetContent(newContent) {
    if (!isPlainObject(newContent)) {
      this.content = {};
      this.emitChangeEvent();
      return;
    }

    this.transact(() => {
      this.content = {};
      for (var key in newContent) {
        if (newContent.hasOwnProperty(key)) {
          this.set(key, newContent[key], save: false);
        }
      }
    });
  }
}

module.exports = StorageFile;

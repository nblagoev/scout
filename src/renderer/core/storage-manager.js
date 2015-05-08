'use babel';

var _ = require('underscore-plus');
var fs = require('fs-plus');
var {CompositeDisposable, Disposable, Emitter} = require('event-kit');
var CSON = require('season');
var path = require('path');
var async = require('async');
var pathWatcher = require('pathwatcher');
var StorageFile = require('./storage-file');

/**
 * Used to access Scout's storage folder.

 * An instance of this class is always available as the `scout.storage` global.
 */
class StorageManager {

  constructor({storageDirPath, resourcePath}={}) {
    this.storageDirPath = storageDirPath;
    this.resourcePath = resourcePath;
    this.emitter = new Emitter();
    this.files = {};
  }

  initialize(done) {
    if (fs.existsSync(this.storageDirPath)) {
      return;
    }

    fs.makeTreeSync(this.storageDirPath);

    let queue = async.queue(({sourcePath, destinationPath}, callback) => {
      fs.copy(sourcePath, destinationPath, callback);
    });
    queue.drain = done;

    let templateStorageDirPath = fs.resolve(this.resourcePath, 'dot-scout');
    let onStorageDirFile = (sourcePath) => {
      let relativePath = sourcePath.substring(templateStorageDirPath.length + 1);
      let destinationPath = path.join(this.storageDirPath, relativePath);
      queue.push({sourcePath, destinationPath});
    };

    fs.traverseTree(templateStorageDirPath, onStorageDirFile, (path) => true);
  }

  notifyFailure(errorMessage, detail) {
    scout.notifications.addError(errorMessage, {detail, dismissable: true});
  }

  requireStorageFile(relativeFilePath) {
    let storageFile = this.files[relativeFilePath];

    if (!storageFile) {
      let absoluteFilePath = path.join(this.storageDirPath, `${relativeFilePath}.json`);
      storageFile = new StorageFile(absoluteFilePath);
      storageFile.load();
      storageFile.observe();
      this.files[relativeFilePath] = storageFile;
    }

    return storageFile;
  }

  /**
   * scout.storage.get("folder/filename:key.nested.inside");
   */
  get(keyPath) {
    let [relativeFilePath, nestedKeyPath] = keyPath.split(':');
    let storageFile = this.requireStorageFile(relativeFilePath);

    return storageFile.get(nestedKeyPath);
  }

  set(keyPath, value, options) {
    let [relativeFilePath, nestedKeyPath] = keyPath.split(':');
    let storageFile = this.requireStorageFile(relativeFilePath);

    return storageFile.set(nestedKeyPath, value, options);
  }

  unset(keyPath, options) {
    let [relativeFilePath, nestedKeyPath] = keyPath.split(':');
    let storageFile = this.requireStorageFile(relativeFilePath);

    return storageFile.unset(nestedKeyPath, options);
  }

  onDidChangeKeyPath(keyPath, callback) {
    let [relativeFilePath, nestedKeyPath] = keyPath.split(':');
    let storageFile = this.requireStorageFile(relativeFilePath);

    return storageFile.onDidChangeKeyPath(nestedKeyPath, callback);
  }
}

module.exports = StorageManager;

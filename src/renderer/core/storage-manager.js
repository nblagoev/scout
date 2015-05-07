'use babel';

var _ = require('underscore-plus');
var fs = require('fs-plus');
var {CompositeDisposable, Disposable, Emitter} = require('event-kit');
var CSON = require('season');
var path = require('path');
var async = require('async');
var pathWatcher = require('pathwatcher');

/**
 * Used to access Scout's storage folder.

 * An instance of this class is always available as the `scout.storage` global.
 */
class StorageManager {

  constructor({storageDirPath, resourcePath}={}) {
    this.storageDirPath = storageDirPath;
    this.resourcePath = resourcePath;
    this.emitter = new Emitter();
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

}

module.exports = StorageManager;

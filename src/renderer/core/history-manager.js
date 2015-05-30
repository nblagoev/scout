'use babel';

import _ from 'underscore-plus';

/**
 * An instance of this class is always available as the `scout.history` global.
 */
export default class HistoryManager {
  constructor() {
    this.entries = scout.storage.get('history:entries') || [];
  }

  add(envelope) {
    this.entries = scout.storage.get('history:entries') || [];

    if (!_.isArray(this.entries)) {
      this.entries = [];
    }

    let entry = envelope.serialize();
    entry.timestamp = Date.now();
    this.entries.push(entry);

    while (this.entries.length > scout.storage.get('config:history.keepLast')) {
      this.entries.shift();
    }

    scout.storage.set('history:entries', this.entries);
  }

  onDidChange(callback) {
    return scout.storage.onDidChange('history:entries', callback);
  }
}

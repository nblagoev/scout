import _ from 'lodash'

/**
 * An instance of this class is always available as the `scout.history` global.
 */
export default class HistoryManager {
  constructor() {
    this.entries = global.scout.storage.get('history:entries') || []
  }

  add(envelope) {
    this.entries = global.scout.storage.get('history:entries') || []

    if (!_.isArray(this.entries)) {
      this.entries = []
    }

    let entry = envelope.serialize()
    entry.timestamp = Date.now()
    this.entries.push(entry)

    while (this.entries.length > global.scout.storage.get('config:history.keepLast')) {
      this.entries.shift()
    }

    global.scout.storage.set('history:entries', this.entries)
  }

  onDidChange(callback) {
    return global.scout.storage.onDidChange('history:entries', callback)
  }
}

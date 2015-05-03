'use babel';

var {Emitter} = require('event-kit');

/*
  A notification to the user containing a message and type.
*/
class Notification {

  constructor(type, message, options={}) {
    this.type = type;
    this.message = message;
    this.options = options;
    this.emitter = new Emitter();
    this.timestamp = new Date();
    this.dismissed = !this.isDismissable();
    this.displayed = false;
  }

  onDidDismiss(callback) {
    return this.emitter.on('did-dismiss', callback);
  }

  onDidDisplay(callback) {
    return this.emitter.on('did-display', callback);
  }

  get detail() {
    return this.options.detail;
  }

  isEqual(other) {
    return this.message === other.message &&
           this.type === other.type &&
           this.detail === other.detail;
  }

  dismiss() {
    if (!this.isDismissable() || this.isDismissed()) {
      return;
    }

    this.dismissed = true;
    this.emitter.emit('did-dismiss', this);
  }

  isDismissed() { return this.dismissed; }

  isDismissable() { return this.options.dismissable || false; }

  wasDisplayed() { return this.displayed; }

  setDisplayed(displayed) {
    this.displayed = displayed;
    this.emitter.emit('did-display', this);
  }

  get icon() {
    if (this.options.icon) {
      return this.options.icon;
    }

    switch (this.type) {
      case 'fatal':
        return 'bug';
      case 'error':
        return 'flame';
      case 'warning':
        return 'alert';
      case 'info':
        return 'info';
      case 'success':
        return 'check';
    }
  }
}

module.exports = Notification;

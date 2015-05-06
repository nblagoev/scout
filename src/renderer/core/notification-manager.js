'use babel';

var {Emitter, Disposable} = require('event-kit');
var Notification = require('./notification');

/**
 * A notification manager used to create {Notification}s to be shown to the user.

 * An instance of this class is always available as the `scout.notifications` global.
 */
class NotificationManager {

  constructor() {
    this.notifications = [];
    this.emitter = new Emitter();
  }

  /**
   * Invoke the given callback after a notification has been added.
   *
   * @callback callback - {Function} to be called after the notification is added.
   * @param {Notification} notification - The {Notification} that was added.
   *
   * @returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
   */
  onDidAddNotification(callback) {
    return this.emitter.on('did-add-notification', callback);
  }

  /**
   * Add a success notification.
   *
   * @param {string} message - A {String} message
   * @param {object} options - An options {Object} with optional keys such as:
   * @param {string} options.detail - A {String} with additional details about the notification
   */
  addSuccess(message, options) {
    return this.addNotification(new Notification('success', message, options));
  }

  /**
   * Add an informational notification.
   *
   * @param {string} message - A {String} message
   * @param {object} options - An options {Object} with optional keys such as:
   * @param {string} options.detail - A {String} with additional details about the notification
   */
  addInfo(message, options) {
    return this.addNotification(new Notification('info', message, options));
  }

  /**
   * Add a warning notification.
   *
   * @param {string} message - A {String} message
   * @param {object} options - An options {Object} with optional keys such as:
   * @param {string} options.detail - A {String} with additional details about the notification
   */
  addWarning(message, options) {
    return this.addNotification(new Notification('warning', message, options));
  }

  /**
   * Add an error notification.
   *
   * @param {string} message - A {String} message
   * @param {object} options - An options {Object} with optional keys such as:
   * @param {string} options.detail - A {String} with additional details about the notification
   */
  addError(message, options) {
    return this.addNotification(new Notification('error', message, options));
  }

  /**
   * Add a fatal error notification.
   *
   * @param {string} message - A {String} message
   * @param {object} options - An options {Object} with optional keys such as:
   * @param {string} options.detail - A {String} with additional details about the notification
   */
  addFatalError(message, options) {
    return this.addNotification(new Notification('fatal', message, options));
  }

  /**
   * @private
   */
  add(type, message, options) {
    return this.addNotification(new Notification(type, message, options));
  }

  /**
   * @private
   */
  addNotification(notification) {
    this.notifications.push(notification);
    this.emitter.emit('did-add-notification', notification);
    return notification;
  }

  dismissAll() {
    for (let notification of this.notifications) {
      if (notification.isDismissable() && !notification.isDismissed()) {
        notification.dismiss();
      }
    }
  }

  /**
   * Remove all the previous notifications.
   */
  clear() {
    this.notifications = [];
  }
}

module.exports = NotificationManager;

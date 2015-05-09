'use babel';

let NotificationManager = require('../src/renderer/core/notification-manager');
let Notification = require('../src//renderer/core/notification');

describe("NotificationManager", () => {
  var manager = null;

  beforeEach(() => {
    manager = new NotificationManager();
  });

  describe("adding events", () => {
    var addSpy = null;

    beforeEach(() => {
      addSpy = jasmine.createSpy();
      manager.onDidAddNotification(addSpy);
    });

    it("emits an event when a notification has been added", () => {
      manager.add('error', 'Some error!', {icon: 'someIcon'});
      expect(addSpy).toHaveBeenCalled();

      var notification = addSpy.calls.mostRecent().args[0];
      expect(notification.type).toBe('error');
      expect(notification.message).toBe('Some error!');
      expect(notification.icon).toBe('someIcon');
    });

    it("emits a fatal error .addFatalError has been called", () => {
      manager.addFatalError('Some error!', {icon: 'someIcon'});
      expect(addSpy).toHaveBeenCalled();
      var notification = addSpy.calls.mostRecent().args[0];
      expect(notification.type).toBe('fatal');
      expect(notification.message).toBe('Some error!');
      expect(notification.icon).toBe('someIcon');
    });

    it("emits an error .addError has been called", () => {
      manager.addError('Some error!', {icon: 'someIcon'});
      expect(addSpy).toHaveBeenCalled();
      var notification = addSpy.calls.mostRecent().args[0];
      expect(notification.type).toBe('error');
      expect(notification.message).toBe('Some error!');
      expect(notification.icon).toBe('someIcon');
    });

    it("emits a warning notification .addWarning has been called", () => {
      manager.addWarning('Something!', {icon: 'someIcon'});
      expect(addSpy).toHaveBeenCalled();
      var notification = addSpy.calls.mostRecent().args[0];
      expect(notification.type).toBe('warning');
      expect(notification.message).toBe('Something!');
      expect(notification.icon).toBe('someIcon');
    });

    it("emits an info notification .addInfo has been called", () => {
      manager.addInfo('Something!', {icon: 'someIcon'});
      expect(addSpy).toHaveBeenCalled();
      var notification = addSpy.calls.mostRecent().args[0];
      expect(notification.type).toBe('info');
      expect(notification.message).toBe('Something!');
      expect(notification.icon).toBe('someIcon');
    });

    it("emits a success notification .addSuccess has been called", () => {
      manager.addSuccess('Something!', {icon: 'someIcon'});
      expect(addSpy).toHaveBeenCalled();
      var notification = addSpy.calls.mostRecent().args[0];
      expect(notification.type).toBe('success');
      expect(notification.message).toBe('Something!');
      expect(notification.icon).toBe('someIcon');
    });
  });
});

describe("Notification", () => {
  var notification = null;

  describe(".timestamp", () => {
    it("returns a Date object", () => {
      notification = new Notification('error', 'message!');
      expect(notification.timestamp instanceof Date).toBe(true);
    });
  });

  describe(".icon)", () => {
    it("returns a default when no icon specified", () => {
      notification = new Notification('error', 'message!');
      expect(notification.icon).toBe('fire');
    });

    it("returns the icon specified", () => {
      notification = new Notification('error', 'message!', {icon: 'my-icon'});
      expect(notification.icon).toBe('my-icon');
    });
  });

  describe("dismissing notifications", () => {
    describe("when the notfication is dismissable", () => {
      it("calls a callback when the notification is dismissed", () => {
        var dismissedSpy = jasmine.createSpy();
        notification = new Notification('error', 'message', {dismissable: true});
        notification.onDidDismiss(dismissedSpy);

        expect(notification.isDismissable()).toBe(true);
        expect(notification.isDismissed()).toBe(false);

        notification.dismiss();

        expect(dismissedSpy).toHaveBeenCalled();
        expect(notification.isDismissed()).toBe(true);
      });
    });

    describe("when the notfication is not dismissable", () => {
      it("does nothing when .dismiss() is called", () => {
        var dismissedSpy = jasmine.createSpy();
        notification = new Notification('error', 'message');
        notification.onDidDismiss(dismissedSpy);

        expect(notification.isDismissable()).toBe(false);
        expect(notification.isDismissed()).toBe(true);

        notification.dismiss();

        expect(dismissedSpy).not.toHaveBeenCalled();
        expect(notification.isDismissed()).toBe(true);
      });
    });
  });
});

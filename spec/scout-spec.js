"use babel";

let StorageManager = require('../src/renderer/core/storage-manager');
let NotificationManager = require('../src/renderer/core/notification-manager');

describe("the `scout` global", () => {
  it("has a storage instance", () => {
    expect(scout.storage instanceof StorageManager).toBe(true);
  });

  it("has a notifications instance", () => {
    expect(scout.notifications instanceof NotificationManager).toBe(true);
  });

  describe("window sizing methods", () => {
    describe(".getPosition() and .setPosition()", () => {
      let originalPosition = null;
      beforeEach(() => originalPosition = scout.getPosition());
      afterEach(() => scout.setPosition(originalPosition.x, originalPosition.y));

      it("sets the position of the window, and can retrieve the position just set", () => {
        scout.setPosition(22, 45);
        expect(scout.getPosition()).toEqual({ x: 22, y: 45 });
      });
    });

    describe(".getSize() and .setSize()", () => {
      let originalSize = null;
      beforeEach(() => originalSize = scout.getSize());
      afterEach(() => scout.setSize(originalSize.width, originalSize.height));

      it("sets the size of the window, and can retrieve the size just set", () => {
        scout.setSize(200, 400);
        expect(scout.getSize()).toEqual({ width: 200, height: 400 });
      });
    });
  });

  describe("window onerror handler", () => {
    beforeEach(() => {
      spyOn(scout, 'openDevTools');
      spyOn(scout, 'executeJavaScriptInDevTools');
    });

    it("will open the dev tools when an error is triggered", () => {
      try {
        a + 1;
      } catch (e) {
        window.onerror.call(window, e.toString(), 'abc', 2, 3, e);
      }

      expect(scout.openDevTools).toHaveBeenCalled();
      expect(scout.executeJavaScriptInDevTools).toHaveBeenCalled();
    });

    describe(".onWillThrowError", () => {
      var willThrowSpy = null;
      beforeEach(() => {
        willThrowSpy = jasmine.createSpy();
      });

      it("is called when there is an error", () => {
        var error = null;
        scout.onWillThrowError(willThrowSpy);
        try {
          a + 1;
        } catch (e) {
          error = e;
          window.onerror.call(window, e.toString(), 'abc', 2, 3, e);
        }

        delete willThrowSpy.calls.mostRecent().args[0].preventDefault;
        expect(willThrowSpy).toHaveBeenCalledWith({
          message: error.toString(),
          url: 'abc',
          line: 2,
          column: 3,
          originalError: error
        });
      });

      it("will not show the devtools when preventDefault() is called", () => {
        willThrowSpy.and.callFake(function(errorObject) { return errorObject.preventDefault(); });
        scout.onWillThrowError(willThrowSpy);

        try {
          a + 1;
        } catch (e) {
          window.onerror.call(window, e.toString(), 'abc', 2, 3, e);
        }

        expect(willThrowSpy).toHaveBeenCalled();
        expect(scout.openDevTools).not.toHaveBeenCalled();
        expect(scout.executeJavaScriptInDevTools).not.toHaveBeenCalled();
      });
    });

    describe(".onDidThrowError", () => {
      var didThrowSpy = null;
      beforeEach(() => {
        didThrowSpy = jasmine.createSpy();
      });

      it("is called when there is an error", () => {
        var error = null;
        scout.onDidThrowError(didThrowSpy);

        try {
          a + 1;
        } catch (e) {
          error = e;
          window.onerror.call(window, e.toString(), 'abc', 2, 3, e);
        }

        expect(didThrowSpy).toHaveBeenCalledWith({
          message: error.toString(),
          url: 'abc',
          line: 2,
          column: 3,
          originalError: error
        });
      });
    });
  });
});

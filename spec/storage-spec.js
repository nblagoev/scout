"use babel";

let path = require('path');
let temp = require('temp');
let CSON = require('season');
let fs = require('fs-plus');
let StorageManager = require('../src/renderer/core/storage-manager');

describe("StorageManager", () => {
  let dotScoutPath = null;

  beforeEach(() => {
    dotScoutPath = temp.path('dot-scout-dir');
    scout.storage.storageDirPath = dotScoutPath;
  });

  describe(".initialize()", () => {
    beforeEach(() => {
      if (fs.existsSync(dotScoutPath)) {
        fs.removeSync(dotScoutPath);
      }
    });

    afterEach(() => {
      fs.removeSync(dotScoutPath);
    });

    describe("when the storageDirPath doesn't exist", () => {
      it("copies the contents of dot-scout to ~/.scout", (done) => {
        scout.storage.initialize(() => {
          expect(fs.existsSync(scout.storage.storageDirPath)).toBeTruthy();
          expect(fs.existsSync(path.join(scout.storage.storageDirPath, 'cookies'))).toBeTruthy();
          expect(fs.isFileSync(path.join(scout.storage.storageDirPath, 'cookies/.index'))).toBeTruthy();
          expect(fs.isFileSync(path.join(scout.storage.storageDirPath, 'config.json'))).toBeTruthy();
          expect(fs.isFileSync(path.join(scout.storage.storageDirPath, 'hints.json'))).toBeTruthy();
          expect(fs.isFileSync(path.join(scout.storage.storageDirPath, 'history.json'))).toBeTruthy();
          expect(fs.isFileSync(path.join(scout.storage.storageDirPath, 'collections.json'))).toBeTruthy();
          done();
        });
      });
    });
  });
});

describe("StorageFile", () => {
  let dotScoutPath = null;
  let storageFile = null;

  beforeEach(() => {
    dotScoutPath = temp.path('dot-scout-dir');
    scout.storage.storageDirPath = dotScoutPath;
    scout.storage.files = {};
    storageFile = scout.storage.requireStorageFile('config');
  });

  describe(".get(keyPath)", () => {
    it("allows a key path's value to be read", () => {
      expect(storageFile.set("foo.bar.baz", 42)).toBe(true);
      expect(storageFile.get("foo.bar.baz")).toBe(42);
      expect(storageFile.get("foo.quux")).toBeUndefined();
    });

    it("returns a deep clone of the key path's value", () => {
      storageFile.set('value', {array: [1, {b: 2}, 3]});
      var retrievedValue = storageFile.get('value');
      retrievedValue.array[0] = 4;
      retrievedValue.array[1].b = 6;
      expect(storageFile.get('value')).toEqual({array: [1, {b: 2}, 3]});
    });

    it("merges defaults into the returned value if both the assigned value and the default value are objects", () => {
      storageFile.setDefaults("foo.bar", {baz: 1, ok: 2});
      storageFile.set("foo.bar", {baz: 3});
      expect(storageFile.get("foo.bar")).toEqual({baz: 3, ok: 2});

      storageFile.setDefaults("other", {baz: 1});
      storageFile.set("other", 7);
      expect(storageFile.get("other")).toBe(7);

      storageFile.set("bar.baz", {a: 3});
      storageFile.setDefaults("bar", {baz: 7});
      expect(storageFile.get("bar.baz")).toEqual({a: 3});
    });

    it("does not allow keyPath to be null", () => {
      expect(() => storageFile.get(null)).toThrowError("Argument 'keyPath' cannot be null or empty.");
    });
  });

  describe(".set(keyPath, value)", () => {
    it("allows a key path's value to be written", () => {
      expect(storageFile.set("foo.bar.baz", 42)).toBe(true);
      expect(storageFile.get("foo.bar.baz")).toBe(42);
    });

    it("saves the storage file to disk after it stops changing", (done) => {
      spyOn(storageFile, 'save');
      // TODO: So ugly, find a better way - es6 generators, node fibers?
      storageFile.set("foo.bar.baz", 42);
      setTimeout(() => {
        expect(storageFile.save).not.toHaveBeenCalled();
        storageFile.set("foo.bar.baz", 43);
        setTimeout(() => {
          expect(storageFile.save).not.toHaveBeenCalled();
          storageFile.set("foo.bar.baz", 44);
          setTimeout(() => {
            expect(storageFile.save).toHaveBeenCalled();
            done();
          }, 150);
        }, 50);
      }, 50);

    });

    it("does not allow keyPath to be null", () => {
      expect(() => storageFile.set(null, 1)).toThrowError("Argument 'keyPath' cannot be null or empty.");
    });

    it("does not store the value in the storage file when the value equals the default value", () => {
      storageFile.setDefaults("foo", {
        same: 1,
        changes: 1,
        sameArray: [1, 2, 3],
        sameObject: {a: 1, b: 2},
        null: null,
        undefined: undefined
      });

      expect(storageFile.content.foo).toBeUndefined();

      storageFile.set('foo.same', 1);
      storageFile.set('foo.changes', 2);
      storageFile.set('foo.sameArray', [1, 2, 3]);
      storageFile.set('foo.null', undefined);
      storageFile.set('foo.undefined', null);
      storageFile.set('foo.sameObject', {b: 2, a: 1});

      expect(storageFile.get("foo.same", {ignoreDefault:true})).toBeUndefined();

      expect(storageFile.get("foo.changes", {ignoreDefault:true})).toBe(2);
      storageFile.set('foo.changes', 1);
      expect(storageFile.get("foo.changes", {ignoreDefault:true})).toBeUndefined();
    });
  });

  describe(".unset(keyPath)", () => {
    it("sets the value of the key path to its default", () => {
      storageFile.setDefaults('a', {b: 3});
      storageFile.set('a.b', 4);
      expect(storageFile.get('a.b')).toBe(4);
      storageFile.unset('a.b');
      expect(storageFile.get('a.b')).toBe(3);

      storageFile.set('a.c', 5);
      expect(storageFile.get('a.c')).toBe(5);
      storageFile.unset('a.c');
      expect(storageFile.get('a.c')).toBeUndefined();
    });

    it("calls .save()", (done) => {
      spyOn(storageFile, 'save');
      storageFile.setDefaults('a', {b: 3});
      storageFile.set('a.b', 4);
      storageFile.save.calls.reset();

      storageFile.unset('a.c');
      setTimeout(() => {
        expect(storageFile.save.calls.count()).toBe(1);
        done();
      }, 500);
    });

    it("does not allow keyPath to be null", () => {
      expect(() => storageFile.unset(null)).toThrowError("Argument 'keyPath' cannot be null or empty.");
    });
  });

  describe(".onDidChange(keyPath)", () => {
    let [observeHandler, observeSubscription] = [];

    beforeEach(() => {
      observeHandler = jasmine.createSpy("observeHandler");
      storageFile.set("foo.bar.baz", "value 1");
      observeSubscription = storageFile.onDidChange("foo.bar.baz", observeHandler);
    });

    afterEach(() => {
      if (observeSubscription) {
        observeSubscription.dispose();
      }
    });

    it("does not fire the given callback with the current value at the keypath", () => {
      expect(observeHandler).not.toHaveBeenCalled();
    });

    it("fires the callback every time the observed value changes", () => {
      storageFile.set('foo.bar.baz', "value 2");
      expect(observeHandler).toHaveBeenCalledWith({newValue: 'value 2', oldValue: 'value 1', keyPath: "foo.bar.baz"});
      observeHandler.calls.reset();

      observeHandler.and.callFake(() => { throw new Error("oops"); });
      expect(() => storageFile.set('foo.bar.baz', "value 1")).toThrowError("oops");
      expect(observeHandler).toHaveBeenCalledWith({newValue: 'value 1', oldValue: 'value 2', keyPath: "foo.bar.baz"});
      observeHandler.calls.reset();

      // Regression: exception in earlier handler shouldn't put observer
      // into a bad state.
      storageFile.set('something.else', "new value");
      expect(observeHandler).not.toHaveBeenCalled();
    });
  });

  describe(".transact(callback)", () => {
    let [changeSpy, observeSubscription] = [null, null];

    beforeEach(() => {
      changeSpy = jasmine.createSpy('onDidChange callback');
      observeSubscription = storageFile.onDidChange("foo.bar.baz", changeSpy);
    });

    afterEach(() => {
      if (observeSubscription) {
        observeSubscription.dispose();
      }
    });

    it("allows only one change event for the duration of the given callback", () => {
      storageFile.transact(() => {
        storageFile.set("foo.bar.baz", 1);
        storageFile.set("foo.bar.baz", 2);
        storageFile.set("foo.bar.baz", 3);
      });

      expect(changeSpy.calls.count()).toBe(1);
      expect(changeSpy.calls.allArgs()[0][0]).toEqual({newValue: 3, oldValue: undefined, keyPath: "foo.bar.baz"});
    });

    it("does not emit an event if no changes occur while paused", () => {
      storageFile.transact(() => {});
      expect(changeSpy).not.toHaveBeenCalled();
    });
  });

  describe("Internal Methods", () => {
    describe(".save()", () => {

      describe("when the storage file exists", () => {
        it("writes any non-default properties to the storage file", () => {
          spyOn(CSON, 'writeFileSync');
          storageFile.set("a.b.c", 1);
          storageFile.set("a.b.d", 2);
          storageFile.set("x.y.z", 3);
          storageFile.setDefaults("a.b", {e: 4, f: 5});

          CSON.writeFileSync.calls.reset();
          storageFile.save();

          expect(CSON.writeFileSync.calls.allArgs()[0][0]).toBe(storageFile.filePath);
          var writtenContent = CSON.writeFileSync.calls.allArgs()[0][1];
          expect(writtenContent).toEqual(storageFile.content);
        });
      });

      describe("when storage file doesn't exist", () => {
        it("writes any non-default properties to the storage file", () => {
          spyOn(CSON, 'writeFileSync');
          storageFile.set("a.b.c", 1);
          storageFile.set("a.b.d", 2);
          storageFile.set("x.y.z", 3);
          storageFile.setDefaults("a.b", {e: 4, f: 5});

          CSON.writeFileSync.calls.reset();
          storageFile.save();

          expect(CSON.writeFileSync.calls.allArgs()[0][0]).toBe(path.join(storageFile.filePath));
          var writtenContent = CSON.writeFileSync.calls.allArgs()[0][1];
          expect(writtenContent).toEqual(storageFile.content);
        });
      });

      describe("when an error is thrown writing the file to disk", () => {
        var addErrorHandler = null;
        beforeEach(() => {
          scout.notifications.onDidAddNotification(addErrorHandler = jasmine.createSpy());
        });

        it("creates a notification", () => {
          spyOn(CSON, 'writeFileSync').and.callFake(() => {
            var error = new Error();
            error.code = 'EPERM';
            error.path = storageFile.filePath;
            throw error;
          });

          var save = () => { storageFile.save(); };
          expect(save).not.toThrow();
          expect(addErrorHandler.calls.count()).toBe(1);
        });
      });
    });

    describe(".load()", () => {
      describe("when the storage file contains valid json", () => {
        beforeEach(() => {
          fs.writeFileSync(storageFile.filePath, '{ "foo": { "bar": "baz" } }');
        });

        it("updates the data based on the file contents", () => {
          storageFile.load();
          expect(storageFile.get("foo.bar")).toBe('baz');
        });

        it("notifies observers for updated keypaths on load", () => {
          var observeHandler = jasmine.createSpy("observeHandler");
          var observeSubscription = storageFile.onDidChange("foo.bar", observeHandler);

          storageFile.load();

          expect(observeHandler).toHaveBeenCalledWith({ newValue: 'baz', oldValue: undefined, keyPath: "foo.bar" });
        });
      });

      describe("when the storage file contains invalid json", () => {
        var addErrorHandler = null;
        beforeEach(() => {
          scout.notifications.onDidAddNotification(addErrorHandler = jasmine.createSpy());
          fs.writeFileSync(storageFile.filePath, "{{{{{");
        });

        it("logs an error to the console and does not overwrite the storage file on a subsequent save", (done) => {
          spyOn(storageFile, 'save');
          storageFile.load();
          expect(addErrorHandler.calls.count()).toBe(1);
          storageFile.set("hair", "blonde"); // trigger a save
          setTimeout(() => {
            expect(storageFile.save).not.toHaveBeenCalled();
            done();
          }, 150);
        });
      });

      describe("when the storage file does not exist", () => {
        it("creates it with an empty object", () => {
          if (fs.existsSync(storageFile.filePath)) {
            fs.removeSync(storageFile.filePath);
          }

          storageFile.load();
          expect(fs.existsSync(storageFile.filePath)).toBe(true);
          expect(CSON.readFileSync(storageFile.filePath)).toEqual({});
        });
      });

      describe("when there is a pending save", () => {
        it("does not change the file's contents", (done) => {
          spyOn(storageFile, 'save');
          fs.writeFileSync(storageFile.filePath, '{ "foo": {"bar": "baz" }}');

          storageFile.set("foo.bar", "quux");
          storageFile.load();
          expect(storageFile.get("foo.bar")).toBe("quux");
          expect(storageFile.save.calls.count()).toBe(0);

          setTimeout(() => {
            expect(storageFile.save.calls.count()).toBe(1);

            expect(storageFile.get("foo.bar")).toBe("quux");
            storageFile.load();
            expect(storageFile.get("foo.bar")).toBe("baz");
            done();
          }, 100);
        });
      });
    });

    describe(".setDefaults(keyPath, defaults)", () => {
      it("assigns any previously-unassigned keys to the object at the key path", () => {
        storageFile.set("foo.bar.baz", {a: 1});
        storageFile.setDefaults("foo.bar.baz", {a: 2, b: 3, c: 4});
        expect(storageFile.get("foo.bar.baz.a")).toBe(1);
        expect(storageFile.get("foo.bar.baz.b")).toBe(3);
        expect(storageFile.get("foo.bar.baz.c")).toBe(4);

        storageFile.setDefaults("foo.quux", {x: 0, y: 1});
        expect(storageFile.get("foo.quux.x")).toBe(0);
        expect(storageFile.get("foo.quux.y")).toBe(1);
      });

      it("emits an updated event", () => {
        var updatedCallback = jasmine.createSpy('updated');
        storageFile.onDidChange('foo.bar.baz.a', updatedCallback);
        expect(updatedCallback.calls.count()).toBe(0);
        storageFile.setDefaults("foo.bar.baz.a", {a: 2});
        expect(updatedCallback.calls.count()).toBe(1);
      });

      it("sets a default when the setting's key contains an escaped dot", () => {
        storageFile.setDefaults("foo", {'a\\.b': 1, b: 2});
        expect(storageFile.get("foo")).toEqual({'a\\.b': 1, b: 2});
      });
    });
  });
});

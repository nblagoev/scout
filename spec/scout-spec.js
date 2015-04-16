"use babel";

describe("the `scout` global", () => {
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
});

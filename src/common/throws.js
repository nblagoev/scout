'use babel';

module.exports = {
  ifEmpty(value, name) {
    if (value === null || value === undefined || value === "") {
      throw new Error("Argument '${name}' cannot be null or empty.");
    }
  }
};

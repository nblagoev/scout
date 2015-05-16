'use babel';

module.exports = (n) => {
  let symbolGenerator = {
    * [Symbol.iterator]() {
      for (let i = 0; i < n; i++) {
        yield Symbol();
      }
    }
  };

  return [for (symbol of symbolGenerator) symbol];
}

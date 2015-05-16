'use babel';

export default function symbols(n) {
  let symbolGenerator = {
    * [Symbol.iterator]() {
      for (let i = 0; i < n; i++) {
        yield Symbol();
      }
    }
  };

  return [for (symbol of symbolGenerator) symbol];
}

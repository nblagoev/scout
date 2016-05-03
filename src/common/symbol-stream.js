/*eslint-disable generator-star-spacing*/

export default function symbols(n) {
  let symbolGenerator = {
    * [Symbol.iterator]() {
      for (let i = 0; i < n; i++) {
        yield Symbol()
      }
    }
  }

  let result = []
  for (let symbol of symbolGenerator) {
    result.push(symbol)
  }

  return result
}

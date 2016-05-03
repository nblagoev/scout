angular.module('scout').filter('split', function() {
  return (input, splitChar, splitIndex = 0) => {
    if (!input) {
      return undefined;
    }

    let result = input.split(splitChar);
    if (splitIndex < 0 || splitIndex >= result.length) {
      return undefined;
    } else {
      return result[splitIndex];
    }
  }
});

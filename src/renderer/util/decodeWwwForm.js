export default function decodeWwwForm(input) {
  function decode(token) {
  	return decodeURIComponent(token.replace(/\+/g, " "));
  }

  function parseToken(token) {
  	return token.split("=").map(decode);
  }

  var result = [];

	if (input) {
    input.trim().split("&").map(parseToken).forEach((token) => {
			result.push({key: token[0], value: token[1]});
		})
	}

	return result;
};

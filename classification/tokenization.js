const nGram = require("@drorgl/n-gram");

function tokenize(text, n) {
  const words = text.split(" ").filter((word) => word.length > 0);

  return nGram.default(n)(words);
}

module.exports = {
  tokenize
};
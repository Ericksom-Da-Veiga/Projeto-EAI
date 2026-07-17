const stemmer = require("porter-stemmer").stemmer;

function stemText(text) {
  const words = text.split(" ");

  const stemmedWords = words.map((word) => {
    return stemmer(word);
  });

  return stemmedWords.join(" ");
}

module.exports = {
  stemText
};

const clean = require("./clean");
const stopwords = require("./stopwords");
const stemming = require("./stemming");
const tokenization = require("./tokenization");

function preprocessText(text, nValues = [1, 2], customStopwords = []) {
  const originalText = text;

  let cleanedText = clean.cleanText(text);

  if (customStopwords.length > 0) {
    cleanedText = stopwords.removeCustomStopwords(cleanedText, customStopwords);
  } else {
    cleanedText = stopwords.removeGeneralStopwords(cleanedText);
  }

  const preprocessedText = stemming.stemText(cleanedText);

  const tokens = nValues.map((n) => {
    return {
      n: n,
      tokens: tokenization.tokenize(preprocessedText, n)
    };
  });

  return {
    originalText,
    cleanedText,
    preprocessedText,
    tokens
  };
}

module.exports = {
  preprocessText
};
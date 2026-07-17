const { removeStopwords } = require("stopword");

function removeGeneralStopwords(text) {
  const words = text.split(" ");
  return removeStopwords(words).join(" ");
}

function removeCustomStopwords(text, customStopwords = []) {
  let cleanedText = removeGeneralStopwords(text);

  let words = cleanedText.split(" ");

  words = words.filter((word) => {
    return !customStopwords.includes(word);
  });

  return words.join(" ");
}

module.exports = {
  removeGeneralStopwords,
  removeCustomStopwords
};
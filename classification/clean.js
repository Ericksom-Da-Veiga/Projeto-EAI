function toLowerCase(text) {
  return text.toLowerCase();
}

function cleanSpaces(text) {
  return text.trim().replace(/\s+/g, " ");
}

function removeNonAlphabetic(text) {
  return text.replace(/[^a-zA-Z\s]/g, " ");
}

function cleanText(text) {
  let cleanedText = text;

  cleanedText = toLowerCase(cleanedText);
  cleanedText = removeNonAlphabetic(cleanedText);
  cleanedText = cleanSpaces(cleanedText);

  return cleanedText;
}

module.exports = {
  toLowerCase,
  cleanSpaces,
  removeNonAlphabetic,
  cleanText
};
function tokensAreEqual(tokenA, tokenB) {
  return JSON.stringify(tokenA) === JSON.stringify(tokenB);
}

function countBySize(tokens) {
  return tokens.length;
}

function numberOfOccurrences(tokens, token) {
  return tokens.filter((item) => tokensAreEqual(item, token)).length;
}

function exists(tokens, token) {
  return numberOfOccurrences(tokens, token) > 0;
}

function tf(tokens, token) {
  const totalTokens = countBySize(tokens);

  if (totalTokens === 0) {
    return 0;
  }

  const occurrences = numberOfOccurrences(tokens, token);

  return occurrences / totalTokens;
}

function idf(numberOfDocuments, documentFrequency) {
  if (documentFrequency === 0) {
    return 0;
  }

  return Math.log(numberOfDocuments / documentFrequency);
}

function tfidf(tfValue, idfValue) {
  return tfValue * idfValue;
}

module.exports = {
  countBySize,
  numberOfOccurrences,
  exists,
  tf,
  idf,
  tfidf
};
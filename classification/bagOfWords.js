const counting = require("./counting");

function tokenToString(token) {
  if (Array.isArray(token)) {
    return token.join(" ");
  }

  return token;
}

function addUniqueTerms(vocabulary, terms) {
  terms.forEach((term) => {
    const termName = tokenToString(term);

    if (!vocabulary.includes(termName)) {
      vocabulary.push(termName);
    }
  });

  return vocabulary;
}

function binaryVector(vocabulary, documentTokens, docId) {
  const tokenNames = documentTokens.map(tokenToString);

  return vocabulary.map((term) => ({
    name: term,
    binary: tokenNames.includes(term) ? 1 : 0,
    docId: docId,
  }));
}

function numberOfOccurrencesVector(vocabulary, documentTokens, docId) {
  const tokenNames = documentTokens.map(tokenToString);

  return vocabulary.map((term) => ({
    name: term,
    occurrences: tokenNames.filter((token) => token === term).length,
    docId: docId,
  }));
}

function tfVector(vocabulary, documentTokens, docId) {
  const tokenNames = documentTokens.map(tokenToString);

  return vocabulary.map((term) => {
    const occurrences = tokenNames.filter((token) => token === term).length;
    const tf = tokenNames.length === 0 ? 0 : occurrences / tokenNames.length;

    return {
      name: term,
      tf: tf,
      docId: docId,
    };
  });
}

function idfVector(vocabulary, allDocumentsTokens) {
  const numberOfDocuments = allDocumentsTokens.length;

  return vocabulary.map((term) => {
    const documentFrequency = allDocumentsTokens.filter((documentTokens) => {
      const tokenNames = documentTokens.map(tokenToString);
      return tokenNames.includes(term);
    }).length;

    return {
      name: term,
      idf: counting.idf(numberOfDocuments, documentFrequency),
    };
  });
}

function tfidfVector(tfVectorData, idfVectorData) {
  return tfVectorData.map((termData) => {
    const idfData = idfVectorData.find((item) => item.name === termData.name);
    const idf = idfData ? idfData.idf : 0;

    return {
      name: termData.name,
      tfidf: counting.tfidf(termData.tf, idf),
      docId: termData.docId,
    };
  });
}

function removeOutliersByMinOccurrences(terms, minOccurrences = 2) {
  return terms.filter((term) => term.occurrences >= minOccurrences);
}

function sumVector(terms) {
  if (!Array.isArray(terms) || terms.length === 0) {
    return null;
  }

  const name = terms[0].name;
  let totalOccurrences = 0;
  let totalTf = 0;
  const idf = terms[0].idf;

  terms.forEach((term) => {
    totalOccurrences += term.occurrences;
    totalTf += term.tf;
  });

  const tfidf = totalTf * idf;

  return {
    name: name,
    occurrences: totalOccurrences,
    tf: totalTf,
    idf: idf,
    tfidf: tfidf,
  };
}

function avgVector(terms) {
  if (!Array.isArray(terms) || terms.length === 0) {
    return null;
  }

  const name = terms[0].name;
  let totalOccurrences = 0;
  let totalTf = 0;
  const idf = terms[0].idf;
  const numberOfTerms = terms.length;

  terms.forEach((term) => {
    totalOccurrences += term.occurrences;
    totalTf += term.tf;
  });

  const avgOccurrences = totalOccurrences / numberOfTerms;
  const avgTf = totalTf / numberOfTerms;
  const tfidf = avgTf * idf;

  return {
    name: name,
    occurrences: avgOccurrences,
    tf: avgTf,
    idf: idf,
    tfidf: tfidf,
  };
}

module.exports = {
  addUniqueTerms,
  binaryVector,
  numberOfOccurrencesVector,
  tfVector,
  idfVector,
  tfidfVector,
  removeOutliersByMinOccurrences,
  sumVector,
  avgVector,
};

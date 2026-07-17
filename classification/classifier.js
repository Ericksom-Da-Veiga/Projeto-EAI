const preprocessing = require("./preprocessing");
const counting = require("./counting");

function calculateCosineSimilarity(vectorA, vectorB) {
  const dotProduct = vectorA.reduce((sum, val, i) => sum + val * vectorB[i], 0);
  const normA = Math.sqrt(vectorA.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(vectorB.reduce((sum, val) => sum + val * val, 0));

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

function cosineSimilarity(text, classesData) {
  const results = classesData.map((classData) => {
    const preprocessed = preprocessing.preprocessText(text, [1, 2]);
    const tokens = preprocessed.tokens.flatMap((g) => g.tokens);

    const vector = classData.vocabulary.map((term) => {
      const tf = counting.tf(tokens, term);
      const idfData = classData.idf.find((i) => i.name === term);
      const idf = idfData ? idfData.idf : 0;
      return tf * idf;
    });

    const classVector =
      classData.representativeVector || new Array(vector.length).fill(0);

    return {
      label: classData.label,
      similarity: calculateCosineSimilarity(vector, classVector),
    };
  });

  return results.sort((a, b) => b.similarity - a.similarity)[0].label;
}

function probabilisticClassification(text, classesData) {
  const preprocessed = preprocessing.preprocessText(text, [1, 2]);
  const tokens = preprocessed.tokens.flatMap((g) => g.tokens);

  const results = classesData.map((classData) => {
    // b. Obter prior P(w)
    const prior = classData.prior;

    // a. Calcular P(W | C)
    // Numerador: importância do termo na classe (sum of tfidf for term in class)
    // Denominador: importância total da classe (sum of all tfidf in class)

    // Assumindo que classData.vectorSums contém os termos com seus valores agregados
    const totalImportance =
      classData.vectorSums.unigram.reduce((sum, term) => sum + term.tfidf, 0) +
      classData.vectorSums.bigram.reduce((sum, term) => sum + term.tfidf, 0);

    const logProb = tokens.reduce((acc, token) => {
      const termData = [
        ...classData.vectorSums.unigram,
        ...classData.vectorSums.bigram,
      ].find((t) => t.name === token);

      const termImportance = termData ? termData.tfidf : 0;
      // Laplace smoothing: (count + 1) / (total + vocabSize)
      const prob =
        (termImportance + 1) /
        (totalImportance +
          (classData.vectorSums.unigram.length +
            classData.vectorSums.bigram.length));
      return acc + Math.log(prob);
    }, 0);

    // c. Multiplicar (ou somar logs) prior * P(W|C)
    return {
      label: classData.label,
      score: Math.log(prior) + logProb,
    };
  });

  return results.sort((a, b) => b.score - a.score)[0].label;
}

module.exports = {
  cosineSimilarity,
  calculateCosineSimilarity,
  probabilisticClassification,
};

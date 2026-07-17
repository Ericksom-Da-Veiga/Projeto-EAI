const preprocessing = require("./preprocessing");

function tokenToString(token) {
  if (Array.isArray(token)) {
    return token.join(" ");
  }

  return String(token);
}

function extractTerms(text) {
  const processed = preprocessing.preprocessText(text || "", [1, 2]);

  const terms = processed.tokens.flatMap((group) =>
    group.tokens.map(tokenToString),
  );

  return {
    originalText: processed.originalText,
    cleanedText: processed.cleanedText,
    preprocessedText: processed.preprocessedText,
    terms,
  };
}

function buildModel(
  documents,
  classes = ["fake", "true"],
  maxFeatures = 2000,
) {
  const totalDocuments = documents.length;

  const classData = {};

  classes.forEach((label) => {
    classData[label] = {
      documentCount: 0,
      termCounts: {},
      totalTerms: 0,
    };
  });

  const globalTermCounts = {};
  const documentFrequency = {};

  documents.forEach((document) => {
    const label = document.label;

    if (!classData[label]) {
      return;
    }

    classData[label].documentCount++;

    const extracted = extractTerms(document.text);
    const uniqueTerms = new Set(extracted.terms);

    extracted.terms.forEach((term) => {
      classData[label].termCounts[term] =
        (classData[label].termCounts[term] || 0) + 1;

      globalTermCounts[term] =
        (globalTermCounts[term] || 0) + 1;
    });

    uniqueTerms.forEach((term) => {
      documentFrequency[term] =
        (documentFrequency[term] || 0) + 1;
    });
  });

  const selectedVocabulary = Object.keys(globalTermCounts)
    .map((term) => {
      const df = documentFrequency[term] || 1;
      const idf =
        totalDocuments === 0
          ? 0
          : Math.log(totalDocuments / df);

      return {
        term,
        occurrences: globalTermCounts[term],
        df,
        idf,
        score: globalTermCounts[term] * idf,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFeatures);

  const vocabulary = selectedVocabulary.map(
    (feature) => feature.term,
  );

  const vocabularySet = new Set(vocabulary);

  /*
   * Mantém apenas as características selecionadas
   * dentro de cada classe.
   */
  classes.forEach((label) => {
    const selectedCounts = {};
    let totalSelectedTerms = 0;

    Object.entries(classData[label].termCounts).forEach(
      ([term, count]) => {
        if (vocabularySet.has(term)) {
          selectedCounts[term] = count;
          totalSelectedTerms += count;
        }
      },
    );

    classData[label].termCounts = selectedCounts;
    classData[label].totalTerms = totalSelectedTerms;
  });

  return {
    classes,
    totalDocuments,
    vocabulary,
    selectedFeatures: selectedVocabulary,
    classData,
  };
}

/**
 * Converte os scores logarítmicos em percentagens.
 */
function scoresToProbabilities(scores) {
  const values = Object.values(scores);

  if (values.length === 0) {
    return {};
  }

  const maximum = Math.max(...values);

  const exponentials = {};

  Object.entries(scores).forEach(([label, score]) => {
    exponentials[label] = Math.exp(score - maximum);
  });

  const total = Object.values(exponentials).reduce(
    (sum, value) => sum + value,
    0,
  );

  const probabilities = {};

  Object.entries(exponentials).forEach(([label, value]) => {
    probabilities[label] =
      total === 0 ? 0 : value / total;
  });

  return probabilities;
}

/**
 * Classifica um texto como fake ou true.
 */
function classify(text, model) {
  const extracted = extractTerms(text);
  const vocabularySet = new Set(model.vocabulary);

  const terms = extracted.terms.filter((term) =>
    vocabularySet.has(term),
  );

  const scores = {};
  const vocabularySize = model.vocabulary.length;

  model.classes.forEach((label) => {
    const data = model.classData[label];

    const prior =
      model.totalDocuments === 0
        ? 0
        : data.documentCount / model.totalDocuments;

    let score =
      prior > 0
        ? Math.log(prior)
        : Number.NEGATIVE_INFINITY;

    terms.forEach((term) => {
      const count = data.termCounts[term] || 0;

      // Suavização de Laplace
      const probability =
        (count + 1) /
        (data.totalTerms + vocabularySize);

      score += Math.log(probability);
    });

    scores[label] = score;
  });

  const probabilities = scoresToProbabilities(scores);

  const ranking = model.classes
    .map((label) => ({
      label,
      score: scores[label],
      probability: probabilities[label] || 0,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    predictedLabel: ranking[0]
      ? ranking[0].label
      : null,
    confidence: ranking[0]
      ? ranking[0].probability
      : 0,
    ranking,
    processed: {
      originalText: extracted.originalText,
      cleanedText: extracted.cleanedText,
      preprocessedText: extracted.preprocessedText,
      recognizedTerms: terms,
      recognizedTermsCount: terms.length,
    },
  };
}

module.exports = {
  extractTerms,
  buildModel,
  classify,
};
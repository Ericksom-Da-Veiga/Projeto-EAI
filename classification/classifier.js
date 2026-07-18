const { performance } = require("perf_hooks");
const preprocessing = require("./preprocessing");

function tokenToString(token) {
  if (Array.isArray(token)) {
    return token.join(" ");
  }

  return String(token);
}

function countOriginalWords(text) {
  if (!text || typeof text !== "string") {
    return 0;
  }

  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.length;
}

function extractTerms(text) {
  const safeText =
    typeof text === "string"
      ? text
      : String(text || "");

  const processed = preprocessing.preprocessText(
    safeText,
    [1, 2],
  );

  const tokenGroups = Array.isArray(processed.tokens)
    ? processed.tokens
    : [];

  const terms = tokenGroups.flatMap((group) => {
    if (!group || !Array.isArray(group.tokens)) {
      return [];
    }

    return group.tokens
      .map(tokenToString)
      .map((term) => term.trim())
      .filter(Boolean);
  });

  const uniqueTerms = [...new Set(terms)];

  const preprocessedWords =
    processed.preprocessedText &&
    typeof processed.preprocessedText === "string"
      ? processed.preprocessedText
          .trim()
          .split(/\s+/)
          .filter(Boolean)
      : [];

  return {
    originalText: processed.originalText || safeText,
    cleanedText: processed.cleanedText || "",
    preprocessedText:
      processed.preprocessedText || "",

    terms,
    uniqueTerms,

    originalWordsCount:
      countOriginalWords(safeText),

    preprocessedWordsCount:
      preprocessedWords.length,

    totalTermsCount:
      terms.length,

    uniqueTermsCount:
      uniqueTerms.length,
  };
}

function buildModel(
  documents,
  classes = ["fake", "true"],
  maxFeatures = 2000,
) {
  const startTime = performance.now();

  const safeDocuments = Array.isArray(documents)
    ? documents
    : [];

  const safeClasses =
    Array.isArray(classes) && classes.length > 0
      ? classes
      : ["fake", "true"];

  const totalDocuments = safeDocuments.length;

  const classData = {};

  safeClasses.forEach((label) => {
    classData[label] = {
      documentCount: 0,
      termCounts: {},
      totalTerms: 0,
    };
  });

  const globalTermCounts = {};
  const documentFrequency = {};

  safeDocuments.forEach((document) => {
    if (!document) {
      return;
    }

    const label = document.label;

    if (!classData[label]) {
      return;
    }

    const documentText = [
      document.title || "",
      document.text || "",
    ]
      .filter(Boolean)
      .join(" ");

    classData[label].documentCount++;

    const extracted = extractTerms(documentText);

    const uniqueTerms =
      new Set(extracted.terms);

    extracted.terms.forEach((term) => {
      classData[label].termCounts[term] =
        (
          classData[label].termCounts[term] ||
          0
        ) + 1;

      globalTermCounts[term] =
        (globalTermCounts[term] || 0) + 1;
    });

    uniqueTerms.forEach((term) => {
      documentFrequency[term] =
        (documentFrequency[term] || 0) + 1;
    });
  });

  const selectedVocabulary =
    Object.keys(globalTermCounts)
      .map((term) => {
        const df =
          documentFrequency[term] || 1;

        const idf =
          totalDocuments === 0
            ? 0
            : Math.log(
                (totalDocuments + 1) /
                  (df + 1),
              ) + 1;

        const occurrences =
          globalTermCounts[term];

        return {
          term,
          occurrences,
          documentFrequency: df,
          df,
          idf,
          score: occurrences * idf,
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return (
          b.occurrences -
          a.occurrences
        );
      })
      .slice(0, maxFeatures);

  const vocabulary =
    selectedVocabulary.map(
      (feature) => feature.term,
    );

  const vocabularySet =
    new Set(vocabulary);

  safeClasses.forEach((label) => {
    const selectedCounts = {};
    let totalSelectedTerms = 0;

    Object.entries(
      classData[label].termCounts,
    ).forEach(([term, count]) => {
      if (vocabularySet.has(term)) {
        selectedCounts[term] = count;
        totalSelectedTerms += count;
      }
    });

    classData[label].termCounts =
      selectedCounts;

    classData[label].totalTerms =
      totalSelectedTerms;
  });

  const endTime = performance.now();

  const classDistribution = {};

  safeClasses.forEach((label) => {
    const count =
      classData[label].documentCount;

    classDistribution[label] = {
      documents: count,

      percentage:
        totalDocuments === 0
          ? 0
          : count / totalDocuments,
    };
  });

  return {
    algorithm:
      "Multinomial Naive Bayes",

    classes: safeClasses,
    totalDocuments,
    vocabulary,
    vocabularySet,
    vocabularySize: vocabulary.length,

    selectedFeatures:
      selectedVocabulary,

    classData,
    classDistribution,

    configuration: {
      maxFeatures,
      ngramSizes: [1, 2],
      laplaceSmoothing: 1,
    },

    trainingTimeMs:
      endTime - startTime,
  };
}

function scoresToProbabilities(scores) {
  const validEntries =
    Object.entries(scores).filter(
      ([, score]) =>
        Number.isFinite(score),
    );

  if (validEntries.length === 0) {
    return {};
  }

  const maximum = Math.max(
    ...validEntries.map(
      ([, score]) => score,
    ),
  );

  const exponentials = {};

  validEntries.forEach(([label, score]) => {
    exponentials[label] =
      Math.exp(score - maximum);
  });

  const total = Object.values(
    exponentials,
  ).reduce(
    (sum, value) => sum + value,
    0,
  );

  const probabilities = {};

  validEntries.forEach(([label]) => {
    probabilities[label] =
      total === 0
        ? 0
        : exponentials[label] /
          total;
  });

  return probabilities;
}

function calculateTermProbability(
  term,
  label,
  model,
) {
  const data =
    model.classData[label];

  if (!data) {
    return 0;
  }

  const vocabularySize =
    Math.max(
      model.vocabulary.length,
      1,
    );

  const count =
    data.termCounts[term] || 0;

  const denominator =
    data.totalTerms +
    vocabularySize;

  if (denominator <= 0) {
    return 0;
  }

  return (
    (count + 1) /
    denominator
  );
}

function calculateTermContributions(
  recognizedTerms,
  model,
  predictedLabel,
) {
  if (
    !predictedLabel ||
    model.classes.length < 2
  ) {
    return [];
  }

  const otherLabels =
    model.classes.filter(
      (label) =>
        label !== predictedLabel,
    );

  const referenceLabel =
    otherLabels[0];

  const termOccurrences = {};

  recognizedTerms.forEach((term) => {
    termOccurrences[term] =
      (termOccurrences[term] || 0) + 1;
  });

  const contributions =
    Object.entries(termOccurrences)
      .map(([term, frequency]) => {
        const predictedProbability =
          calculateTermProbability(
            term,
            predictedLabel,
            model,
          );

        const referenceProbability =
          calculateTermProbability(
            term,
            referenceLabel,
            model,
          );

        const predictedLog =
          predictedProbability > 0
            ? Math.log(
                predictedProbability,
              )
            : 0;

        const referenceLog =
          referenceProbability > 0
            ? Math.log(
                referenceProbability,
              )
            : 0;

        const contribution =
          (
            predictedLog -
            referenceLog
          ) * frequency;

        return {
          term,
          frequency,
          predictedLabel,
          referenceLabel,

          predictedProbability,
          referenceProbability,

          contribution,
          absoluteContribution:
            Math.abs(contribution),

          favorsPrediction:
            contribution >= 0,
        };
      })
      .sort(
        (a, b) =>
          b.absoluteContribution -
          a.absoluteContribution,
      );

  return contributions;
}

function classify(text, model) {
  const startTime = performance.now();

  if (!model) {
    throw new Error(
      "O modelo não foi fornecido.",
    );
  }

  if (
    !Array.isArray(model.vocabulary) ||
    !model.classData
  ) {
    throw new Error(
      "O modelo possui uma estrutura inválida.",
    );
  }

  const safeText =
    typeof text === "string"
      ? text
      : String(text || "");

  const extracted =
    extractTerms(safeText);

  const vocabularySet =
    model.vocabularySet instanceof Set
      ? model.vocabularySet
      : new Set(model.vocabulary);

  const recognizedTerms =
    extracted.terms.filter((term) =>
      vocabularySet.has(term),
    );

  const ignoredTerms =
    extracted.terms.filter(
      (term) =>
        !vocabularySet.has(term),
    );

  const uniqueRecognizedTerms = [
    ...new Set(recognizedTerms),
  ];

  const uniqueIgnoredTerms = [
    ...new Set(ignoredTerms),
  ];

  const scores = {};

  const vocabularySize =
    Math.max(
      model.vocabulary.length,
      1,
    );

  model.classes.forEach((label) => {
    const data =
      model.classData[label];

    if (!data) {
      scores[label] =
        Number.NEGATIVE_INFINITY;
      return;
    }

    const prior =
      model.totalDocuments === 0
        ? 0
        : data.documentCount /
          model.totalDocuments;

    let score =
      prior > 0
        ? Math.log(prior)
        : Number.NEGATIVE_INFINITY;

    recognizedTerms.forEach(
      (term) => {
        const count =
          data.termCounts[term] || 0;

        const denominator =
          data.totalTerms +
          vocabularySize;

        const probability =
          denominator > 0
            ? (count + 1) /
              denominator
            : 0;

        if (probability > 0) {
          score +=
            Math.log(probability);
        }
      },
    );

    scores[label] = score;
  });

  const probabilities =
    scoresToProbabilities(scores);

  const ranking =
    model.classes
      .map((label) => ({
        label,
        score: scores[label],

        probability:
          probabilities[label] ||
          0,

        percentage:
          (
            (
              probabilities[label] ||
              0
            ) * 100
          ),
      }))
      .sort(
        (a, b) =>
          b.probability -
          a.probability,
      );

  const predictedLabel =
    ranking[0]
      ? ranking[0].label
      : null;

  const confidence =
    ranking[0]
      ? ranking[0].probability
      : 0;

  const secondProbability =
    ranking[1]
      ? ranking[1].probability
      : 0;

  const confidenceMargin =
    confidence -
    secondProbability;

  const contributions =
    calculateTermContributions(
      recognizedTerms,
      model,
      predictedLabel,
    );

  const favorableContributions =
    contributions.filter(
      (item) =>
        item.favorsPrediction,
    );

  const opposingContributions =
    contributions.filter(
      (item) =>
        !item.favorsPrediction,
    );

  const coverage =
    extracted.terms.length === 0
      ? 0
      : recognizedTerms.length /
        extracted.terms.length;

  const endTime = performance.now();

  let confidenceLevel = "baixa";

  if (confidence >= 0.85) {
    confidenceLevel = "alta";
  } else if (confidence >= 0.65) {
    confidenceLevel = "média";
  }

  let explanation = "";

  if (recognizedTerms.length === 0) {
    explanation =
      "Nenhum termo do texto foi reconhecido pelo vocabulário do modelo. A previsão foi baseada principalmente na distribuição das classes.";
  } else if (
    confidenceLevel === "alta"
  ) {
    explanation =
      "O modelo encontrou evidências fortes para esta classificação.";
  } else if (
    confidenceLevel === "média"
  ) {
    explanation =
      "O modelo encontrou evidências moderadas para esta classificação.";
  } else {
    explanation =
      "As probabilidades das classes ficaram próximas. Recomenda-se interpretar esta previsão com cautela.";
  }

  return {
    predictedLabel,
    confidence,
    confidencePercentage:
      confidence * 100,

    confidenceLevel,
    confidenceMargin,
    explanation,

    ranking,
    probabilities,
    scores,

    processingTimeMs:
      endTime - startTime,

    processed: {
      originalText:
        extracted.originalText,

      cleanedText:
        extracted.cleanedText,

      preprocessedText:
        extracted.preprocessedText,

      originalWordsCount:
        extracted.originalWordsCount,

      preprocessedWordsCount:
        extracted.preprocessedWordsCount,

      totalTermsCount:
        extracted.totalTermsCount,

      uniqueTermsCount:
        extracted.uniqueTermsCount,

      recognizedTerms,
      recognizedTermsCount:
        recognizedTerms.length,

      uniqueRecognizedTerms,
      uniqueRecognizedTermsCount:
        uniqueRecognizedTerms.length,

      ignoredTerms,
      ignoredTermsCount:
        ignoredTerms.length,

      uniqueIgnoredTerms,
      uniqueIgnoredTermsCount:
        uniqueIgnoredTerms.length,

      vocabularyCoverage:
        coverage,

      vocabularyCoveragePercentage:
        coverage * 100,
    },

    contributions: {
      all: contributions,

      top:
        contributions.slice(0, 20),

      favorable:
        favorableContributions.slice(
          0,
          20,
        ),

      opposing:
        opposingContributions.slice(
          0,
          20,
        ),
    },
  };
}

module.exports = {
  tokenToString,
  countOriginalWords,
  extractTerms,
  buildModel,
  scoresToProbabilities,
  calculateTermProbability,
  calculateTermContributions,
  classify,
};
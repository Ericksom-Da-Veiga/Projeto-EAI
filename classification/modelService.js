const { performance } = require("perf_hooks");

const trainingSetDatabase = require(
  "../database/trainingset",
);

const classifier = require("./classifier");
const evaluation = require("./evaluation");

const CLASSES = ["fake", "true"];
const MAX_FEATURES = 2000;

let cachedModel = null;
let cachedEvaluation = null;
let trainedAt = null;
let lastTrainingDurationMs = 0;

function getTrainingDocuments() {
  const documents =
    trainingSetDatabase.getAllTrainingSet();

  if (!Array.isArray(documents)) {
    throw new Error(
      "O conjunto de treino não possui um formato válido.",
    );
  }

  if (documents.length === 0) {
    throw new Error(
      "O conjunto de treino está vazio.",
    );
  }

  return documents;
}

function validateTrainingDocuments(documents) {
  CLASSES.forEach((label) => {
    const classDocuments =
      documents.filter(
        (document) =>
          document &&
          document.label === label,
      );

    if (classDocuments.length === 0) {
      throw new Error(
        `O conjunto de treino precisa conter documentos da classe "${label}".`,
      );
    }
  });
}

function trainModel() {
  const trainingStart =
    performance.now();

  const documents =
    getTrainingDocuments();

  validateTrainingDocuments(
    documents,
  );

  cachedModel =
    classifier.buildModel(
      documents,
      CLASSES,
      MAX_FEATURES,
    );

  cachedEvaluation = null;
  trainedAt = new Date();

  const trainingEnd =
    performance.now();

  lastTrainingDurationMs =
    trainingEnd -
    trainingStart;

  return getModelSummary();
}

function getModel() {
  if (!cachedModel) {
    trainModel();
  }

  return cachedModel;
}

function evaluateModel(options = {}) {
  const force =
    options.force === true;

  if (
    cachedEvaluation &&
    !force
  ) {
    return cachedEvaluation;
  }

  const documents =
    getTrainingDocuments();

  validateTrainingDocuments(
    documents,
  );

  cachedEvaluation =
    evaluation.evaluate(
      documents,
      CLASSES,
      MAX_FEATURES,
      {
        testRatio:
          typeof options.testRatio ===
            "number"
            ? options.testRatio
            : 0.2,

        seed:
          Number.isInteger(
            options.seed,
          )
            ? options.seed
            : 12345,
      },
    );

  cachedEvaluation.generatedAt =
    new Date().toISOString();

  return cachedEvaluation;
}

function classifyText(text) {
  if (
    typeof text !== "string" ||
    text.trim().length === 0
  ) {
    throw new Error(
      "Digite um texto válido para realizar a classificação.",
    );
  }

  const model = getModel();

  const result =
    classifier.classify(
      text,
      model,
    );

  return {
    ...result,

    model: {
      algorithm:
        model.algorithm,

      trainedAt:
        trainedAt instanceof Date
          ? trainedAt.toISOString()
          : null,

      totalDocuments:
        model.totalDocuments,

      vocabularySize:
        model.vocabulary.length,

      maxFeatures:
        model.configuration
          ? model.configuration
              .maxFeatures
          : MAX_FEATURES,

      ngramSizes:
        model.configuration
          ? model.configuration
              .ngramSizes
          : [1, 2],

      laplaceSmoothing:
        model.configuration
          ? model.configuration
              .laplaceSmoothing
          : 1,
    },
  };
}

function invalidateModel() {
  cachedModel = null;
  cachedEvaluation = null;
  trainedAt = null;
  lastTrainingDurationMs = 0;
}

function invalidateEvaluation() {
  cachedEvaluation = null;
}

function getModelSummary() {
  if (!cachedModel) {
    return {
      trained: false,
      trainedAt: null,
      algorithm:
        "Multinomial Naive Bayes",
      totalDocuments: 0,
      vocabularySize: 0,
      selectedFeatures: 0,
      trainingTimeMs: 0,
      classes: {},
      configuration: {
        maxFeatures:
          MAX_FEATURES,
        ngramSizes: [1, 2],
        laplaceSmoothing: 1,
      },
      topFeatures: [],
    };
  }

  const classes = {};

  cachedModel.classes.forEach(
    (label) => {
      const classInfo =
        cachedModel.classData[label];

      const distributionInfo =
        cachedModel.classDistribution
          ? cachedModel.classDistribution[
              label
            ]
          : null;

      classes[label] = {
        documents:
          classInfo.documentCount,

        percentage:
          distributionInfo
            ? distributionInfo.percentage
            : cachedModel.totalDocuments ===
                0
              ? 0
              : classInfo.documentCount /
                cachedModel.totalDocuments,

        percentageFormatted:
          `${(
            (
              distributionInfo
                ? distributionInfo.percentage
                : cachedModel.totalDocuments ===
                    0
                  ? 0
                  : classInfo.documentCount /
                    cachedModel.totalDocuments
            ) * 100
          ).toFixed(2)}%`,

        selectedTerms:
          Object.keys(
            classInfo.termCounts,
          ).length,

        totalTerms:
          classInfo.totalTerms,
      };
    },
  );

  return {
    trained: true,

    trainedAt:
      trainedAt instanceof Date
        ? trainedAt.toISOString()
        : null,

    algorithm:
      cachedModel.algorithm ||
      "Multinomial Naive Bayes",

    totalDocuments:
      cachedModel.totalDocuments,

    vocabularySize:
      cachedModel.vocabulary.length,

    selectedFeatures:
      cachedModel.selectedFeatures.length,

    trainingTimeMs:
      cachedModel.trainingTimeMs ||
      lastTrainingDurationMs,

    totalTrainingRequestTimeMs:
      lastTrainingDurationMs,

    classes,

    configuration: {
      maxFeatures:
        cachedModel.configuration
          ? cachedModel.configuration
              .maxFeatures
          : MAX_FEATURES,

      ngramSizes:
        cachedModel.configuration
          ? cachedModel.configuration
              .ngramSizes
          : [1, 2],

      laplaceSmoothing:
        cachedModel.configuration
          ? cachedModel.configuration
              .laplaceSmoothing
          : 1,
    },

    topFeatures:
      cachedModel.selectedFeatures
        .slice(0, 20)
        .map((feature) => ({
          term: feature.term,
          occurrences:
            feature.occurrences,
          documentFrequency:
            feature.documentFrequency ||
            feature.df,
          idf: feature.idf,
          score: feature.score,
        })),
  };
}

/**
 * Retorna o estado atual do serviço.
 */
function getServiceStatus() {
  return {
    modelTrained:
      Boolean(cachedModel),

    evaluationAvailable:
      Boolean(cachedEvaluation),

    trainedAt:
      trainedAt instanceof Date
        ? trainedAt.toISOString()
        : null,

    classes: CLASSES,
    maxFeatures:
      MAX_FEATURES,
  };
}

module.exports = {
  CLASSES,
  MAX_FEATURES,
  trainModel,
  getModel,
  evaluateModel,
  classifyText,
  invalidateModel,
  invalidateEvaluation,
  getModelSummary,
  getServiceStatus,
};
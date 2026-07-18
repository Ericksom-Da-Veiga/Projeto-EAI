const { performance } = require("perf_hooks");

const classifier = require("./classifier");
const stats = require("./stats");

function deterministicShuffle(items, seed = 12345) {
  const shuffled = [...items];

  let currentSeed = seed;

  function random() {
    currentSeed =
      (currentSeed * 9301 + 49297) % 233280;

    return currentSeed / 233280;
  }

  for (
    let index = shuffled.length - 1;
    index > 0;
    index--
  ) {
    const randomIndex = Math.floor(
      random() * (index + 1),
    );

    const temporary = shuffled[index];

    shuffled[index] =
      shuffled[randomIndex];

    shuffled[randomIndex] =
      temporary;
  }

  return shuffled;
}

function splitDocuments(
  documents,
  classes = ["fake", "true"],
  testRatio = 0.2,
  seed = 12345,
) {
  const safeDocuments =
    Array.isArray(documents)
      ? documents
      : [];

  const safeClasses =
    Array.isArray(classes) &&
    classes.length > 0
      ? classes
      : ["fake", "true"];

  const trainingDocuments = [];
  const testDocuments = [];

  const distribution = {};

  safeClasses.forEach(
    (label, classIndex) => {
      const classDocuments =
        safeDocuments.filter(
          (document) =>
            document &&
            document.label === label,
        );

      const shuffledDocuments =
        deterministicShuffle(
          classDocuments,
          seed + classIndex,
        );

      let testSize = Math.floor(
        shuffledDocuments.length *
          testRatio,
      );

      if (
        shuffledDocuments.length > 1 &&
        testSize < 1
      ) {
        testSize = 1;
      }

      if (
        testSize >=
          shuffledDocuments.length &&
        shuffledDocuments.length > 1
      ) {
        testSize =
          shuffledDocuments.length - 1;
      }

      const classTestDocuments =
        shuffledDocuments.slice(
          0,
          testSize,
        );

      const classTrainingDocuments =
        shuffledDocuments.slice(
          testSize,
        );

      testDocuments.push(
        ...classTestDocuments,
      );

      trainingDocuments.push(
        ...classTrainingDocuments,
      );

      distribution[label] = {
        total:
          shuffledDocuments.length,

        training:
          classTrainingDocuments.length,

        test:
          classTestDocuments.length,
      };
    },
  );

  return {
    trainingDocuments,
    testDocuments,
    distribution,
    testRatio,
    seed,
  };
}

function average(values) {
  const validValues =
    values.filter((value) =>
      Number.isFinite(value),
    );

  if (validValues.length === 0) {
    return 0;
  }

  return (
    validValues.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / validValues.length
  );
}

function weightedAverage(
  items,
  valueKey,
  weightKey,
) {
  const totalWeight =
    items.reduce(
      (sum, item) =>
        sum +
        (Number(item[weightKey]) || 0),
      0,
    );

  if (totalWeight === 0) {
    return 0;
  }

  const weightedSum =
    items.reduce(
      (sum, item) => {
        const value =
          Number(item[valueKey]) || 0;

        const weight =
          Number(item[weightKey]) || 0;

        return (
          sum + value * weight
        );
      },
      0,
    );

  return weightedSum / totalWeight;
}

function countActualDocuments(
  results,
  label,
) {
  return results.filter(
    (result) =>
      result.actual === label,
  ).length;
}

function evaluate(
  documents,
  classes = ["fake", "true"],
  maxFeatures = 2000,
  options = {},
) {
  const evaluationStart =
    performance.now();

  const safeDocuments =
    Array.isArray(documents)
      ? documents
      : [];

  const safeClasses =
    Array.isArray(classes) &&
    classes.length > 0
      ? classes
      : ["fake", "true"];

  const testRatio =
    typeof options.testRatio ===
      "number"
      ? options.testRatio
      : 0.2;

  const seed =
    Number.isInteger(options.seed)
      ? options.seed
      : 12345;

  if (safeDocuments.length === 0) {
    throw new Error(
      "Não existem documentos disponíveis para avaliação.",
    );
  }

  safeClasses.forEach((label) => {
    const classDocuments =
      safeDocuments.filter(
        (document) =>
          document &&
          document.label === label,
      );

    if (
      classDocuments.length < 2
    ) {
      throw new Error(
        `A classe "${label}" precisa ter pelo menos dois documentos para realizar a avaliação.`,
      );
    }
  });

  const split = splitDocuments(
    safeDocuments,
    safeClasses,
    testRatio,
    seed,
  );

  if (
    split.trainingDocuments.length ===
      0 ||
    split.testDocuments.length === 0
  ) {
    throw new Error(
      "Não foi possível criar conjuntos válidos de treino e teste.",
    );
  }

  const modelBuildStart =
    performance.now();

  const model =
    classifier.buildModel(
      split.trainingDocuments,
      safeClasses,
      maxFeatures,
    );

  const modelBuildEnd =
    performance.now();

  const classificationStart =
    performance.now();

  const results =
    split.testDocuments.map(
      (document, index) => {
        const text = [
          document.title || "",
          document.text || "",
        ]
          .filter(Boolean)
          .join(" ");

        const prediction =
          classifier.classify(
            text,
            model,
          );

        return {
          id:
            document.id !==
              undefined
              ? document.id
              : index,

          title:
            document.title ||
            `Documento ${index + 1}`,

          text:
            document.text || "",

          actual:
            document.label,

          predicted:
            prediction.predictedLabel,

          confidence:
            prediction.confidence,

          confidencePercentage:
            prediction.confidencePercentage,

          confidenceLevel:
            prediction.confidenceLevel,

          correct:
            document.label ===
            prediction.predictedLabel,

          processingTimeMs:
            prediction.processingTimeMs,

          recognizedTermsCount:
            prediction.processed
              .recognizedTermsCount,

          vocabularyCoverage:
            prediction.processed
              .vocabularyCoverage,

          vocabularyCoveragePercentage:
            prediction.processed
              .vocabularyCoveragePercentage,

          topContributions:
            prediction.contributions
              .top
              .slice(0, 5),

          ranking:
            prediction.ranking,
        };
      },
    );

  const classificationEnd =
    performance.now();

  const matrix =
    stats.confusionMatrix(
      results,
      safeClasses,
    );

  const perClass = {};

  safeClasses.forEach((label) => {
    const precisionValue =
      stats.precision(
        matrix,
        label,
      );

    const recallValue =
      stats.recall(
        matrix,
        label,
      );

    const f1Value =
      stats.fMeasure(
        precisionValue,
        recallValue,
      );

    const support =
      countActualDocuments(
        results,
        label,
      );

    const predictedCount =
      results.filter(
        (result) =>
          result.predicted === label,
      ).length;

    const correctCount =
      results.filter(
        (result) =>
          result.actual === label &&
          result.predicted === label,
      ).length;

    perClass[label] = {
      precision: precisionValue,
      recall: recallValue,
      f1: f1Value,
      support,
      predictedCount,
      correctCount,
    };
  });

  const accuracyValue =
    stats.accuracy(
      matrix,
      safeClasses,
    );

  const correctResults =
    results.filter(
      (result) =>
        result.correct,
    );

  const incorrectResults =
    results.filter(
      (result) =>
        !result.correct,
    );

  const classMetricValues =
    safeClasses.map(
      (label) => ({
        label,
        precision:
          perClass[label].precision,

        recall:
          perClass[label].recall,

        f1:
          perClass[label].f1,

        support:
          perClass[label].support,
      }),
    );

  const macroAverage = {
    precision: average(
      classMetricValues.map(
        (item) =>
          item.precision,
      ),
    ),

    recall: average(
      classMetricValues.map(
        (item) =>
          item.recall,
      ),
    ),

    f1: average(
      classMetricValues.map(
        (item) => item.f1,
      ),
    ),
  };

  const weightedAverageMetrics = {
    precision: weightedAverage(
      classMetricValues,
      "precision",
      "support",
    ),

    recall: weightedAverage(
      classMetricValues,
      "recall",
      "support",
    ),

    f1: weightedAverage(
      classMetricValues,
      "f1",
      "support",
    ),
  };

  const averageConfidence =
    average(
      results.map(
        (result) =>
          result.confidence,
      ),
    );

  const averageCorrectConfidence =
    average(
      correctResults.map(
        (result) =>
          result.confidence,
      ),
    );

  const averageIncorrectConfidence =
    average(
      incorrectResults.map(
        (result) =>
          result.confidence,
      ),
    );

  const averageCoverage =
    average(
      results.map(
        (result) =>
          result.vocabularyCoverage,
      ),
    );

  const averageClassificationTimeMs =
    average(
      results.map(
        (result) =>
          result.processingTimeMs,
      ),
    );

  const evaluationEnd =
    performance.now();

  return {
    algorithm:
      model.algorithm ||
      "Multinomial Naive Bayes",

    configuration: {
      testRatio,
      trainingRatio:
        1 - testRatio,

      maxFeatures,
      seed,

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

    dataset: {
      totalDocuments:
        safeDocuments.length,

      trainingSize:
        split.trainingDocuments
          .length,

      testSize:
        split.testDocuments.length,

      distribution:
        split.distribution,
    },

    trainingSize:
      split.trainingDocuments.length,

    testSize:
      split.testDocuments.length,

    selectedFeatures:
      model.selectedFeatures.length,

    vocabularySize:
      model.vocabulary.length,

    topSelectedFeatures:
      model.selectedFeatures.slice(
        0,
        20,
      ),

    accuracy:
      accuracyValue,

    accuracyPercentage:
      accuracyValue * 100,

    confusionMatrix:
      matrix,

    perClass,

    macroAverage,
    weightedAverage:
      weightedAverageMetrics,

    summary: {
      totalPredictions:
        results.length,

      correctPredictions:
        correctResults.length,

      incorrectPredictions:
        incorrectResults.length,

      errorRate:
        results.length === 0
          ? 0
          : incorrectResults.length /
            results.length,

      errorRatePercentage:
        results.length === 0
          ? 0
          : (
              incorrectResults.length /
              results.length
            ) * 100,

      averageConfidence,

      averageConfidencePercentage:
        averageConfidence * 100,

      averageCorrectConfidence,

      averageCorrectConfidencePercentage:
        averageCorrectConfidence *
        100,

      averageIncorrectConfidence,

      averageIncorrectConfidencePercentage:
        averageIncorrectConfidence *
        100,

      averageVocabularyCoverage:
        averageCoverage,

      averageVocabularyCoveragePercentage:
        averageCoverage * 100,
    },

    timings: {
      modelTrainingTimeMs:
        model.trainingTimeMs ||
        modelBuildEnd -
          modelBuildStart,

      totalModelBuildTimeMs:
        modelBuildEnd -
        modelBuildStart,

      totalClassificationTimeMs:
        classificationEnd -
        classificationStart,

      averageClassificationTimeMs,

      totalEvaluationTimeMs:
        evaluationEnd -
        evaluationStart,
    },

    examples: {
      correct:
        correctResults
          .slice(0, 10),

      incorrect:
        incorrectResults
          .sort(
            (a, b) =>
              b.confidence -
              a.confidence,
          )
          .slice(0, 10),

      highestConfidence:
        [...results]
          .sort(
            (a, b) =>
              b.confidence -
              a.confidence,
          )
          .slice(0, 10),

      lowestConfidence:
        [...results]
          .sort(
            (a, b) =>
              a.confidence -
              b.confidence,
          )
          .slice(0, 10),
    },

    results,
  };
}

module.exports = {
  deterministicShuffle,
  splitDocuments,
  average,
  weightedAverage,
  countActualDocuments,
  evaluate,
};
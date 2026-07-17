const classifier = require("./classifier");
const stats = require("./stats");

function splitDocuments(
  documents,
  classes = ["fake", "true"],
  testRatio = 0.2,
) {
  const trainingDocuments = [];
  const testDocuments = [];

  classes.forEach((label) => {
    const classDocuments = documents.filter(
      (document) => document.label === label,
    );

    const testSize = Math.max(
      1,
      Math.floor(classDocuments.length * testRatio),
    );

    classDocuments.forEach((document, index) => {
      if (index % 5 === 0 && testDocuments.filter(
        (item) => item.label === label,
      ).length < testSize) {
        testDocuments.push(document);
      } else {
        trainingDocuments.push(document);
      }
    });
  });

  return {
    trainingDocuments,
    testDocuments,
  };
}

function evaluate(
  documents,
  classes = ["fake", "true"],
  maxFeatures = 2000,
) {
  const split = splitDocuments(
    documents,
    classes,
    0.2,
  );

  const model = classifier.buildModel(
    split.trainingDocuments,
    classes,
    maxFeatures,
  );

  const results = split.testDocuments.map(
    (document) => {
      const prediction = classifier.classify(
        document.text,
        model,
      );

      return {
        id: document.id,
        title: document.title,
        actual: document.label,
        predicted: prediction.predictedLabel,
        confidence: prediction.confidence,
        correct:
          document.label ===
          prediction.predictedLabel,
      };
    },
  );

  const matrix = stats.confusionMatrix(
    results,
    classes,
  );

  const perClass = {};

  classes.forEach((label) => {
    const precisionValue = stats.precision(
      matrix,
      label,
    );

    const recallValue = stats.recall(
      matrix,
      label,
    );

    perClass[label] = {
      precision: precisionValue,
      recall: recallValue,
      f1: stats.fMeasure(
        precisionValue,
        recallValue,
      ),
    };
  });

  return {
    trainingSize: split.trainingDocuments.length,
    testSize: split.testDocuments.length,
    selectedFeatures:
      model.selectedFeatures.length,
    accuracy: stats.accuracy(
      matrix,
      classes,
    ),
    confusionMatrix: matrix,
    perClass,
    results,
  };
}

module.exports = {
  splitDocuments,
  evaluate,
};
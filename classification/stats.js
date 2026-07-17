function confusionMatrix(results, classes) {
  const matrix = {};
  classes.forEach((actual) => {
    matrix[actual] = {};
    classes.forEach((predicted) => {
      matrix[actual][predicted] = 0;
    });
  });

  results.forEach((r) => {
    matrix[r.actual][r.predicted]++;
  });

  return matrix;
}

function precision(matrix, label) {
  const tp = matrix[label][label];
  const totalPredicted = Object.keys(matrix).reduce((sum, actual) => sum + matrix[actual][label], 0);
  return totalPredicted === 0 ? 0 : tp / totalPredicted;
}

function recall(matrix, label) {
  const tp = matrix[label][label];
  const totalActual = Object.keys(matrix[label]).reduce((sum, predicted) => sum + matrix[label][predicted], 0);
  return totalActual === 0 ? 0 : tp / totalActual;
}

function fMeasure(precision, recall) {
  return (precision + recall) === 0 ? 0 : 2 * (precision * recall) / (precision + recall);
}

function accuracy(matrix, classes) {
  let tp = 0;
  let total = 0;
  classes.forEach((actual) => {
    classes.forEach((predicted) => {
      total += matrix[actual][predicted];
      if (actual === predicted) tp += matrix[actual][predicted];
    });
  });
  return total === 0 ? 0 : tp / total;
}

module.exports = {
  confusionMatrix,
  precision,
  recall,
  fMeasure,
  accuracy
};

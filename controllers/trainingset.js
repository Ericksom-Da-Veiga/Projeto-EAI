const trainingSetDatabase = require("../database/trainingset");

function getTrainingSet(label) {
  return trainingSetDatabase.getTrainingSet(label);
}

module.exports = {
  getTrainingSet
};
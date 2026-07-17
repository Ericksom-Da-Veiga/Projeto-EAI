const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../trainingset.json");

function readTrainingSet() {
  const data = fs.readFileSync(filePath, "utf8");
  return JSON.parse(data);
}

function getTrainingSet(label) {
  const trainingSet = readTrainingSet();

  return trainingSet.filter((item) => item.label === label);
}

module.exports = {
  getTrainingSet
};
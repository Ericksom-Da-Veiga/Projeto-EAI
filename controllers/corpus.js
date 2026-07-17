const corpusDatabase = require("../database/corpus");

function getCorpus(label) {
  return corpusDatabase.getCorpus(label);
}

function getDocument(id) {
  return corpusDatabase.getDocument(id);
}

module.exports = {
  getCorpus,
  getDocument
};
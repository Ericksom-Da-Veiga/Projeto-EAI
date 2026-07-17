const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "../trainingset.json",
);

function readTrainingSet() {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const data = fs.readFileSync(filePath, "utf8");

  if (!data.trim()) {
    return [];
  }

  return JSON.parse(data);
}

function getTrainingSet(label) {
  const trainingSet = readTrainingSet();

  return trainingSet.filter(
    (item) => item.label === label,
  );
}

function getAllTrainingSet() {
  return readTrainingSet();
}

function saveTrainingSet(documents) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(documents, null, 2),
    "utf8",
  );
}

function addDocument(document) {
  const documents = readTrainingSet();

  const nextId =
    documents.length === 0
      ? 1
      : Math.max(
          ...documents.map((item) =>
            Number(item.id) || 0,
          ),
        ) + 1;

  const newDocument = {
    id: nextId,
    title: document.title || "Documento de feedback",
    text: document.text || "",
    label: document.label,
  };

  documents.push(newDocument);
  saveTrainingSet(documents);

  return newDocument;
}

module.exports = {
  readTrainingSet,
  getTrainingSet,
  getAllTrainingSet,
  saveTrainingSet,
  addDocument,
};
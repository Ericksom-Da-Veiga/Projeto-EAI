const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../news.json");

function readNews() {
  const data = fs.readFileSync(filePath, "utf8");
  return JSON.parse(data);
}

function getCorpus(label) {
  const news = readNews();

  return news
    .filter((item) => item.label === label)
    .slice(0, 100);
}

function getDocument(id) {
  const news = readNews();

  return news.find((item) => item.id == id);
}

module.exports = {
  getCorpus,
  getDocument
};
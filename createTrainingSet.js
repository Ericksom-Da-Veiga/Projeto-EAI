const fs = require("fs");

const news = JSON.parse(fs.readFileSync("news.json", "utf8"));

const fakeNews = news
  .filter((item) => item.label === "fake")
  .slice(0, 200);

const trueNews = news
  .filter((item) => item.label === "true")
  .slice(0, 200);

const trainingSet = [...fakeNews, ...trueNews];

fs.writeFileSync(
  "trainingset.json",
  JSON.stringify(trainingSet, null, 2)
);

console.log("trainingset.json criado com sucesso!");
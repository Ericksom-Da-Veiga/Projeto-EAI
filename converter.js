const fs = require("fs");
const csv = require("csv-parser");

const news = [];

function readCSV(filePath, label) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        news.push({
          id: news.length + 1,
          title: row.title,
          text: row.text,
          subject: row.subject,
          date: row.date,
          label: label
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });
}

async function convert() {
  await readCSV("Fake.csv", "fake");
  await readCSV("True.csv", "true");

  fs.writeFileSync(
    "news.json",
    JSON.stringify(news, null, 2)
  );

  console.log("news.json criado com sucesso!");
}

convert();
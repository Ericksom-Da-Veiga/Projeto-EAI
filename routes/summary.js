const express = require("express");
const router = express.Router();

const trainingSetDatabase = require(
  "../database/trainingset",
);

router.get("/", function (req, res) {
  try {
    const documents =
      trainingSetDatabase.getAllTrainingSet();

    const fakeDocuments =
      documents.filter(
        (document) =>
          document.label === "fake",
      );

    const trueDocuments =
      documents.filter(
        (document) =>
          document.label === "true",
      );

    const fakePercentage =
      documents.length === 0
        ? 0
        : (
            fakeDocuments.length /
            documents.length
          ) * 100;

    const truePercentage =
      documents.length === 0
        ? 0
        : (
            trueDocuments.length /
            documents.length
          ) * 100;

    res.render("summary", {
      totalDocuments:
        documents.length,

      fakeDocuments:
        fakeDocuments.length,

      trueDocuments:
        trueDocuments.length,

      fakePercentage,
      truePercentage,

      balanced:
        Math.abs(
          fakeDocuments.length -
          trueDocuments.length,
        ) <=
        Math.max(
          1,
          documents.length * 0.05,
        ),
    });
  } catch (error) {
    res.status(500).send(
      `Erro ao gerar resumo: ${error.message}`,
    );
  }
});

module.exports = router;
const express = require("express");
const router = express.Router();

const trainingSetDatabase = require(
  "../database/trainingset",
);

const classifier = require(
  "../classification/classifier",
);

const evaluation = require(
  "../classification/evaluation",
);

router.get("/", function (req, res) {
  res.render("textmining", {
    prediction: null,
    evaluationResult: null,
    submittedText: "",
    message: null,
    error: null,
  });
});

router.post("/classify", function (req, res) {
  try {
    const text = req.body.text || "";

    if (!text.trim()) {
      return res.render("textmining", {
        prediction: null,
        evaluationResult: null,
        submittedText: text,
        message: null,
        error: "Introduza uma notícia para classificar.",
      });
    }

    const documents =
      trainingSetDatabase.getAllTrainingSet();

    const model = classifier.buildModel(
      documents,
      ["fake", "true"],
      2000,
    );

    const prediction = classifier.classify(
      text,
      model,
    );

    res.render("textmining", {
      prediction,
      evaluationResult: null,
      submittedText: text,
      message: null,
      error: null,
    });
  } catch (error) {
    res.render("textmining", {
      prediction: null,
      evaluationResult: null,
      submittedText: req.body.text || "",
      message: null,
      error: error.message,
    });
  }
});

router.get("/evaluate", function (req, res) {
  try {
    const documents =
      trainingSetDatabase.getAllTrainingSet();

    const evaluationResult = evaluation.evaluate(
      documents,
      ["fake", "true"],
      2000,
    );

    res.render("textmining", {
      prediction: null,
      evaluationResult,
      submittedText: "",
      message: null,
      error: null,
    });
  } catch (error) {
    res.render("textmining", {
      prediction: null,
      evaluationResult: null,
      submittedText: "",
      message: null,
      error: error.message,
    });
  }
});

router.post("/feedback", function (req, res) {
  try {
    const text = req.body.text || "";
    const correctLabel = req.body.correctLabel;

    if (
      !text.trim() ||
      !["fake", "true"].includes(correctLabel)
    ) {
      return res.render("textmining", {
        prediction: null,
        evaluationResult: null,
        submittedText: text,
        message: null,
        error: "Feedback inválido.",
      });
    }

    trainingSetDatabase.addDocument({
      title: "Documento adicionado por feedback",
      text,
      label: correctLabel,
    });

    res.render("textmining", {
      prediction: null,
      evaluationResult: null,
      submittedText: "",
      message:
        "Documento adicionado ao conjunto de treino.",
      error: null,
    });
  } catch (error) {
    res.render("textmining", {
      prediction: null,
      evaluationResult: null,
      submittedText: req.body.text || "",
      message: null,
      error: error.message,
    });
  }
});

module.exports = router;
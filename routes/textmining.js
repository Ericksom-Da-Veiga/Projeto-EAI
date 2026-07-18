const express = require("express");
const router = express.Router();

const trainingSetDatabase = require(
  "../database/trainingset",
);

const modelService = require(
  "../classification/modelService",
);

let lastPrediction = null;
let lastEvaluationResult = null;
let lastSubmittedText = "";

function renderDashboard(
  res,
  options = {},
) {
  const prediction =
    Object.prototype.hasOwnProperty.call(
      options,
      "prediction",
    )
      ? options.prediction
      : lastPrediction;

  const evaluationResult =
    Object.prototype.hasOwnProperty.call(
      options,
      "evaluationResult",
    )
      ? options.evaluationResult
      : lastEvaluationResult;

  const submittedText =
    Object.prototype.hasOwnProperty.call(
      options,
      "submittedText",
    )
      ? options.submittedText
      : lastSubmittedText;

  res.render("textmining", {
    prediction,
    evaluationResult,

    modelSummary:
      options.modelSummary ||
      modelService.getModelSummary(),

    submittedText,

    message:
      options.message || null,

    error:
      options.error || null,

    serviceStatus:
      modelService.getServiceStatus(),
  });
}

router.get("/", function (req, res) {
  renderDashboard(res);
});

router.post("/train", function (req, res) {
  try {
    const modelSummary =
      modelService.trainModel();

    lastEvaluationResult = null;

    renderDashboard(res, {
      modelSummary,

      evaluationResult: null,

      message:
        "Modelo treinado com sucesso.",
    });
  } catch (error) {
    renderDashboard(res, {
      error:
        error.message ||
        "Ocorreu um erro ao treinar o modelo.",
    });
  }
});

router.post(
  "/classify",
  function (req, res) {
    const text =
      typeof req.body.text === "string"
        ? req.body.text
        : "";

    try {
      if (!text.trim()) {
        return renderDashboard(res, {
          prediction: null,
          submittedText: text,

          error:
            "Introduza uma notícia para classificar.",
        });
      }

      const prediction =
        modelService.classifyText(text);

      lastPrediction = prediction;
      lastSubmittedText = text;

      renderDashboard(res, {
        prediction,
        submittedText: text,

        message:
          "Notícia classificada com sucesso.",
      });
    } catch (error) {
      renderDashboard(res, {
        prediction: null,
        submittedText: text,

        error:
          error.message ||
          "Ocorreu um erro durante a classificação.",
      });
    }
  },
);

router.post(
  "/evaluate",
  function (req, res) {
    try {
      const evaluationResult =
        modelService.evaluateModel({
          force: true,
          testRatio: 0.2,
          seed: 12345,
        });

      lastEvaluationResult =
        evaluationResult;

      renderDashboard(res, {
        evaluationResult,

        message:
          "Avaliação concluída com sucesso.",
      });
    } catch (error) {
      renderDashboard(res, {
        error:
          error.message ||
          "Ocorreu um erro durante a avaliação.",
      });
    }
  },
);

router.post(
  "/feedback",
  function (req, res) {
    const text =
      typeof req.body.text === "string"
        ? req.body.text
        : "";

    const correctLabel =
      req.body.correctLabel;

    try {
      if (!text.trim()) {
        return renderDashboard(res, {
          submittedText: text,

          error:
            "O texto do feedback está vazio.",
        });
      }

      if (
        !modelService.CLASSES.includes(
          correctLabel,
        )
      ) {
        return renderDashboard(res, {
          submittedText: text,

          error:
            "A classe do feedback é inválida.",
        });
      }

      const generatedTitle =
        correctLabel === "fake"
          ? "Notícia Fake adicionada por feedback"
          : "Notícia True adicionada por feedback";

      trainingSetDatabase.addDocument({
        title: generatedTitle,
        text,
        label: correctLabel,
      });

      modelService.invalidateModel();

      lastPrediction = null;
      lastEvaluationResult = null;
      lastSubmittedText = text;

      renderDashboard(res, {
        prediction: null,
        evaluationResult: null,
        submittedText: text,

        message:
          `Documento adicionado como ${correctLabel.toUpperCase()}. Treine novamente o modelo para aplicar a correção.`,
      });
    } catch (error) {
      renderDashboard(res, {
        submittedText: text,

        error:
          error.message ||
          "Ocorreu um erro ao guardar o feedback.",
      });
    }
  },
);

router.post(
  "/clear",
  function (req, res) {
    lastPrediction = null;
    lastEvaluationResult = null;
    lastSubmittedText = "";

    renderDashboard(res, {
      prediction: null,
      evaluationResult: null,
      submittedText: "",

      message:
        "Resultados do dashboard limpos.",
    });
  },
);

router.get(
  "/status",
  function (req, res) {
    try {
      res.json({
        service:
          modelService.getServiceStatus(),

        model:
          modelService.getModelSummary(),

        dashboard: {
          hasPrediction:
            Boolean(lastPrediction),

          hasEvaluation:
            Boolean(
              lastEvaluationResult,
            ),
        },
      });
    } catch (error) {
      res.status(500).json({
        error:
          error.message ||
          "Não foi possível obter o estado do modelo.",
      });
    }
  },
);

module.exports = router;
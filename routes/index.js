const express = require("express");
const router = express.Router();
const train = require("../classification/train");
const classifier = require("../classification/classifier");

router.get("/", (req, res) => res.redirect("/corpus/fake"));
router.get("/textmining", (req, res) => res.render("textmining"));

// Rota para disparar o treino
router.get("/textmining/train", (req, res) => {
  train.train();
  res.json({ status: "ok" });
});

// Rota para classificar
router.post("/textmining/classify", (req, res) => {
  // Você precisará carregar os dados das classes aqui
  // Ex: const classesData = [train.getFeaturesByClassAndN('fake', 1), ...];
  const result = classifier.probabilisticClassification(
    req.body.text,
    classesData,
  );
  res.json({ label: result });
});

module.exports = router;

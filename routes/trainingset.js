const express = require("express");
const router = express.Router();

const trainingSetController = require("../controllers/trainingset");

router.get("/:label", function (req, res) {
  const label = req.params.label;
  const documents = trainingSetController.getTrainingSet(label);

  res.render("trainingset", {
    label: label,
    documents: documents
  });
});

module.exports = router;
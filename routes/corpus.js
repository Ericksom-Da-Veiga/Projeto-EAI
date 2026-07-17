const express = require("express");
const router = express.Router();

const corpusController = require("../controllers/corpus");

router.get("/:label", function (req, res) {
  const label = req.params.label;
  const documents = corpusController.getCorpus(label);

  res.render("corpus", {
    label: label,
    documents: documents
  });
});

router.get("/document/:id", function (req, res) {
  const id = req.params.id;
  const document = corpusController.getDocument(id);

  res.render("document", {
    document: document
  });
});

module.exports = router;
const express = require("express");
const router = express.Router();

// Redireciona a raiz para a página inicial do Corpus
router.get("/", (req, res) => res.redirect("/corpus/fake"));

module.exports = router;
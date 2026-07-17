const express = require("express");
const router = express.Router();

const trainModule = require("../classification/train");

router.get("/", function (req, res) {
  res.send("Servidor funcionando. Lab 4 pronto para teste leve.");
});

router.get("/test", function (req, res) {
  const result = trainModule.train(["fake", "true"], [1, 2]);

  res.json({
    fake: {
      totalDocuments: result[0].totalDocuments,
      unigramVocabularySize: result[0].vocabulary.unigram.length,
      bigramVocabularySize: result[0].vocabulary.bigram.length,
      firstDocumentVectors: {
        unigramBinary: result[0].documents[0].vectors.unigram.binary.slice(0, 5),
        unigramOccurrences: result[0].documents[0].vectors.unigram.occurrences.slice(0, 5),
        unigramTf: result[0].documents[0].vectors.unigram.tf.slice(0, 5),
        unigramTfidf: result[0].documents[0].vectors.unigram.tfidf.slice(0, 5),
        bigramBinary: result[0].documents[0].vectors.bigram.binary.slice(0, 5),
        bigramOccurrences: result[0].documents[0].vectors.bigram.occurrences.slice(0, 5),
        bigramTf: result[0].documents[0].vectors.bigram.tf.slice(0, 5),
        bigramTfidf: result[0].documents[0].vectors.bigram.tfidf.slice(0, 5)
      }
    },
    true: {
      totalDocuments: result[1].totalDocuments,
      unigramVocabularySize: result[1].vocabulary.unigram.length,
      bigramVocabularySize: result[1].vocabulary.bigram.length,
      firstDocumentVectors: {
        unigramBinary: result[1].documents[0].vectors.unigram.binary.slice(0, 5),
        unigramOccurrences: result[1].documents[0].vectors.unigram.occurrences.slice(0, 5),
        unigramTf: result[1].documents[0].vectors.unigram.tf.slice(0, 5),
        unigramTfidf: result[1].documents[0].vectors.unigram.tfidf.slice(0, 5),
        bigramBinary: result[1].documents[0].vectors.bigram.binary.slice(0, 5),
        bigramOccurrences: result[1].documents[0].vectors.bigram.occurrences.slice(0, 5),
        bigramTf: result[1].documents[0].vectors.bigram.tf.slice(0, 5),
        bigramTfidf: result[1].documents[0].vectors.bigram.tfidf.slice(0, 5)
      }
    }
  });
});

module.exports = router;
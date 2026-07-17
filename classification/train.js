const trainingSetDatabase = require("../database/trainingset");
const preprocessing = require("./preprocessing");
const bagOfWords = require("./bagOfWords");
const featureSelection = require("./featureSelection");
const fs = require("fs");
const path = require("path");

function calculatePriorProbability(label, totalDocuments) {
  const documents = trainingSetDatabase.getTrainingSet(label);

  if (totalDocuments === 0) {
    return 0;
  }

  return documents.length / totalDocuments;
}

function calculateVectorSums(
  vocabulary,
  documentsWithVectors,
  ngramType,
  idfVector,
) {
  return vocabulary
    .map((termName) => {
      const terms = documentsWithVectors.map((doc) => {
        const occurrencesData = doc.vectors[ngramType].occurrences.find(
          (item) => item.name === termName,
        );

        const tfData = doc.vectors[ngramType].tf.find(
          (item) => item.name === termName,
        );

        const idfData = idfVector.find(
          (item) => item.name === termName,
        );

        return {
          name: termName,
          occurrences: occurrencesData
            ? occurrencesData.occurrences
            : 0,
          tf: tfData ? tfData.tf : 0,
          idf: idfData ? idfData.idf : 0,
        };
      });

      return bagOfWords.sumVector(terms);
    })
    .filter(Boolean);
}

function train(classes = ["fake", "true"], nValues = [1, 2]) {
  const result = [];

  const allDocuments = classes.flatMap((label) =>
    trainingSetDatabase.getTrainingSet(label),
  );

  classes.forEach((label) => {
    const documents = trainingSetDatabase.getTrainingSet(label);

    let unigramVocabulary = [];
    let bigramVocabulary = [];

    const processedDocuments = documents.map((doc) => {
      const text = doc.text || "";
      const preprocessed = preprocessing.preprocessText(text, nValues);

      const unigramGroup = preprocessed.tokens.find(
        (item) => item.n === 1,
      );

      const bigramGroup = preprocessed.tokens.find(
        (item) => item.n === 2,
      );

      const unigramTokens = unigramGroup
        ? unigramGroup.tokens
        : [];

      const bigramTokens = bigramGroup
        ? bigramGroup.tokens
        : [];

      unigramVocabulary = bagOfWords.addUniqueTerms(
        unigramVocabulary,
        unigramTokens,
      );

      bigramVocabulary = bagOfWords.addUniqueTerms(
        bigramVocabulary,
        bigramTokens,
      );

      return {
        id: doc.id,
        title: doc.title || "",
        text: text,
        label: doc.label,
        preprocessing: {
          originalText: preprocessed.originalText,
          cleanedText: preprocessed.cleanedText,
          preprocessedText: preprocessed.preprocessedText,
          tokens: preprocessed.tokens,
        },
      };
    });

    const allUnigramTokens = processedDocuments.map((doc) => {
      const group = doc.preprocessing.tokens.find(
        (item) => item.n === 1,
      );

      return group ? group.tokens : [];
    });

    const allBigramTokens = processedDocuments.map((doc) => {
      const group = doc.preprocessing.tokens.find(
        (item) => item.n === 2,
      );

      return group ? group.tokens : [];
    });

    const unigramIdfVector = bagOfWords.idfVector(
      unigramVocabulary,
      allUnigramTokens,
    );

    const bigramIdfVector = bagOfWords.idfVector(
      bigramVocabulary,
      allBigramTokens,
    );

    const documentsWithVectors = processedDocuments.map((doc) => {
      const unigramGroup = doc.preprocessing.tokens.find(
        (item) => item.n === 1,
      );

      const bigramGroup = doc.preprocessing.tokens.find(
        (item) => item.n === 2,
      );

      const unigramTokens = unigramGroup
        ? unigramGroup.tokens
        : [];

      const bigramTokens = bigramGroup
        ? bigramGroup.tokens
        : [];

      const unigramBinaryVector = bagOfWords.binaryVector(
        unigramVocabulary,
        unigramTokens,
        doc.id,
      );

      const unigramOccurrencesVector =
        bagOfWords.numberOfOccurrencesVector(
          unigramVocabulary,
          unigramTokens,
          doc.id,
        );

      const unigramTfVector = bagOfWords.tfVector(
        unigramVocabulary,
        unigramTokens,
        doc.id,
      );

      const unigramTfidfVector = bagOfWords.tfidfVector(
        unigramTfVector,
        unigramIdfVector,
      );

      const bigramBinaryVector = bagOfWords.binaryVector(
        bigramVocabulary,
        bigramTokens,
        doc.id,
      );

      const bigramOccurrencesVector =
        bagOfWords.numberOfOccurrencesVector(
          bigramVocabulary,
          bigramTokens,
          doc.id,
        );

      const bigramTfVector = bagOfWords.tfVector(
        bigramVocabulary,
        bigramTokens,
        doc.id,
      );

      const bigramTfidfVector = bagOfWords.tfidfVector(
        bigramTfVector,
        bigramIdfVector,
      );

      return {
        ...doc,
        vectors: {
          unigram: {
            binary: unigramBinaryVector,
            occurrences: unigramOccurrencesVector,
            tf: unigramTfVector,
            tfidf: unigramTfidfVector,
          },
          bigram: {
            binary: bigramBinaryVector,
            occurrences: bigramOccurrencesVector,
            tf: bigramTfVector,
            tfidf: bigramTfidfVector,
          },
        },
      };
    });

    const unigramVectorSums = calculateVectorSums(
      unigramVocabulary,
      documentsWithVectors,
      "unigram",
      unigramIdfVector,
    );

    const bigramVectorSums = calculateVectorSums(
      bigramVocabulary,
      documentsWithVectors,
      "bigram",
      bigramIdfVector,
    );

    const kUnigram = Math.max(
      1,
      Math.floor(unigramVocabulary.length * 0.2),
    );

    const kBigram = Math.max(
      1,
      Math.floor(bigramVocabulary.length * 0.2),
    );

    const bestUnigrams = featureSelection.selectKBest(
      unigramVectorSums,
      kUnigram,
      "tfidf",
    );

    const bestBigrams = featureSelection.selectKBest(
      bigramVectorSums,
      kBigram,
      "tfidf",
    );

    const prior = calculatePriorProbability(
      label,
      allDocuments.length,
    );

    const classResult = {
      label: label,
      prior: prior,
      totalDocuments: documentsWithVectors.length,
      vocabulary: {
        unigram: unigramVocabulary,
        bigram: bigramVocabulary,
      },
      idf: {
        unigram: unigramIdfVector,
        bigram: bigramIdfVector,
      },
      documents: documentsWithVectors,
      vectorSums: {
        unigram: unigramVectorSums,
        bigram: bigramVectorSums,
      },
      selectedFeatures: {
        unigram: bestUnigrams,
        bigram: bestBigrams,
      },
    };

    result.push(classResult);

    const outputPath = path.join(
      __dirname,
      `training_results_${label}.json`,
    );

    fs.writeFileSync(
      outputPath,
      JSON.stringify(classResult, null, 2),
      "utf8",
    );
  });

  return result;
}

function getFeaturesByClassAndN(label, n) {
  const filePath = path.join(
    __dirname,
    `training_results_${label}.json`,
  );

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const data = JSON.parse(
    fs.readFileSync(filePath, "utf8"),
  );

  const nGramType = n === 1
    ? "unigram"
    : "bigram";

  return data.selectedFeatures[nGramType].map((term) => ({
    name: term.name,
    tfidf: term.tfidf,
    n: n,
  }));
}

module.exports = {
  train,
  getFeaturesByClassAndN,
};
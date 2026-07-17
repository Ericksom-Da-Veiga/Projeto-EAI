const trainingSetDatabase = require("../database/trainingset");
const preprocessing = require("./preprocessing");
const counting = require("./counting");
const bagOfWords = require("./bagOfWords");
const featureSelection = require("./featureSelection");
const fs = require("fs");
const path = require("path");

function calculatePriorProbability(label, totalDocuments) {
  const documents = trainingSetDatabase.getTrainingSet(label);
  return documents.length / totalDocuments;
}

function train(classes = ["fake", "true"], nValues = [1, 2]) {
  const result = [];

  classes.forEach((label) => {
    const documents = trainingSetDatabase.getTrainingSet(label);

    let unigramVocabulary = [];
    let bigramVocabulary = [];

    const processedDocuments = documents.map((doc) => {
      const preprocessed = preprocessing.preprocessText(doc.text, nValues);

      const unigramTokens = preprocessed.tokens.find(
        (item) => item.n === 1,
      ).tokens;
      const bigramTokens = preprocessed.tokens.find(
        (item) => item.n === 2,
      ).tokens;

      unigramVocabulary = bagOfWords.addUniqueTerms(
        unigramVocabulary,
        unigramTokens,
      );
      bigramVocabulary = bagOfWords.addUniqueTerms(
        bigramVocabulary,
        bigramTokens,
      );

      const tokensWithTf = preprocessed.tokens.map((tokenGroup) => {
        return {
          n: tokenGroup.n,
          tokens: tokenGroup.tokens,
          tf: calculateTfForTokens(tokenGroup.tokens),
        };
      });

      return {
        id: doc.id,
        title: doc.title,
        label: doc.label,
        preprocessing: {
          originalText: preprocessed.originalText,
          cleanedText: preprocessed.cleanedText,
          preprocessedText: preprocessed.preprocessedText,
          tokens: tokensWithTf,
        },
      };
    });

    // Call sumVector for each term of the bag of words

    const allUnigramTokens = processedDocuments.map((doc) => {
      return doc.preprocessing.tokens.find((item) => item.n === 1).tokens;
    });

    const allBigramTokens = processedDocuments.map((doc) => {
      return doc.preprocessing.tokens.find((item) => item.n === 2).tokens;
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
      const unigramTokens = doc.preprocessing.tokens.find(
        (item) => item.n === 1,
      ).tokens;
      const bigramTokens = doc.preprocessing.tokens.find(
        (item) => item.n === 2,
      ).tokens;

      const unigramBinaryVector = bagOfWords.binaryVector(
        unigramVocabulary,
        unigramTokens,
        doc.id,
      );

      const unigramOccurrencesVector = bagOfWords.numberOfOccurrencesVector(
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

      const bigramOccurrencesVector = bagOfWords.numberOfOccurrencesVector(
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

    const unigramVectorSums = unigramVocabulary.map((termName) => {
      const terms = documentsWithVectors.map((doc) => {
        const occurrences = doc.vectors.unigram.occurrences.find(
          (v) => v.name === termName,
        );
        const tf = doc.vectors.unigram.tf.find((v) => v.name === termName);
        const idf = unigramIdfVector.find((v) => v.name === termName);

        return {
          name: termName,
          occurrences: occurrences.occurrences,
          tf: tf.tf,
          idf: idf.idf,
        };
      });
      return bagOfWords.sumVector(terms);
    });

    const bigramVectorSums = bigramVocabulary.map((termName) => {
      // ... (as before)
    });

    // 7. Apply feature selection
    const kUnigram = Math.floor(unigramVocabulary.length * 0.2);
    const kBigram = Math.floor(bigramVocabulary.length * 0.2);

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

    // 9. Calculate and store Prior Probability
    const allLabels = ["fake", "true"]; // Assume these are the labels
    const allDocuments = allLabels.flatMap((l) =>
      trainingSetDatabase.getTrainingSet(l),
    );
    const prior = calculatePriorProbability(label, allDocuments.length);

    result.push({
      label: label,
      prior: prior,
      totalDocuments: documentsWithVectors.length,
      // ...
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
    });

    // 8. Gravar em ficheiro
    const outputPath = path.join(__dirname, `training_results_${label}.json`);
    fs.writeFileSync(
      outputPath,
      JSON.stringify(result[result.length - 1], null, 2),
    );
  });

  return result;
}

function getFeaturesByClassAndN(label, n) {
  const filePath = path.join(__dirname, `training_results_${label}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const nGramType = n === 1 ? "unigram" : "bigram";

  // Return the selected features for the specific n-gram type
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

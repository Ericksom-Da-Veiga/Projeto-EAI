function selectKBest(terms, k, metric = 'tfidf', useSum = true) {
  // Sort terms based on the specified metric in descending order
  const sortedTerms = [...terms].sort((a, b) => {
    const valA = useSum ? a[metric] : (a[metric] / a.occurrences); // Assuming useSum logic, simplified
    // Actually, based on previous definitions, metrics like 'tf', 'tfidf'
    // are already calculated in the vector object.
    return b[metric] - a[metric];
  });

  return sortedTerms.slice(0, k);
}

module.exports = {
  selectKBest,
};

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { validateGlossaryCSVContent } = require('./glossary-schema-validator');

function getGlossaryStatus(bookSlug) {
  const bookRoot = getBookRoot(bookSlug);
  const glossaryPath = path.join(bookRoot, 'glossary.csv');

  if (!fs.existsSync(glossaryPath)) {
    return {
      status: 'missing',
      totalTerms: 0,
      approved: 0,
      needsReview: 0,
      candidate: 0,
      locked: 0,
      rejected: 0,
      deprecated: 0,
      changed: 0,
      readyForFullBook: false,
      message: 'glossary.csv does not exist.'
    };
  }

  const csvText = fs.readFileSync(glossaryPath, 'utf8');
  const validation = validateGlossaryCSVContent(csvText);

  if (!validation.valid) {
    return {
      status: 'invalid',
      totalTerms: 0,
      approved: 0,
      needsReview: 0,
      candidate: 0,
      locked: 0,
      rejected: 0,
      deprecated: 0,
      changed: 0,
      readyForFullBook: false,
      errors: validation.errors,
      warnings: validation.warnings,
      message: 'glossary.csv failed validation.'
    };
  }

  const terms = validation.terms;
  const stats = {
    totalTerms: terms.length,
    approved: 0,
    needsReview: 0,
    candidate: 0,
    locked: 0,
    rejected: 0,
    deprecated: 0,
    changed: 0
  };

  terms.forEach(term => {
    const status = term.status;
    if (status === 'approved') stats.approved++;
    else if (status === 'needs_review') stats.needsReview++;
    else if (status === 'candidate') stats.candidate++;
    else if (status === 'locked') stats.locked++;
    else if (status === 'rejected') stats.rejected++;
    else if (status === 'deprecated') stats.deprecated++;
    else if (status === 'changed') stats.changed++;
  });

  // Check readiness for full book translation
  // Crucial Rule: No candidate or needs_review terms should be present without translation,
  // and for translate full book, glossary status must be approved enough (e.g. no blocking unreviewed terms).
  // We define readyForFullBook as: needsReview === 0 && candidate === 0 (all terms are either approved, locked, rejected, deprecated, or changed).
  const unapprovedCount = stats.needsReview + stats.candidate;
  const readyForFullBook = unapprovedCount === 0;

  let statusStr = 'approved';
  if (unapprovedCount > 0) {
    statusStr = 'needs_human_review';
  }

  return {
    status: statusStr,
    ...stats,
    readyForFullBook,
    errors: validation.errors,
    warnings: validation.warnings,
    message: readyForFullBook 
      ? 'Glossary fully approved. Ready for full book translation.'
      : `Glossary has ${unapprovedCount} unapproved terms (${stats.needsReview} needs_review, ${stats.candidate} candidate).`
  };
}

module.exports = {
  getGlossaryStatus
};

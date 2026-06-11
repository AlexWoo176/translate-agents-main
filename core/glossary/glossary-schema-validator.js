'use strict';

const { parseCSV } = require('../translation/glossary-context-builder');
const { parseCSVRow, normalizeHeaders } = require('./glossary-normalizer');

const VALID_STATUSES = new Set([
  'candidate',
  'needs_review',
  'approved',
  'rejected',
  'deprecated',
  'changed',
  'locked'
]);

function validateGlossaryCSVContent(csvText) {
  const errors = [];
  const warnings = [];
  const rows = parseCSV(csvText);

  if (rows.length === 0) {
    errors.push('Glossary file is empty.');
    return { valid: false, errors, warnings, terms: [] };
  }

  const rawHeaders = rows[0];
  const headers = normalizeHeaders(rawHeaders);

  // Check required columns: must contain term (or key) and translation and status
  const hasTerm = headers.includes('term');
  const hasTranslation = headers.includes('translation');
  const hasStatus = headers.includes('status');

  if (!hasTerm) {
    errors.push('Missing required column: "term" (or "key").');
  }
  if (!hasTranslation) {
    errors.push('Missing required column: "translation".');
  }
  if (!hasStatus) {
    errors.push('Missing required column: "status".');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, terms: [] };
  }

  const uniqueTerms = new Map();
  const termsSeen = new Map(); // term -> row index

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 1 && row[0] === '') {
      continue; // Skip empty rows
    }

    // Malformed row check
    if (row.length !== rawHeaders.length) {
      warnings.push(`Row ${i + 1} has ${row.length} fields, but header has ${rawHeaders.length} fields.`);
    }

    const item = parseCSVRow(row, rawHeaders);
    const lineNum = i + 1;

    if (!item.term) {
      errors.push(`Row ${lineNum}: English term is empty.`);
      continue;
    }

    // Check duplicate term
    const termLower = item.term.toLowerCase();
    if (termsSeen.has(termLower)) {
      const prevInfo = termsSeen.get(termLower);
      const isBothApproved = ['approved', 'locked', 'changed'].includes(item.status) &&
                             ['approved', 'locked', 'changed'].includes(prevInfo.status);
      const hasConflict = isBothApproved && (item.translation !== prevInfo.translation);

      if (hasConflict) {
        errors.push(`Row ${lineNum}: Duplicate conflicting approved term "${item.term}" (translation: "${item.translation}", but row ${prevInfo.line} is "${prevInfo.translation}").`);
      } else {
        warnings.push(`Row ${lineNum}: Duplicate term "${item.term}" detected (already defined on row ${prevInfo.line}).`);
      }
    } else {
      termsSeen.set(termLower, {
        line: lineNum,
        translation: item.translation,
        status: item.status
      });
    }

    // Check valid status
    if (item.status && !VALID_STATUSES.has(item.status)) {
      errors.push(`Row ${lineNum}: Invalid status "${item.status}" for term "${item.term}". Valid statuses are: ${Array.from(VALID_STATUSES).join(', ')}.`);
    }

    // If status is approved or locked, translation must not be empty
    if ((item.status === 'approved' || item.status === 'locked') && !item.translation) {
      errors.push(`Row ${lineNum}: Term "${item.term}" has status "${item.status}" but translation is empty.`);
    }

    uniqueTerms.set(termLower, item);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    terms: Array.from(uniqueTerms.values())
  };
}

module.exports = {
  validateGlossaryCSVContent,
  VALID_STATUSES
};

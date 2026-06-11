/**
 * run-quality-gates.js
 *
 * Runs multiple quality gates sequentially in a safe dependency order.
 */

'use strict';

const { runQualityGate } = require('./run-quality-gate');

const DEFAULT_ORDER = [
  'glossary',
  'prepCompleteness',
  'duplicatePages',
  'bilingualPairs',
  'tableIntegrity',
  'previewCssReferences',
  'localPathLeaks',
  'qaSummary',
  'finalValidation'
];

function sortGateIds(gateIds) {
  return [...gateIds].sort((a, b) => {
    let indexA = DEFAULT_ORDER.indexOf(a);
    let indexB = DEFAULT_ORDER.indexOf(b);
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;
    return indexA - indexB;
  });
}

async function runQualityGates(bookSlug, gateIds, options = {}) {
  const sorted = sortGateIds(gateIds);
  const results = [];

  for (const gateId of sorted) {
    const res = await runQualityGate(bookSlug, gateId, options);
    results.push(res);

    if (options.stopOnFailure && !res.success) {
      break;
    }
  }

  return results;
}

async function runAllQualityGates(bookSlug, options = {}) {
  return runQualityGates(bookSlug, DEFAULT_ORDER, options);
}

module.exports = {
  runQualityGates,
  runAllQualityGates
};

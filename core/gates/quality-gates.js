/**
 * quality-gates.js
 *
 * Reads quality gates statuses from reports, workflow-state.json, and qa-summary.json.
 */

'use strict';

const fs = require('fs');
const { getWorkflowStatePath, getQaSummaryPath } = require('../paths/path-resolver');
const { readGateResult } = require('./read-gate-result');

function readQualityGates(bookSlug) {
  const wsPath = getWorkflowStatePath(bookSlug);
  const qaPath = getQaSummaryPath(bookSlug);

  let workflowState = null;
  let qaSummary = null;

  if (fs.existsSync(wsPath)) {
    try {
      workflowState = JSON.parse(fs.readFileSync(wsPath, 'utf8'));
    } catch (e) {
      // Ignore parse error
    }
  }

  if (fs.existsSync(qaPath)) {
    try {
      qaSummary = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
    } catch (e) {
      // Ignore parse error
    }
  }

  // Get status using readGateResult directly from reports, falling back to state/summary
  function getGateStatus(gateId) {
    try {
      const res = readGateResult(bookSlug, gateId);
      if (res.status !== 'missing_report' && res.status !== 'invalid_report') {
        return res.status;
      }
    } catch (e) {
      // Ignore reading error, fall back
    }

    if (workflowState && workflowState.qualityGates && workflowState.qualityGates[gateId]) {
      return workflowState.qualityGates[gateId].status;
    }
    if (qaSummary && qaSummary.checks && qaSummary.checks[gateId]) {
      return qaSummary.checks[gateId].status;
    }
    return 'unknown';
  }

  const overallStatus = workflowState?.overallStatus || qaSummary?.overallStatus || 'unknown';

  return {
    overallStatus,
    gates: {
      glossary: getGateStatus('glossary'),
      glossaryApproval: getGateStatus('glossaryApproval'),
      glossaryImpact: getGateStatus('glossaryImpact'),
      prepCompleteness: getGateStatus('prepCompleteness'),
      duplicatePages: getGateStatus('duplicatePages'),
      bilingualPairs: getGateStatus('bilingualPairs'),
      tableIntegrity: getGateStatus('tableIntegrity'),
      previewCssReferences: getGateStatus('previewCssReferences'),
      localPathLeaks: getGateStatus('localPathLeaks'),
      finalValidation: getGateStatus('finalValidation'),
      epubValidity: getGateStatus('epubValidity'),
      reviewCompleteness: getGateStatus('reviewCompleteness'),
      analysisCompleteness: getGateStatus('analysisCompleteness'),
      translationCompleteness: getGateStatus('translationCompleteness'),
      cleanHtmlValid: getGateStatus('cleanHtmlValid'),
      rawHtmlExists: getGateStatus('rawHtmlExists'),
      planCompleteness: getGateStatus('planCompleteness')
    }
  };
}

module.exports = {
  readQualityGates
};

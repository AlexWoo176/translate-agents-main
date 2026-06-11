/**
 * read-gate-result.js
 *
 * Reads and parses the JSON report for a quality gate, returning normalized status and results.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { getQualityGate } = require('./gate-registry');
const { normalizeGateStatus } = require('./normalize-gate-status');

function readGateResult(bookSlug, gateId) {
  const bookRoot = getBookRoot(bookSlug);
  const gate = getQualityGate(gateId);
  const reportPath = path.join(bookRoot, gate.reportJson);

  if (!fs.existsSync(reportPath)) {
    return {
      gateId,
      status: 'missing_report',
      success: false
    };
  }

  let report;
  try {
    const content = fs.readFileSync(reportPath, 'utf8');
    report = JSON.parse(content);
  } catch (err) {
    return {
      gateId,
      status: 'invalid_report',
      success: false,
      message: `Invalid JSON report: ${err.message}`
    };
  }

  // Determine raw status
  let rawStatus = 'unknown';
  if (report.overallResult) {
    rawStatus = report.overallResult;
  } else if (report.status) {
    rawStatus = report.status;
  } else if (report.success !== undefined) {
    rawStatus = report.success ? 'passed' : 'failed';
  } else {
    rawStatus = 'passed'; // Default if none
  }

  // Adjust for warnings
  let normalized = normalizeGateStatus(rawStatus);
  const errors = report.errors || report.issues || [];
  const warnings = report.warnings || [];
  
  if (normalized === 'passed' && (warnings.length > 0 || report.stats?.warningsCount > 0)) {
    normalized = 'passed_with_warnings';
  }

  return {
    gateId,
    status: normalized,
    success: ['passed', 'passed_with_warnings'].includes(normalized),
    tool: gate.tool,
    reportJson: gate.reportJson,
    reportMarkdown: gate.reportMarkdown,
    issues: errors,
    warnings: warnings
  };
}

module.exports = {
  readGateResult
};

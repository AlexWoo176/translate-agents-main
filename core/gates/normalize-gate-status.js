/**
 * normalize-gate-status.js
 *
 * Normalizes various raw status strings from different QA tools into a unified set of statuses.
 */

'use strict';

function normalizeGateStatus(rawStatus) {
  if (!rawStatus) return 'unknown';

  const status = String(rawStatus).trim().toLowerCase();

  const passedValues = ['passed', 'resolved', 'validated', 'generated', 'success'];
  const warningValues = ['ready_with_warnings', 'passed_with_warnings', 'warning', 'warnings'];
  const failedValues = ['failed', 'error', 'failure'];

  if (passedValues.includes(status)) {
    return 'passed';
  }
  if (warningValues.includes(status)) {
    return 'passed_with_warnings';
  }
  if (failedValues.includes(status)) {
    return 'failed';
  }
  if (status === 'needs_human_review') {
    return 'needs_human_review';
  }
  if (status === 'missing_tool') {
    return 'missing_tool';
  }
  if (status === 'missing_report') {
    return 'missing_report';
  }
  if (status === 'invalid_report') {
    return 'invalid_report';
  }

  return 'unknown';
}

module.exports = {
  normalizeGateStatus
};

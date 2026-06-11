'use strict';

function getTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * Creates a execution context for a workflow run.
 * 
 * @param {string} bookSlug 
 * @param {object} options 
 * @returns {object} Execution context
 */
function createExecutionContext(bookSlug, options = {}) {
  const startedAt = new Date().toISOString();
  const runId = `wf-${getTimestamp()}`;
  
  return {
    workflowRunId: runId,
    bookSlug,
    options,
    startedAt,
    finishedAt: null,
    status: 'running',
    executedPhases: [],
    skippedPhases: [],
    warnings: [],
    errors: [],
    filesCreated: [],
    filesUpdated: [],
    filesSkipped: []
  };
}

module.exports = {
  createExecutionContext
};

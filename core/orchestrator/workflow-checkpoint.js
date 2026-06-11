'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

function getCheckpointPath(bookSlug) {
  return path.join(getBookRoot(bookSlug), 'workflow-checkpoint.json');
}

/**
 * Loads the checkpoint for a book.
 * 
 * @param {string} bookSlug 
 * @returns {object|null} Checkpoint data or null if not found
 */
function loadCheckpoint(bookSlug) {
  const file = getCheckpointPath(bookSlug);
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return null;
  }
}

/**
 * Saves a checkpoint to disk.
 * 
 * @param {string} bookSlug 
 * @param {object} context - Execution context
 * @param {string} currentPhase 
 * @param {string[]} pendingPhases 
 * @param {string} runStatus - 'running', 'completed', 'failed'
 * @param {string} [failedAtPhase] - The phase that failed if runStatus is 'failed'
 */
function saveCheckpoint(bookSlug, context, currentPhase, pendingPhases, runStatus = 'running', failedAtPhase = null) {
  const file = getCheckpointPath(bookSlug);
  
  const completedPhases = context.executedPhases.map(p => ({
    phase: p.phase,
    status: p.status,
    report: p.report || ''
  }));

  const checkpoint = {
    bookSlug,
    workflowRunId: context.workflowRunId,
    startedAt: context.startedAt,
    updatedAt: new Date().toISOString(),
    status: runStatus,
    currentPhase,
    completedPhases,
    pendingPhases,
    options: context.options
  };

  if (runStatus === 'failed' && failedAtPhase) {
    checkpoint.failedAt = failedAtPhase;
  }

  // Ensure book root exists
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(file, JSON.stringify(checkpoint, null, 2), 'utf8');
  return checkpoint;
}

module.exports = {
  loadCheckpoint,
  saveCheckpoint,
  getCheckpointPath
};

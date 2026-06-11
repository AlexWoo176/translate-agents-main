/**
 * write-workflow-state.js
 *
 * Safe workflow state writer with backup, validation, and temp file verification.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getWorkflowStatePath } = require('../paths/path-resolver');
const { calculateWorkflowState } = require('./calculate-workflow-state');
const { validateGeneratedState } = require('./validate-generated-state');
const { backupWorkflowState } = require('./backup-workflow-state');

function writeWorkflowState(bookSlug) {
  const statePath = getWorkflowStatePath(bookSlug);
  const tempPath = `${statePath}.tmp`;

  try {
    // 1. Calculate state
    const state = calculateWorkflowState(bookSlug);

    // 2. Validate state
    validateGeneratedState(state, bookSlug);

    // 3. Backup old workflow-state.json
    const backupFile = backupWorkflowState(bookSlug);

    // 4. Write temp file workflow-state.json.tmp
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8');

    // 5. Parse temp file to ensure validity
    try {
      const tempContent = fs.readFileSync(tempPath, 'utf8');
      JSON.parse(tempContent);
    } catch (parseErr) {
      throw new Error(`Temp file verification failed (JSON is invalid): ${parseErr.message}`);
    }

    // 6. Rename temp file to workflow-state.json
    fs.renameSync(tempPath, statePath);

    return {
      success: true,
      backupFile,
      state
    };
  } catch (err) {
    // Rollback: delete temp file if it exists
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (unlinkErr) {
        // Ignore unlink error to preserve original error
      }
    }
    throw err;
  }
}

module.exports = {
  writeWorkflowState
};

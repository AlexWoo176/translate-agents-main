/**
 * load-workflow-state.js
 *
 * Loads the workflow state JSON file (workflow-state.json) for a book.
 */

'use strict';

const fs = require('fs');
const { getWorkflowStatePath } = require('../paths/path-resolver');

function loadWorkflowState(bookSlug) {
  const statePath = getWorkflowStatePath(bookSlug);
  
  if (!fs.existsSync(statePath)) {
    throw new Error(`Workflow state file not found: ${statePath}`);
  }
  
  try {
    const content = fs.readFileSync(statePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse workflow state JSON at ${statePath}: ${err.message}`);
  }
}

module.exports = {
  loadWorkflowState
};

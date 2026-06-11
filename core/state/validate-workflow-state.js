/**
 * validate-workflow-state.js
 *
 * Validates the structure and content of a workflow state object.
 */

'use strict';

function validateWorkflowState(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('Validation Error: Workflow state is null or not an object');
  }

  const requiredFields = ['schemaVersion', 'bookSlug', 'title', 'datasetVersion', 'overallStatus', 'chapters'];
  
  for (const field of requiredFields) {
    if (state[field] === undefined || state[field] === null) {
      throw new Error(`Validation Error: Required field '${field}' is missing in workflow state`);
    }
  }

  if (typeof state.chapters !== 'object') {
    throw new Error("Validation Error: 'chapters' field must be an object");
  }

  return true;
}

module.exports = {
  validateWorkflowState
};

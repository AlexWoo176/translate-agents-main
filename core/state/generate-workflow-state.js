/**
 * generate-workflow-state.js
 *
 * Public API for generating and safely writing workflow-state.json.
 */

'use strict';

const { writeWorkflowState } = require('./write-workflow-state');

function generateWorkflowState(bookSlug) {
  return writeWorkflowState(bookSlug);
}

module.exports = {
  generateWorkflowState
};

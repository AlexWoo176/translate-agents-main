/**
 * load-master-workflow.js
 *
 * Loads and parses the machine-readable workflow definition file.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const PhaseDefinition = require('./phase-definition');

const WORKFLOW_PATH = path.resolve(__dirname, '../../workflow/master-workflow.json');

function loadMasterWorkflow() {
  if (!fs.existsSync(WORKFLOW_PATH)) {
    throw new Error(`Master workflow file not found at: ${WORKFLOW_PATH}`);
  }

  try {
    const content = fs.readFileSync(WORKFLOW_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse master-workflow.json: ${err.message}`);
  }
}

function getWorkflowPhases() {
  const workflow = loadMasterWorkflow();
  if (!workflow.phases || !Array.isArray(workflow.phases)) {
    throw new Error('Invalid workflow structure: "phases" array is missing');
  }
  return workflow.phases.map(p => new PhaseDefinition(p));
}

function getPhaseDefinition(phaseId) {
  const phases = getWorkflowPhases();
  const phase = phases.find(p => p.id === phaseId);
  if (!phase) {
    throw new Error(`Workflow phase not found: ${phaseId}`);
  }
  return phase;
}

module.exports = {
  loadMasterWorkflow,
  getWorkflowPhases,
  getPhaseDefinition
};

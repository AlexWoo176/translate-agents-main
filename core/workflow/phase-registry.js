/**
 * phase-registry.js
 *
 * Query and lookup operations on the workflow phases.
 */

'use strict';

const { getWorkflowPhases, getPhaseDefinition } = require('./load-master-workflow');

function listPhases() {
  return getWorkflowPhases().sort((a, b) => a.order - b.order);
}

function getPhase(phaseId) {
  return getPhaseDefinition(phaseId);
}

function getPhasesByScope(scope) {
  if (!scope) throw new Error('Scope is required');
  return listPhases().filter(p => p.scope.includes(scope));
}

function getNextPhase(phaseId) {
  const phases = listPhases();
  const index = phases.findIndex(p => p.id === phaseId);
  if (index === -1 || index === phases.length - 1) return null;
  return phases[index + 1];
}

function getPreviousPhase(phaseId) {
  const phases = listPhases();
  const index = phases.findIndex(p => p.id === phaseId);
  if (index === -1 || index === 0) return null;
  return phases[index - 1];
}

function getRunnablePhases() {
  return listPhases().filter(p => p.canRunAutomatically);
}

function getDatasetWritingPhases() {
  return listPhases().filter(p => p.writesDataset);
}

function getReadOnlyPhases() {
  return listPhases().filter(p => p.readOnly);
}

module.exports = {
  listPhases,
  getPhase,
  getPhasesByScope,
  getNextPhase,
  getPreviousPhase,
  getRunnablePhases,
  getDatasetWritingPhases,
  getReadOnlyPhases
};

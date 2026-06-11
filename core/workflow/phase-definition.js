/**
 * phase-definition.js
 *
 * Defines the structure and properties of a workflow phase.
 */

'use strict';

class PhaseDefinition {
  constructor(data) {
    if (!data) throw new Error('Phase data is required');
    
    this.id = data.id;
    this.name = data.name;
    this.order = data.order;
    this.description = data.description;
    this.agent = data.agent;
    this.scope = data.scope;
    this.inputPhases = data.inputPhases || [];
    this.outputPhase = data.outputPhase;
    this.inputPaths = data.inputPaths || [];
    this.outputPaths = data.outputPaths || [];
    this.qualityGate = data.qualityGate;
    this.requiresHumanApproval = !!data.requiresHumanApproval;
    this.canRunAutomatically = !!data.canRunAutomatically;
    this.writesDataset = !!data.writesDataset;
    this.readOnly = !!data.readOnly;
    this.status = data.status || 'defined';
  }
}

module.exports = PhaseDefinition;

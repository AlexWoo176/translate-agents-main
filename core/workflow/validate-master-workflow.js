/**
 * validate-master-workflow.js
 *
 * Validates the schema, dependencies, and constraints of the master workflow definition.
 */

'use strict';

function validateMasterWorkflow(workflow) {
  const result = {
    valid: true,
    checks: {
      schema: 'passed',
      requiredFields: 'passed',
      uniquePhaseIds: 'passed',
      uniqueOrder: 'passed',
      dependencies: 'passed',
      circularDependency: 'passed',
      agentReferences: 'passed'
    },
    errors: []
  };

  function fail(checkKey, msg) {
    result.valid = false;
    result.checks[checkKey] = 'failed';
    result.errors.push(msg);
  }

  // 1. Schema check
  if (!workflow || typeof workflow !== 'object') {
    fail('schema', 'Workflow definition is null or not an object');
    return result;
  }
  if (!workflow.schemaVersion) {
    fail('schema', 'Missing "schemaVersion" in workflow definition');
  }
  if (!workflow.workflowId) {
    fail('schema', 'Missing "workflowId" in workflow definition');
  }
  if (!workflow.phases || !Array.isArray(workflow.phases)) {
    fail('schema', '"phases" must be an array');
    return result;
  }

  const phases = workflow.phases;

  // 2. Required fields check & consistency & scope & agent checks
  const requiredFields = [
    'id', 'name', 'order', 'description', 'agent', 'scope', 
    'inputPhases', 'outputPhase', 'inputPaths', 'outputPaths', 
    'qualityGate', 'requiresHumanApproval', 'canRunAutomatically', 
    'writesDataset', 'readOnly', 'status'
  ];

  const allowedScopes = new Set(['book', 'chapter', 'book-level']);
  const allowedAgents = new Set([
    'agent-plan', 'agent-scrape', 'agent-analyze', 
    'agent-translate', 'agent-review', 'agent-archive', 'workflow-core'
  ]);

  const phaseIds = new Set();
  const phaseOrders = new Set();
  const phaseMap = {};

  for (const phase of phases) {
    // Check required fields
    let missingField = false;
    for (const field of requiredFields) {
      if (phase[field] === undefined || phase[field] === null) {
        fail('requiredFields', `Phase order ${phase.order || 'unknown'} (id: ${phase.id || 'unknown'}) is missing required field: "${field}"`);
        missingField = true;
      }
    }

    if (missingField) continue;

    phaseMap[phase.id] = phase;

    // Check unique phase ids
    if (phaseIds.has(phase.id)) {
      fail('uniquePhaseIds', `Duplicate phase ID detected: "${phase.id}"`);
    } else {
      phaseIds.add(phase.id);
    }

    // Check unique order
    if (phaseOrders.has(phase.order)) {
      fail('uniqueOrder', `Duplicate phase order detected: ${phase.order} (id: "${phase.id}")`);
    } else {
      phaseOrders.add(phase.order);
    }

    // Check qualityGate is not empty
    if (typeof phase.qualityGate !== 'string' || phase.qualityGate.trim() === '') {
      fail('requiredFields', `Phase "${phase.id}" qualityGate cannot be empty`);
    }

    // Check scope elements are valid
    if (!Array.isArray(phase.scope) || phase.scope.length === 0) {
      fail('requiredFields', `Phase "${phase.id}" scope must be a non-empty array`);
    } else {
      for (const s of phase.scope) {
        if (!allowedScopes.has(s)) {
          fail('requiredFields', `Phase "${phase.id}" has invalid scope: "${s}". Must be one of: book, chapter, book-level`);
        }
      }
    }

    // Check agent is valid
    if (!allowedAgents.has(phase.agent)) {
      fail('agentReferences', `Phase "${phase.id}" has invalid agent: "${phase.agent}". Must be one of: agent-plan, agent-scrape, agent-analyze, agent-translate, agent-review, agent-archive, workflow-core`);
    }

    // Check readOnly & writesDataset consistency
    if (phase.readOnly && phase.writesDataset) {
      fail('requiredFields', `Conflict in phase "${phase.id}": cannot have readOnly = true and writesDataset = true`);
    }
  }

  // 3. Dependency check: inputPhases exist
  for (const phase of phases) {
    if (!phase.id || !phase.inputPhases) continue;
    
    for (const inputId of phase.inputPhases) {
      if (!phaseIds.has(inputId)) {
        fail('dependencies', `Phase "${phase.id}" references non-existent input phase: "${inputId}"`);
      }
    }
  }

  // 4. Circular dependency check
  if (result.checks.dependencies === 'passed') {
    const visited = {};
    const recStack = {};

    function hasCycle(node) {
      if (recStack[node]) return true;
      if (visited[node]) return false;

      visited[node] = true;
      recStack[node] = true;

      const phase = phaseMap[node];
      if (phase && phase.inputPhases) {
        for (const inputId of phase.inputPhases) {
          if (hasCycle(inputId)) return true;
        }
      }

      recStack[node] = false;
      return false;
    }

    for (const phase of phases) {
      if (phase.id && hasCycle(phase.id)) {
        fail('circularDependency', `Circular dependency detected in workflow starting from phase: "${phase.id}"`);
        break; // Only report one cycle
      }
    }
  } else {
    result.checks.circularDependency = 'failed';
  }

  return result;
}

module.exports = {
  validateMasterWorkflow
};

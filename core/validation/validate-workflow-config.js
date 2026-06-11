'use strict';

const fs = require('fs');
const path = require('path');
const { loadMasterWorkflow } = require('../workflow/load-master-workflow');

/**
 * Checks for circular dependencies in workflow phases using DFS.
 * 
 * @param {object[]} phases 
 * @returns {string[]|null} The path depicting the cycle if found, or null
 */
function findCircularDependency(phases) {
  const adj = {};
  phases.forEach(p => {
    adj[p.id] = p.inputPhases || [];
  });

  const visited = {}; // 'visiting' or 'visited'
  const pathStack = [];

  function dfs(node) {
    if (visited[node] === 'visiting') {
      const idx = pathStack.indexOf(node);
      return [...pathStack.slice(idx), node];
    }
    if (visited[node] === 'visited') {
      return null;
    }

    visited[node] = 'visiting';
    pathStack.push(node);

    const neighbors = adj[node] || [];
    for (const neighbor of neighbors) {
      // Check if neighbor exists in phases list
      if (adj[neighbor]) {
        const cycle = dfs(neighbor);
        if (cycle) return cycle;
      }
    }

    pathStack.pop();
    visited[node] = 'visited';
    return null;
  }

  for (const p of phases) {
    const cycle = dfs(p.id);
    if (cycle) {
      return cycle;
    }
  }

  return null;
}

/**
 * Validates the master workflow config file.
 * 
 * @returns {object} { status: 'passed'|'passed_with_warnings'|'failed', errors: string[], warnings: string[] }
 */
function validateWorkflowConfig() {
  const errors = [];
  const warnings = [];

  let workflow;
  try {
    workflow = loadMasterWorkflow();
  } catch (err) {
    return {
      status: 'failed',
      errors: [`Failed to load or parse master workflow: ${err.message}`],
      warnings: []
    };
  }

  if (!workflow.phases || !Array.isArray(workflow.phases)) {
    return {
      status: 'failed',
      errors: ["Workflow config is missing 'phases' array"],
      warnings: []
    };
  }

  const phases = workflow.phases;

  // 1. Unique Phase IDs
  const phaseIds = new Set();
  const duplicateIds = new Set();
  phases.forEach(p => {
    if (!p.id) {
      errors.push("Phase definition is missing 'id'");
      return;
    }
    const idLower = p.id.toLowerCase();
    if (phaseIds.has(idLower)) {
      duplicateIds.add(p.id);
    }
    phaseIds.add(idLower);
  });

  if (duplicateIds.size > 0) {
    errors.push(`Duplicate phase IDs found: ${Array.from(duplicateIds).join(', ')}`);
  }

  // 2. Metadata checks
  phases.forEach(p => {
    if (!p.id) return;
    
    if (!p.name || typeof p.name !== 'string' || p.name.trim() === '') {
      errors.push(`Phase '${p.id}' is missing a 'name'`);
    }
    if (p.order === undefined || typeof p.order !== 'number') {
      errors.push(`Phase '${p.id}' is missing or has invalid 'order'`);
    }
    if (!p.agent || typeof p.agent !== 'string') {
      warnings.push(`Phase '${p.id}' is missing 'agent' metadata`);
    }
    if (!p.scope || !Array.isArray(p.scope)) {
      warnings.push(`Phase '${p.id}' is missing 'scope' metadata`);
    }
  });

  // 3. Dependency target existence
  phases.forEach(p => {
    if (!p.id) return;
    const inputPhases = p.inputPhases || [];
    inputPhases.forEach(dep => {
      if (!phaseIds.has(dep.toLowerCase())) {
        errors.push(`Phase '${p.id}' has unresolved dependency: '${dep}'`);
      }
    });
  });

  // 4. Circular dependency check
  const cycle = findCircularDependency(phases);
  if (cycle) {
    errors.push(`Circular dependency detected: ${cycle.join(' -> ')}`);
  }

  // 5. Phase runner availability (supported phase mapping)
  const supportedRunners = [
    'plan', 'scrape', 'clean', 'analyze', 'prep', 
    'translate', 'review', 'archive', 'build_preview', 'export_epub'
  ];
  const metaPhases = ['qa_summary', 'generate_state', 'final_validate'];

  phases.forEach(p => {
    if (!p.id) return;
    const idLower = p.id.toLowerCase();
    if (!supportedRunners.includes(idLower) && !metaPhases.includes(idLower)) {
      warnings.push(`Phase '${p.id}' has no direct runner registration (unknown/custom phase)`);
    }
    if (metaPhases.includes(idLower)) {
      // Confirm it has been marked/handled appropriately
      // (meta-phases are handled internally in workflow-runner.js)
    }
  });

  let status = 'passed';
  if (errors.length > 0) {
    status = 'failed';
  } else if (warnings.length > 0) {
    status = 'passed_with_warnings';
  }

  return {
    status,
    errors,
    warnings
  };
}

module.exports = {
  validateWorkflowConfig
};

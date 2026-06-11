/**
 * workflow-graph.js
 *
 * Provides utilities for analyzing phase dependencies, dependents, and execution order.
 */

'use strict';

const { listPhases } = require('./phase-registry');

function buildWorkflowGraph() {
  const phases = listPhases();
  const graph = {};
  
  for (const p of phases) {
    graph[p.id] = {
      id: p.id,
      phase: p,
      dependencies: p.inputPhases || [],
      dependents: []
    };
  }
  
  for (const p of phases) {
    if (p.inputPhases) {
      for (const depId of p.inputPhases) {
        if (graph[depId]) {
          graph[depId].dependents.push(p.id);
        }
      }
    }
  }
  
  return graph;
}

function getPhaseDependencies(phaseId) {
  const graph = buildWorkflowGraph();
  const deps = new Set();
  
  function visit(id) {
    const node = graph[id];
    if (!node) return;
    for (const depId of node.dependencies) {
      if (!deps.has(depId)) {
        deps.add(depId);
        visit(depId);
      }
    }
  }
  
  visit(phaseId);
  return Array.from(deps);
}

function getPhaseDependents(phaseId) {
  const graph = buildWorkflowGraph();
  const dependents = new Set();
  
  function visit(id) {
    const node = graph[id];
    if (!node) return;
    for (const depId of node.dependents) {
      if (!dependents.has(depId)) {
        dependents.add(depId);
        visit(depId);
      }
    }
  }
  
  visit(phaseId);
  return Array.from(dependents);
}

function getExecutionOrder() {
  const graph = buildWorkflowGraph();
  const order = [];
  const visited = {};
  
  function visit(id) {
    if (visited[id] === 'visiting') {
      throw new Error(`Circular dependency detected involving: ${id}`);
    }
    if (visited[id] === 'visited') return;
    
    visited[id] = 'visiting';
    const node = graph[id];
    if (node) {
      for (const depId of node.dependencies) {
        visit(depId);
      }
    }
    visited[id] = 'visited';
    order.push(id);
  }
  
  const phases = listPhases();
  for (const p of phases) {
    visit(p.id);
  }
  
  return order;
}

function canRunPhase(phaseId, completedPhaseIds) {
  const graph = buildWorkflowGraph();
  const node = graph[phaseId];
  if (!node) return false;
  
  const completedSet = new Set(completedPhaseIds || []);
  for (const depId of node.dependencies) {
    if (!completedSet.has(depId)) {
      return false;
    }
  }
  return true;
}

module.exports = {
  buildWorkflowGraph,
  getPhaseDependencies,
  getPhaseDependents,
  getExecutionOrder,
  canRunPhase
};

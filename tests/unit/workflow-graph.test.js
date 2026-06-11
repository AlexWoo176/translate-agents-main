'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  buildWorkflowGraph,
  getPhaseDependencies,
  getPhaseDependents,
  getExecutionOrder,
  canRunPhase
} = require('../../core/workflow/workflow-graph');

test('Workflow Graph - buildWorkflowGraph', () => {
  const graph = buildWorkflowGraph();
  assert.ok(graph.plan);
  assert.ok(graph.scrape);
  assert.deepStrictEqual(graph.plan.dependencies, []);
  assert.ok(graph.scrape.dependencies.includes('plan'));
});

test('Workflow Graph - getPhaseDependencies', () => {
  const deps = getPhaseDependencies('clean');
  assert.ok(deps.includes('scrape'));
  assert.ok(deps.includes('plan'));
});

test('Workflow Graph - getPhaseDependents', () => {
  const deps = getPhaseDependents('scrape');
  assert.ok(deps.includes('clean'));
  assert.ok(deps.includes('translate'));
});

test('Workflow Graph - getExecutionOrder', () => {
  const order = getExecutionOrder();
  assert.ok(order.indexOf('plan') < order.indexOf('scrape'));
  assert.ok(order.indexOf('scrape') < order.indexOf('clean'));
});

test('Workflow Graph - canRunPhase', () => {
  assert.strictEqual(canRunPhase('plan', []), true);
  assert.strictEqual(canRunPhase('scrape', []), false);
  assert.strictEqual(canRunPhase('scrape', ['plan']), true);
});

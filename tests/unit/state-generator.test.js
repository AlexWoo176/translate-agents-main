'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { calculateWorkflowState } = require('../../core/state/calculate-workflow-state');

test('State Generator - calculateWorkflowState', () => {
  // Use existing entrepreneurship dataset for the test
  const state = calculateWorkflowState('entrepreneurship');
  
  assert.strictEqual(state.schemaVersion, '1.0');
  assert.strictEqual(state.bookSlug, 'entrepreneurship');
  assert.ok(state.overallStatus);
  assert.ok(state.appReadiness);
  assert.ok(Object.keys(state.chapters).length > 0);
  assert.ok(state.qualityGates);
  assert.ok(state.assets);
});

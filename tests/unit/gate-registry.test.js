'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { listQualityGates, getQualityGate, hasQualityGate } = require('../../core/gates/gate-registry');

test('Gate Registry - listQualityGates', () => {
  const gates = listQualityGates();
  assert.ok(gates.includes('glossary'));
  assert.ok(gates.includes('prepCompleteness'));
  assert.ok(gates.includes('tableIntegrity'));
  assert.ok(gates.includes('glossaryApproval'));
  assert.ok(gates.includes('glossaryImpact'));
  assert.strictEqual(gates.length, 19);
});

test('Gate Registry - hasQualityGate', () => {
  assert.strictEqual(hasQualityGate('glossary'), true);
  assert.strictEqual(hasQualityGate('unknown-gate'), false);
});

test('Gate Registry - getQualityGate', () => {
  const gate = getQualityGate('glossary');
  assert.strictEqual(gate.tool, 'tools/validate-glossary.js');
  assert.strictEqual(gate.reportJson, 'reports/glossary-validation-report.json');
  
  assert.throws(() => {
    getQualityGate('unknown-gate');
  });
});

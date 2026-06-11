'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { validateBookConfig } = require('../../core/validation/validate-book-config');
const { getBookRoot } = require('../../core/paths/path-resolver');

test('Book Config Validator - Validate reference project config', () => {
  const result = validateBookConfig('entrepreneurship');
  // Might have passed or passed_with_warnings depending on warning conditions
  assert.ok(['passed', 'passed_with_warnings'].includes(result.status));
  assert.strictEqual(result.errors.length, 0);
});

test('Book Config Validator - Fail on invalid slug project', () => {
  const result = validateBookConfig('non-existent-book-slug');
  assert.strictEqual(result.status, 'failed');
  assert.ok(result.errors.length > 0);
});

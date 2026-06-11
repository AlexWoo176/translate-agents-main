'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

test('Smoke Test - Entrepreneurship - status command works', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  const stdout = execSync(`node "${cliPath}" status entrepreneurship`, { encoding: 'utf8' });
  assert.ok(stdout.includes('Book: Entrepreneurship'));
});

test('Smoke Test - Entrepreneurship - workflow validate works', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  const stdout = execSync(`node "${cliPath}" workflow validate`, { encoding: 'utf8' });
  assert.ok(stdout.includes('Result: Passed'));
});

test('Smoke Test - Entrepreneurship - workflow-run dry-run works', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  const stdout = execSync(`node "${cliPath}" workflow-run entrepreneurship --dry-run`, { encoding: 'utf8' });
  assert.ok(stdout.includes('Result: dry_run_passed'));
});

test('Smoke Test - Entrepreneurship - validate-production works', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  // Might return code 0 or 1 depending on whether it is fully compliant, so we catch potential non-zero exit codes.
  try {
    const stdout = execSync(`node "${cliPath}" validate-production entrepreneurship`, { encoding: 'utf8' });
    assert.ok(stdout.includes('Production Readiness Check'));
    assert.ok(stdout.includes('Result:'));
  } catch (err) {
    // If it fails because of warnings or actual errors, the output should still contain the header
    assert.ok(err.stdout.includes('Production Readiness Check'));
    assert.ok(err.stdout.includes('Result:'));
  }
});

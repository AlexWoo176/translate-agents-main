'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

test('CLI Integration - init-book command dry-run', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  try {
    const stdout = execSync(`node "${cliPath}" init-book --slug test-psychology-3e --title "Psychology 3e" --dry-run`, { encoding: 'utf8' });
    
    assert.ok(stdout.includes('Initializing book project: test-psychology-3e'));
    assert.ok(stdout.includes('Mode: dry-run'));
    assert.ok(stdout.includes('Result: dry_run_passed'));
  } catch (err) {
    assert.fail(`CLI init-book command failed: ${err.message}`);
  }
});

test('CLI Integration - init-book command requires title', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  assert.throws(() => {
    execSync(`node "${cliPath}" init-book --slug test-psychology-3e --dry-run`, { stdio: 'pipe' });
  });
});

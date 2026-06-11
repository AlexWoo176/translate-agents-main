'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

test('CLI Integration - run plan phase dry-run', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  try {
    const stdout = execSync(`node "${cliPath}" run entrepreneurship --phase plan --dry-run`, { encoding: 'utf8' });
    
    assert.ok(stdout.includes('Running phase "plan"'));
    assert.ok(stdout.includes('Mode: dry-run'));
    assert.ok(stdout.includes('Status: DRY_RUN_PASSED'));
  } catch (err) {
    assert.fail(`CLI run plan command failed: ${err.message}`);
  }
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

test('CLI Integration - qa list command', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  try {
    const stdout = execSync(`node "${cliPath}" qa entrepreneurship --list`, { encoding: 'utf8' });
    
    assert.ok(stdout.includes('Available quality gates:'));
    assert.ok(stdout.includes('- glossary'));
    assert.ok(stdout.includes('- tableIntegrity'));
  } catch (err) {
    assert.fail(`CLI qa list command failed: ${err.message}`);
  }
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

test('CLI Integration - status command', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  try {
    const stdout = execSync(`node "${cliPath}" status entrepreneurship`, { encoding: 'utf8' });
    
    assert.ok(stdout.includes('Book: Entrepreneurship'));
    assert.ok(stdout.includes('Book slug: entrepreneurship'));
    assert.ok(stdout.includes('Quality gates:'));
  } catch (err) {
    assert.fail(`CLI status command failed to execute: ${err.message}`);
  }
});

test('CLI Integration - status command fails on invalid slug', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  assert.throws(() => {
    execSync(`node "${cliPath}" status invalid-slug-name`, { stdio: 'pipe' });
  });
});

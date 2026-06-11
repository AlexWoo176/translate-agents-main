'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

test('Smoke Test - New Book - init dry-run works', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  const stdout = execSync(`node "${cliPath}" init-book --slug psychology-smoke --title "Psychology Smoke" --dry-run`, { encoding: 'utf8' });
  assert.ok(stdout.includes('Initializing book project: psychology-smoke'));
  assert.ok(stdout.includes('Result: dry_run_passed'));
});

test('Smoke Test - New Book - invalid slug format is rejected', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  assert.throws(() => {
    // Uppercase is invalid
    execSync(`node "${cliPath}" init-book --slug Psychology-Invalid --title "Title" --dry-run`, { stdio: 'pipe' });
  });
});

test('Smoke Test - New Book - duplicate book slug raises error without force', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  assert.throws(() => {
    // entrepreneurship already exists, so it should throw duplicate error
    execSync(`node "${cliPath}" init-book --slug entrepreneurship --title "Entrepreneurship Duplicate" --dry-run`, { stdio: 'pipe' });
  });
});

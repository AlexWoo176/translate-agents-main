'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

test('CLI Integration - workflow-run dry-run', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  try {
    const stdout = execSync(`node "${cliPath}" workflow-run entrepreneurship --dry-run`, { encoding: 'utf8' });
    
    assert.ok(stdout.includes('Workflow run plan:'));
    assert.ok(stdout.includes('1. plan'));
    assert.ok(stdout.includes('2. scrape'));
    assert.ok(stdout.includes('Result: dry_run_passed'));
  } catch (err) {
    assert.fail(`CLI workflow-run dry-run failed: ${err.message}`);
  }
});

test('CLI Integration - workflow-run dry-run with ranges', () => {
  const cliPath = path.resolve(__dirname, '../../cli/index.js');
  try {
    const stdout = execSync(`node "${cliPath}" workflow-run entrepreneurship --from analyze --to review --chapter chapter-2 --dry-run`, { encoding: 'utf8' });
    
    assert.ok(stdout.includes('Workflow run plan:'));
    assert.ok(stdout.includes('1. analyze'));
    assert.ok(stdout.includes('2. glossary'));
    assert.ok(stdout.includes('3. prep'));
    assert.ok(stdout.includes('4. translate'));
    assert.ok(stdout.includes('5. review'));
    assert.ok(stdout.includes('Scope:\nBook: entrepreneurship\nChapter: chapter-2'));
    assert.ok(stdout.includes('Result: dry_run_passed'));
  } catch (err) {
    assert.fail(`CLI workflow-run range dry-run failed: ${err.message}`);
  }
});

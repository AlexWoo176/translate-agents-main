/**
 * run-quality-gate.js
 *
 * Spawns a single quality gate verification tool, captures its outputs, and reads the report.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { getBookRoot } = require('../paths/path-resolver');
const { getQualityGate } = require('./gate-registry');
const { readGateResult } = require('./read-gate-result');

async function runQualityGate(bookSlug, gateId, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const gate = getQualityGate(gateId);

  // 1. Check for internal runner
  if (gate.internalRunner) {
    const runnerPath = path.resolve(__dirname, `${gate.internalRunner}.js`);
    if (!fs.existsSync(runnerPath)) {
      return {
        gateId,
        status: "missing_runner",
        success: false,
        internalRunner: gate.internalRunner,
        message: `Internal runner not found at: ${runnerPath}`
      };
    }
    const runner = require(runnerPath);
    return runner.run(bookSlug, options);
  }

  const toolPath = path.join(bookRoot, gate.tool);

  // 2. Check if tool exists
  if (!fs.existsSync(toolPath)) {
    return {
      gateId,
      status: "missing_tool",
      success: false,
      tool: gate.tool,
      message: `Tool not found at: ${toolPath}`
    };
  }

  // 2. Safety check: prepCompleteness modifications
  if (gateId === 'prepCompleteness' && !options.allowWrite) {
    // Skip and return read results with a warning
    const existing = readGateResult(bookSlug, gateId);
    const skipWarning = "prepCompleteness gate is skipped by default because current tool may modify dataset.";
    
    if (existing.status !== 'missing_report' && existing.status !== 'invalid_report') {
      if (!existing.warnings) existing.warnings = [];
      if (!existing.warnings.includes(skipWarning)) {
        existing.warnings.unshift(skipWarning);
      }
      return existing;
    }

    return {
      gateId,
      status: "passed_with_warnings",
      success: true,
      tool: gate.tool,
      reportJson: gate.reportJson,
      reportMarkdown: gate.reportMarkdown,
      warnings: [skipWarning],
      issues: [],
      message: skipWarning
    };
  }

  // 3. Construct execution command
  let cmd = `node "${toolPath}"`;
  
  // Pass --check-only by default unless explicit option passed
  if (options.checkOnly !== false) {
    cmd += " --check-only";
  }

  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  try {
    const res = await exec(cmd, { cwd: bookRoot });
    stdout = res.stdout;
    stderr = res.stderr;
  } catch (err) {
    exitCode = err.code || 1;
    stdout = err.stdout || '';
    stderr = err.stderr || '';
  }

  // 4. Read report results
  const result = readGateResult(bookSlug, gateId);
  result.exitCode = exitCode;
  result.stdout = stdout;
  result.stderr = stderr;

  // If tool failed with exit code, force failed status
  if (exitCode !== 0) {
    result.status = 'failed';
    result.success = false;
  }

  return result;
}

module.exports = {
  runQualityGate
};

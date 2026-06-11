'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot, getBookConfigPath } = require('../paths/path-resolver');
const { loadBookConfig } = require('../config/book-config');
const { generateProjectPlan } = require('../project/project-plan-generator');
const { runQualityGate } = require('../gates/run-quality-gate');
const { generateWorkflowState } = require('../state/generate-workflow-state');
const { createPhaseRunResult } = require('./phase-run-result');
const { backupPlanFiles } = require('./plan-runner-utils');

// Helper: Formats timestamp to YYYYMMDD-HHMMSS
function getTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * Runs the plan phase workflow runner.
 * 
 * @param {string} bookSlug 
 * @param {object} options 
 * @param {boolean} [options.dryRun=false] 
 * @param {boolean} [options.force=false] 
 * @returns {object} Phase run result
 */
async function runPlanPhase(bookSlug, options = {}) {
  const startedAt = new Date().toISOString();
  const timestamp = getTimestamp();
  const bookRoot = getBookRoot(bookSlug);
  const configPath = getBookConfigPath(bookSlug);

  const dryRun = !!options.dryRun;
  const force = !!options.force;

  const filesCreated = [];
  const filesUpdated = [];
  const filesSkipped = [];
  const warnings = [];
  const errors = [];
  const inputs = ['book.config.json'];
  const outputs = [];

  // 1. Verify book.config.json exists
  if (!fs.existsSync(configPath)) {
    errors.push(`Book config file does not exist at: ${configPath}. Run 'init-book' first.`);
    return createPhaseRunResult({
      phase: 'plan',
      bookSlug,
      scope: 'book',
      status: 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      dryRun,
      force,
      inputs,
      outputs,
      filesCreated,
      filesUpdated,
      filesSkipped,
      warnings,
      errors
    });
  }

  // 2. Load config
  let config;
  try {
    config = loadBookConfig(bookSlug);
  } catch (err) {
    errors.push(`Failed to load book config: ${err.message}`);
    return createPhaseRunResult({
      phase: 'plan',
      bookSlug,
      scope: 'book',
      status: 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      dryRun,
      force,
      inputs,
      outputs,
      filesCreated,
      filesUpdated,
      filesSkipped,
      warnings,
      errors
    });
  }

  // 3. Dry run mode check
  if (dryRun) {
    const mockPlan = generateProjectPlan(bookSlug, config, { dryRun: true });
    
    return createPhaseRunResult({
      phase: 'plan',
      bookSlug,
      scope: 'book',
      status: 'dry_run_passed',
      startedAt,
      finishedAt: new Date().toISOString(),
      dryRun: true,
      force,
      inputs,
      outputs: [],
      filesCreated: [],
      filesUpdated: [],
      filesSkipped: [],
      warnings,
      errors,
      qualityGate: {
        id: 'planCompleteness',
        status: 'passed'
      }
    });
  }

  // 4. Overwrite backup
  try {
    const backupDir = backupPlanFiles(bookSlug, timestamp);
    if (backupDir) {
      const relBackup = path.relative(bookRoot, backupDir).replace(/\\/g, '/');
      warnings.push(`Backed up existing project plan files to: ${relBackup}`);
    }
  } catch (err) {
    warnings.push(`Backup of project plan files failed: ${err.message}`);
  }

  // 5. Generate project plan
  try {
    generateProjectPlan(bookSlug, config, { dryRun: false });
    
    // Check if files already existed to count created vs updated
    const planJsonExists = fs.existsSync(path.join(bookRoot, 'project-plan.json'));
    const planMdExists = fs.existsSync(path.join(bookRoot, 'project-plan.md'));

    const relJson = 'project-plan.json';
    const relMd = 'project-plan.md';

    if (planJsonExists) filesUpdated.push(relJson);
    else filesCreated.push(relJson);

    if (planMdExists) filesUpdated.push(relMd);
    else filesCreated.push(relMd);

    outputs.push(relJson, relMd);
  } catch (err) {
    errors.push(`Failed to generate project plan: ${err.message}`);
  }

  // 6. Run completeness gate
  let gateResult = null;
  try {
    gateResult = await runQualityGate(bookSlug, 'planCompleteness', { allowWrite: true });
    if (gateResult.warnings) warnings.push(...gateResult.warnings);
    if (gateResult.errors) errors.push(...gateResult.errors);
  } catch (err) {
    errors.push(`planCompleteness quality gate failed: ${err.message}`);
  }

  // 7. Regenerate workflow-state.json
  try {
    generateWorkflowState(bookSlug);
    outputs.push('workflow-state.json');
  } catch (err) {
    warnings.push(`Failed to regenerate workflow-state.json: ${err.message}`);
  }

  const finishedAt = new Date().toISOString();

  // 8. Write phase run report files
  writePhaseReports(bookSlug, {
    timestamp,
    startedAt,
    finishedAt,
    filesCreated,
    filesUpdated,
    filesSkipped,
    warnings,
    errors,
    gateResult
  });

  let finalStatus = 'passed';
  if (errors.length > 0) {
    finalStatus = 'failed';
  } else if (warnings.length > 0) {
    finalStatus = 'passed_with_warnings';
  }

  return createPhaseRunResult({
    phase: 'plan',
    bookSlug,
    scope: 'book',
    status: finalStatus,
    startedAt,
    finishedAt,
    dryRun,
    force,
    inputs,
    outputs,
    filesCreated,
    filesUpdated,
    filesSkipped,
    warnings,
    errors,
    qualityGate: gateResult ? {
      id: gateResult.gateId,
      status: gateResult.status
    } : null
  });
}

function writePhaseReports(bookSlug, { timestamp, startedAt, finishedAt, filesCreated, filesUpdated, filesSkipped, warnings, errors, gateResult }) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports', 'phase-runs');

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const jsonPath = path.join(reportsDir, `plan-${timestamp}.json`);
  const mdPath = path.join(reportsDir, `plan-${timestamp}.md`);

  const report = {
    phase: 'plan',
    bookSlug,
    scope: 'book',
    startedAt,
    finishedAt,
    filesCreated,
    filesUpdated,
    filesSkipped,
    warnings: warnings.length,
    errors: errors.length,
    qualityGate: gateResult ? {
      id: gateResult.gateId,
      status: gateResult.status
    } : null
  };

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  let md = `# Phase Run Report: plan\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|---|---|\n`;
  md += `| **Book** | ${bookSlug} |\n`;
  md += `| **Scope** | book |\n`;
  md += `| **Started At** | ${startedAt} |\n`;
  md += `| **Finished At** | ${finishedAt} |\n`;
  md += `\n---\n\n`;
  md += `## Statistics\n\n`;
  md += `- **Files Created**: ${filesCreated.length}\n`;
  md += `- **Files Updated**: ${filesUpdated.length}\n`;
  md += `- **Files Skipped**: ${filesSkipped.length}\n`;
  md += `- **Warnings**: ${warnings.length}\n`;
  md += `- **Errors**: ${errors.length}\n\n`;

  if (gateResult) {
    md += `## Quality Gate\n\n`;
    md += `- **Gate ID**: \`${gateResult.gateId}\`\n`;
    md += `- **Status**: **${gateResult.status.toUpperCase()}**\n\n`;
  }

  if (warnings.length > 0) {
    md += `## Warnings\n\n`;
    warnings.forEach(w => { md += `- ⚠️ ${w}\n`; });
    md += `\n`;
  }

  if (errors.length > 0) {
    md += `## Errors\n\n`;
    errors.forEach(e => { md += `- ❌ ${e}\n`; });
    md += `\n`;
  }

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  runPlanPhase
};

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { generateGlossaryCandidates } = require('../glossary/glossary-candidate-generator');
const { getGlossaryStatus } = require('../glossary/glossary-status');
const { runQualityGate } = require('../gates/run-quality-gate');
const { createPhaseRunResult } = require('./phase-run-result');
const { getPhaseRunReportPath } = require('./glossary-runner-utils');

// Helper: Formats timestamp to YYYYMMDD-HHMMSS
function getTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const sec = pad(now.getSeconds());
  return `${yyyy}${mm}${dd}-${hh}${min}${sec}`;
}

async function runGlossaryPhase(bookSlug, options = {}) {
  const startedAt = new Date().toISOString();
  const timestamp = getTimestamp();
  const bookRoot = getBookRoot(bookSlug);
  
  const dryRun = !!options.dryRun;
  const force = !!options.force;
  
  const filesCreated = [];
  const filesUpdated = [];
  const filesSkipped = [];
  const warnings = [];
  const errors = [];
  
  const glossaryPath = path.join(bookRoot, 'glossary.csv');
  const existsBefore = fs.existsSync(glossaryPath);
  
  // 1. Generate glossary candidates
  const genResult = generateGlossaryCandidates(bookSlug, { dryRun });
  if (genResult.status === 'success' && !dryRun) {
    filesCreated.push(...genResult.filesCreated);
  }

  // 2. Initialize glossary.csv if missing entirely
  if (!existsBefore) {
    if (dryRun) {
      filesCreated.push('glossary.csv');
      warnings.push('glossary.csv is missing. Would bootstrap it from candidates.');
    } else {
      const candidatesPath = path.join(bookRoot, 'glossary-candidates.csv');
      if (fs.existsSync(candidatesPath)) {
        fs.copyFileSync(candidatesPath, glossaryPath);
        filesCreated.push('glossary.csv');
        warnings.push('glossary.csv was missing and has been bootstrapped from candidates. Status set to candidate. Please review and approve.');
      } else {
        // Create an empty glossary.csv with header
        const headers = [
          'term', 'translation', 'category', 'status', 'confidence',
          'source', 'chapterRefs', 'reviewer', 'reviewedAt', 'locked', 'notes', 'options', 'desc_en', 'desc_vi'
        ].join(',');
        fs.writeFileSync(glossaryPath, headers + '\n', 'utf8');
        filesCreated.push('glossary.csv');
        warnings.push('glossary.csv was missing and has been initialized with headers.');
      }
    }
  } else {
    filesSkipped.push('glossary.csv');
  }

  // 3. Execute glossary approval gate check
  let gateResult;
  try {
    const gateRunner = require('../gates/glossary-approval-gate');
    gateResult = await gateRunner.run(bookSlug, options);
  } catch (err) {
    errors.push(`Failed to run glossary approval gate: ${err.message}`);
    gateResult = {
      gateId: 'glossaryApproval',
      status: 'failed',
      success: false,
      warnings: [],
      errors: [err.message]
    };
  }

  // Compute final status of the runner phase
  let status = 'passed';
  if (gateResult.status === 'failed') {
    status = 'failed';
  } else if (gateResult.status === 'needs_human_review') {
    status = 'needs_human_review';
  } else if (gateResult.status === 'passed_with_warnings') {
    status = 'passed_with_warnings';
  }

  const finishedAt = new Date().toISOString();
  
  const phaseResult = createPhaseRunResult({
    phase: 'glossary',
    bookSlug,
    scope: 'book',
    status,
    startedAt,
    finishedAt,
    dryRun,
    force,
    inputs: existsBefore ? ['glossary.csv'] : [],
    outputs: ['glossary-candidates.csv', 'glossary.csv'],
    filesCreated,
    filesUpdated,
    filesSkipped,
    warnings: [...warnings, ...gateResult.warnings],
    errors: [...errors, ...gateResult.errors],
    qualityGate: {
      id: 'glossaryApproval',
      status: gateResult.status
    }
  });

  // Write phase run reports
  if (!dryRun) {
    const { jsonPath, mdPath } = getPhaseRunReportPath(bookSlug, timestamp);
    const dir = path.dirname(jsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(jsonPath, JSON.stringify(phaseResult, null, 2), 'utf8');

    let md = `# Glossary Phase Run Report\n\n`;
    md += `- **Book**: ${bookSlug}\n`;
    md += `- **Status**: **${status.toUpperCase()}**\n`;
    md += `- **Started At**: ${startedAt}\n`;
    md += `- **Finished At**: ${finishedAt}\n`;
    md += `- **Dry Run**: ${dryRun ? 'Yes' : 'No'}\n\n`;

    md += `## Quality Gate: glossaryApproval\n\n`;
    md += `- **Status**: **${gateResult.status.toUpperCase()}**\n`;
    if (gateResult.errors && gateResult.errors.length > 0) {
      md += `\n### Gate Errors\n`;
      gateResult.errors.forEach(e => { md += `- ❌ ${e}\n`; });
    }
    if (gateResult.warnings && gateResult.warnings.length > 0) {
      md += `\n### Gate Warnings\n`;
      gateResult.warnings.forEach(w => { md += `- ⚠️ ${w}\n`; });
    }

    md += `\n## File Outputs\n\n`;
    md += `- Files Created: ${filesCreated.length}\n`;
    filesCreated.forEach(f => { md += `  - ${f}\n`; });
    md += `- Files Updated: ${filesUpdated.length}\n`;
    filesUpdated.forEach(f => { md += `  - ${f}\n`; });
    md += `- Files Skipped: ${filesSkipped.length}\n`;
    filesSkipped.forEach(f => { md += `  - ${f}\n`; });

    fs.writeFileSync(mdPath, md, 'utf8');
  }

  return phaseResult;
}

module.exports = {
  runGlossaryPhase
};

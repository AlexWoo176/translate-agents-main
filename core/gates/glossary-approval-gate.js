'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { validateGlossaryCSVContent } = require('../glossary/glossary-schema-validator');
const { getGlossaryStatus } = require('../glossary/glossary-status');

async function run(bookSlug, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports');
  const reportJsonPath = path.join(reportsDir, 'glossary-approval-report.json');
  const reportMdPath = path.join(reportsDir, 'glossary-approval-report.md');

  const result = {
    gateId: 'glossaryApproval',
    status: 'passed',
    success: true,
    checks: {
      exists: false,
      validSchema: false,
      noDuplicates: false,
      approvedForFullBook: false
    },
    metrics: {
      totalTerms: 0,
      approved: 0,
      needsReview: 0,
      candidate: 0,
      locked: 0,
      rejected: 0
    },
    warnings: [],
    errors: []
  };

  const glossaryPath = path.join(bookRoot, 'glossary.csv');
  if (!fs.existsSync(glossaryPath)) {
    result.errors.push('glossary.csv is missing from project root.');
    result.status = 'failed';
    result.success = false;
    writeReports(result, reportJsonPath, reportMdPath);
    return result;
  }

  result.checks.exists = true;

  // Load and validate glossary content
  const csvText = fs.readFileSync(glossaryPath, 'utf8');
  const validation = validateGlossaryCSVContent(csvText);

  if (!validation.valid) {
    result.errors.push(...validation.errors);
    result.warnings.push(...validation.warnings);
    result.checks.validSchema = false;
    result.status = 'failed';
    result.success = false;
    writeReports(result, reportJsonPath, reportMdPath);
    return result;
  }

  result.checks.validSchema = true;
  result.checks.noDuplicates = true; // Handled by validator if it succeeded

  // Compute status & metrics
  const statusInfo = getGlossaryStatus(bookSlug);
  
  result.metrics = {
    totalTerms: statusInfo.totalTerms,
    approved: statusInfo.approved,
    needsReview: statusInfo.needsReview,
    candidate: statusInfo.candidate,
    locked: statusInfo.locked,
    rejected: statusInfo.rejected
  };

  result.warnings.push(...statusInfo.warnings);
  result.checks.approvedForFullBook = statusInfo.readyForFullBook;

  // Set final status
  const unapproved = statusInfo.needsReview + statusInfo.candidate;
  
  if (unapproved > 0) {
    // If we have unapproved terms, we warn or fail depending on ratio.
    // If ratio of unapproved terms is higher than 30% of total terms, we mark as needs_human_review.
    // However, if we translate full book, full book translation will check this gate.
    result.status = 'needs_human_review';
    result.success = true; // It does not exit code 1, but flags for review
    result.warnings.push(`Glossary contains ${unapproved} unapproved terms. Translate pilot chapter is allowed, but full-book translation requires approval.`);
  } else {
    result.status = 'passed';
    result.success = true;
  }

  writeReports(result, reportJsonPath, reportMdPath);
  return result;
}

function writeReports(result, jsonPath, mdPath) {
  const dir = path.dirname(jsonPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  let md = `# Glossary Approval Gate Report\n\n`;
  md += `## Summary\n\n`;
  md += `**Status**: **${result.status.toUpperCase()}**\n\n`;

  md += `## Metrics\n\n`;
  md += `- **Total Terms**: ${result.metrics.totalTerms}\n`;
  md += `- **Approved**: ${result.metrics.approved}\n`;
  md += `- **Locked**: ${result.metrics.locked}\n`;
  md += `- **Needs Review**: ${result.metrics.needsReview}\n`;
  md += `- **Candidates**: ${result.metrics.candidate}\n`;
  md += `- **Rejected**: ${result.metrics.rejected}\n\n`;

  md += `## Checks\n\n`;
  md += `| Check | Status | Description |\n`;
  md += `|---|---|---|\n`;
  md += `| glossary.csv Exists | ${result.checks.exists ? '✅ PASS' : '❌ FAIL'} | Verifies \`glossary.csv\` is present. |\n`;
  md += `| Valid Schema | ${result.checks.validSchema ? '✅ PASS' : '❌ FAIL'} | Verifies correct columns and structure. |\n`;
  md += `| No Duplicates | ${result.checks.noDuplicates ? '✅ PASS' : '❌ FAIL'} | Confirms no English term is declared twice. |\n`;
  md += `| Ready for Full Book | ${result.checks.approvedForFullBook ? '✅ PASS' : '⚠️ WARNING'} | Confirms all terms are reviewed and approved. |\n\n`;

  md += `## Errors\n\n`;
  if (result.errors.length > 0) {
    result.errors.forEach(e => { md += `- ❌ ${e}\n`; });
  } else {
    md += `None\n`;
  }
  md += `\n`;

  md += `## Warnings\n\n`;
  if (result.warnings.length > 0) {
    result.warnings.forEach(w => { md += `- ⚠️ ${w}\n`; });
  } else {
    md += `None\n`;
  }
  
  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  run
};

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

async function run(bookSlug, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports');
  const reportJsonPath = path.join(reportsDir, 'glossary-impact-gate-report.json');
  const reportMdPath = path.join(reportsDir, 'glossary-impact-gate-report.md');

  const result = {
    gateId: 'glossaryImpact',
    status: 'passed',
    success: true,
    checks: {
      hasImpactReport: false,
      staleDraftsDetected: false,
      staleFinalsDetected: false
    },
    affectedChaptersCount: 0,
    warnings: [],
    errors: []
  };

  const impactReportPath = path.join(reportsDir, 'glossary-impact-report.json');
  if (!fs.existsSync(impactReportPath)) {
    result.warnings.push('No glossary-impact-report.json found. Running baseline check (assumed passed).');
    writeReports(result, reportJsonPath, reportMdPath);
    return result;
  }

  result.checks.hasImpactReport = true;

  try {
    const raw = fs.readFileSync(impactReportPath, 'utf8');
    const impact = JSON.parse(raw);
    
    result.affectedChaptersCount = impact.summary.affectedChaptersCount;
    result.checks.staleDraftsDetected = impact.summary.draftStale;
    result.checks.staleFinalsDetected = impact.summary.finalStale;

    if (impact.status === 'final_translation_affected' || impact.status.includes('final_translation_affected')) {
      result.status = 'needs_human_review';
      result.errors.push(`Glossary change affects final translations in ${result.affectedChaptersCount} chapters. Re-run translate & review recommended.`);
    } else if (impact.status === 'drafts_affected' || impact.status.includes('drafts_affected')) {
      result.status = 'passed_with_warnings';
      result.warnings.push(`Glossary changes affect draft translations in ${result.affectedChaptersCount} chapters.`);
    } else if (impact.status === 'review_required') {
      result.status = 'passed_with_warnings';
      result.warnings.push(`Review rounds might need to be run again due to glossary edits.`);
    }
  } catch (e) {
    result.errors.push(`Failed to parse glossary-impact-report.json: ${e.message}`);
    result.status = 'failed';
    result.success = false;
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

  let md = `# Glossary Impact Gate Report\n\n`;
  md += `## Summary\n\n`;
  md += `**Status**: **${result.status.toUpperCase()}**\n\n`;

  md += `## Details\n\n`;
  md += `- **Impact Report Checked**: ${result.checks.hasImpactReport ? 'Yes' : 'No'}\n`;
  md += `- **Affected Chapters**: ${result.affectedChaptersCount}\n`;
  md += `- **Stale Drafts**: ${result.checks.staleDraftsDetected ? 'Yes' : 'No'}\n`;
  md += `- **Stale Finals**: ${result.checks.staleFinalsDetected ? 'Yes' : 'No'}\n\n`;

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

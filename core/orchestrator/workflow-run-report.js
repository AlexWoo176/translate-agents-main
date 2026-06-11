'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { readQualityGates } = require('../gates/quality-gates');

/**
 * Writes the workflow run report (JSON and MD).
 * 
 * @param {string} bookSlug 
 * @param {object} context - Execution context
 * @param {string} timestamp 
 * @returns {object} The report paths { jsonPath, mdPath }
 */
function writeWorkflowRunReport(bookSlug, context, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports', 'workflow-runs');

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const jsonPath = path.join(reportsDir, `workflow-run-${timestamp}.json`);
  const mdPath = path.join(reportsDir, `workflow-run-${timestamp}.md`);

  const durationMs = new Date(context.finishedAt) - new Date(context.startedAt);
  const durationSec = (durationMs / 1000).toFixed(1);

  const reportData = {
    workflowRunId: context.workflowRunId,
    bookSlug,
    status: context.status,
    startedAt: context.startedAt,
    finishedAt: context.finishedAt,
    durationSeconds: durationSec,
    mode: context.options.dryRun ? 'dry-run' : (context.options.resume ? 'resume' : 'normal'),
    scope: {
      chapterId: context.options.chapterId || null,
      all: !!context.options.all
    },
    phasesRequested: context.options.phases || 'all',
    phasesExecuted: context.executedPhases.map(p => p.phase),
    phasesSkipped: context.skippedPhases.map(p => p.id),
    phaseResults: context.executedPhases,
    warnings: context.warnings,
    errors: context.errors
  };

  // 1. Write JSON
  fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2), 'utf8');

  // 2. Read current quality gates
  let gatesInfo = {};
  try {
    const qg = readQualityGates(bookSlug);
    gatesInfo = qg.gates;
  } catch (e) {}

  // 3. Write MD
  let md = `# Workflow Run Report — ${context.workflowRunId}\n\n`;
  md += `## Summary\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|---|---|\n`;
  md += `| **Book Slug** | \`${bookSlug}\` |\n`;
  md += `| **Overall Run Status** | **${context.status.toUpperCase()}** |\n`;
  md += `| **Mode** | ${reportData.mode} |\n`;
  md += `| **Started At** | ${context.startedAt} |\n`;
  md += `| **Finished At** | ${context.finishedAt} |\n`;
  md += `| **Duration** | ${durationSec} seconds |\n`;
  md += `| **Chapter Scope** | ${context.options.chapterId || 'all'} |\n\n`;

  md += `## Requested Phases\n\n`;
  md += `- **from**: \`${context.options.from || 'start'}\`\n`;
  md += `- **to**: \`${context.options.to || 'end'}\`\n`;
  md += `- **phases**: \`${context.options.phases || 'all'}\`\n\n`;

  md += `## Executed Phases\n\n`;
  if (context.executedPhases.length > 0) {
    context.executedPhases.forEach(p => {
      md += `- \`${p.phase}\` : **${p.status.toUpperCase()}**\n`;
    });
  } else {
    md += `*None*\n`;
  }
  md += `\n`;

  md += `## Skipped Phases\n\n`;
  if (context.skippedPhases.length > 0) {
    context.skippedPhases.forEach(p => {
      md += `- \`${p.id}\` (Reason: ${p.reason})\n`;
    });
  } else {
    md += `*None*\n`;
  }
  md += `\n`;

  md += `## Phase Results\n\n`;
  md += `| Phase | Status | Created | Updated | Skipped | Warnings | Errors |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  context.executedPhases.forEach(p => {
    md += `| \`${p.phase}\` | **${p.status.toUpperCase()}** | ${p.filesCreated?.length || 0} | ${p.filesUpdated?.length || 0} | ${p.filesSkipped?.length || 0} | ${p.warnings?.length || 0} | ${p.errors?.length || 0} |\n`;
  });
  md += `\n`;

  md += `## Quality Gates Status\n\n`;
  md += `| Gate | Status |\n`;
  md += `|---|---|\n`;
  Object.entries(gatesInfo).forEach(([gate, status]) => {
    md += `| \`${gate}\` | **${status.toUpperCase()}** |\n`;
  });
  md += `\n`;

  md += `## Warnings\n\n`;
  if (context.warnings.length > 0) {
    context.warnings.forEach(w => {
      md += `- ⚠️ ${w}\n`;
    });
  } else {
    md += `*None*\n`;
  }
  md += `\n`;

  md += `## Errors\n\n`;
  if (context.errors.length > 0) {
    context.errors.forEach(e => {
      md += `- ❌ ${e}\n`;
    });
  } else {
    md += `*None*\n`;
  }
  md += `\n`;

  md += `## Next Recommended Steps\n\n`;
  if (context.status === 'failed') {
    md += `Identify the failed phase in the logs, correct the issue, and resume the run:\n`;
    md += `\`\`\`bash\n`;
    md += `node cli/index.js workflow-run ${bookSlug} --resume\n`;
    md += `\`\`\`\n`;
  } else {
    md += `Workflow completed. Run status command to see app readiness:\n`;
    md += `\`\`\`bash\n`;
    md += `node cli/index.js status ${bookSlug}\n`;
    md += `\`\`\`\n`;
  }

  fs.writeFileSync(mdPath, md, 'utf8');

  return {
    jsonPath,
    mdPath
  };
}

module.exports = {
  writeWorkflowRunReport
};

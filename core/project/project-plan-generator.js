'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

/**
 * Generates project-plan.json and project-plan.md for a book.
 * 
 * @param {string} bookSlug 
 * @param {object} config - Book configuration object 
 * @param {object} [options]
 * @param {boolean} [options.dryRun=false]
 * @returns {object} The generated project plan JSON object
 */
function generateProjectPlan(bookSlug, config, options = {}) {
  const dryRun = !!options.dryRun;
  const bookRoot = getBookRoot(bookSlug);

  const phases = (config.workflow && config.workflow.enabledPhases) || [
    'plan', 'scrape', 'clean', 'analyze', 'prep', 'translate', 'review', 'archive', 'build_preview', 'export_epub', 'qa_summary', 'generate_state', 'final_validate'
  ];

  const planPhases = phases.map(phaseId => {
    return {
      id: phaseId,
      status: phaseId === 'plan' ? 'passed' : 'pending'
    };
  });

  const sourceUrl = config.source?.bookUrl || '';

  const risks = [];
  if (!sourceUrl) {
    risks.push({
      category: 'source',
      description: 'Source URL (bookUrl) is not set. Scrape phase must run in offline/local mode.',
      severity: 'medium'
    });
  }

  const projectPlan = {
    bookSlug: config.bookSlug,
    title: config.title,
    status: 'planned',
    source: config.source || {},
    targetLanguage: config.targetLanguage || 'vi',
    workflow: {
      phases: planPhases
    },
    qualityGates: {
      planCompleteness: 'pending',
      rawHtmlExists: 'pending',
      cleanHtmlValid: 'pending',
      analysisCompleteness: 'pending',
      prepCompleteness: 'pending',
      translationCompleteness: 'pending',
      reviewCompleteness: 'pending',
      archiveCompleteness: 'pending',
      previewCssReferences: 'pending',
      epubValidity: 'pending',
      finalValidation: 'pending'
    },
    risks,
    nextRecommendedCommand: `node cli/index.js run ${bookSlug} --phase scrape --dry-run`
  };

  // Build Markdown content
  let md = `# Project Plan — ${config.title}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Book Slug**: \`${config.bookSlug}\`\n`;
  md += `- **Title**: ${config.title}\n`;
  md += `- **Target Language**: ${config.targetLanguage || 'vi'}\n`;
  md += `- **Status**: ${projectPlan.status.toUpperCase()}\n\n`;

  md += `## Source\n\n`;
  md += `- **Provider**: ${config.source?.provider || 'N/A'}\n`;
  md += `- **Book URL**: ${sourceUrl ? `[OpenStax Book Link](${sourceUrl})` : '*Pending/None*'}\n`;
  md += `- **License**: ${config.source?.license || 'CC BY'}\n\n`;

  md += `## Workflow Phases\n\n`;
  md += `| Phase | Status |\n`;
  md += `|---|---|\n`;
  projectPlan.workflow.phases.forEach(p => {
    const statusLabel = p.status === 'passed' ? '✅ **PASSED**' : '⏳ *PENDING*';
    md += `| \`${p.id}\` | ${statusLabel} |\n`;
  });
  md += `\n`;

  md += `## Quality Gates\n\n`;
  md += `| Gate | Initial Status |\n`;
  md += `|---|---|\n`;
  Object.keys(projectPlan.qualityGates).forEach(gate => {
    md += `| \`${gate}\` | ⏳ *PENDING* |\n`;
  });
  md += `\n`;

  md += `## Risks\n\n`;
  if (risks.length > 0) {
    risks.forEach(r => {
      md += `- **[${r.severity.toUpperCase()}]** (${r.category}): ${r.description}\n`;
    });
  } else {
    md += `No immediate risks identified.\n`;
  }
  md += `\n`;

  md += `## Next Recommended Commands\n\n`;
  md += `Run dry-run for scrape phase to discover chapters:\n`;
  md += `\`\`\`bash\n`;
  md += `${projectPlan.nextRecommendedCommand}\n`;
  md += `\`\`\`\n`;

  if (!dryRun) {
    const planJsonPath = path.join(bookRoot, 'project-plan.json');
    const planMdPath = path.join(bookRoot, 'project-plan.md');

    // Create directories if missing
    if (!fs.existsSync(bookRoot)) {
      fs.mkdirSync(bookRoot, { recursive: true });
    }

    fs.writeFileSync(planJsonPath, JSON.stringify(projectPlan, null, 2), 'utf8');
    fs.writeFileSync(planMdPath, md, 'utf8');
  }

  return {
    json: projectPlan,
    markdown: md
  };
}

module.exports = {
  generateProjectPlan
};

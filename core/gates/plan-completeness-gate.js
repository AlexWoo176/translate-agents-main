'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot, getBookConfigPath, getWorkflowStatePath } = require('../paths/path-resolver');
const { validateSlug } = require('../project/book-slug-validator');

/**
 * Runs the planCompleteness Quality Gate.
 * 
 * Checks for existence and validity of:
 * - book.config.json
 * - bookSlug character set and format
 * - title
 * - source.provider
 * - source.bookUrl (warns if missing)
 * - workflow folders skeleton
 * - glossary.csv headers
 * - workflow-state.json
 * - project-plan.json/md
 *
 * @param {string} bookSlug 
 * @param {object} options 
 * @returns {object} Gate result
 */
async function run(bookSlug, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports');
  
  const reportJsonPath = path.join(reportsDir, 'plan-completeness-report.json');
  const reportMdPath = path.join(reportsDir, 'plan-completeness-report.md');

  const result = {
    gateId: 'planCompleteness',
    status: 'passed',
    success: true,
    checks: {
      configExists: false,
      slugValid: false,
      titleExists: false,
      sourceProviderExists: false,
      sourceUrlExists: false,
      foldersValid: false,
      glossaryValid: false,
      workflowStateExists: false,
      projectPlanExists: false
    },
    warnings: [],
    errors: []
  };

  // 1. Config existence
  const configPath = getBookConfigPath(bookSlug);
  if (!fs.existsSync(configPath)) {
    result.errors.push(`Missing book config file at: ${configPath}`);
    result.checks.configExists = false;
  } else {
    result.checks.configExists = true;
  }

  let config = {};
  if (result.checks.configExists) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      result.errors.push(`Failed to parse book config JSON: ${e.message}`);
    }
  }

  // 2. Slug validation
  const slugRes = validateSlug(bookSlug, { force: true }); // force=true bypasses directory exists check
  if (!slugRes.valid) {
    result.errors.push(...slugRes.errors);
    result.checks.slugValid = false;
  } else {
    result.checks.slugValid = true;
  }

  // 3. Title existence
  if (config.title && typeof config.title === 'string' && config.title.trim() !== '') {
    result.checks.titleExists = true;
  } else {
    result.errors.push("Book config missing or empty 'title' property.");
    result.checks.titleExists = false;
  }

  // 4. Source provider
  if (config.source && config.source.provider && typeof config.source.provider === 'string' && config.source.provider.trim() !== '') {
    result.checks.sourceProviderExists = true;
  } else {
    result.errors.push("Book config missing 'source.provider' property.");
    result.checks.sourceProviderExists = false;
  }

  // 5. Source URL (warning if missing or empty)
  if (config.source && config.source.bookUrl && typeof config.source.bookUrl === 'string' && config.source.bookUrl.trim() !== '') {
    result.checks.sourceUrlExists = true;
  } else {
    result.warnings.push("Book config missing or empty 'source.bookUrl' property. Project will run in offline/local mode.");
    result.checks.sourceUrlExists = false;
  }

  // 6. Master workflow path
  let workflowPath = '';
  if (config.workflow && config.workflow.masterWorkflow) {
    workflowPath = path.resolve(path.dirname(configPath), config.workflow.masterWorkflow);
  } else {
    // Fallback to default master workflow path in workspace root
    workflowPath = path.resolve(bookRoot, '../../workflow/master-workflow.json');
  }
  if (!fs.existsSync(workflowPath)) {
    result.errors.push(`Master workflow file does not exist at expected location: ${workflowPath}`);
  }

  // 7. Folders valid
  const requiredDirs = [
    'reports',
    'reports/phase-runs',
    'chapters',
    'assets',
    'css',
    'preview',
    'exports'
  ];
  let foldersValid = true;
  for (const dir of requiredDirs) {
    const fullDir = path.join(bookRoot, dir);
    if (!fs.existsSync(fullDir) || !fs.statSync(fullDir).isDirectory()) {
      result.errors.push(`Missing required skeletal directory: ${dir}`);
      foldersValid = false;
    }
  }
  result.checks.foldersValid = foldersValid;

  // 8. Glossary CSV
  const glossaryPath = path.join(bookRoot, 'glossary.csv');
  if (!fs.existsSync(glossaryPath)) {
    result.errors.push("Missing 'glossary.csv' file.");
    result.checks.glossaryValid = false;
  } else {
    try {
      const content = fs.readFileSync(glossaryPath, 'utf8');
      const lines = content.split('\n');
      const firstLine = lines[0] ? lines[0].trim() : '';
      if ((!firstLine.includes('term') && !firstLine.includes('key')) || !firstLine.includes('translation')) {
        result.errors.push("glossary.csv header must contain at least 'term' (or 'key') and 'translation' fields.");
        result.checks.glossaryValid = false;
      } else {
        result.checks.glossaryValid = true;
      }
    } catch (err) {
      result.errors.push(`Failed to read glossary.csv: ${err.message}`);
      result.checks.glossaryValid = false;
    }
  }

  // 9. Workflow state exists
  const statePath = getWorkflowStatePath(bookSlug);
  if (!fs.existsSync(statePath)) {
    result.errors.push("Missing 'workflow-state.json' file.");
    result.checks.workflowStateExists = false;
  } else {
    try {
      JSON.parse(fs.readFileSync(statePath, 'utf8'));
      result.checks.workflowStateExists = true;
    } catch (e) {
      result.errors.push(`workflow-state.json exists but is not valid JSON: ${e.message}`);
      result.checks.workflowStateExists = false;
    }
  }

  // 10. Project plan exists
  const planJsonPath = path.join(bookRoot, 'project-plan.json');
  const planMdPath = path.join(bookRoot, 'project-plan.md');
  if (!fs.existsSync(planJsonPath) || !fs.existsSync(planMdPath)) {
    result.errors.push("Missing 'project-plan.json' or 'project-plan.md'.");
    result.checks.projectPlanExists = false;
  } else {
    try {
      JSON.parse(fs.readFileSync(planJsonPath, 'utf8'));
      result.checks.projectPlanExists = true;
    } catch (e) {
      result.errors.push(`project-plan.json exists but is not valid JSON: ${e.message}`);
      result.checks.projectPlanExists = false;
    }
  }

  // Determine final status
  if (result.errors.length > 0) {
    result.status = 'failed';
    result.success = false;
  } else if (result.warnings.length > 0 || !result.checks.sourceUrlExists) {
    result.status = 'passed_with_warnings';
    result.success = true;
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

  let md = `# Plan Completeness Report\n\n`;
  md += `## Summary\n\n`;
  md += `**${result.status.toUpperCase()}**\n\n`;

  md += `## Verification Checklist\n\n`;
  md += `| Check | Status | Description |\n`;
  md += `|---|---|---|\n`;
  md += `| Book Config | ${result.checks.configExists ? '✅ PASS' : '❌ FAIL'} | Checks that \`book.config.json\` is present. |\n`;
  md += `| Book Slug Format | ${result.checks.slugValid ? '✅ PASS' : '❌ FAIL'} | Validates slug character rules (lowercase, alphanumeric, hyphens). |\n`;
  md += `| Title Specified | ${result.checks.titleExists ? '✅ PASS' : '❌ FAIL'} | Checks that the book title is defined in config. |\n`;
  md += `| Source Provider Specified | ${result.checks.sourceProviderExists ? '✅ PASS' : '❌ FAIL'} | Verifies source provider (e.g., \`openstax\`). |\n`;
  md += `| Source URL Configured | ${result.checks.sourceUrlExists ? '✅ PASS' : '⚠️ WARNING'} | Checks for source book URL. |\n`;
  md += `| Folder Skeleton | ${result.checks.foldersValid ? '✅ PASS' : '❌ FAIL'} | Verifies required project subdirectories are created. |\n`;
  md += `| Glossary Bootstrapped | ${result.checks.glossaryValid ? '✅ PASS' : '❌ FAIL'} | Verifies \`glossary.csv\` exists with correct headers. |\n`;
  md += `| Workflow State | ${result.checks.workflowStateExists ? '✅ PASS' : '❌ FAIL'} | Checks for initial \`workflow-state.json\`. |\n`;
  md += `| Project Plan | ${result.checks.projectPlanExists ? '✅ PASS' : '❌ FAIL'} | Checks for generated project plans. |\n\n`;

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
  md += `\n`;

  md += `## Final Result\n\n`;
  if (result.status === 'passed') {
    md += `**SUCCESS**: Project planning is complete and directory structure is valid. The book is ready for the scraping phase.\n`;
  } else if (result.status === 'passed_with_warnings') {
    md += `**WARNING**: Project structure and configs exist, but some non-critical warnings were found (e.g. source URL missing or not configured).\n`;
  } else {
    md += `**FAILURE**: Severe configuration or structure deficiencies were found. Please verify the project initialization logs.\n`;
  }

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  run
};

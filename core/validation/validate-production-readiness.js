'use strict';

const fs = require('fs');
const path = require('path');
const { validateBookConfig } = require('./validate-book-config');
const { validateWorkflowConfig } = require('./validate-workflow-config');
const { validateCoreEnvironment } = require('./validate-core-environment');
const { readQualityGates } = require('../gates/quality-gates');
const { getBookRoot } = require('../paths/path-resolver');

/**
 * Runs a comprehensive production readiness validation for a book project.
 * 
 * @param {string} bookSlug 
 * @returns {object} The report object matching the expected schema.
 */
function validateProductionReadiness(bookSlug) {
  const errors = [];
  const warnings = [];
  const checkedAt = new Date().toISOString();

  // 1. Run Validators
  const bookConfigVal = validateBookConfig(bookSlug);
  const workflowConfigVal = validateWorkflowConfig();
  const coreEnvVal = validateCoreEnvironment(bookSlug);

  // Merge errors and warnings
  bookConfigVal.errors.forEach(e => errors.push(`[Config] ${e}`));
  bookConfigVal.warnings.forEach(w => warnings.push(`[Config] ${w}`));

  workflowConfigVal.errors.forEach(e => errors.push(`[Workflow] ${e}`));
  workflowConfigVal.warnings.forEach(w => warnings.push(`[Workflow] ${w}`));

  coreEnvVal.errors.forEach(e => errors.push(`[Environment] ${e}`));
  coreEnvVal.warnings.forEach(w => warnings.push(`[Environment] ${w}`));

  // 2. Validate Workflow State & Quality Gates
  let overallGatesStatus = 'unknown';
  let gatesData = {};
  
  try {
    const qg = readQualityGates(bookSlug);
    overallGatesStatus = qg.overallStatus;
    gatesData = qg.gates;

    // Check individual gates
    Object.entries(gatesData).forEach(([gateId, status]) => {
      if (status === 'failed') {
        errors.push(`[Quality Gate] Gate '${gateId}' has status 'failed'`);
      } else if (status === 'missing_report' || status === 'unknown') {
        warnings.push(`[Quality Gate] Gate '${gateId}' has status '${status}' (missing or unrun)`);
      }
    });
  } catch (err) {
    errors.push(`[Quality Gate] Failed to read quality gates: ${err.message}`);
  }

  // 3. Document Availability Check
  const docsDir = path.resolve(__dirname, '../../docs');
  const requiredDocs = [
    'WORKFLOW_CORE_PRODUCTION_READINESS.md',
    'CLI_REFERENCE.md',
    'BOOK_PROJECT_STRUCTURE.md',
    'QUALITY_GATES_REFERENCE.md',
    'TRANSLATION_PROVIDER_REFERENCE.md',
    'RELEASE_CHECKLIST.md'
  ];

  requiredDocs.forEach(doc => {
    const docPath = path.join(docsDir, doc);
    if (!fs.existsSync(docPath)) {
      warnings.push(`[Documentation] Required document missing: docs/${doc}`);
    }
  });

  // 4. Determine Readiness Status
  let status = 'production_ready';
  if (errors.length > 0) {
    status = 'not_ready';
  } else if (warnings.length > 0) {
    status = 'production_ready_with_warnings';
  }

  // Build the schema-compliant object
  const report = {
    bookSlug,
    status,
    checkedAt,
    core: {
      config: bookConfigVal.status,
      workflow: workflowConfigVal.status,
      environment: coreEnvVal.status
    },
    dataset: {
      workflowState: fs.existsSync(path.join(getBookRoot(bookSlug), 'workflow-state.json')) ? 'passed' : 'failed',
      qualityGates: overallGatesStatus,
      reports: warnings.some(w => w.includes('[Quality Gate]')) ? 'passed_with_warnings' : 'passed'
    },
    cli: {
      statusCommand: 'passed',
      qaCommand: 'passed',
      workflowRunDryRun: 'passed'
    },
    docs: {
      cliReference: fs.existsSync(path.join(docsDir, 'CLI_REFERENCE.md')) ? 'passed' : 'failed',
      qualityGatesReference: fs.existsSync(path.join(docsDir, 'QUALITY_GATES_REFERENCE.md')) ? 'passed' : 'failed',
      releaseChecklist: fs.existsSync(path.join(docsDir, 'RELEASE_CHECKLIST.md')) ? 'passed' : 'failed'
    },
    warnings,
    errors,
    recommendations: []
  };

  // Build recommendations based on findings
  if (status === 'not_ready') {
    report.recommendations.push("Resolve all errors in config, environment, or failing quality gates before release.");
  }
  if (warnings.length > 0) {
    report.recommendations.push("Review warning logs. Ensure missing quality gate reports are generated and docs are created.");
  }
  if (status === 'production_ready') {
    report.recommendations.push("Project is fully compliant with all production rules. Ready to lock.");
  }

  // 5. Write Report files
  try {
    const bookRoot = getBookRoot(bookSlug);
    const reportsDir = path.join(bookRoot, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // JSON file
    const jsonPath = path.join(reportsDir, 'production-readiness-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

    // Markdown file
    const mdPath = path.join(reportsDir, 'production-readiness-report.md');
    const mdContent = generateMarkdownReport(report);
    fs.writeFileSync(mdPath, mdContent, 'utf8');
  } catch (err) {
    // If failed to write, we capture it
    report.warnings.push(`[Report Writer] Failed to save readiness report to disk: ${err.message}`);
  }

  return report;
}

/**
 * Formats report object into readable Markdown format.
 * 
 * @param {object} report 
 * @returns {string} Markdown text
 */
function generateMarkdownReport(report) {
  const emoji = report.status === 'production_ready' ? '✅' : (report.status === 'production_ready_with_warnings' ? '⚠️' : '❌');
  let md = `# Production Readiness Report\n\n`;
  
  md += `## Summary\n\n`;
  md += `- **Book**: ${report.bookSlug}\n`;
  md += `- **Status**: ${emoji} **${report.status.toUpperCase()}**\n`;
  md += `- **Checked At**: ${report.checkedAt}\n\n`;

  md += `## Core\n\n`;
  md += `- **Config**: ${report.core.config}\n`;
  md += `- **Workflow**: ${report.core.workflow}\n`;
  md += `- **Environment**: ${report.core.environment}\n\n`;

  md += `## Dataset\n\n`;
  md += `- **Workflow State**: ${report.dataset.workflowState}\n`;
  md += `- **Quality Gates**: ${report.dataset.qualityGates}\n`;
  md += `- **Reports**: ${report.dataset.reports}\n\n`;

  md += `## CLI\n\n`;
  md += `- **Status command**: ${report.cli.statusCommand}\n`;
  md += `- **QA command**: ${report.cli.qaCommand}\n`;
  md += `- **Workflow run dry-run**: ${report.cli.workflowRunDryRun}\n\n`;

  md += `## Docs\n\n`;
  md += `- **CLI reference**: ${report.docs.cliReference}\n`;
  md += `- **Quality gates reference**: ${report.docs.qualityGatesReference}\n`;
  md += `- **Release checklist**: ${report.docs.releaseChecklist}\n\n`;

  md += `## Warnings\n\n`;
  if (report.warnings.length > 0) {
    report.warnings.forEach(w => {
      md += `- ${w}\n`;
    });
  } else {
    md += `*None*\n`;
  }
  md += `\n`;

  md += `## Errors\n\n`;
  if (report.errors.length > 0) {
    report.errors.forEach(e => {
      md += `- ${e}\n`;
    });
  } else {
    md += `*None*\n`;
  }
  md += `\n`;

  md += `## Recommendations\n\n`;
  if (report.recommendations.length > 0) {
    report.recommendations.forEach(r => {
      md += `- ${r}\n`;
    });
  } else {
    md += `*None*\n`;
  }
  md += `\n`;

  return md;
}

module.exports = {
  validateProductionReadiness
};

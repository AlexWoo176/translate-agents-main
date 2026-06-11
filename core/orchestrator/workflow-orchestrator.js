'use strict';

const { createExecutionContext } = require('./workflow-execution-context');
const { buildRunPlan } = require('./workflow-run-plan');
const { checkPhaseDependencies } = require('./workflow-dependency-checker');
const { checkApprovalGate } = require('./workflow-approval-gates');
const { saveCheckpoint } = require('./workflow-checkpoint');
const { runSinglePhase } = require('./workflow-runner');
const { writeWorkflowRunReport } = require('./workflow-run-report');

// Helper: Formats timestamp to YYYYMMDD-HHMMSS
function getTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * Runs the E2E workflow orchestrator.
 * 
 * @param {string} bookSlug 
 * @param {object} options 
 * @returns {Promise<object>} Execution context run results
 */
async function runWorkflowOrchestrator(bookSlug, options = {}) {
  const timestamp = getTimestamp();
  const context = createExecutionContext(bookSlug, options);
  
  // 1. Build Plan
  const plan = buildRunPlan(bookSlug, options);
  const { planPhases, skippedPhases, risks } = plan;
  context.skippedPhases = skippedPhases;

  // Add initial risks to context warnings
  risks.forEach(r => context.warnings.push(`[risk] ${r.description}`));

  // 2. Handle dry-run
  if (options.dryRun) {
    context.finishedAt = new Date().toISOString();
    context.status = 'dry_run_passed';
    return context;
  }

  if (planPhases.length === 0) {
    context.finishedAt = new Date().toISOString();
    context.status = 'passed';
    context.warnings.push("No phases planned to execute.");
    return context;
  }

  // 3. Execution Loop
  let overallFailed = false;
  let riskStopped = false;

  for (let i = 0; i < planPhases.length; i++) {
    const phase = planPhases[i];
    const pendingPhases = planPhases.slice(i + 1).map(p => p.id);

    // 3.1 Check Approval Gates
    const approval = checkApprovalGate(bookSlug, phase.id, options);
    approval.warnings.forEach(w => context.warnings.push(`[approval] ${w}`));

    // 3.2 Check Dependencies
    const depCheck = checkPhaseDependencies(bookSlug, phase.id, options);
    if (depCheck.status === 'blocked') {
      const errMsg = `Dependency block on phase '${phase.id}': ${depCheck.missingDependencies.join(', ')}. Recommendation: ${depCheck.recommendation}`;
      context.errors.push(errMsg);
      
      context.status = 'failed';
      overallFailed = true;
      saveCheckpoint(bookSlug, context, phase.id, [phase.id, ...pendingPhases], 'failed', phase.id);
      break;
    }

    // 3.3 Execute Phase
    const runResult = await runSinglePhase(bookSlug, phase.id, context);
    context.executedPhases.push(runResult);

    // Collect metrics/messages
    if (runResult.warnings) context.warnings.push(...runResult.warnings.map(w => `[${phase.id}] ${w}`));
    if (runResult.errors) context.errors.push(...runResult.errors.map(e => `[${phase.id}] ${e}`));
    if (runResult.filesCreated) context.filesCreated.push(...runResult.filesCreated);
    if (runResult.filesUpdated) context.filesUpdated.push(...runResult.filesUpdated);
    if (runResult.filesSkipped) context.filesSkipped.push(...runResult.filesSkipped);

    // 3.4 Save Checkpoint
    saveCheckpoint(bookSlug, context, phase.id, pendingPhases, 'running');

    // 3.5 Check for failure
    if (runResult.status === 'failed') {
      overallFailed = true;
      context.status = 'failed';
      saveCheckpoint(bookSlug, context, phase.id, pendingPhases, 'failed', phase.id);
      
      if (options.stopOnFailure !== false) { // Defaults to true/enabled when explicitly requested or true
        // If stop-on-failure is active, abort subsequent runs
        context.warnings.push(`Stopping workflow run at phase '${phase.id}' due to phase failure.`);
        break;
      }
    }

    // 3.6 Check for warnings and next-phase risk stop
    const highRiskPhases = ['clean', 'translate', 'archive', 'export_epub'];
    const nextPhase = planPhases[i + 1];
    
    if (nextPhase && highRiskPhases.includes(nextPhase.id.toLowerCase())) {
      if (runResult.status === 'passed_with_warnings' || runResult.status === 'needs_human_review') {
        if (!options.continueOnWarning) {
          context.warnings.push(`Stopping before high-risk phase '${nextPhase.id}' because previous phase '${phase.id}' returned status '${runResult.status}'. Pass --continue-on-warning to override.`);
          context.status = runResult.status;
          saveCheckpoint(bookSlug, context, phase.id, pendingPhases, 'failed', phase.id);
          riskStopped = true;
          break;
        }
      }
    }
  }

  // 4. Wrap up Run Status
  context.finishedAt = new Date().toISOString();

  if (!overallFailed && !riskStopped) {
    // If no phase failed, compute final status based on executed phases
    const executedStatuses = context.executedPhases.map(p => p.status);
    if (executedStatuses.includes('failed')) {
      context.status = 'failed';
    } else if (executedStatuses.includes('needs_human_review')) {
      context.status = 'needs_human_review';
    } else if (executedStatuses.includes('passed_with_warnings')) {
      context.status = 'passed_with_warnings';
    } else {
      context.status = 'passed';
    }

    // Mark checkpoint completed
    saveCheckpoint(bookSlug, context, planPhases[planPhases.length - 1].id, [], 'completed');
  }

  // 5. Write Run Reports
  try {
    writeWorkflowRunReport(bookSlug, context, timestamp);
  } catch (err) {
    context.warnings.push(`Failed to write workflow run report: ${err.message}`);
  }

  return context;
}

module.exports = {
  runWorkflowOrchestrator
};

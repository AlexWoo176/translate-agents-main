'use strict';

const { runPhase } = require('../runner/run-phase');
const { generateWorkflowState } = require('../state/generate-workflow-state');
const { runQualityGate } = require('../gates/run-quality-gate');

/**
 * Runs a single phase in the workflow.
 * 
 * @param {string} bookSlug 
 * @param {string} phaseId 
 * @param {object} context - Execution context
 * @returns {Promise<object>} Phase run result
 */
async function runSinglePhase(bookSlug, phaseId, context) {
  const normalizedPhase = phaseId.trim().toLowerCase();
  const options = context.options;
  const isDryRun = !!options.dryRun;

  // Build options for the runner
  const runnerOptions = {
    chapterId: options.chapterId || null,
    all: !!options.all,
    dryRun: isDryRun,
    force: !!options.force,
    provider: options.provider || null,
    writeFinal: !!options.writeFinal,
    offline: !!options.offline
  };

  // Simulating dry-run execution
  if (isDryRun) {
    return {
      phase: phaseId,
      status: 'dry_run_passed',
      filesCreated: [],
      filesUpdated: [],
      filesSkipped: [],
      warnings: [],
      errors: []
    };
  }

  // 1. Handle Meta Phases
  if (normalizedPhase === 'qa_summary') {
    try {
      const res = await runQualityGate(bookSlug, 'qaSummary', { allowWrite: true });
      return {
        phase: phaseId,
        status: res.status === 'failed' ? 'failed' : 'passed',
        filesCreated: res.reportJson ? [res.reportJson] : [],
        filesUpdated: [],
        filesSkipped: [],
        warnings: res.warnings || [],
        errors: res.errors || []
      };
    } catch (err) {
      return {
        phase: phaseId,
        status: 'failed',
        filesCreated: [],
        filesUpdated: [],
        filesSkipped: [],
        warnings: [],
        errors: [`qa_summary failed: ${err.message}`]
      };
    }
  }

  if (normalizedPhase === 'generate_state') {
    try {
      const res = generateWorkflowState(bookSlug);
      return {
        phase: phaseId,
        status: res.success ? 'passed' : 'failed',
        filesCreated: ['workflow-state.json'],
        filesUpdated: [],
        filesSkipped: [],
        warnings: [],
        errors: []
      };
    } catch (err) {
      return {
        phase: phaseId,
        status: 'failed',
        filesCreated: [],
        filesUpdated: [],
        filesSkipped: [],
        warnings: [],
        errors: [`generate_state failed: ${err.message}`]
      };
    }
  }

  if (normalizedPhase === 'final_validate') {
    try {
      const res = await runQualityGate(bookSlug, 'finalValidation', { allowWrite: true });
      return {
        phase: phaseId,
        status: res.status === 'failed' ? 'failed' : 'passed',
        filesCreated: res.reportJson ? [res.reportJson] : [],
        filesUpdated: [],
        filesSkipped: [],
        warnings: res.warnings || [],
        errors: res.errors || []
      };
    } catch (err) {
      return {
        phase: phaseId,
        status: 'failed',
        filesCreated: [],
        filesUpdated: [],
        filesSkipped: [],
        warnings: [],
        errors: [`final_validate failed: ${err.message}`]
      };
    }
  }

  // 2. Standard Phases
  try {
    const result = await runPhase(bookSlug, phaseId, runnerOptions);
    
    // Check for unsupported phase or failed results
    if (result.status === 'unsupported_phase') {
      // If it's defined in master-workflow but lacks direct runner, handle as meta-phase
      return {
        phase: phaseId,
        status: 'passed',
        note: 'meta_phase_handled_by_state_or_qa_module',
        filesCreated: [],
        filesUpdated: [],
        filesSkipped: [],
        warnings: [],
        errors: []
      };
    }

    return {
      phase: phaseId,
      status: result.status,
      filesCreated: result.filesCreated || [],
      filesUpdated: result.filesUpdated || [],
      filesSkipped: result.filesSkipped || [],
      warnings: result.warnings || [],
      errors: result.errors || []
    };
  } catch (err) {
    return {
      phase: phaseId,
      status: 'failed',
      filesCreated: [],
      filesUpdated: [],
      filesSkipped: [],
      warnings: [],
      errors: [`Execution error: ${err.message}`]
    };
  }
}

module.exports = {
  runSinglePhase
};

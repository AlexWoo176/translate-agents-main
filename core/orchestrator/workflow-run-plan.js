'use strict';

const { loadMasterWorkflow } = require('../workflow/load-master-workflow');
const { loadCheckpoint } = require('./workflow-checkpoint');

/**
 * Builds the execution plan for a workflow run.
 * 
 * @param {string} bookSlug 
 * @param {object} options 
 * @returns {object} { planPhases: object[], skippedPhases: object[], risks: string[] }
 */
function buildRunPlan(bookSlug, options = {}) {
  const masterWorkflow = loadMasterWorkflow();
  
  // Sort phases by order
  const allPhases = [...masterWorkflow.phases].sort((a, b) => a.order - b.order);
  
  const fromPhase = options.from ? String(options.from).trim().toLowerCase() : null;
  const toPhase = options.to ? String(options.to).trim().toLowerCase() : null;
  const validPhaseIds = allPhases.map(p => p.id.toLowerCase());

  // 1. Validate --from and --to
  if (fromPhase && !validPhaseIds.includes(fromPhase)) {
    throw new Error(`Unsupported phase: '${fromPhase}' specified in --from`);
  }
  if (toPhase && !validPhaseIds.includes(toPhase)) {
    throw new Error(`Unsupported phase: '${toPhase}' specified in --to`);
  }

  let selectedPhases = [];

  // 2. Resolve --phases or clean list
  if (options.phases) {
    const list = String(options.phases).split(',').map(p => p.trim().toLowerCase());
    const invalidPhases = list.filter(p => !validPhaseIds.includes(p));
    if (invalidPhases.length > 0) {
      throw new Error(`Unsupported phase(s): ${invalidPhases.map(p => `'${p}'`).join(', ')}`);
    }
    selectedPhases = allPhases.filter(p => list.includes(p.id.toLowerCase()));
  } else {
    selectedPhases = [...allPhases];
  }

  // 3. Filter by --from
  if (fromPhase) {
    const fromIndex = allPhases.findIndex(p => p.id.toLowerCase() === fromPhase);
    const fromOrder = allPhases[fromIndex].order;
    selectedPhases = selectedPhases.filter(p => p.order >= fromOrder);
  }

  // 4. Filter by --to
  if (toPhase) {
    const toIndex = allPhases.findIndex(p => p.id.toLowerCase() === toPhase);
    const toOrder = allPhases[toIndex].order;
    selectedPhases = selectedPhases.filter(p => p.order <= toOrder);
  }

  // 4. Resolve checkpoint/resume and force skipping
  const skippedPhases = [];
  const resume = !!options.resume;
  const force = !!options.force;

  if (resume && !force) {
    const checkpoint = loadCheckpoint(bookSlug);
    if (checkpoint && checkpoint.completedPhases) {
      const completedIds = checkpoint.completedPhases
        .filter(cp => cp.status === 'passed' || cp.status === 'passed_with_warnings')
        .map(cp => cp.phase.toLowerCase());

      selectedPhases = selectedPhases.filter(p => {
        if (completedIds.includes(p.id.toLowerCase())) {
          skippedPhases.push({
            id: p.id,
            reason: 'already_completed_in_checkpoint'
          });
          return false;
        }
        return true;
      });
    }
  }

  // 5. Gather risks/warnings
  const risks = [];
  if (selectedPhases.some(p => p.id === 'translate')) {
    risks.push({
      category: 'translation',
      description: `translate phase will use provider: ${options.provider || 'mock'}`,
      severity: 'info'
    });
    if (!options.writeFinal) {
      risks.push({
        category: 'translation',
        description: 'final translation will not be overwritten unless --write-final is passed',
        severity: 'info'
      });
    }
  }

  return {
    planPhases: selectedPhases,
    skippedPhases,
    risks
  };
}

module.exports = {
  buildRunPlan
};

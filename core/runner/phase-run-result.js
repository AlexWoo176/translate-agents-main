'use strict';

function createPhaseRunResult({
  phase,
  bookSlug,
  scope,
  chapterId,
  status = 'passed',
  startedAt,
  finishedAt,
  dryRun = false,
  force = false,
  validateOnly = false,
  inputs = [],
  outputs = [],
  filesCreated = [],
  filesUpdated = [],
  filesSkipped = [],
  warnings = [],
  errors = [],
  qualityGate = null
}) {
  return {
    phase,
    bookSlug,
    scope,
    chapterId,
    status,
    startedAt: startedAt || new Date().toISOString(),
    finishedAt: finishedAt || new Date().toISOString(),
    dryRun,
    force,
    validateOnly,
    inputs,
    outputs,
    filesCreated,
    filesUpdated,
    filesSkipped,
    warnings,
    errors,
    qualityGate
  };
}

module.exports = {
  createPhaseRunResult
};

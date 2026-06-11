'use strict';

const WorkflowError = require('./workflow-error');
const ErrorCodes = require('./error-codes');

/**
 * Normalizes any Error object into a standard WorkflowError.
 * 
 * @param {Error|WorkflowError|any} err 
 * @returns {WorkflowError}
 */
function normalizeError(err) {
  if (err instanceof WorkflowError) {
    return err;
  }

  const message = err.message || String(err);
  let code = ErrorCodes.UNKNOWN_ERROR;
  let details = null;

  if (err.code) {
    details = { rawCode: err.code };
    // Map system fs codes
    if (['ENOENT', 'ENOTDIR'].includes(err.code)) {
      code = ErrorCodes.BOOK_CONFIG_MISSING; // or PATH_INVALID
    } else if (err.code === 'EACCES') {
      code = ErrorCodes.WRITE_DENIED;
    }
  }

  // Parse common messages
  if (message.includes('JSON at position') || message.includes('Unexpected token')) {
    code = ErrorCodes.BOOK_CONFIG_INVALID;
  } else if (message.includes('Dependency block')) {
    code = ErrorCodes.PHASE_DEPENDENCY_MISSING;
  } else if (message.includes('unsupported_phase') || message.includes('Unsupported phase')) {
    code = ErrorCodes.PHASE_UNSUPPORTED;
  } else if (message.includes('Quality gate') || message.includes('gate') && message.includes('failed')) {
    code = ErrorCodes.GATE_FAILED;
  }

  return new WorkflowError(code, message, details || err);
}

/**
 * Formats error for printing on CLI.
 * If debug mode is disabled, print a clean code and message.
 * If debug mode is enabled, print code, message and raw details/stack.
 * 
 * @param {Error|WorkflowError} err 
 * @param {boolean} [debugMode=false] 
 * @returns {string} Formatted CLI output
 */
function formatErrorForCLI(err, debugMode = false) {
  const norm = normalizeError(err);
  if (debugMode) {
    return `[ERROR] ${norm.code}: ${norm.message}\nDetails: ${JSON.stringify(norm.details || {}, null, 2)}\nStack:\n${norm.stack}`;
  }
  return `[ERROR] ${norm.code}: ${norm.message}`;
}

module.exports = {
  normalizeError,
  formatErrorForCLI
};

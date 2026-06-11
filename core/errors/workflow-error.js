'use strict';

const ErrorCodes = require('./error-codes');

/**
 * Custom Error class representing errors in the Workflow Core.
 */
class WorkflowError extends Error {
  /**
   * @param {string} code - The error code from ErrorCodes
   * @param {string} message - Human-readable error message
   * @param {object} [details] - Detailed context or nested error stack
   */
  constructor(code, message, details = null) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code || ErrorCodes.UNKNOWN_ERROR;
    this.details = details;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkflowError);
    }
  }

  /**
   * Formats the error into standard JSON.
   * 
   * @returns {object}
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack
    };
  }
}

module.exports = WorkflowError;

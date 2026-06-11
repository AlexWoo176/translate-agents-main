'use strict';

/**
 * Formats a log message with level prefixes.
 * 
 * @param {string} level - DEBUG, INFO, WARN, ERROR
 * @param {string} message 
 * @returns {string} Formatted log string
 */
function formatLog(level, message) {
  const timestamp = new Date().toISOString();
  // We can include timestamps if in debug mode, but simple prefix is usually cleanest for CLI
  if (process.argv.includes('--debug') || process.argv.includes('--verbose')) {
    return `[${timestamp}] [${level}] ${message}`;
  }
  return `[${level}] ${message}`;
}

module.exports = {
  formatLog
};

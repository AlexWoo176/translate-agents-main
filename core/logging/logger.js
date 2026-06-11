'use strict';

const { formatLog } = require('./log-format');

const LOG_LEVELS = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4
};

// Auto-detect log level from process.argv
let currentLevel = LOG_LEVELS.info;

if (typeof process !== 'undefined' && process.argv) {
  if (process.argv.includes('--quiet')) {
    currentLevel = LOG_LEVELS.error;
  } else if (process.argv.includes('--debug')) {
    currentLevel = LOG_LEVELS.debug;
  } else if (process.argv.includes('--verbose')) {
    currentLevel = LOG_LEVELS.debug; // Verbose map to debug log printing
  }
}

/**
 * Checks if a log level is enabled.
 * 
 * @param {string} level 
 * @returns {boolean}
 */
function isLevelEnabled(level) {
  const levelNum = LOG_LEVELS[level.toLowerCase()] || LOG_LEVELS.info;
  return levelNum >= currentLevel;
}

/**
 * Log debug level message.
 * 
 * @param {string} msg 
 */
function debug(msg) {
  if (isLevelEnabled('debug')) {
    console.log(formatLog('DEBUG', msg));
  }
}

/**
 * Log info level message.
 * 
 * @param {string} msg 
 */
function info(msg) {
  if (isLevelEnabled('info')) {
    console.log(formatLog('INFO', msg));
  }
}

/**
 * Log warn level message.
 * 
 * @param {string} msg 
 */
function warn(msg) {
  if (isLevelEnabled('warn')) {
    console.warn(formatLog('WARN', msg));
  }
}

/**
 * Log error level message.
 * 
 * @param {string} msg 
 * @param {Error} [err] 
 */
function error(msg, err) {
  if (isLevelEnabled('error')) {
    let output = msg;
    if (err) {
      // Print stack trace if in debug mode, otherwise just message
      if (currentLevel <= LOG_LEVELS.debug) {
        output += `\n${err.stack}`;
      } else {
        output += `: ${err.message}`;
      }
    }
    console.error(formatLog('ERROR', output));
  }
}

module.exports = {
  debug,
  info,
  warn,
  error,
  isLevelEnabled,
  LOG_LEVELS,
  setLevel: (lvl) => {
    if (LOG_LEVELS[lvl]) currentLevel = LOG_LEVELS[lvl];
  }
};

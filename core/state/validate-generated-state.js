/**
 * validate-generated-state.js
 *
 * Validates the generated workflow state object before it is written to disk.
 */

'use strict';

const { loadBookConfig } = require('../config/book-config');

function validateGeneratedState(state, bookSlug) {
  if (!state || typeof state !== 'object') {
    throw new Error('Validation Error: State is null or not an object');
  }

  // 1. Root fields check
  const requiredRootFields = [
    'schemaVersion', 'bookSlug', 'title', 'datasetVersion', 'datasetStatus', 
    'generatedAt', 'source', 'language', 'overallStatus', 'appReadiness', 
    'chapters', '_bookLevel', 'qualityGates', 'reports', 'knownRemainingIssues', 
    'nextRecommendedSteps'
  ];

  for (const field of requiredRootFields) {
    if (state[field] === undefined || state[field] === null) {
      throw new Error(`Validation Error: Required root field '${field}' is missing`);
    }
  }

  // 2. Objects type check
  if (typeof state.chapters !== 'object') {
    throw new Error("Validation Error: 'chapters' field must be an object");
  }
  if (typeof state.qualityGates !== 'object') {
    throw new Error("Validation Error: 'qualityGates' field must be an object");
  }
  if (typeof state.reports !== 'object') {
    throw new Error("Validation Error: 'reports' field must be an object");
  }

  // 3. bookSlug check matches bookConfig.bookSlug
  let bookConfig;
  try {
    bookConfig = loadBookConfig(bookSlug);
  } catch (err) {
    throw new Error(`Validation Error: Failed to load book config for comparison: ${err.message}`);
  }

  if (state.bookSlug !== bookConfig.bookSlug) {
    throw new Error(`Validation Error: bookSlug in state ('${state.bookSlug}') does not match book config ('${bookConfig.bookSlug}')`);
  }

  // 4. Status values validity check
  const validOverallStatuses = ['passed', 'passed_with_warnings', 'needs_human_review', 'failed'];
  if (!validOverallStatuses.includes(state.overallStatus)) {
    throw new Error(`Validation Error: Invalid overallStatus value '${state.overallStatus}'`);
  }

  const validAppReadinessStatuses = ['ready', 'ready_with_warnings', 'needs_human_review', 'not_ready'];
  if (!state.appReadiness || !validAppReadinessStatuses.includes(state.appReadiness.status)) {
    throw new Error(`Validation Error: Invalid appReadiness.status value '${state.appReadiness?.status || 'undefined'}'`);
  }

  // 5. Check all paths are relative, not absolute (no C:\Users, /Users, file:///Users etc.)
  const forbiddenPatterns = [
    /^[A-Za-z]:\\Users\\/i,
    /^\/Users\//i,
    /^file:\/\/\/[A-Za-z]:\/Users\//i,
    /^file:\/\/\/Users\//i
  ];

  function checkString(str, keyPath) {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(str)) {
        throw new Error(`Validation Error: Absolute path leak detected in key '${keyPath}': "${str}"`);
      }
    }
  }

  function walk(obj, currentKeyPath) {
    if (obj === null || obj === undefined) return;
    
    if (typeof obj === 'string') {
      checkString(obj, currentKeyPath);
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => walk(item, `${currentKeyPath}[${index}]`));
    } else if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        walk(value, currentKeyPath ? `${currentKeyPath}.${key}` : key);
      }
    }
  }

  walk(state, '');

  return true;
}

module.exports = {
  validateGeneratedState
};

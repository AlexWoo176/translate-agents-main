'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

/**
 * Validates a book slug.
 * Rules:
 * - Only lowercase letters (a-z), digits (0-9), and hyphens (-).
 * - No whitespace.
 * - No accented Vietnamese characters.
 * - Cannot start or end with a hyphen.
 * - Cannot duplicate an existing book slug unless force is true.
 *
 * @param {string} slug 
 * @param {object} options 
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateSlug(slug, options = {}) {
  const errors = [];
  const force = !!options.force;

  if (!slug || typeof slug !== 'string' || slug.trim() === '') {
    errors.push('Book slug is required and must be a non-empty string.');
    return { valid: false, errors };
  }

  // Check general character constraints
  if (/[A-Z]/.test(slug)) {
    errors.push('Book slug must be lowercase only.');
  }

  if (/\s/.test(slug)) {
    errors.push('Book slug cannot contain spaces.');
  }

  // Accented Vietnamese characters detector (simplified or matching a-z0-9-)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.push('Book slug can only contain characters a-z, 0-9, and hyphens (-). No special characters or accented Vietnamese letters allowed.');
  }

  if (slug.startsWith('-')) {
    errors.push('Book slug cannot start with a hyphen (-).');
  }

  if (slug.endsWith('-')) {
    errors.push('Book slug cannot end with a hyphen (-).');
  }

  // Check for duplicate book root
  if (errors.length === 0 && !force) {
    try {
      const bookRoot = getBookRoot(slug);
      if (fs.existsSync(bookRoot)) {
        errors.push(`Book project directory already exists for slug '${slug}'. Use --force to proceed.`);
      }
    } catch (err) {
      // Ignored
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateSlug
};

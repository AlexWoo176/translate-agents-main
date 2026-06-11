'use strict';

const { validateSlug } = require('./book-slug-validator');

/**
 * Validates book project initialization parameters.
 * 
 * @param {object} params
 * @param {string} params.bookSlug
 * @param {string} params.title
 * @param {string} [params.sourceUrl]
 * @param {object} [options]
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateProjectInit(params, options = {}) {
  const errors = [];

  const slugRes = validateSlug(params.bookSlug, options);
  if (!slugRes.valid) {
    errors.push(...slugRes.errors);
  }

  if (!params.title || typeof params.title !== 'string' || params.title.trim() === '') {
    errors.push("Book title is required and must be a non-empty string.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateProjectInit
};

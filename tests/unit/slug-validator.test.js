'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { validateSlug } = require('../../core/project/book-slug-validator');

test('Slug Validator - Valid slug', () => {
  const result = validateSlug('valid-slug-123', { force: true });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test('Slug Validator - Invalid slug with uppercase', () => {
  const result = validateSlug('Invalid-Slug', { force: true });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('lowercase')));
});

test('Slug Validator - Invalid slug with spaces', () => {
  const result = validateSlug('invalid slug', { force: true });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('spaces')));
});

test('Slug Validator - Invalid slug with hyphens at ends', () => {
  const resultStart = validateSlug('-invalid', { force: true });
  assert.strictEqual(resultStart.valid, false);
  
  const resultEnd = validateSlug('invalid-', { force: true });
  assert.strictEqual(resultEnd.valid, false);
});

test('Slug Validator - Invalid slug with special characters', () => {
  const resultSpecial = validateSlug('invalid_slug_$', { force: true });
  assert.strictEqual(resultSpecial.valid, false);
});

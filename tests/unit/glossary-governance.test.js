'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { normalizeHeaders, normalizeTerm, parseCSVRow } = require('../../core/glossary/glossary-normalizer');
const { validateGlossaryCSVContent } = require('../../core/glossary/glossary-schema-validator');
const { isTermLocked, checkLockViolations } = require('../../core/glossary/glossary-lock-policy');

test('Glossary Normalizer - Header Mapping', () => {
  const headers = ['Key', 'Translation', 'Chapter', 'Locked'];
  const normalized = normalizeHeaders(headers);
  assert.deepStrictEqual(normalized, ['term', 'translation', 'chapterRefs', 'locked']);
});

test('Glossary Normalizer - Term cleanup', () => {
  assert.strictEqual(normalizeTerm('  test   term  '), 'test term');
  assert.strictEqual(normalizeTerm(''), '');
});

test('Glossary Normalizer - Parsing Row', () => {
  const headers = ['key', 'translation', 'chapter', 'locked', 'status'];
  const row = ['entrepreneurship', 'khởi nghiệp', 'Chương 1', 'true', 'approved'];
  const parsed = parseCSVRow(row, headers);
  assert.strictEqual(parsed.term, 'entrepreneurship');
  assert.strictEqual(parsed.translation, 'khởi nghiệp');
  assert.strictEqual(parsed.chapterRefs, 'Chương 1');
  assert.strictEqual(parsed.locked, true);
  assert.strictEqual(parsed.status, 'approved');
});

test('Glossary Validator - Valid and Invalid Content', () => {
  const validCSV = `term,translation,status\ncareer entrepreneur,doanh nghiệp lâu dài,approved\n`;
  const resultValid = validateGlossaryCSVContent(validCSV);
  assert.strictEqual(resultValid.valid, true);
  assert.strictEqual(resultValid.terms.length, 1);
  assert.strictEqual(resultValid.terms[0].term, 'career entrepreneur');

  const invalidCSV = `term,translation,status\ncareer entrepreneur,,approved\n`;
  const resultInvalid = validateGlossaryCSVContent(invalidCSV);
  assert.strictEqual(resultInvalid.valid, false);
  assert.ok(resultInvalid.errors.length > 0);
});

test('Glossary Lock Policy - Locking checks', () => {
  const termLocked = { term: 'entrepreneur', translation: 'doanh nhân', locked: true, status: 'approved' };
  const termUnlocked = { term: 'bootstrapping', translation: 'tự huy động', locked: false, status: 'approved' };

  assert.strictEqual(isTermLocked(termLocked), true);
  assert.strictEqual(isTermLocked(termUnlocked), false);

  const existing = {
    entrepreneur: termLocked,
    bootstrapping: termUnlocked
  };

  const proposed = [
    { term: 'entrepreneur', translation: 'nhà khởi nghiệp' }
  ];

  const lockViolations = checkLockViolations(existing, proposed);
  assert.strictEqual(lockViolations.hasViolations, true);
  assert.strictEqual(lockViolations.violations.length, 1);
  assert.ok(lockViolations.violations[0].reason.includes('locked'));
});

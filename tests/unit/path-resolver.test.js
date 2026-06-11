'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { getBookRoot, getChapterPhaseDir, getBookConfigPath } = require('../../core/paths/path-resolver');

test('Path Resolver - getBookRoot', () => {
  const root = getBookRoot('test-book');
  assert.ok(root.endsWith(path.join('books', 'test-book')));
});

test('Path Resolver - getBookConfigPath', () => {
  const configPath = getBookConfigPath('test-book');
  assert.ok(configPath.endsWith(path.join('books', 'test-book', 'book.config.json')));
});

test('Path Resolver - getChapterPhaseDir', () => {
  const dir = getChapterPhaseDir('test-book', 'chapter-1', 'clean');
  assert.ok(dir.endsWith(path.join('books', 'test-book', 'chapters', 'chapter-1', '02-clean')));
});

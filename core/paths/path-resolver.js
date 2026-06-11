/**
 * path-resolver.js
 *
 * Resolves paths for book dataset content in the translate-agents-main repository.
 */

'use strict';

const path = require('path');

// Base directory for all book datasets
const WORKSPACE_ROOT = path.resolve(__dirname, '../..');

const phaseMapping = {
  raw: "01-raw",
  clean: "02-clean",
  analyzed: "03-analyzed",
  prep: "04-prep",
  translated: "05-translated",
  reviews: "06-reviews",
  archive: "07-archive",
  assets: "assets"
};

function getBookRoot(bookSlug) {
  if (!bookSlug) throw new Error('bookSlug is required');
  return path.join(WORKSPACE_ROOT, 'books', bookSlug);
}

function getBookConfigPath(bookSlug) {
  return path.join(getBookRoot(bookSlug), 'book.config.json');
}

function getWorkflowStatePath(bookSlug) {
  return path.join(getBookRoot(bookSlug), 'workflow-state.json');
}

function getQaSummaryPath(bookSlug) {
  return path.join(getBookRoot(bookSlug), 'qa-summary.json');
}

function getReportsDir(bookSlug) {
  return path.join(getBookRoot(bookSlug), 'reports');
}

function getChaptersDir(bookSlug) {
  return path.join(getBookRoot(bookSlug), 'chapters');
}

function getChapterRoot(bookSlug, chapterId) {
  if (!chapterId) throw new Error('chapterId is required');
  return path.join(getChaptersDir(bookSlug), chapterId);
}

function getChapterPhaseDir(bookSlug, chapterId, phaseKey) {
  const folder = phaseMapping[phaseKey];
  if (!folder) {
    throw new Error(`Unknown phase key: ${phaseKey}`);
  }
  return path.join(getChapterRoot(bookSlug, chapterId), folder);
}

function getPreviewHtmlDir(bookSlug) {
  return path.join(getBookRoot(bookSlug), 'preview', 'html');
}

function getEpubPath(bookSlug) {
  return path.join(getBookRoot(bookSlug), 'exports', 'epub', 'book.epub');
}

module.exports = {
  phaseMapping,
  getBookRoot,
  getBookConfigPath,
  getWorkflowStatePath,
  getQaSummaryPath,
  getReportsDir,
  getChaptersDir,
  getChapterRoot,
  getChapterPhaseDir,
  getPreviewHtmlDir,
  getEpubPath
};

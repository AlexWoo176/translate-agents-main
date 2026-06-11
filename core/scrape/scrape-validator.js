'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');
const { readSourceMap } = require('./source-map-writer');

/**
 * Validates a single chapter's raw HTML directory.
 *
 * @param {string} bookSlug
 * @param {string} chapterId
 * @param {object} sourceMap - Full source map object
 * @returns {{ chapterId, status, htmlCount, errors, warnings }}
 */
function validateChapterRaw(bookSlug, chapterId, sourceMap) {
  const bookRoot = getBookRoot(bookSlug);
  const rawDir = chapterId === '_book-level'
    ? path.join(bookRoot, '_book-level', '01-raw')
    : path.join(bookRoot, 'chapters', chapterId, '01-raw');

  const errors = [];
  const warnings = [];

  if (!fs.existsSync(rawDir)) {
    errors.push(`Missing 01-raw directory`);
    return { chapterId, status: 'failed', htmlCount: 0, errors, warnings };
  }

  const htmlFiles = fs.readdirSync(rawDir).filter(f => f.endsWith('.html'));

  if (htmlFiles.length === 0) {
    errors.push(`01-raw directory exists but contains no HTML files`);
    return { chapterId, status: 'failed', htmlCount: 0, errors, warnings };
  }

  // Check each file for non-empty content
  let emptyCount = 0;
  for (const file of htmlFiles) {
    const filePath = path.join(rawDir, file);
    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      errors.push(`Empty HTML file: ${file}`);
      emptyCount++;
    } else if (stat.size < 100) {
      warnings.push(`Suspiciously small HTML file (< 100 bytes): ${file}`);
    }
  }

  // Check against source map if available
  if (sourceMap && Object.keys(sourceMap).length > 0) {
    const prefix = chapterId === '_book-level' ? '_book-level' : `chapters/${chapterId}`;
    const mapEntries = Object.keys(sourceMap).filter(k => k.startsWith(`${prefix}/01-raw/`));
    const mapFiles = mapEntries.map(e => path.basename(e));

    // Files in source map but missing locally
    for (const mapFile of mapFiles) {
      if (!htmlFiles.includes(mapFile)) {
        warnings.push(`In source map but missing locally: ${mapFile}`);
      }
    }

    // Files locally but not in source map
    for (const localFile of htmlFiles) {
      if (!mapFiles.includes(localFile)) {
        warnings.push(`Exists locally but not in source map: ${localFile}`);
      }
    }
  }

  let status = 'passed';
  if (errors.length > 0) {
    status = 'failed';
  } else if (warnings.length > 0) {
    status = 'passed_with_warnings';
  }

  return { chapterId, status, htmlCount: htmlFiles.length, errors, warnings };
}

/**
 * Validates the entire book's raw HTML state.
 *
 * @param {string} bookSlug
 * @param {object} [options]
 * @param {string|null} [options.chapterId] - Validate a single chapter, or null for all
 * @returns {{ status, chapters: object, totalHtmlFiles, errors, warnings }}
 */
function validateScrape(bookSlug, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const sourceMap = readSourceMap(bookSlug);
  const errors = [];
  const warnings = [];
  const chapters = {};

  let chaptersToCheck;
  if (options.chapterId) {
    chaptersToCheck = [options.chapterId];
  } else {
    const scan = scanBook(bookSlug);
    chaptersToCheck = scan.chaptersFound;

    // Also check book-level
    const bookLevelDir = path.join(bookRoot, '_book-level');
    if (fs.existsSync(bookLevelDir)) {
      chaptersToCheck = [...chaptersToCheck, '_book-level'];
    }
  }

  let totalHtmlFiles = 0;
  let failedChapters = 0;
  let warnChapters = 0;

  for (const chId of chaptersToCheck) {
    const result = validateChapterRaw(bookSlug, chId, sourceMap);
    chapters[chId] = result;
    totalHtmlFiles += result.htmlCount;

    if (result.status === 'failed') {
      failedChapters++;
      errors.push(...result.errors.map(e => `[${chId}] ${e}`));
    } else if (result.status === 'passed_with_warnings') {
      warnChapters++;
      warnings.push(...result.warnings.map(w => `[${chId}] ${w}`));
    }
  }

  if (chaptersToCheck.length === 0) {
    errors.push('No chapters found to validate');
  }

  let status = 'passed';
  if (errors.length > 0 || failedChapters > 0) {
    status = 'failed';
  } else if (warnings.length > 0 || warnChapters > 0) {
    status = 'passed_with_warnings';
  }

  return {
    status,
    chapters,
    totalHtmlFiles,
    errors,
    warnings
  };
}

module.exports = {
  validateScrape,
  validateChapterRaw
};

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { extractMetaComments } = require('./html-fetcher');

/**
 * Reads metadata comments from an existing raw HTML file.
 *
 * @param {string} filePath
 * @returns {{ sourceUrl: string|null, fetchedAt: string|null, provider: string|null }}
 */
function readHtmlMeta(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { meta } = extractMetaComments(content);
    return {
      sourceUrl: meta.sourceUrl || null,
      fetchedAt: meta.fetchedAt || null,
      provider: meta.provider || null
    };
  } catch (e) {
    return { sourceUrl: null, fetchedAt: null, provider: null };
  }
}

/**
 * Builds the source map from a list of page entries.
 *
 * @param {Array<{relPath, slug, chapterId, sourceUrl?, fetchedAt?, provider?}>} pages
 * @returns {object} source map object
 */
function buildSourceMap(pages) {
  const map = {};
  for (const page of pages) {
    map[page.relPath] = {
      slug: page.slug,
      chapterId: page.chapterId,
      sourceUrl: page.sourceUrl || page.url || null,
      fetchedAt: page.fetchedAt || null,
      provider: page.provider || null
    };
  }
  return map;
}

/**
 * Writes the source map to books/{bookSlug}/source-map.json
 * The source map merges existing entries with new ones (additive by default).
 *
 * @param {string} bookSlug
 * @param {Array} pages - Array of page entries to include
 * @param {boolean} [force] - If true, overwrite all entries (replace existing)
 * @returns {{ jsonPath: string, entries: number }}
 */
function writeSourceMap(bookSlug, pages, force = false) {
  const bookRoot = getBookRoot(bookSlug);
  const jsonPath = path.join(bookRoot, 'source-map.json');

  let existing = {};
  if (!force && fs.existsSync(jsonPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      // Invalid JSON, start fresh
    }
  }

  const newEntries = buildSourceMap(pages);
  const merged = force ? newEntries : Object.assign({}, existing, newEntries);

  fs.writeFileSync(jsonPath, JSON.stringify(merged, null, 2), 'utf8');

  return { jsonPath, entries: Object.keys(merged).length };
}

/**
 * Reads the existing source map for a book.
 *
 * @param {string} bookSlug
 * @returns {object} - Map of relPath → entry, or empty object if not found
 */
function readSourceMap(bookSlug) {
  const bookRoot = getBookRoot(bookSlug);
  const jsonPath = path.join(bookRoot, 'source-map.json');
  if (!fs.existsSync(jsonPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    return {};
  }
}

/**
 * Builds source map entries from existing local raw HTML files by reading their metadata headers.
 * Used in offline mode to regenerate source-map from local files without fetching.
 *
 * @param {string} bookSlug
 * @param {Array<{relPath, slug, chapterId, rawFile}>} pages - Discovered local pages
 * @returns {Array<{relPath, slug, chapterId, sourceUrl, fetchedAt, provider}>}
 */
function enrichPagesFromLocalFiles(bookSlug, pages) {
  return pages.map(page => {
    const meta = readHtmlMeta(page.rawFile);
    return Object.assign({}, page, {
      sourceUrl: meta.sourceUrl,
      fetchedAt: meta.fetchedAt,
      provider: meta.provider
    });
  });
}

module.exports = {
  writeSourceMap,
  readSourceMap,
  buildSourceMap,
  readHtmlMeta,
  enrichPagesFromLocalFiles
};

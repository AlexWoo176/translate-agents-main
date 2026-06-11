'use strict';

const fs = require('fs');
const path = require('path');
const { loadBookConfig } = require('../config/book-config');
const { getBookRoot } = require('../paths/path-resolver');

/**
 * Resolves and normalizes the source configuration for a book.
 *
 * @param {string} bookSlug - The slug of the book.
 * @returns {object} - Normalized source configuration and warnings.
 */
function resolveSource(bookSlug) {
  const warnings = [];
  const bookRoot = getBookRoot(bookSlug);
  
  let config = {};
  try {
    config = loadBookConfig(bookSlug);
  } catch (err) {
    throw new Error(`Failed to load book config for ${bookSlug}: ${err.message}`);
  }

  const source = config.source || {};
  const provider = source.provider || 'openstax';
  const bookUrl = source.bookUrl || '';
  const webviewUrl = source.webviewUrl || '';
  const downloadUrl = source.downloadUrl || '';
  const canonicalSlug = source.canonicalSlug || bookSlug;
  const license = source.license || 'CC BY';
  const attribution = source.attribution || '';

  // Check if bookUrl is missing
  if (!bookUrl) {
    // Check if raw files exist locally
    let hasLocalRaw = false;
    const chaptersDir = path.join(bookRoot, 'chapters');
    if (fs.existsSync(chaptersDir)) {
      const chapters = fs.readdirSync(chaptersDir).filter(c => c.startsWith('chapter-'));
      for (const ch of chapters) {
        const rawDir = path.join(chaptersDir, ch, '01-raw');
        if (fs.existsSync(rawDir)) {
          const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.html'));
          if (files.length > 0) {
            hasLocalRaw = true;
            break;
          }
        }
      }
    }
    
    // Also check book level raw
    const bookLevelRaw = path.join(bookRoot, '_book-level', '01-raw');
    if (fs.existsSync(bookLevelRaw)) {
      const files = fs.readdirSync(bookLevelRaw).filter(f => f.endsWith('.html'));
      if (files.length > 0) {
        hasLocalRaw = true;
      }
    }

    if (!hasLocalRaw) {
      warnings.push('source_url_missing');
    }
  }

  return {
    provider,
    bookSlug,
    bookUrl,
    webviewUrl,
    downloadUrl,
    canonicalSlug,
    license,
    attribution,
    warnings
  };
}

module.exports = {
  resolveSource
};

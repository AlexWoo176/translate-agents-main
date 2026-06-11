/**
 * epub-runner-utils.js
 *
 * Helper utilities for the EPUB export runner.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

// Reads the canonical reading order array from preview's book-pages.js
function loadBookPages(bookSlug) {
  const bookRoot = getBookRoot(bookSlug);
  const bookPagesJsPath = path.join(bookRoot, 'preview', 'html', 'book-reader', 'book-pages.js');
  
  if (!fs.existsSync(bookPagesJsPath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(bookPagesJsPath, 'utf8');
    const match = content.match(/window\.BOOK_PAGES\s*=\s*(\[[^\]]+\])/);
    if (match) {
      const arrayStr = match[1].replace(/'/g, '"');
      return JSON.parse(arrayStr);
    }
  } catch (e) {
    console.warn(`Warning: Failed to parse book-pages.js for ${bookSlug}: ${e.message}`);
  }
  
  return [];
}

// Extracts a user-friendly page title from the HTML content
function extractPageTitle(html, filename) {
  // 1. Try to match h1 or h2 with data-type="document-title"
  const docTitleMatch = html.match(/<h[12][^>]*data-type="document-title"[^>]*>([\s\S]*?)<\/h[12]>/i);
  if (docTitleMatch) {
    const inner = docTitleMatch[1];
    const textMatch = inner.match(/<span[^>]*class="[^"]*os-text[^"]*"[^>]*>([\s\S]*?)<\/span>/i) || 
                      inner.match(/<span[^>]*>([\s\S]*?)<\/span>/i) ||
                      inner.match(/>([^<]+)</);
    if (textMatch) return cleanText(textMatch[1]);
    return cleanText(inner.replace(/<[^>]+>/g, ''));
  }
  
  // 2. Try generic h1/h2 title
  const hMatch = html.match(/<h[12][^>]*class="[^"]*os-title[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/i) || 
                 html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (hMatch) {
    return cleanText(hMatch[1].replace(/<[^>]+>/g, ''));
  }
  
  // 3. Fallback to filename
  const base = path.basename(filename, path.extname(filename));
  return base
    .replace(/-/g, ' ')
    .replace(/^\d+-\d+-/, '')
    .replace(/^\d+-/, '')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').replace(/<[^>]+>/g, '').trim();
}

// Ensures the HTML content is well-formed XHTML
function ensureXhtml(html) {
  let processed = html.trim();
  
  // Ensure we have xml declaration if needed (some readers require it, others prefer standard doctype)
  // Standard HTML5 DOCTYPE is valid in EPUB 3
  if (!processed.startsWith('<?xml') && !processed.startsWith('<!DOCTYPE')) {
    processed = '<?xml version="1.0" encoding="utf-8"?>\n' + processed;
  }
  
  // Ensure xmlns is present on <html> tag
  if (processed.includes('<html') && !processed.includes('xmlns=')) {
    processed = processed.replace('<html', '<html xmlns="http://www.w3.org/1999/xhtml"');
  }
  
  return processed;
}

// Maps file extensions to standard EPUB media types
function getMediaType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.css':
      return 'text/css';
    case '.html':
    case '.xhtml':
      return 'application/xhtml+xml';
    case '.webp':
      return 'image/webp';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.opf':
      return 'application/oebps-package+xml';
    case '.ncx':
      return 'application/x-dtbncx+xml';
    case '.otf':
      return 'application/font-sfnt';
    case '.ttf':
      return 'application/font-sfnt';
    case '.woff':
      return 'application/font-woff';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

module.exports = {
  loadBookPages,
  extractPageTitle,
  ensureXhtml,
  getMediaType
};

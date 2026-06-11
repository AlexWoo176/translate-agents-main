/**
 * scan-book.js
 *
 * Scans the overall book directory, listing chapters, reports, and checking for key components.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  getBookRoot,
  getChaptersDir,
  getReportsDir,
  getPreviewHtmlDir,
  getEpubPath
} = require('../paths/path-resolver');

function scanBook(bookSlug) {
  const bookRoot = getBookRoot(bookSlug);
  
  if (!fs.existsSync(bookRoot)) {
    throw new Error(`Book directory not found: ${bookRoot}`);
  }

  // 1. Scan chapters
  const chaptersDir = getChaptersDir(bookSlug);
  let chaptersFound = [];
  if (fs.existsSync(chaptersDir)) {
    chaptersFound = fs.readdirSync(chaptersDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.startsWith('chapter-'))
      .map(entry => entry.name)
      .sort((a, b) => {
        const na = parseInt(a.replace('chapter-', ''), 10);
        const nb = parseInt(b.replace('chapter-', ''), 10);
        return na - nb;
      });
  }

  // 2. Check _book-level
  const bookLevelDir = path.join(bookRoot, '_book-level');
  const hasBookLevel = fs.existsSync(bookLevelDir) && fs.statSync(bookLevelDir).isDirectory();

  // 3. Check preview/html
  const previewHtmlDir = getPreviewHtmlDir(bookSlug);
  const hasPreviewHtml = fs.existsSync(previewHtmlDir) && fs.statSync(previewHtmlDir).isDirectory();

  // 4. Check epub
  const epubPath = getEpubPath(bookSlug);
  const hasEpub = fs.existsSync(epubPath) && fs.statSync(epubPath).isFile();

  // 5. Scan reports
  const reportsDir = getReportsDir(bookSlug);
  let reportsFound = [];
  if (fs.existsSync(reportsDir)) {
    reportsFound = fs.readdirSync(reportsDir).filter(file => {
      const fullPath = path.join(reportsDir, file);
      return fs.statSync(fullPath).isFile();
    });
  }

  return {
    bookSlug,
    chaptersFound,
    chapterCount: chaptersFound.length,
    hasBookLevel,
    hasPreviewHtml,
    hasEpub,
    reportsFound
  };
}

module.exports = {
  scanBook
};

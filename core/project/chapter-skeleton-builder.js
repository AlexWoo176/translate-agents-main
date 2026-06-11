'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

/**
 * Builds the folder structure for a book project.
 * 
 * @param {string} bookSlug 
 * @param {object} options 
 * @param {number} [options.chapterCount]
 * @param {boolean} [options.dryRun=false]
 * @returns {string[]} List of directory paths resolved relative to workspace root (or absolute)
 */
function buildFolderSkeleton(bookSlug, options = {}) {
  const dryRun = !!options.dryRun;
  const chapterCount = options.chapterCount ? parseInt(options.chapterCount, 10) : 0;
  
  const bookRoot = getBookRoot(bookSlug);
  
  // Base skeletal directories (relative to book root)
  const baseDirs = [
    'reports',
    'reports/phase-runs',
    'backups',
    'assets',
    'css',
    'preview',
    'preview/html',
    'exports',
    'exports/epub',
    'chapters'
  ];

  const targetDirs = baseDirs.map(d => path.join(bookRoot, d));

  // If chapter count is provided, add chapter folders
  if (chapterCount > 0) {
    for (let i = 1; i <= chapterCount; i++) {
      const chapFolder = `chapters/chapter-${i}`;
      const subDirs = [
        '', // the chapter folder itself
        '01-raw',
        '02-clean',
        '03-analyzed',
        '04-prep',
        '05-translated',
        '06-reviews',
        '07-archive',
        'assets'
      ];
      
      subDirs.forEach(sub => {
        if (sub === '') {
          targetDirs.push(path.join(bookRoot, chapFolder));
        } else {
          targetDirs.push(path.join(bookRoot, chapFolder, sub));
        }
      });
    }
  }

  // Perform physical creation if not dry-run
  if (!dryRun) {
    targetDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Return list of paths relative to book's parent or just normalized paths
  return targetDirs.map(dir => path.relative(path.join(bookRoot, '..'), dir).replace(/\\/g, '/'));
}

module.exports = {
  buildFolderSkeleton
};

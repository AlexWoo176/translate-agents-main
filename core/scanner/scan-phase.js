/**
 * scan-phase.js
 *
 * Scans a specific phase directory in a chapter or book-level directory,
 * counting files by type and determining status.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { phaseMapping } = require('../paths/path-resolver');

/**
 * Scans a folder on disk to compute file statistics and status.
 *
 * @param {string} dirPath - Absolute path to the phase directory
 * @param {string} phaseKey - The phase identifier (raw, clean, etc.)
 * @returns {object} Phase scan summary
 */
function scanPhase(dirPath, phaseKey) {
  const result = {
    status: 'missing',
    path: dirPath,
    fileCount: 0,
    htmlCount: 0,
    mdCount: 0,
    assetCount: 0
  };

  if (!fs.existsSync(dirPath)) {
    return result;
  }

  // Check if it's a directory
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    return result;
  }

  const assetExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
    '.css', '.scss', '.js', '.ts', '.woff', '.woff2', '.ttf', '.otf', '.eot'
  ]);

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        result.fileCount++;
        
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.html' || ext === '.htm') {
          result.htmlCount++;
        } else if (ext === '.md' || ext === '.markdown') {
          result.mdCount++;
        }
        
        if (phaseKey === 'assets' || assetExtensions.has(ext)) {
          result.assetCount++;
        }
      }
    }
  }

  walk(dirPath);

  if (result.fileCount > 0) {
    result.status = 'done';
  } else {
    result.status = 'empty';
  }

  return result;
}

module.exports = {
  scanPhase
};

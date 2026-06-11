/**
 * scan-chapter.js
 *
 * Scans all phases within a specific chapter and returns the aggregated status.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getChapterRoot, getChapterPhaseDir, getBookRoot } = require('../paths/path-resolver');
const { scanPhase } = require('./scan-phase');

function scanChapter(bookSlug, chapterId) {
  const chapterRoot = getChapterRoot(bookSlug, chapterId);
  const bookRoot = getBookRoot(bookSlug);
  
  if (!fs.existsSync(chapterRoot)) {
    return {
      chapterId,
      status: 'missing',
      path: `chapters/${chapterId}`,
      phases: {}
    };
  }

  const phaseKeys = ['raw', 'clean', 'analyzed', 'prep', 'translated', 'reviews', 'archive', 'assets'];
  const phases = {};

  for (const phaseKey of phaseKeys) {
    const phaseDir = getChapterPhaseDir(bookSlug, chapterId, phaseKey);
    const scanResult = scanPhase(phaseDir, phaseKey);
    
    // Convert path to relative format relative to the book root
    const relativePath = path.relative(bookRoot, scanResult.path).replace(/\\/g, '/');
    
    phases[phaseKey] = {
      status: scanResult.status,
      path: relativePath,
      fileCount: scanResult.fileCount,
      htmlCount: scanResult.htmlCount,
      mdCount: scanResult.mdCount,
      assetCount: scanResult.assetCount
    };
  }

  const result = {
    chapterId,
    status: 'imported', // Default status when chapter exists
    path: `chapters/${chapterId}`,
    phases
  };

  // Check for quarantine directory
  const quarantinePath = path.join(chapterRoot, '_quarantine');
  if (fs.existsSync(quarantinePath) && fs.statSync(quarantinePath).isDirectory()) {
    result.quarantine = {
      exists: true,
      path: `chapters/${chapterId}/_quarantine`
    };
  }

  return result;
}

module.exports = {
  scanChapter
};

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

// Recursive directory copy helper
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Backs up an existing 05-translated directory for a chapter before overwrite.
 * 
 * @param {string} bookSlug - Book slug.
 * @param {string} chapterId - Chapter ID.
 * @param {string} timestamp - Timestamp for directory name.
 * @returns {string|null} The backup directory path or null if none existed.
 */
function backupTranslatedFolder(bookSlug, chapterId, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const transDir = path.join(bookRoot, 'chapters', chapterId, '05-translated');
  
  if (!fs.existsSync(transDir)) {
    return null;
  }

  const backupDest = path.join(bookRoot, 'backups', 'phase-10-translate-runner', chapterId, timestamp);
  try {
    copyDirRecursive(transDir, backupDest);
    return backupDest;
  } catch (err) {
    throw new Error(`Backup failed for ${chapterId} translation folder: ${err.message}`);
  }
}

/**
 * Loads translation progress from the output directory.
 * 
 * @param {string} outputDir - Output directory path.
 * @returns {Object} Progress data.
 */
function loadProgress(outputDir) {
  const progressPath = path.join(outputDir, '.translation-progress.json');
  if (!fs.existsSync(progressPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(progressPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Warning: Failed to parse translation progress: ${err.message}`);
    return null;
  }
}

/**
 * Saves translation progress to the output directory.
 * 
 * @param {string} outputDir - Output directory path.
 * @param {Object} progress - Progress data.
 */
function saveProgress(outputDir, progress) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const progressPath = path.join(outputDir, '.translation-progress.json');
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');
}

module.exports = {
  copyDirRecursive,
  backupTranslatedFolder,
  loadProgress,
  saveProgress
};

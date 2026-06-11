'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { copyDirRecursive } = require('./phase-runner-utils');

/**
 * Backs up the 02-clean folder of a chapter before overwriting.
 * 
 * @param {string} bookSlug - The slug of the book.
 * @param {string} chapterId - The ID of the chapter (e.g. chapter-2).
 * @param {string} timestamp - Timestamp for directory naming (YYYYMMDD-HHMMSS).
 * @returns {string|null} - Path to the backup destination, or null if no folder to backup.
 */
function backupCleanFolder(bookSlug, chapterId, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const cleanDir = path.join(bookRoot, 'chapters', chapterId, '02-clean');
  if (!fs.existsSync(cleanDir)) {
    return null; // Nothing to backup
  }
  
  const backupDest = path.join(bookRoot, 'backups', 'phase-11-clean-runner', chapterId, timestamp);
  try {
    copyDirRecursive(cleanDir, backupDest);
    return backupDest;
  } catch (err) {
    throw new Error(`Backup failed for 02-clean in ${chapterId}: ${err.message}`);
  }
}

module.exports = {
  backupCleanFolder
};

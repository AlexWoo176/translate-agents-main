'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

/**
 * Backs up existing project plan files before rewriting.
 * 
 * @param {string} bookSlug 
 * @param {string} timestamp 
 * @returns {string|null} Path to backup folder, or null if no files were backed up.
 */
function backupPlanFiles(bookSlug, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const planJson = path.join(bookRoot, 'project-plan.json');
  const planMd = path.join(bookRoot, 'project-plan.md');

  if (!fs.existsSync(planJson) && !fs.existsSync(planMd)) {
    return null;
  }

  const backupDest = path.join(bookRoot, 'backups', 'phase-13-plan-runner', timestamp);
  
  try {
    if (!fs.existsSync(backupDest)) {
      fs.mkdirSync(backupDest, { recursive: true });
    }

    if (fs.existsSync(planJson)) {
      fs.copyFileSync(planJson, path.join(backupDest, 'project-plan.json'));
    }
    if (fs.existsSync(planMd)) {
      fs.copyFileSync(planMd, path.join(backupDest, 'project-plan.md'));
    }

    return backupDest;
  } catch (err) {
    throw new Error(`Backup failed for project plan files in ${bookSlug}: ${err.message}`);
  }
}

module.exports = {
  backupPlanFiles
};

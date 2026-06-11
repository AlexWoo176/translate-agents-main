/**
 * backup-workflow-state.js
 *
 * Backs up the current workflow-state.json to a timestamped file in the backups folder.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot, getWorkflowStatePath } = require('../paths/path-resolver');

function backupWorkflowState(bookSlug) {
  const bookRoot = getBookRoot(bookSlug);
  const statePath = getWorkflowStatePath(bookSlug);

  // If the state file doesn't exist, there is nothing to backup
  if (!fs.existsSync(statePath)) {
    return null;
  }

  const backupDir = path.join(bookRoot, 'backups', 'workflow-core-phase-2');

  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  } catch (err) {
    throw new Error(`Failed to create backup directory ${backupDir}: ${err.message}`);
  }

  // Format timestamp: YYYYMMDD-HHMMSS
  const now = new Date();
  const pad = num => String(num).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  
  const backupFileName = `workflow-state.backup.${timestamp}.json`;
  const backupFilePath = path.join(backupDir, backupFileName);

  try {
    fs.copyFileSync(statePath, backupFilePath);
    
    // Relative path format for return
    const relativePath = path.relative(bookRoot, backupFilePath).replace(/\\/g, '/');
    return relativePath;
  } catch (err) {
    throw new Error(`Backup failed: Could not copy ${statePath} to ${backupFilePath}: ${err.message}`);
  }
}

module.exports = {
  backupWorkflowState
};

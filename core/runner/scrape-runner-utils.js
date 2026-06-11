'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { copyDirRecursive } = require('./phase-runner-utils');

/**
 * Backs up 01-raw folder and assets for a specific chapter before force overwrite.
 *
 * @param {string} bookSlug
 * @param {string} chapterId - e.g. "chapter-2" or "_book-level"
 * @param {string} timestamp - YYYYMMDD-HHMMSS
 * @returns {{ rawBackup: string|null, assetsBackup: string|null }}
 */
function backupChapterRaw(bookSlug, chapterId, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const backupBase = path.join(bookRoot, 'backups', 'phase-12-scrape-runner', chapterId, timestamp);
  const result = { rawBackup: null, assetsBackup: null };

  // Backup 01-raw
  const rawDir = chapterId === '_book-level'
    ? path.join(bookRoot, '_book-level', '01-raw')
    : path.join(bookRoot, 'chapters', chapterId, '01-raw');

  if (fs.existsSync(rawDir)) {
    const rawBackupDest = path.join(backupBase, '01-raw');
    try {
      copyDirRecursive(rawDir, rawBackupDest);
      result.rawBackup = rawBackupDest;
    } catch (err) {
      throw new Error(`Backup failed for 01-raw in ${chapterId}: ${err.message}`);
    }
  }

  // Backup chapter-level assets dir
  const assetsDir = chapterId === '_book-level'
    ? path.join(bookRoot, '_book-level', 'assets')
    : path.join(bookRoot, 'chapters', chapterId, 'assets');

  if (fs.existsSync(assetsDir)) {
    const assetsBackupDest = path.join(backupBase, 'assets');
    try {
      copyDirRecursive(assetsDir, assetsBackupDest);
      result.assetsBackup = assetsBackupDest;
    } catch (err) {
      throw new Error(`Backup failed for assets in ${chapterId}: ${err.message}`);
    }
  }

  return result;
}

/**
 * Backs up book-level scrape manifest and source map.
 *
 * @param {string} bookSlug
 * @param {string} timestamp - YYYYMMDD-HHMMSS
 * @returns {{ manifestBackup: string|null, sourceMapBackup: string|null }}
 */
function backupScrapeArtifacts(bookSlug, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const backupBase = path.join(bookRoot, 'backups', 'phase-12-scrape-runner', '_book-artifacts', timestamp);
  const result = { manifestBackup: null, sourceMapBackup: null };

  const manifestPath = path.join(bookRoot, 'scrape-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const dest = path.join(backupBase, 'scrape-manifest.json');
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(manifestPath, dest);
      result.manifestBackup = dest;
    } catch (err) {
      throw new Error(`Backup failed for scrape-manifest.json: ${err.message}`);
    }
  }

  const sourceMapPath = path.join(bookRoot, 'source-map.json');
  if (fs.existsSync(sourceMapPath)) {
    const dest = path.join(backupBase, 'source-map.json');
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(sourceMapPath, dest);
      result.sourceMapBackup = dest;
    } catch (err) {
      throw new Error(`Backup failed for source-map.json: ${err.message}`);
    }
  }

  return result;
}

/**
 * Backs up global assets directory (books/{bookSlug}/assets/).
 *
 * @param {string} bookSlug
 * @param {string} timestamp
 * @returns {string|null} - backup path or null
 */
function backupGlobalAssets(bookSlug, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const assetsDir = path.join(bookRoot, 'assets');
  if (!fs.existsSync(assetsDir)) return null;

  const backupDest = path.join(bookRoot, 'backups', 'phase-12-scrape-runner', '_global-assets', timestamp);
  try {
    copyDirRecursive(assetsDir, backupDest);
    return backupDest;
  } catch (err) {
    throw new Error(`Backup failed for global assets: ${err.message}`);
  }
}

module.exports = {
  backupChapterRaw,
  backupScrapeArtifacts,
  backupGlobalAssets
};

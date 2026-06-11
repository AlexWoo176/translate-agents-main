'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot, getChapterPhaseDir } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');

/**
 * Checks approval gates and adjusts execution options based on safety flags.
 * 
 * @param {string} bookSlug 
 * @param {string} phaseId 
 * @param {object} options 
 * @returns {object} { warnings: string[], modifiedOptions: object }
 */
function checkApprovalGate(bookSlug, phaseId, options = {}) {
  const warnings = [];
  const modifiedOptions = { ...options };
  const bookRoot = getBookRoot(bookSlug);

  // 1. Translate phase approval
  if (phaseId === 'translate') {
    if (!options.writeFinal) {
      warnings.push("Phase 'translate' requested to run, but --write-final was not passed. Using draft/mock translations (requiresHumanReview=true) instead.");
      modifiedOptions.writeFinal = false;
    }
  }

  // 2. Overwrite protection for clean, prep, archive, build_preview, export_epub
  const checkOverwritePhases = ['clean', 'archive', 'build_preview', 'export_epub'];
  if (checkOverwritePhases.includes(phaseId) && !options.force) {
    let hasExisting = false;
    let chapters = [];

    try {
      if (fs.existsSync(bookRoot)) {
        const scan = scanBook(bookSlug);
        chapters = scan.chaptersFound;
      }
    } catch (e) {}

    if (options.chapterId) {
      chapters = [options.chapterId];
    }

    if (phaseId === 'clean') {
      for (const ch of chapters) {
        try {
          const dir = getChapterPhaseDir(bookSlug, ch, 'clean');
          if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
            hasExisting = true;
            break;
          }
        } catch (e) {}
      }
    } else if (phaseId === 'archive') {
      for (const ch of chapters) {
        try {
          const dir = getChapterPhaseDir(bookSlug, ch, 'archive');
          if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
            hasExisting = true;
            break;
          }
        } catch (e) {}
      }
    } else if (phaseId === 'build_preview') {
      const dir = path.join(bookRoot, 'preview', 'html');
      if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
        hasExisting = true;
      }
    } else if (phaseId === 'export_epub') {
      const file = path.join(bookRoot, 'exports', 'epub', 'book.epub');
      if (fs.existsSync(file)) {
        hasExisting = true;
      }
    }

    if (hasExisting) {
      warnings.push(`Phase '${phaseId}' requires --force to overwrite existing outputs. Execution will proceed but existing outputs will be preserved/skipped where possible.`);
    }
  }

  return {
    warnings,
    modifiedOptions
  };
}

module.exports = {
  checkApprovalGate
};

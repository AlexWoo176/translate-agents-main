'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot, getBookConfigPath, getChaptersDir, getChapterPhaseDir } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');

/**
 * Checks if a directory contains any files of the given extension (or any files if no ext).
 * 
 * @param {string} dir 
 * @param {string} [ext] 
 * @returns {boolean}
 */
function hasFiles(dir, ext = '') {
  if (!fs.existsSync(dir)) return false;
  try {
    const files = fs.readdirSync(dir);
    if (ext) {
      return files.some(f => f.endsWith(ext));
    }
    return files.length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Checks dependencies for a single phase.
 * 
 * @param {string} bookSlug 
 * @param {string} phaseId 
 * @param {object} [options] 
 * @returns {object} { status: 'passed'|'blocked', phase, missingDependencies: string[], recommendation: string }
 */
function checkPhaseDependencies(bookSlug, phaseId, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const configPath = getBookConfigPath(bookSlug);
  
  const chapterId = options.chapterId || null;
  const allChapters = !!options.all;
  
  // Resolve chapters to check
  let chaptersToCheck = [];
  if (chapterId) {
    chaptersToCheck = [chapterId];
  } else {
    // Scan book for existing chapters
    try {
      if (fs.existsSync(bookRoot)) {
        const scan = scanBook(bookSlug);
        chaptersToCheck = scan.chaptersFound;
      }
    } catch (e) {
      // ignore, bookRoot might not exist yet during dry-runs of new projects
    }
  }

  const result = {
    status: 'passed',
    phase: phaseId,
    missingDependencies: [],
    recommendation: ''
  };

  const addMissing = (dep, rec) => {
    result.status = 'blocked';
    result.missingDependencies.push(dep);
    if (result.recommendation) {
      result.recommendation += ' ' + rec;
    } else {
      result.recommendation = rec;
    }
  };

  // 1. Config must exist for everything
  if (!fs.existsSync(configPath)) {
    addMissing('book.config.json', `Run project initialization first.`);
    return result;
  }

  // 2. Specific dependencies per phase
  switch (phaseId) {
    case 'plan':
      // Requires config
      break;

    case 'scrape':
      // Requires project config
      break;

    case 'clean': {
      // Requires raw HTML in 01-raw (either in _book-level or chapter folders)
      let rawExists = false;
      const bookLevelRaw = path.join(bookRoot, '_book-level', '01-raw');
      if (hasFiles(bookLevelRaw, '.html')) {
        rawExists = true;
      }
      
      for (const ch of chaptersToCheck) {
        try {
          const chRaw = getChapterPhaseDir(bookSlug, ch, 'raw');
          if (hasFiles(chRaw, '.html')) {
            rawExists = true;
          }
        } catch (e) {}
      }

      if (!rawExists) {
        addMissing('scrape output (01-raw)', `Run 'scrape' phase first to download raw HTML.`);
      }
      break;
    }

    case 'analyze': {
      // Requires clean HTML in 02-clean, and glossary.csv
      let cleanExists = false;
      const bookLevelClean = path.join(bookRoot, '_book-level', '02-clean');
      if (hasFiles(bookLevelClean, '.html')) {
        cleanExists = true;
      }

      for (const ch of chaptersToCheck) {
        try {
          const chClean = getChapterPhaseDir(bookSlug, ch, 'clean');
          if (hasFiles(chClean, '.html')) {
            cleanExists = true;
          }
        } catch (e) {}
      }

      if (!cleanExists) {
        addMissing('clean output (02-clean)', `Run 'clean' phase first to prepare clean HTML.`);
      }

      const glossaryPath = path.join(bookRoot, 'glossary.csv');
      if (!fs.existsSync(glossaryPath)) {
        addMissing('glossary.csv', `Ensure glossary.csv is bootstrapped in project root.`);
      }
      break;
    }

    case 'prep': {
      // Requires clean HTML in 02-clean
      let cleanExists = false;
      const bookLevelClean = path.join(bookRoot, '_book-level', '02-clean');
      if (hasFiles(bookLevelClean, '.html')) {
        cleanExists = true;
      }

      for (const ch of chaptersToCheck) {
        try {
          const chClean = getChapterPhaseDir(bookSlug, ch, 'clean');
          if (hasFiles(chClean, '.html')) {
            cleanExists = true;
          }
        } catch (e) {}
      }

      if (!cleanExists) {
        addMissing('clean output (02-clean)', `Run 'clean' phase first to prepare clean HTML.`);
      }
      break;
    }

    case 'translate': {
      // Requires prep HTML in 04-prep, analyze output in 03-analyzed, and glossary.csv
      let prepExists = false;
      let analyzeExists = false;

      const bookLevelPrep = path.join(bookRoot, '_book-level', '04-prep');
      if (hasFiles(bookLevelPrep, '.html')) {
        prepExists = true;
      }

      for (const ch of chaptersToCheck) {
        try {
          const chPrep = getChapterPhaseDir(bookSlug, ch, 'prep');
          if (hasFiles(chPrep, '.html')) {
            prepExists = true;
          }
        } catch (e) {}
      }

      const bookLevelAnalyzed = path.join(bookRoot, '_book-level', '03-analyzed');
      if (hasFiles(bookLevelAnalyzed)) {
        analyzeExists = true;
      }

      for (const ch of chaptersToCheck) {
        try {
          const chAnalyzed = getChapterPhaseDir(bookSlug, ch, 'analyzed');
          if (hasFiles(chAnalyzed)) {
            analyzeExists = true;
          }
        } catch (e) {}
      }

      if (!prepExists) {
        addMissing('prep output (04-prep)', `Run 'prep' phase first to build bilingual HTML templates.`);
      }
      if (!analyzeExists) {
        addMissing('analyze output (03-analyzed)', `Run 'analyze' phase first to extract terms and contexts.`);
      }

      const glossaryPath = path.join(bookRoot, 'glossary.csv');
      if (!fs.existsSync(glossaryPath)) {
        addMissing('glossary.csv', `Ensure glossary.csv exists.`);
      }
      break;
    }

    case 'review': {
      // Requires translated HTML in 05-translated, and glossary.csv
      let transExists = false;
      const bookLevelTrans = path.join(bookRoot, '_book-level', '05-translated');
      if (hasFiles(bookLevelTrans, '.html')) {
        transExists = true;
      }

      for (const ch of chaptersToCheck) {
        try {
          const chTrans = getChapterPhaseDir(bookSlug, ch, 'translated');
          if (hasFiles(chTrans, '.html')) {
            transExists = true;
          }
        } catch (e) {}
      }

      if (!transExists) {
        addMissing('translate output (05-translated)', `Run 'translate' phase first to generate translations.`);
      }

      const glossaryPath = path.join(bookRoot, 'glossary.csv');
      if (!fs.existsSync(glossaryPath)) {
        addMissing('glossary.csv', `Ensure glossary.csv exists.`);
      }
      break;
    }

    case 'archive': {
      // Requires translated HTML in 05-translated
      let transExists = false;
      const bookLevelTrans = path.join(bookRoot, '_book-level', '05-translated');
      if (hasFiles(bookLevelTrans, '.html')) {
        transExists = true;
      }

      for (const ch of chaptersToCheck) {
        try {
          const chTrans = getChapterPhaseDir(bookSlug, ch, 'translated');
          if (hasFiles(chTrans, '.html')) {
            transExists = true;
          }
        } catch (e) {}
      }

      if (!transExists) {
        addMissing('translate output (05-translated)', `Run 'translate' phase first to generate translations.`);
      }
      break;
    }

    case 'build_preview': {
      // Requires archive output in 07-archive
      let archiveExists = false;
      const bookLevelArchive = path.join(bookRoot, '_book-level', '07-archive');
      if (hasFiles(bookLevelArchive)) {
        archiveExists = true;
      }

      for (const ch of chaptersToCheck) {
        try {
          const chArchive = getChapterPhaseDir(bookSlug, ch, 'archive');
          if (hasFiles(chArchive)) {
            archiveExists = true;
          }
        } catch (e) {}
      }

      if (!archiveExists) {
        addMissing('archive output (07-archive)', `Run 'archive' phase first to create clean final outputs.`);
      }
      break;
    }

    case 'export_epub': {
      // Requires archive output in 07-archive and preview built
      let archiveExists = false;
      for (const ch of chaptersToCheck) {
        try {
          const chArchive = getChapterPhaseDir(bookSlug, ch, 'archive');
          if (hasFiles(chArchive)) {
            archiveExists = true;
          }
        } catch (e) {}
      }

      const previewDir = path.join(bookRoot, 'preview', 'html');
      const previewExists = fs.existsSync(previewDir) && fs.readdirSync(previewDir).length > 0;

      if (!archiveExists) {
        addMissing('archive output (07-archive)', `Run 'archive' phase first.`);
      }
      if (!previewExists) {
        addMissing('preview outputs', `Run 'build_preview' phase first to assemble HTML preview.`);
      }
      break;
    }
  }

  return result;
}

module.exports = {
  checkPhaseDependencies
};

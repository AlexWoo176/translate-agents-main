'use strict';

const { runPlanPhase } = require('./run-plan-phase');
const { runPrepPhase } = require('./run-prep-phase');
const { runArchivePhase } = require('./run-archive-phase');
const { runBuildPreviewPhase } = require('./run-build-preview-phase');
const { runExportEpubPhase } = require('./run-export-epub-phase');
const { runReviewPhase } = require('./run-review-phase');
const { runAnalyzePhase } = require('./run-analyze-phase');
const { runTranslatePhase } = require('./run-translate-phase');
const { runCleanPhase } = require('./run-clean-phase');
const { runScrapePhase } = require('./run-scrape-phase');
const { runGlossaryPhase } = require('./run-glossary-phase');

async function runPhase(bookSlug, phaseId, options = {}) {
  if (!phaseId) {
    throw new Error('phaseId is required.');
  }

  const normalizedPhase = String(phaseId).trim().toLowerCase();
  
  if (normalizedPhase === 'plan') {
    return runPlanPhase(bookSlug, options);
  }
  
  if (normalizedPhase === 'scrape') {
    return runScrapePhase(bookSlug, options);
  }
  
  if (normalizedPhase === 'clean') {
    return runCleanPhase(bookSlug, options);
  }
  
  if (normalizedPhase === 'glossary') {
    return runGlossaryPhase(bookSlug, options);
  }
  
  if (normalizedPhase === 'prep') {
    return runPrepPhase(bookSlug, options);
  }
  
  if (normalizedPhase === 'archive') {
    return runArchivePhase(bookSlug, options);
  }
  
  if (normalizedPhase === 'build_preview' || normalizedPhase === 'build-preview') {
    return runBuildPreviewPhase(bookSlug, options);
  }
  
  if (normalizedPhase === 'export_epub' || normalizedPhase === 'export-epub') {
    return runExportEpubPhase(bookSlug, options);
  }
  
  if (normalizedPhase === 'review') {
    return runReviewPhase(bookSlug, options);
  }
  
  if (normalizedPhase === 'analyze') {
    return runAnalyzePhase(bookSlug, options);
  }

  if (normalizedPhase === 'translate') {
    return runTranslatePhase(bookSlug, options);
  }
  
  return {
    status: 'unsupported_phase',
    message: `Supported phases in current implementation: plan, scrape, clean, glossary, prep, archive, build_preview, export_epub, review, analyze, translate. Unsupported phase: ${phaseId}`
  };
}

module.exports = {
  runPhase
};

'use strict';

/**
 * Builds the default config object for a new book project.
 * 
 * @param {object} params
 * @param {string} params.bookSlug
 * @param {string} params.title
 * @param {string} [params.sourceUrl=""]
 * @param {string} [params.sourceProvider="openstax"]
 * @param {string} [params.sourceLanguage="en"]
 * @param {string} [params.targetLanguage="vi"]
 * @param {string} [params.datasetVersion="v1"]
 * @returns {object} The configured template object.
 */
function buildBookConfig({
  bookSlug,
  title,
  sourceUrl = '',
  sourceProvider = 'openstax',
  sourceLanguage = 'en',
  targetLanguage = 'vi',
  datasetVersion = 'v1'
}) {
  return {
    bookSlug,
    title,
    datasetVersion,
    datasetStatus: 'planned',
    sourceLanguage,
    targetLanguage,
    source: {
      provider: sourceProvider,
      bookUrl: sourceUrl,
      webviewUrl: '',
      downloadUrl: '',
      canonicalSlug: bookSlug,
      license: 'CC BY',
      attribution: 'Vietnamese translation adapted from OpenStax.'
    },
    workflow: {
      masterWorkflow: '../../workflow/master-workflow.json',
      currentPhase: 'plan',
      enabledPhases: [
        'plan',
        'scrape',
        'clean',
        'analyze',
        'prep',
        'translate',
        'review',
        'archive',
        'build_preview',
        'export_epub',
        'qa_summary',
        'generate_state',
        'final_validate'
      ]
    },
    // Adding duplicates/mappings to satisfy core/config/book-config.js validator checks
    language: {
      source: sourceLanguage,
      target: targetLanguage
    },
    translation: {
      provider: 'mock',
      sourceLanguage,
      targetLanguage,
      writeFinalByDefault: false,
      requiresHumanReview: true,
      preserveBilingual: true
    },
    dataset: {
      name: `${title} Reference Dataset`,
      version: datasetVersion,
      status: 'planned'
    },
    quality: {
      requiredGates: [
        'planCompleteness',
        'rawHtmlExists',
        'cleanHtmlValid',
        'analysisCompleteness',
        'prepCompleteness',
        'translationCompleteness',
        'reviewCompleteness',
        'archiveCompleteness',
        'previewCssReferences',
        'epubValidity',
        'finalValidation'
      ]
    }
  };
}

module.exports = {
  buildBookConfig
};

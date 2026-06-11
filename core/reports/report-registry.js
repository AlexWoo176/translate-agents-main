/**
 * report-registry.js
 *
 * Scans and registers reports within the reports/ directory of a book dataset.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

function getReportsRegistry(bookSlug) {
  const bookRoot = getBookRoot(bookSlug);
  
  function checkReport(jsonRelative, mdRelative) {
    const jsonPath = path.join(bookRoot, jsonRelative);
    const mdPath = path.join(bookRoot, mdRelative);
    
    const jsonExists = fs.existsSync(jsonPath) && fs.statSync(jsonPath).isFile();
    const markdownExists = fs.existsSync(mdPath) && fs.statSync(mdPath).isFile();
    
    let status = 'missing';
    if (jsonExists && markdownExists) {
      status = 'present';
    } else if (jsonExists || markdownExists) {
      status = 'partial';
    }
    
    return {
      json: jsonRelative,
      jsonExists,
      markdown: mdRelative,
      markdownExists,
      status
    };
  }

  return {
    qaSummary: checkReport('qa-summary.json', 'qa-summary.md'),
    glossaryValidation: checkReport('reports/glossary-validation-report.json', 'reports/glossary-validation-report.md'),
    chapter5DuplicatePages: checkReport('reports/chapter-5-duplicate-page-report.json', 'reports/chapter-5-duplicate-page-report.md'),
    chapter8BilingualPairs: checkReport('reports/chapter-8-bilingual-pair-report.json', 'reports/chapter-8-bilingual-pair-report.md'),
    chapter14TableIntegrity: checkReport('reports/chapter-14-table-integrity-report.json', 'reports/chapter-14-table-integrity-report.md'),
    previewCssReferences: checkReport('reports/preview-css-refs-report.json', 'reports/preview-css-refs-report.md'),
    localPathLeaks: checkReport('reports/local-path-leaks-report.json', 'reports/local-path-leaks-report.md'),
    translatedCssRefs: checkReport('reports/translated-css-refs-report.json', 'reports/translated-css-refs-report.md'),
    prepRebuild: checkReport('reports/prep-rebuild-report.json', 'reports/prep-rebuild-report.md'),
    epubValidity: checkReport('reports/epub-validity-report.json', 'reports/epub-validity-report.md'),
    reviewCompleteness: checkReport('reports/review-completeness-report.json', 'reports/review-completeness-report.md'),
    analysisCompleteness: checkReport('reports/analysis-completeness-report.json', 'reports/analysis-completeness-report.md'),
    translationCompleteness: checkReport('reports/translation-completeness-report.json', 'reports/translation-completeness-report.md'),
    cleanHtmlValid: checkReport('reports/clean-html-valid-report.json', 'reports/clean-html-valid-report.md'),
    rawHtmlExists: checkReport('reports/raw-html-exists-report.json', 'reports/raw-html-exists-report.md'),
    planCompleteness: checkReport('reports/plan-completeness-report.json', 'reports/plan-completeness-report.md')
  };
}

module.exports = {
  getReportsRegistry
};

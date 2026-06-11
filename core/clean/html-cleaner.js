'use strict';

const cheerio = require('cheerio');
const { applyCleanRules } = require('./openstax-clean-rules');
const { normalizeAssetReferences } = require('./asset-reference-normalizer');
const { validateHtmlStructure } = require('./html-structure-validator');

/**
 * Extracts and cleans the main textbook content from raw OpenStax HTML, 
 * wrapping it in a standardized HTML academic page with stylesheet references.
 *
 * @param {string} rawHtml - Original HTML file content.
 * @param {string} bookRoot - Absolute path to the book root.
 * @param {string} chapterId - The current chapter ID.
 * @param {string} fileName - File name of the HTML document.
 * @returns {object} - Cleaned HTML, statistics, warnings, and errors.
 */
function cleanHtml(rawHtml, bookRoot, chapterId, fileName) {
  const warnings = [];
  const errors = [];
  
  const $raw = cheerio.load(rawHtml);
  
  // Extract document title from raw
  const title = $raw('head title').text() || 'Entrepreneurship';
  
  // Extract main textbook content container
  let mainContent = $raw('[data-type="page"]').html();
  if (!mainContent) {
    mainContent = $raw('main').html() || $raw('body').html();
  }
  
  if (!mainContent) {
    throw new Error(`Could not find main content wrapper ([data-type="page"], <main>, or <body>) in ${fileName}`);
  }
  
  // Wrap content in standardized HTML document structure
  const wrappedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <link rel="stylesheet" href="../../../css/style.css">
</head>
<body>
${mainContent}
</body>
</html>`;

  const $ = cheerio.load(wrappedHtml);
  
  // Apply clean rules
  const cleanStats = applyCleanRules($, warnings);
  
  // Normalize asset references
  normalizeAssetReferences($, bookRoot, chapterId, fileName, warnings);
  
  // Validate structure
  const validation = validateHtmlStructure($, rawHtml, fileName, warnings);
  if (!validation.valid) {
    errors.push(...validation.errors);
  }
  
  const cleanHtmlString = $.html();
  
  return {
    cleanHtml: cleanHtmlString,
    stats: cleanStats,
    warnings,
    errors
  };
}

module.exports = {
  cleanHtml
};

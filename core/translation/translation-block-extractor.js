'use strict';

const cheerio = require('cheerio');
const { buildGlossaryContext } = require('./glossary-context-builder');

/**
 * Extracts translatable blocks from a prep HTML file content.
 * 
 * @param {string} htmlContent - The HTML content of the 04-prep file.
 * @param {string} relativeFilePath - Relative path of the file for metadata.
 * @param {string} bookSlug - Book slug for glossary matching.
 * @param {string} chapterId - Chapter ID for terminology context.
 * @returns {Array} List of extracted blocks.
 */
function extractTranslationBlocks(htmlContent, relativeFilePath, bookSlug, chapterId) {
  const $ = cheerio.load(htmlContent);
  const blocks = [];

  $('[data-prep-role="target"]').each((idx, elem) => {
    const targetNode = $(elem);
    const sourceNode = targetNode.prev('[data-prep-role="source"]');

    if (sourceNode.length === 0) {
      // Warning if no source block found
      console.warn(`Warning: Target block at index ${idx} in ${relativeFilePath} is missing a corresponding source block.`);
      return;
    }

    // Determine a stable block ID
    const targetId = targetNode.attr('id');
    const sourceId = sourceNode.attr('id');
    const blockId = targetId || (sourceId ? `${sourceId}-vn` : `b-${idx}`);

    const tagName = elem.name || '';
    const sourceText = sourceNode.html() || '';
    const targetText = targetNode.html() || '';

    // Match glossary terms for this block
    let glossaryTerms = [];
    try {
      const glContext = buildGlossaryContext(bookSlug, chapterId, sourceText);
      glossaryTerms = glContext.matchedTerms || [];
    } catch (err) {
      console.warn(`Warning: Glossary matching failed for block ${blockId}: ${err.message}`);
    }

    blocks.push({
      blockId,
      tagName,
      sourceText,
      targetText,
      file: relativeFilePath,
      index: idx,
      glossaryTerms,
      // Status flags to help runner
      isPending: targetNode.attr('data-prep-status') === 'pending-translation',
      existingStatus: targetNode.attr('data-translation-status') || null
    });
  });

  // Calculate contextBefore and contextAfter
  for (let i = 0; i < blocks.length; i++) {
    blocks[i].contextBefore = i > 0 ? blocks[i - 1].sourceText : '';
    blocks[i].contextAfter = i < blocks.length - 1 ? blocks[i + 1].sourceText : '';
  }

  return blocks;
}

module.exports = {
  extractTranslationBlocks
};

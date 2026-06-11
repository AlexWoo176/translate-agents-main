'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

/**
 * Reads a prep HTML file, applies translations to target blocks, and writes the output HTML file.
 * 
 * @param {string} prepFilePath - Path to the input 04-prep HTML file.
 * @param {string} outputFilePath - Path to the output 05-translated HTML file.
 * @param {Object} blockTranslations - Map of blockId or index to { translatedText, status }.
 */
function writeTranslationsToFile(prepFilePath, outputFilePath, blockTranslations) {
  const htmlContent = fs.readFileSync(prepFilePath, 'utf8');
  const $ = cheerio.load(htmlContent);

  $('[data-prep-role="target"]').each((idx, elem) => {
    const targetNode = $(elem);
    const sourceNode = targetNode.prev('[data-prep-role="source"]');

    const targetId = targetNode.attr('id');
    const sourceId = sourceNode.attr('id');
    const blockId = targetId || (sourceId ? `${sourceId}-vn` : `b-${idx}`);

    // Try finding translation by blockId, then by index
    let translation = blockTranslations[blockId];
    if (!translation) {
      translation = blockTranslations[idx];
    }

    if (translation) {
      targetNode.html(translation.translatedText);
      targetNode.removeAttr('data-prep-status');
      targetNode.attr('data-translation-status', translation.status);
    }
  });

  const dir = path.dirname(outputFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, $.html(), 'utf8');
}

module.exports = {
  writeTranslationsToFile
};

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

function cleanText(text) {
  if (!text) return "";
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Loads manual translations from books/{bookSlug}/translation-memory/manual-translations.json
 * Returns a Map or object mapping normalized sourceText to translatedText.
 */
function loadManualTranslations(bookSlug) {
  const bookRoot = getBookRoot(bookSlug);
  const memoryPath = path.join(bookRoot, 'translation-memory', 'manual-translations.json');

  if (!fs.existsSync(memoryPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(memoryPath, 'utf8');
    const data = JSON.parse(raw);
    
    const memory = {};
    if (Array.isArray(data)) {
      // If it is an array of { sourceText, translatedText }
      for (const item of data) {
        if (item && item.sourceText) {
          const key = cleanText(item.sourceText).toLowerCase();
          memory[key] = item.translatedText;
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      // If it is a direct key-value mapping
      for (const [src, trans] of Object.entries(data)) {
        const key = cleanText(src).toLowerCase();
        memory[key] = trans;
      }
    }
    
    return memory;
  } catch (err) {
    console.error(`Warning: Failed to load translation memory: ${err.message}`);
    return {};
  }
}

module.exports = {
  loadManualTranslations,
  cleanText
};

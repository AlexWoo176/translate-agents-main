'use strict';

const { loadManualTranslations, cleanText } = require('./translation-memory');

class ManualTranslationProvider {
  constructor(bookSlug) {
    this.name = 'manual';
    this.memory = loadManualTranslations(bookSlug);
  }

  async translateBlock({ sourceText, glossaryTerms, chapterContext, bookConfig, blockMeta }) {
    const key = cleanText(sourceText).toLowerCase();
    
    if (this.memory && Object.prototype.hasOwnProperty.call(this.memory, key)) {
      return {
        translatedText: this.memory[key],
        provider: 'manual',
        confidence: 'exact',
        warnings: [],
        metadata: {}
      };
    }

    return {
      translatedText: '[MANUAL_TRANSLATION_MISSING]',
      provider: 'manual',
      confidence: 'unknown',
      warnings: ['No manual translation found in memory.'],
      metadata: {}
    };
  }
}

module.exports = {
  ManualTranslationProvider
};

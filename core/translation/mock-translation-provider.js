'use strict';

class MockTranslationProvider {
  constructor() {
    this.name = 'mock';
  }

  async translateBlock({ sourceText, glossaryTerms, chapterContext, bookConfig, blockMeta }) {
    return {
      translatedText: `[MOCK_TRANSLATION_REQUIRED] ${sourceText}`,
      provider: 'mock',
      confidence: 'unknown',
      warnings: [],
      metadata: {}
    };
  }
}

module.exports = {
  MockTranslationProvider
};

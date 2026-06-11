'use strict';

class ExternalAiTranslationProvider {
  constructor(bookSlug) {
    this.name = 'external-ai';
    this.configured = false;
    this.configMessage = 'External AI translation provider is not configured.';
  }

  async translateBlock({ sourceText, glossaryTerms, chapterContext, bookConfig, blockMeta }) {
    // Phase 10: Skeleton only. Returns provider-not-configured.
    return {
      translatedText: '[PROVIDER_NOT_CONFIGURED]',
      provider: 'external-ai',
      confidence: 'unknown',
      warnings: [this.configMessage],
      metadata: {
        status: 'provider_not_configured'
      }
    };
  }
}

module.exports = {
  ExternalAiTranslationProvider
};

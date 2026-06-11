'use strict';

const { MockTranslationProvider } = require('./mock-translation-provider');
const { ManualTranslationProvider } = require('./manual-translation-provider');
const { ExternalAiTranslationProvider } = require('./external-ai-translation-provider');

/**
 * Factory to retrieve a translation provider by name.
 * 
 * @param {string} providerName - Name of the provider ('mock', 'manual', 'external-ai').
 * @param {string} bookSlug - Book slug for loading book-specific configuration or memory.
 * @returns {Object} An instance of a translation provider.
 */
function getTranslationProvider(providerName, bookSlug) {
  const name = String(providerName || 'mock').trim().toLowerCase();

  switch (name) {
    case 'mock':
      return new MockTranslationProvider();
    case 'manual':
      return new ManualTranslationProvider(bookSlug);
    case 'external-ai':
    case 'external_ai':
      return new ExternalAiTranslationProvider(bookSlug);
    default:
      throw new Error(`Unsupported translation provider: ${providerName}. Supported: mock, manual, external-ai`);
  }
}

module.exports = {
  getTranslationProvider
};

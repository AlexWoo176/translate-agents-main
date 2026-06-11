'use strict';

const fs = require('fs');
const { getBookConfigPath } = require('../paths/path-resolver');

/**
 * Validates a book config file.
 * 
 * @param {string} bookSlug 
 * @returns {object} { status: 'passed'|'passed_with_warnings'|'failed', errors: string[], warnings: string[] }
 */
function validateBookConfig(bookSlug) {
  const errors = [];
  const warnings = [];
  const configPath = getBookConfigPath(bookSlug);

  if (!fs.existsSync(configPath)) {
    return {
      status: 'failed',
      errors: [`Book config file not found at: ${configPath}`],
      warnings: []
    };
  }

  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  } catch (err) {
    return {
      status: 'failed',
      errors: [`Failed to parse book config JSON: ${err.message}`],
      warnings: []
    };
  }

  // 1. Basic properties
  if (!config.bookSlug) {
    errors.push("Missing required field 'bookSlug'");
  } else if (config.bookSlug !== bookSlug) {
    errors.push(`Mismatched bookSlug: expected '${bookSlug}', found '${config.bookSlug}'`);
  }

  if (!config.title || typeof config.title !== 'string' || config.title.trim() === '') {
    errors.push("Missing or empty required field 'title'");
  }

  // 2. Dataset properties
  if (!config.dataset) {
    errors.push("Missing required 'dataset' section");
  } else {
    if (!config.dataset.version) {
      errors.push("Missing required field 'dataset.version'");
    }
    if (config.dataset.status) {
      const validStatuses = ['raw', 'normalizing', 'ready', 'translated', 'reviewed', 'archived', 'reference_dataset_prepared'];
      if (!validStatuses.includes(config.dataset.status)) {
        warnings.push(`Non-standard dataset status: '${config.dataset.status}'. Expected one of: ${validStatuses.join(', ')}`);
      }
    } else {
      warnings.push("Missing optional field 'dataset.status'");
    }
  }

  // 3. Languages
  if (!config.language) {
    errors.push("Missing required 'language' section");
  } else {
    if (!config.language.source) {
      errors.push("Missing required field 'language.source'");
    } else if (typeof config.language.source !== 'string' || config.language.source.length < 2) {
      errors.push("Invalid source language code");
    }

    if (!config.language.target) {
      errors.push("Missing required field 'language.target'");
    } else if (typeof config.language.target !== 'string' || config.language.target.length < 2) {
      errors.push("Invalid target language code");
    }
  }

  // 4. Source & Provider
  if (!config.source) {
    errors.push("Missing required 'source' section");
  } else {
    const validProviders = ['openstax', 'custom', 'local', 'mock'];
    if (!config.source.provider) {
      errors.push("Missing required field 'source.provider'");
    } else if (!validProviders.includes(config.source.provider)) {
      warnings.push(`Unknown source provider: '${config.source.provider}'`);
    }

    if (config.source.provider === 'openstax') {
      if (!config.source.bookUrl && !config.source.sourceUrl) {
        warnings.push("OpenStax provider enabled, but no 'source.bookUrl' or 'source.sourceUrl' is specified. Project will operate in local/offline mode.");
      }
    }
  }

  // 5. Workflow and Quality keys (optional configuration)
  if (config.workflow) {
    if (config.workflow.enabledPhases && !Array.isArray(config.workflow.enabledPhases)) {
      errors.push("'workflow.enabledPhases' must be an array");
    }
  }
  if (config.quality) {
    if (config.quality.requiredGates && !Array.isArray(config.quality.requiredGates)) {
      errors.push("'quality.requiredGates' must be an array");
    }
  }

  // 6. Translation provider configuration (optional in book config, defaults to mock)
  if (config.translation) {
    if (config.translation.provider) {
      const validTranslationProviders = ['mock', 'manual', 'external-ai'];
      if (!validTranslationProviders.includes(config.translation.provider)) {
        warnings.push(`Non-standard translation provider: '${config.translation.provider}'`);
      }
    }
  }

  // 7. Check for local machine leaks (absolute paths pointing to local system directories)
  const contentString = JSON.stringify(config);
  const localPathRegex = /(?:[a-zA-Z]:\\|\/Users\/|\/home\/)/;
  if (localPathRegex.test(contentString)) {
    errors.push("Configuration contains local absolute path leaks (e.g. C:\\... or /Users/...)");
  }

  let status = 'passed';
  if (errors.length > 0) {
    status = 'failed';
  } else if (warnings.length > 0) {
    status = 'passed_with_warnings';
  }

  return {
    status,
    errors,
    warnings
  };
}

module.exports = {
  validateBookConfig
};

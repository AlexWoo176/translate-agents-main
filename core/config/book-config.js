/**
 * book-config.js
 *
 * Loads and validates book configuration file (book.config.json).
 */

'use strict';

const fs = require('fs');
const { getBookConfigPath } = require('../paths/path-resolver');

function loadBookConfig(bookSlug) {
  const configPath = getBookConfigPath(bookSlug);
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Book config file not found: ${configPath}`);
  }
  
  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse book config JSON at ${configPath}: ${err.message}`);
  }
  
  // Validate minimum requirements
  if (!config.bookSlug || typeof config.bookSlug !== 'string' || config.bookSlug.trim() === '') {
    throw new Error(`Validation Error: 'bookSlug' is missing or invalid in ${configPath}`);
  }
  
  if (!config.title || typeof config.title !== 'string' || config.title.trim() === '') {
    throw new Error(`Validation Error: 'title' is missing or invalid in ${configPath}`);
  }
  
  if (!config.dataset || typeof config.dataset !== 'object' || !config.dataset.version || typeof config.dataset.version !== 'string' || config.dataset.version.trim() === '') {
    throw new Error(`Validation Error: 'dataset.version' is missing or invalid in ${configPath}`);
  }
  
  if (!config.language || typeof config.language !== 'object') {
    throw new Error(`Validation Error: 'language' block is missing or invalid in ${configPath}`);
  }
  
  if (!config.language.source || typeof config.language.source !== 'string' || config.language.source.trim() === '') {
    throw new Error(`Validation Error: 'language.source' is missing or invalid in ${configPath}`);
  }
  
  if (!config.language.target || typeof config.language.target !== 'string' || config.language.target.trim() === '') {
    throw new Error(`Validation Error: 'language.target' is missing or invalid in ${configPath}`);
  }
  
  return config;
}

module.exports = {
  loadBookConfig
};

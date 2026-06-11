'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

/**
 * Validates the core system environment for a book.
 * 
 * @param {string} bookSlug 
 * @returns {object} { status: 'passed'|'passed_with_warnings'|'failed', errors: string[], warnings: string[] }
 */
function validateCoreEnvironment(bookSlug) {
  const errors = [];
  const warnings = [];

  // 1. Check Node.js version (expecting >= 18.0.0)
  const nodeVersionStr = process.version; // e.g. "v22.20.0"
  const match = nodeVersionStr.match(/^v(\d+)\./);
  if (match) {
    const majorVersion = parseInt(match[1], 10);
    if (majorVersion < 18) {
      errors.push(`Node.js version is too old: ${nodeVersionStr}. Requires Node.js >= v18.0.0.`);
    }
  } else {
    warnings.push(`Could not determine Node.js version from string: ${nodeVersionStr}`);
  }

  // 2. Check Package Dependencies
  const requiredDeps = ['axios', 'cheerio', 'html-to-docx', 'puppeteer'];
  requiredDeps.forEach(dep => {
    try {
      require(dep);
    } catch (err) {
      errors.push(`Required npm dependency '${dep}' is missing or fails to load: ${err.message}`);
    }
  });

  // 3. Check Path Resolver & Book directory structure
  let bookRoot;
  try {
    bookRoot = getBookRoot(bookSlug);
    if (!fs.existsSync(bookRoot)) {
      errors.push(`Book directory does not exist: ${bookRoot}`);
    }
  } catch (err) {
    errors.push(`Path resolver failed to resolve book root directory: ${err.message}`);
  }

  // 4. Check Write Permission on Reports
  if (bookRoot && fs.existsSync(bookRoot)) {
    const reportsDir = path.join(bookRoot, 'reports');
    const runsDir = path.join(reportsDir, 'workflow-runs');
    
    // Ensure directories exist
    try {
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      if (!fs.existsSync(runsDir)) {
        fs.mkdirSync(runsDir, { recursive: true });
      }

      // Try write a temp file
      const tempFile = path.join(runsDir, `.env-write-test-${Date.now()}.tmp`);
      fs.writeFileSync(tempFile, 'test', 'utf8');
      fs.unlinkSync(tempFile);
    } catch (err) {
      errors.push(`Write permission check failed in book reports directory: ${err.message}`);
    }
  }

  // 5. CLI Entrypoint
  const cliFile = path.resolve(__dirname, '../../cli/index.js');
  if (!fs.existsSync(cliFile)) {
    errors.push(`CLI entrypoint file missing at: ${cliFile}`);
  }

  // 6. External Translation Provider Keys
  // Load book config to check current translation provider
  try {
    const configPath = path.join(bookRoot, 'book.config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const provider = config.translation?.provider || 'mock';

      if (provider === 'external-ai') {
        const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
        const hasGeminiKey = !!process.env.GEMINI_API_KEY;
        
        if (!hasOpenAiKey && !hasGeminiKey) {
          errors.push("Translation provider is set to 'external-ai', but neither OPENAI_API_KEY nor GEMINI_API_KEY environment variable is defined.");
        }
      } else {
        // Warning if missing keys but provider is mock
        const hasKeys = !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
        if (!hasKeys) {
          warnings.push("Optional translation API keys (OPENAI_API_KEY, GEMINI_API_KEY) are not configured. External translation provider will not work.");
        }
      }
    }
  } catch (err) {
    warnings.push(`Skipped translation provider key check due to config read error: ${err.message}`);
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
  validateCoreEnvironment
};

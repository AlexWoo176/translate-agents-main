'use strict';

const fs = require('fs');
const path = require('path');

const COMMENT_PREFIX_LENGTH = 3; // lines of metadata comments prepended

/**
 * Prepends standard metadata comment headers to raw HTML content.
 *
 * @param {string} html - Raw HTML string.
 * @param {object} meta - Metadata object.
 * @param {string} meta.sourceUrl
 * @param {string} meta.fetchedAt
 * @param {string} [meta.provider]
 * @returns {string}
 */
function prependMetaComments(html, meta) {
  const provider = meta.provider || 'OpenStax';
  const lines = [
    `<!-- source: ${provider} -->`,
    `<!-- fetchedAt: ${meta.fetchedAt} -->`,
    `<!-- sourceUrl: ${meta.sourceUrl} -->`
  ];
  return lines.join('\n') + '\n' + html;
}

/**
 * Checks if the HTML content already has our metadata comments.
 *
 * @param {string} html
 * @returns {boolean}
 */
function hasMetaComments(html) {
  return html.trimStart().startsWith('<!-- source:');
}

/**
 * Strips metadata comments from HTML (first 3 comment lines).
 *
 * @param {string} html
 * @returns {{ meta: object, html: string }}
 */
function extractMetaComments(html) {
  const lines = html.split('\n');
  const meta = {
    provider: null,
    fetchedAt: null,
    sourceUrl: null
  };

  let i = 0;
  for (; i < Math.min(COMMENT_PREFIX_LENGTH, lines.length); i++) {
    const line = lines[i].trim();
    const sourceMatch = line.match(/^<!--\s*source:\s*(.+?)\s*-->$/);
    const fetchedMatch = line.match(/^<!--\s*fetchedAt:\s*(.+?)\s*-->$/);
    const urlMatch = line.match(/^<!--\s*sourceUrl:\s*(.+?)\s*-->$/);
    if (sourceMatch) meta.provider = sourceMatch[1];
    if (fetchedMatch) meta.fetchedAt = fetchedMatch[1];
    if (urlMatch) meta.sourceUrl = urlMatch[1];
  }

  return {
    meta,
    html: lines.slice(i).join('\n')
  };
}

/**
 * Fetches HTML from a URL using Axios with fallback to Puppeteer.
 * Returns the raw HTML string with prepended metadata comments.
 *
 * @param {string} url - The URL to fetch.
 * @param {object} options
 * @param {string} [options.provider] - Source provider name.
 * @param {boolean} [options.usePuppeteer] - Force Puppeteer usage.
 * @returns {{ html: string, fetchedAt: string, method: string, warnings: string[] }}
 */
async function fetchHtml(url, options = {}) {
  const fetchedAt = new Date().toISOString();
  const provider = options.provider || 'OpenStax';
  const warnings = [];
  let html = null;
  let method = 'axios';

  // Try Axios first (fast, works for static pages)
  if (!options.usePuppeteer) {
    try {
      const axios = require('axios');
      const res = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; translate-agents/1.0)'
        },
        responseType: 'text'
      });
      html = res.data;
      method = 'axios';
    } catch (err) {
      warnings.push(`axios_failed:${err.message}`);
    }
  }

  // Fallback to Puppeteer for SPA or if Axios failed
  if (!html) {
    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch (e) {
      warnings.push('puppeteer_not_available');
      throw new Error(`Cannot fetch ${url}: Axios failed and Puppeteer is not available. ${warnings.join('; ')}`);
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      html = await page.content();
      method = 'puppeteer';
    } catch (err) {
      warnings.push(`puppeteer_failed:${err.message}`);
      throw new Error(`Cannot fetch ${url}: ${err.message}`);
    } finally {
      if (browser) {
        try { await browser.close(); } catch (_) {}
      }
    }
  }

  // Prepend metadata comments
  const htmlWithMeta = prependMetaComments(html, { sourceUrl: url, fetchedAt, provider });

  return {
    html: htmlWithMeta,
    fetchedAt,
    method,
    warnings
  };
}

module.exports = {
  fetchHtml,
  prependMetaComments,
  hasMetaComments,
  extractMetaComments
};

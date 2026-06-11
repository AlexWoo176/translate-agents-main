'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');

const BASE_OPENSTAX = 'https://openstax.org';

/**
 * Extracts asset URLs from raw HTML content.
 * Finds img[src] and source[srcset] attributes.
 *
 * @param {string} html
 * @param {string} [pageUrl] - Base URL for resolving relative paths.
 * @returns {Array<{originalUrl: string, absoluteUrl: string, filename: string}>}
 */
function extractAssetUrls(html, pageUrl) {
  const assets = [];
  const seen = new Set();

  // Match img src
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    const src = m[1];
    addAsset(src, pageUrl, assets, seen);
  }

  // Match source srcset (may have multiple URLs separated by commas)
  const srcsetRegex = /<source[^>]+srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRegex.exec(html)) !== null) {
    const srcset = m[1];
    // srcset may be: "url1 2x, url2 1x"
    const parts = srcset.split(',').map(p => p.trim().split(/\s+/)[0]);
    for (const src of parts) {
      if (src) addAsset(src, pageUrl, assets, seen);
    }
  }

  return assets;
}

/**
 * Adds a resolved asset to the list if not already seen.
 */
function addAsset(src, pageUrl, assets, seen) {
  if (!src || src.startsWith('data:')) return;

  let absoluteUrl = src;
  if (src.startsWith('//')) {
    absoluteUrl = 'https:' + src;
  } else if (src.startsWith('/')) {
    absoluteUrl = BASE_OPENSTAX + src;
  } else if (!src.startsWith('http')) {
    if (pageUrl) {
      absoluteUrl = new URL(src, pageUrl).href;
    } else {
      absoluteUrl = BASE_OPENSTAX + '/' + src;
    }
  }

  if (seen.has(absoluteUrl)) return;
  seen.add(absoluteUrl);

  // Extract original filename from URL path (ignoring query string)
  const parsed = new URL(absoluteUrl);
  const pathname = parsed.pathname;
  let filename = path.basename(pathname);
  if (!filename || !filename.includes('.')) {
    // Use hashed name if no extension
    filename = 'asset-' + Buffer.from(absoluteUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  }

  assets.push({ originalUrl: src, absoluteUrl, filename });
}

/**
 * Downloads an asset from a URL and saves it to the destination path.
 *
 * @param {string} assetUrl
 * @param {string} destPath - Full path to write the asset file.
 * @returns {{ success: boolean, skipped: boolean, error: string|null }}
 */
async function downloadAsset(assetUrl, destPath) {
  if (fs.existsSync(destPath)) {
    return { success: true, skipped: true, error: null };
  }

  let axios;
  try {
    axios = require('axios');
  } catch (e) {
    return { success: false, skipped: false, error: 'axios_not_available' };
  }

  try {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    const res = await axios({
      url: assetUrl,
      method: 'GET',
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; translate-agents/1.0)'
      }
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(destPath);
      res.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    return { success: true, skipped: false, error: null };
  } catch (err) {
    return { success: false, skipped: false, error: err.message };
  }
}

/**
 * Scans HTML for asset references and downloads them to the chapter's assets dir.
 *
 * @param {object} params
 * @param {string} params.html - Raw HTML content
 * @param {string} params.pageUrl - Source URL of the page
 * @param {string} params.assetsDir - Local directory to save assets
 * @param {boolean} [params.force] - Force re-download even if exists
 * @param {boolean} [params.dryRun] - Don't actually download
 * @returns {{ downloaded: string[], skipped: string[], failed: Array<{url,error}>, warnings: string[] }}
 */
async function fetchAssets({ html, pageUrl, assetsDir, force = false, dryRun = false }) {
  const assets = extractAssetUrls(html, pageUrl);
  const downloaded = [];
  const skipped = [];
  const failed = [];
  const warnings = [];

  for (const asset of assets) {
    const destPath = path.join(assetsDir, asset.filename);

    if (dryRun) {
      skipped.push(asset.filename);
      continue;
    }

    // Under force, remove existing asset before re-download
    if (force && fs.existsSync(destPath)) {
      try {
        fs.unlinkSync(destPath);
      } catch (e) {
        warnings.push(`Cannot remove existing asset ${asset.filename}: ${e.message}`);
      }
    }

    const result = await downloadAsset(asset.absoluteUrl, destPath);
    if (result.skipped) {
      skipped.push(asset.filename);
    } else if (result.success) {
      downloaded.push(asset.filename);
    } else {
      failed.push({ url: asset.absoluteUrl, filename: asset.filename, error: result.error });
      warnings.push(`Asset download failed: ${asset.filename} - ${result.error}`);
    }
  }

  return { downloaded, skipped, failed, warnings };
}

module.exports = {
  extractAssetUrls,
  downloadAsset,
  fetchAssets
};

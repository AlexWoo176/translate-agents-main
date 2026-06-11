'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

const BASE_OPENSTAX = 'https://openstax.org';

/**
 * Resolves the chapter number from a page slug.
 * e.g. "2-1-overview" → 2, "preface" → null
 */
function chapterNumberFromSlug(slug) {
  const m = slug.match(/^(\d+)[-/]/);
  if (m) return parseInt(m[1], 10);
  const onlyDigit = slug.match(/^(\d+)$/);
  if (onlyDigit) return parseInt(onlyDigit[1], 10);
  return null;
}

/**
 * Resolves the chapter directory id (e.g. "chapter-2") from a page slug.
 * Non-chapter pages ("preface", "index", etc.) return "_book-level".
 */
function chapterIdFromSlug(slug) {
  const num = chapterNumberFromSlug(slug);
  if (num !== null) return `chapter-${num}`;
  return '_book-level';
}

/**
 * Offline discovery: scans local filesystem for chapters and pages.
 *
 * @param {string} bookSlug
 * @returns {{ pages: Array<{slug,chapterId,rawFile,relPath}>, warnings: string[] }}
 */
function discoverOffline(bookSlug) {
  const bookRoot = getBookRoot(bookSlug);
  const chaptersRoot = path.join(bookRoot, 'chapters');
  const pages = [];
  const warnings = [];

  // Scan regular chapters
  if (fs.existsSync(chaptersRoot)) {
    const chapterDirs = fs.readdirSync(chaptersRoot).filter(d => d.startsWith('chapter-'));
    for (const chId of chapterDirs.sort()) {
      const rawDir = path.join(chaptersRoot, chId, '01-raw');
      if (!fs.existsSync(rawDir)) continue;
      const htmlFiles = fs.readdirSync(rawDir).filter(f => f.endsWith('.html'));
      for (const file of htmlFiles) {
        const slug = file.replace(/\.html$/, '');
        pages.push({
          slug,
          chapterId: chId,
          rawFile: path.join(rawDir, file),
          relPath: `chapters/${chId}/01-raw/${file}`
        });
      }
    }
  }

  // Scan _book-level
  const bookLevelRaw = path.join(bookRoot, '_book-level', '01-raw');
  if (fs.existsSync(bookLevelRaw)) {
    const htmlFiles = fs.readdirSync(bookLevelRaw).filter(f => f.endsWith('.html'));
    for (const file of htmlFiles) {
      const slug = file.replace(/\.html$/, '');
      pages.push({
        slug,
        chapterId: '_book-level',
        rawFile: path.join(bookLevelRaw, file),
        relPath: `_book-level/01-raw/${file}`
      });
    }
  }

  if (pages.length === 0) {
    warnings.push('no_local_raw_html_found');
  }

  return { pages, warnings };
}

/**
 * Offline discovery for a single chapter.
 *
 * @param {string} bookSlug
 * @param {string} chapterId - e.g. "chapter-2" or "_book-level"
 * @returns {{ pages: Array<{slug,chapterId,rawFile,relPath}>, warnings: string[] }}
 */
function discoverOfflineChapter(bookSlug, chapterId) {
  const bookRoot = getBookRoot(bookSlug);
  const pages = [];
  const warnings = [];

  let rawDir;
  if (chapterId === '_book-level') {
    rawDir = path.join(bookRoot, '_book-level', '01-raw');
  } else {
    rawDir = path.join(bookRoot, 'chapters', chapterId, '01-raw');
  }

  if (!fs.existsSync(rawDir)) {
    warnings.push(`raw_dir_missing:${chapterId}`);
    return { pages, warnings };
  }

  const htmlFiles = fs.readdirSync(rawDir).filter(f => f.endsWith('.html'));
  for (const file of htmlFiles) {
    const slug = file.replace(/\.html$/, '');
    const prefix = chapterId === '_book-level' ? '_book-level' : `chapters/${chapterId}`;
    pages.push({
      slug,
      chapterId,
      rawFile: path.join(rawDir, file),
      relPath: `${prefix}/01-raw/${file}`
    });
  }

  if (pages.length === 0) {
    warnings.push(`no_html_files:${chapterId}`);
  }

  return { pages, warnings };
}

/**
 * Online discovery using Puppeteer to get the book table of contents.
 *
 * @param {string} bookUrl - URL to the book TOC / start page (e.g. OpenStax book landing)
 * @param {string} canonicalSlug - The slug used in OpenStax book URL path (e.g. "entrepreneurship")
 * @returns {{ pages: Array<{slug, url, chapterId}>, warnings: string[] }}
 */
async function discoverOnline(bookUrl, canonicalSlug) {
  const pages = [];
  const warnings = [];

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    warnings.push('puppeteer_not_available');
    return { pages, warnings };
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    await page.goto(bookUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    const links = await page.evaluate((slug) => {
      const prefix = `https://openstax.org/books/${slug}/pages/`;
      const aTags = Array.from(document.querySelectorAll('a'));
      const found = new Set();
      aTags.forEach(a => {
        const href = a.href;
        if (href && href.startsWith(prefix) && !href.includes('#')) {
          found.add(href.split('?')[0]);
        }
      });
      return Array.from(found);
    }, canonicalSlug);

    for (const link of links) {
      const slugPart = link.split('/pages/').pop();
      const chapterId = chapterIdFromSlug(slugPart);
      pages.push({
        slug: slugPart,
        url: link,
        chapterId
      });
    }

    if (pages.length === 0) {
      warnings.push('no_pages_found_online');
    }
  } catch (err) {
    warnings.push(`online_discovery_failed:${err.message}`);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
  }

  return { pages, warnings };
}

/**
 * Discovers pages to scrape.
 *
 * If offline is true, scans local filesystem only.
 * Otherwise attempts online discovery with Puppeteer.
 *
 * @param {object} params
 * @param {string} params.bookSlug
 * @param {string|null} params.chapterId - null means all chapters
 * @param {boolean} params.offline
 * @param {string} [params.bookUrl] - Online discovery URL
 * @param {string} [params.canonicalSlug]
 * @returns {{ pages: Array, warnings: string[] }}
 */
async function discoverPages({ bookSlug, chapterId, offline, bookUrl, canonicalSlug }) {
  if (offline || !bookUrl) {
    if (chapterId) {
      return discoverOfflineChapter(bookSlug, chapterId);
    }
    return discoverOffline(bookSlug);
  }

  // Online mode
  const result = await discoverOnline(bookUrl, canonicalSlug || bookSlug);

  // Filter by chapter if specified
  if (chapterId && result.pages.length > 0) {
    result.pages = result.pages.filter(p => p.chapterId === chapterId);
  }

  // Fall back to offline if online failed
  if (result.pages.length === 0) {
    result.warnings.push('falling_back_to_offline_discovery');
    const fallback = chapterId
      ? discoverOfflineChapter(bookSlug, chapterId)
      : discoverOffline(bookSlug);
    result.pages.push(...fallback.pages);
    result.warnings.push(...fallback.warnings);
  }

  return result;
}

module.exports = {
  discoverPages,
  discoverOffline,
  discoverOfflineChapter,
  discoverOnline,
  chapterIdFromSlug,
  chapterNumberFromSlug
};

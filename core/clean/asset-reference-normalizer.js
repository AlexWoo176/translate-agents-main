'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Normalizes image source assets in HTML and warns if any asset is missing on disk.
 *
 * @param {object} $ - Cheerio instance.
 * @param {string} bookRoot - Absolute path to the book root.
 * @param {string} chapterId - The current chapter ID (e.g. chapter-2).
 * @param {string} fileName - File name of the HTML document.
 * @param {string[]} warnings - Collector for warning messages.
 */
function normalizeAssetReferences($, bookRoot, chapterId, fileName, warnings = []) {
  let filePrefix = fileName.replace('.html', '');
  const numMatch = filePrefix.match(/^(\d+(?:-\d+)?)/);
  if (numMatch) {
    filePrefix = numMatch[1];
  }

  // Chapter assets folder is books/{bookSlug}/chapters/{chapterId}/assets
  const assetsDir = path.join(bookRoot, 'chapters', chapterId, 'assets');
  let imgIndex = 1;

  $('img, source').each((i, el) => {
    const tagName = el.name.toLowerCase();
    const attrName = tagName === 'img' ? 'src' : 'srcset';
    const srcVal = $(el).attr(attrName);
    if (!srcVal) return;

    let ext = '.webp'; // default
    const originalSrc = $(el).attr('data-original-src') || '';
    const srcToParse = originalSrc || srcVal;
    
    const cleanUrl = srcToParse.split('?')[0];
    const matchExt = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
    if (matchExt) {
      ext = `.${matchExt[1].toLowerCase()}`;
    }

    // New format: img-[prefix]-[index].[ext]
    const newFileName = `img-${filePrefix}-${imgIndex}${ext}`;
    imgIndex++;

    const expectedAssetPath = path.join(assetsDir, newFileName);

    // Verify if asset file exists
    if (!fs.existsSync(expectedAssetPath)) {
      warnings.push(`Missing expected asset: ${newFileName} at chapters/${chapterId}/assets/ (ref in ${fileName})`);
    }

    // Rewrite src or srcset path to be chapter-relative: ../assets/img-[prefix]-[index].[ext]
    $(el).attr(attrName, `../assets/${newFileName}`);
    
    // Clean up original metadata attributes
    $(el).removeAttr('data-original-src');
    if (tagName === 'img') {
      $(el).removeAttr('srcset');
    }
  });
}

module.exports = {
  normalizeAssetReferences
};

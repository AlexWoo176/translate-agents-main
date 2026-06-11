'use strict';

/**
 * Applies OpenStax-specific cleanup rules to Cheerio parsed HTML.
 *
 * @param {object} $ - Cheerio instance loaded with the HTML document.
 * @param {string[]} warnings - Collector array for warnings.
 * @returns {object} - Statistics on what was cleaned.
 */
function applyCleanRules($, warnings = []) {
  let scriptsCount = 0;
  
  // 1. Remove all script tags
  $('script').each((i, el) => {
    scriptsCount++;
    $(el).remove();
  });

  // Also remove noscript and Google Tag Manager tracker tags
  $('noscript').remove();
  $('iframe[src*="googletagmanager"]').remove();

  // 2. Remove style tags and external stylesheet links
  $('style').remove();
  $('link[rel="stylesheet"]').remove();

  // 3. Remove inline event handlers from all elements
  let handlersRemoved = 0;
  $('*').each((i, el) => {
    const attribs = el.attribs;
    if (attribs) {
      for (const attr of Object.keys(attribs)) {
        if (attr.startsWith('on')) {
          $(el).removeAttr(attr);
          handlersRemoved++;
        }
      }
    }
  });

  // 4. Remove local file path leaks
  let leaksRemoved = 0;
  $('*').each((i, el) => {
    const attribs = el.attribs;
    if (attribs) {
      for (const [attr, val] of Object.entries(attribs)) {
        if (typeof val === 'string' && (val.includes('file://') || /^[a-zA-Z]:\\/.test(val) || val.includes('/Users/') || val.includes('\\Users\\'))) {
          $(el).removeAttr(attr);
          leaksRemoved++;
        }
      }
    }
  });

  // 5. Remove duplicate empty elements (excluding self-closing tags and table cells)
  const skipEmptyCheck = ['img', 'br', 'hr', 'col', 'td', 'th', 'iframe', 'math', 'mjx-container'];
  let emptyElementsRemoved = 0;
  
  // Multiple passes to clear nested empty tags (e.g., <div><p></p></div>)
  for (let pass = 0; pass < 3; pass++) {
    $('*').each((i, el) => {
      const name = el.name.toLowerCase();
      if (skipEmptyCheck.includes(name)) return;
      
      const text = $(el).text().trim();
      const children = $(el).children();
      
      if (text === '' && children.length === 0) {
        $(el).remove();
        emptyElementsRemoved++;
      }
    });
  }

  // 6. Check for potentially unsupported interactive widgets and warn
  $('[data-type="interactive"], [class*="interactive"], iframe').each((i, el) => {
    const id = $(el).attr('id') || '';
    const src = $(el).attr('src') || '';
    const name = el.name;
    warnings.push(`Unsupported interactive widget/iframe found: <${name} id="${id}" src="${src}">. Keeping it but verification is recommended.`);
  });

  return {
    scriptsRemoved: scriptsCount,
    localPathsRemoved: leaksRemoved,
    handlersRemoved,
    emptyElementsRemoved
  };
}

module.exports = {
  applyCleanRules
};

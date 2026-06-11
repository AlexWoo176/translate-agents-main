'use strict';

/**
 * Validates integrity, security, and content layout of cleaned HTML structure.
 *
 * @param {object} $ - Cheerio instance of the cleaned HTML.
 * @param {string} rawHtml - Original raw HTML content.
 * @param {string} fileName - File name of the HTML document.
 * @param {string[]} warnings - Collector for warning messages.
 * @returns {object} - Validation result ({ valid: boolean, errors: string[] }).
 */
function validateHtmlStructure($, rawHtml, fileName, warnings = []) {
  const errors = [];

  // 1. Verify <body> tag is present and not empty
  const body = $('body');
  if (body.length === 0) {
    errors.push(`HTML structure error: <body> tag is missing in ${fileName}`);
    return { valid: false, errors };
  }

  const bodyHtml = body.html() || '';
  if (bodyHtml.trim() === '') {
    errors.push(`HTML structure error: <body> tag is empty in ${fileName}`);
    return { valid: false, errors };
  }

  // 2. Verify main headings (h1, h2, h3, h4) exist in content
  const headings = $('h1, h2, h3, h4');
  if (headings.length === 0) {
    warnings.push(`Missing headings: No h1-h4 tags found in the main content of ${fileName}`);
  }

  // 3. Verify table/tr/td structural hierarchy
  $('tr').each((i, el) => {
    const parentTable = $(el).closest('table');
    if (parentTable.length === 0) {
      errors.push(`Invalid table nesting: <tr> found outside <table> in ${fileName}`);
    }
  });

  $('td, th').each((i, el) => {
    const parentTr = $(el).closest('tr');
    if (parentTr.length === 0) {
      errors.push(`Invalid table nesting: <${el.name}> found outside <tr> in ${fileName}`);
    }
  });

  // 4. Verify no remaining scripts or local path leaks
  $('script').each((i, el) => {
    errors.push(`Security violation: <script> tag remained in cleaned HTML: ${fileName}`);
  });

  $('*').each((i, el) => {
    const attribs = el.attribs || {};
    for (const [attr, val] of Object.entries(attribs)) {
      if (attr.startsWith('on')) {
        errors.push(`Security violation: Inline event handler '${attr}' remained in cleaned HTML: ${fileName}`);
      }
      if (typeof val === 'string' && (val.includes('file://') || /^[a-zA-Z]:\\/.test(val))) {
        errors.push(`Leak violation: Local path leak detected in attribute '${attr}="${val}"': ${fileName}`);
      }
    }
  });

  // 5. Compare visible text length to detect possible content loss
  const rawTextLength = rawHtml.replace(/<[^>]*>/g, '').trim().length;
  const cleanText = $('body').text().trim();
  const cleanTextLength = cleanText.length;

  if (rawTextLength > 0) {
    const ratio = cleanTextLength / rawTextLength;
    if (ratio < 0.05) {
      warnings.push(`possible_content_loss: Cleaned text length (${cleanTextLength}) is less than 5% of raw text length (${rawTextLength}) in ${fileName}`);
    }
  } else {
    warnings.push(`Empty raw content: Raw HTML of ${fileName} has no visible text`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateHtmlStructure
};

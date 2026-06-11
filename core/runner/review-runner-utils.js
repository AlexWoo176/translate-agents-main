'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

// RFC 4180 compliant CSV parser
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          field += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\r' || c === '\n') {
        row.push(field);
        field = '';
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
          rows.push(row);
        }
        row = [];
        if (c === '\r' && next === '\n') {
          i++;
        }
      } else {
        field += c;
      }
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Loads glossary.csv and parses it into a map of keys to translation options
 */
function loadGlossary(bookSlug) {
  const bookRoot = getBookRoot(bookSlug);
  const glossaryPath = path.join(bookRoot, 'glossary.csv');
  
  if (!fs.existsSync(glossaryPath)) {
    return {};
  }
  
  const content = fs.readFileSync(glossaryPath, 'utf8');
  const rows = parseCSV(content);
  if (rows.length === 0) return {};
  
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const keyIdx = headers.indexOf('key');
  const transIdx = headers.indexOf('translation');
  const optIdx = headers.indexOf('options');
  
  if (keyIdx === -1 || transIdx === -1) {
    return {};
  }
  
  const glossary = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const key = row[keyIdx] ? row[keyIdx].trim().toLowerCase() : '';
    const translation = row[transIdx] ? row[transIdx].trim() : '';
    const optionsRaw = optIdx !== -1 && row[optIdx] ? row[optIdx].trim() : '';
    
    const options = optionsRaw.split('/').map(o => o.trim().toLowerCase()).filter(Boolean);
    if (!options.includes(translation.toLowerCase())) {
      options.unshift(translation.toLowerCase());
    }
    
    if (key) {
      glossary[key] = {
        keyRaw: row[keyIdx].trim(),
        translation,
        options
      };
    }
  }
  return glossary;
}

/**
 * Removes HTML tags from a string
 */
function stripHtml(htmlStr) {
  if (!htmlStr) return "";
  return htmlStr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Locates the nearest preceding tag matching the structure for Vietnamese fallback text
 */
function findVnParagraphText(html, engPos) {
  const before = html.substring(Math.max(0, engPos - 5000), engPos);
  const idRegex = /id="([^"]*)"/g;
  let idMatches = [];
  let match;
  while ((match = idRegex.exec(before)) !== null) {
    idMatches.push(match[1]);
  }
  if (idMatches.length === 0) return "";
  const paraId = idMatches[idMatches.length - 1];
  
  const escapedId = paraId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const vnPat = new RegExp(`id="${escapedId}-vn"[^>]*>([\\s\\S]*?)<\/(?:p|td|th|li|h[1-6])>`, 'i');
  const m = html.match(vnPat);
  return m ? stripHtml(m[1]) : "";
}

/**
 * Extracts term pairs paired by term_id from HTML
 */
function extractTermPairs(html) {
  const termTagPattern = /<span\s+([^>]*?data-type="term"[^>]*)>([\s\S]*?)<\/span>/gi;
  const termOccurrences = {};
  let match;
  
  while ((match = termTagPattern.exec(html)) !== null) {
    const attrsStr = match[1];
    const innerText = stripHtml(match[2]).trim();
    const pos = match.index;
    
    const idMatch = attrsStr.match(/\bid="([^"]*)"/i);
    const termId = idMatch ? idMatch[1] : "";
    
    const classMatch = attrsStr.match(/\bclass="([^"]*)"/i);
    const classStr = classMatch ? classMatch[1] : "";
    const classes = classStr.split(/\s+/).filter(Boolean);
    
    const noEmphasis = classes.includes('no-emphasis');
    
    // Determine if in eng hidden or vn visible block
    const before = html.substring(Math.max(0, pos - 5000), pos);
    const engRegex = /class="[^"]*\beng\b[^"]*\bhidden\b[^"]*"/gi;
    const vnRegex = /class="[^"]*\bvn\b[^"]*\bvisible\b[^"]*"/gi;
    
    let lastEng = -1;
    let m;
    while ((m = engRegex.exec(before)) !== null) {
      lastEng = m.index + m[0].length;
    }
    
    let lastVn = -1;
    while ((m = vnRegex.exec(before)) !== null) {
      lastVn = m.index + m[0].length;
    }
    
    const isEng = lastEng > lastVn;
    const isVn = lastVn > lastEng;
    
    const occ = {
      pos,
      text: innerText,
      isEng,
      isVn,
      termId,
      noEmphasis
    };
    
    if (termId) {
      if (!termOccurrences[termId]) {
        termOccurrences[termId] = [];
      }
      termOccurrences[termId].push(occ);
    }
  }
  
  const pairs = [];
  for (const termId in termOccurrences) {
    const occs = termOccurrences[termId];
    const engOccs = occs.filter(o => o.isEng);
    const vnOccs = occs.filter(o => o.isVn);
    
    if (engOccs.length > 0 && vnOccs.length > 0) {
      pairs.push({
        term_id: termId,
        eng_term: engOccs[0].text.toLowerCase(),
        eng_term_raw: engOccs[0].text,
        vn_term: vnOccs[0].text,
        no_emphasis: engOccs[0].noEmphasis
      });
    } else if (engOccs.length > 0) {
      const eng = engOccs[0];
      const vnText = findVnParagraphText(html, eng.pos);
      pairs.push({
        term_id: termId,
        eng_term: eng.text.toLowerCase(),
        eng_term_raw: eng.text,
        vn_term: vnText,
        no_emphasis: eng.noEmphasis
      });
    }
  }
  return pairs;
}

/**
 * Extracts elements from HTML
 */
function parseElements(html) {
  const tagRegex = /<([a-zA-Z0-9:-]+)([^>]*?)>/g;
  const elements = [];
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const tagName = match[1].toLowerCase();
    const attrsStr = match[2];
    
    if (tagName.startsWith('/')) continue;
    
    const idMatch = attrsStr.match(/\bid="([^"]*)"/i);
    const id = idMatch ? idMatch[1] : null;
    
    const classMatch = attrsStr.match(/\bclass="([^"]*)"/i);
    const classStr = classMatch ? classMatch[1] : "";
    const classes = classStr.split(/\s+/).filter(Boolean);
    
    const isEng = classes.includes('eng') && classes.includes('hidden');
    const isVn = classes.includes('vn') && classes.includes('visible');
    
    elements.push({
      tagName,
      id,
      classStr,
      classes,
      isEng,
      isVn,
      startIndex: match.index,
      tagLength: match[0].length
    });
  }
  return elements;
}

/**
 * Extracts inner content of an element tracking depth
 */
function getElementInnerContent(html, elem) {
  const endTag = `</${elem.tagName}>`;
  const afterTagIndex = elem.startIndex + elem.tagLength;
  
  if (elem.tagLength > 2 && html[elem.startIndex + elem.tagLength - 2] === '/') {
    return "";
  }
  
  const closeRegex = new RegExp(`<\/?${elem.tagName}\\b`, 'gi');
  closeRegex.lastIndex = afterTagIndex;
  
  let depth = 1;
  let match;
  while ((match = closeRegex.exec(html)) !== null) {
    if (match[0].startsWith('</') || match[0].startsWith('</')) {
      depth--;
      if (depth === 0) {
        return html.substring(afterTagIndex, match.index);
      }
    } else {
      if (!match[0].endsWith('/>')) {
        depth++;
      }
    }
  }
  
  const simpleClose = html.indexOf(endTag, afterTagIndex);
  if (simpleClose !== -1) {
    return html.substring(afterTagIndex, simpleClose);
  }
  return "";
}

/**
 * Helper to get the outer tag range from starting element to its matching end tag
 */
function getOuterElementRange(html, elem) {
  const start = elem.startIndex;
  const tagLength = elem.tagLength;
  const afterTagIndex = start + tagLength;
  
  // If self-closing tag
  if (tagLength > 2 && html[start + tagLength - 2] === '/') {
    return { start, end: afterTagIndex };
  }
  
  // Void elements that might not have closing tags
  const voidElements = ['img', 'br', 'hr', 'input', 'link', 'meta'];
  if (voidElements.includes(elem.tagName)) {
    return { start, end: afterTagIndex };
  }
  
  const closeRegex = new RegExp(`<\/?${elem.tagName}\\b`, 'gi');
  closeRegex.lastIndex = afterTagIndex;
  
  let depth = 1;
  let match;
  while ((match = closeRegex.exec(html)) !== null) {
    if (match[0].startsWith('</')) {
      depth--;
      if (depth === 0) {
        return { start, end: match.index + match[0].length };
      }
    } else {
      // Avoid self-closing tag within nested tags incrementing depth
      if (!match[0].endsWith('/>')) {
        depth++;
      }
    }
  }
  
  // Fallback: if matching closing tag not found, find first simple close tag
  const endTag = `</${elem.tagName}>`;
  const simpleClose = html.indexOf(endTag, afterTagIndex);
  if (simpleClose !== -1) {
    return { start, end: simpleClose + endTag.length };
  }
  
  // Fallback: just return start tag range
  return { start, end: afterTagIndex };
}

/**
 * Strips out all Vietnamese visible elements and their nested content
 */
function stripVnVisible(html) {
  if (!html) return "";
  const elements = parseElements(html);
  const vnElements = elements.filter(el => el.isVn);
  
  if (vnElements.length === 0) {
    return html;
  }
  
  // Calculate ranges for all vn elements
  const ranges = vnElements.map(el => getOuterElementRange(html, el));
  
  // Filter out ranges that are completely inside another range
  const outerRanges = [];
  for (const r of ranges) {
    const isInside = ranges.some(other => other !== r && other.start <= r.start && other.end >= r.end);
    if (!isInside) {
      outerRanges.push(r);
    }
  }
  
  // Sort ranges in descending order of start index to slice from end to beginning
  outerRanges.sort((a, b) => b.start - a.start);
  
  let result = html;
  for (const r of outerRanges) {
    result = result.substring(0, r.start) + result.substring(r.end);
  }
  
  return result;
}

module.exports = {
  parseCSV,
  loadGlossary,
  stripHtml,
  findVnParagraphText,
  extractTermPairs,
  parseElements,
  getElementInnerContent,
  stripVnVisible
};

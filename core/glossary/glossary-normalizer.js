'use strict';

/**
 * Maps legacy headers and normalizes CSV data fields.
 */
function normalizeHeaders(headers) {
  return headers.map(h => {
    const clean = h.trim().toLowerCase();
    if (clean === 'key') return 'term';
    if (clean === 'chapter') return 'chapterRefs';
    return clean;
  });
}

function normalizeTerm(term) {
  if (!term) return '';
  return term.trim().replace(/\s+/g, ' ');
}

function parseCSVRow(row, headers) {
  const normalizedHeaders = normalizeHeaders(headers);
  const item = {};
  
  // Set defaults for schema fields
  item.term = '';
  item.translation = '';
  item.category = 'other';
  item.status = 'candidate';
  item.confidence = 'medium';
  item.source = 'auto';
  item.chapterRefs = '';
  item.reviewer = '';
  item.reviewedAt = '';
  item.locked = false;
  item.notes = '';
  item.options = '';
  item.desc_en = '';
  item.desc_vi = '';

  for (let i = 0; i < headers.length; i++) {
    const header = normalizedHeaders[i];
    let val = row[i] ? row[i].trim() : '';
    
    if (header === 'locked') {
      item.locked = val.toLowerCase() === 'true' || val === '1';
    } else if (header === 'term') {
      item.term = normalizeTerm(val);
    } else {
      item.header = val;
      item[header] = val;
    }
  }

  // Fallbacks/Mappings
  if (!item.term && item.key) {
    item.term = normalizeTerm(item.key);
  }
  if (!item.chapterRefs && item.chapter) {
    item.chapterRefs = item.chapter;
  }
  if (!item.status) {
    item.status = 'candidate';
  }

  return item;
}

module.exports = {
  normalizeHeaders,
  normalizeTerm,
  parseCSVRow
};

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot, getChapterRoot } = require('../paths/path-resolver');

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
  
  if (keyIdx === -1 || transIdx === -1) {
    return {};
  }
  
  const glossary = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const key = row[keyIdx] ? row[keyIdx].trim().toLowerCase() : '';
    const keyRaw = row[keyIdx] ? row[keyIdx].trim() : '';
    const translation = row[transIdx] ? row[transIdx].trim() : '';
    
    if (key) {
      glossary[key] = {
        keyRaw,
        translation
      };
    }
  }
  return glossary;
}

function loadTerminologyTerms(bookSlug, chapterId) {
  try {
    const chRoot = getChapterRoot(bookSlug, chapterId);
    const analyzedDir = path.join(chRoot, '03-analyzed');
    if (!fs.existsSync(analyzedDir)) return [];

    const files = fs.readdirSync(analyzedDir);
    const terminologyFiles = files.filter(f => f.startsWith('terminology-analysis-') && f.endsWith('.json'));
    if (terminologyFiles.length === 0) return [];

    terminologyFiles.sort();
    const latestFile = terminologyFiles[terminologyFiles.length - 1];
    const raw = fs.readFileSync(path.join(analyzedDir, latestFile), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.knownTerms || [];
  } catch (err) {
    return [];
  }
}

function stripHtml(htmlStr) {
  if (!htmlStr) return "";
  return htmlStr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Builds glossary context for a block's sourceText.
 */
function buildGlossaryContext(bookSlug, chapterId, sourceText) {
  const glossary = loadGlossary(bookSlug);
  const terminologyTerms = chapterId ? loadTerminologyTerms(bookSlug, chapterId) : [];
  
  const matchedTerms = [];
  const warnings = [];
  
  const cleanSourceText = stripHtml(sourceText).toLowerCase();
  const normalizedSource = cleanSourceText.replace(/\s+/g, ' ');

  // Set to avoid duplicates
  const matchedKeys = new Set();

  // Match from glossary
  for (const [key, termObj] of Object.entries(glossary)) {
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKey}\\b`, 'i');
    
    if (regex.test(normalizedSource)) {
      matchedTerms.push({
        key: termObj.keyRaw,
        translation: termObj.translation,
        status: 'approved',
        notes: ''
      });
      matchedKeys.add(key);
    }
  }

  // Double check terminology analysis terms if they contain any other terms that we didn't catch, or to validate
  for (const termObj of terminologyTerms) {
    const termLower = termObj.term.toLowerCase();
    if (matchedKeys.has(termLower)) continue;

    const escapedTerm = termLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');

    if (regex.test(normalizedSource)) {
      matchedTerms.push({
        key: termObj.term,
        translation: termObj.glossaryTranslation || '',
        status: 'approved',
        notes: 'Matched via chapter terminology report'
      });
      matchedKeys.add(termLower);
    }
  }

  return {
    matchedTerms,
    warnings
  };
}

module.exports = {
  buildGlossaryContext,
  loadGlossary,
  parseCSV,
  stripHtml
};

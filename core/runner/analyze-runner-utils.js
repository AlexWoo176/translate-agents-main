'use strict';

const { loadGlossary, stripHtml } = require('./review-runner-utils');

/**
 * Trims and normalizes whitespace in text
 */
function cleanText(text) {
  if (!text) return "";
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Splits text into clean sentences.
 * Matches common sentence boundaries followed by whitespace.
 */
function extractSentences(text) {
  if (!text) return [];
  // Split on . ? ! followed by space
  const rawSentences = text.split(/(?<=[.!?])\s+/);
  return rawSentences.map(cleanText).filter(Boolean);
}

/**
 * Locates the first sentence containing a term as a whole phrase (case-insensitive).
 */
function findSentenceWithTerm(sentences, term) {
  if (!sentences || sentences.length === 0 || !term) return "";
  const lowerTerm = term.toLowerCase();
  
  // Create a regex to match the term as a word boundary
  const escaped = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  
  for (const sentence of sentences) {
    if (regex.test(sentence)) {
      return sentence;
    }
  }
  
  // Fallback: simple includes check if regex doesn't match boundaries (e.g. for special chars)
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(lowerTerm)) {
      return sentence;
    }
  }
  
  return "";
}

/**
 * Extracts multi-word capitalized phrases (2-4 words) from text
 */
function extractCapitalizedPhrases(text) {
  if (!text) return [];
  
  // Matches 2 to 4 consecutive words starting with a capital letter
  // (allowing for small words like 'of', 'the', 'and', 'to', 'in' in the middle, e.g., "U.S. Department of Labor" or "Process of Becoming")
  const phraseRegex = /\b[A-Z][a-zA-Z0-9-]*(?:\s+(?:of|the|and|to|in|for|on|with|a|an)\s+[A-Z][a-zA-Z0-9-]*|\s+[A-Z][a-zA-Z0-9-]*){1,3}\b/g;
  
  const matches = text.match(phraseRegex) || [];
  const uniquePhrases = new Set();
  
  // Stop words to filter out if they are matched in isolation
  const stopwords = new Set([
    'I', 'A', 'An', 'The', 'And', 'But', 'Or', 'As', 'If', 'By', 'For', 'In', 'Of', 'On', 'To', 'With'
  ]);
  
  for (const match of matches) {
    const trimmed = cleanText(match);
    // Skip if it is just a stopword or too short
    if (stopwords.has(trimmed) || trimmed.length < 3) continue;
    // Skip if it contains only digits/symbols
    if (/^[0-9\s\-_.:,;!?()]+$/.test(trimmed)) continue;
    
    uniquePhrases.add(trimmed);
  }
  
  return Array.from(uniquePhrases);
}

/**
 * Parses all <dt> tags to identify key terms formally defined in the HTML
 */
function extractFormalKeyTerms(html) {
  if (!html) return [];
  const dtRegex = /<dt\b[^>]*>([\s\S]*?)<\/dt>/gi;
  const terms = [];
  let match;
  while ((match = dtRegex.exec(html)) !== null) {
    const termText = stripHtml(match[1]).trim();
    if (termText) {
      terms.push(termText);
    }
  }
  return terms;
}

/**
 * Checks a list of heading tags (in document order) for level jumps greater than 1
 */
function checkHeadingHierarchy(headings) {
  const violations = [];
  let prevLevel = null;
  
  for (const h of headings) {
    const currentLevel = parseInt(h.replace('h', ''), 10);
    if (isNaN(currentLevel)) continue;
    
    if (prevLevel !== null) {
      if (currentLevel > prevLevel + 1) {
        violations.push({
          from: `h${prevLevel}`,
          to: `h${currentLevel}`,
          message: `Heading level jump from h${prevLevel} to h${currentLevel}`
        });
      }
    }
    prevLevel = currentLevel;
  }
  
  return violations;
}

module.exports = {
  cleanText,
  extractSentences,
  findSentenceWithTerm,
  extractCapitalizedPhrases,
  extractFormalKeyTerms,
  checkHeadingHierarchy
};

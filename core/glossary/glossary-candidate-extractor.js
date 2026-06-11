'use strict';

const fs = require('fs');
const path = require('path');
const { getChapterRoot, getBookRoot } = require('../paths/path-resolver');
const { listChapters } = require('../scanner/scan-book');
const { parseCSV } = require('../translation/glossary-context-builder');

function extractCandidatesFromChapter(bookSlug, chapterId) {
  const chapterRoot = getChapterRoot(bookSlug, chapterId);
  const candidates = [];
  
  // 1. Extract from 03-analyzed terminology analysis JSON
  const analyzedDir = path.join(chapterRoot, '03-analyzed');
  if (fs.existsSync(analyzedDir)) {
    const files = fs.readdirSync(analyzedDir);
    const terminologyFiles = files.filter(f => f.startsWith('terminology-analysis-') && f.endsWith('.json'));
    if (terminologyFiles.length > 0) {
      // Sort to get the latest file
      terminologyFiles.sort();
      const latestFile = terminologyFiles[terminologyFiles.length - 1];
      try {
        const raw = fs.readFileSync(path.join(analyzedDir, latestFile), 'utf8');
        const parsed = JSON.parse(raw);
        
        // Add knownTerms
        if (Array.isArray(parsed.knownTerms)) {
          parsed.knownTerms.forEach(t => {
            if (t.term) {
              candidates.push({
                term: t.term,
                translation: t.glossaryTranslation || '',
                source: 'terminology_analysis_known',
                chapterRefs: chapterId
              });
            }
          });
        }
        
        // Add candidateTerms
        if (Array.isArray(parsed.candidateTerms)) {
          parsed.candidateTerms.forEach(t => {
            if (t.term) {
              candidates.push({
                term: t.term,
                translation: t.glossaryTranslation || '',
                source: 'terminology_analysis_candidate',
                chapterRefs: chapterId
              });
            }
          });
        }
      } catch (err) {
        // Ignore JSON parse errors
      }
    }
  }

  // 2. Scan clean HTML in 02-clean for bold elements if terminology files aren't enough
  const cleanDir = path.join(chapterRoot, '02-clean');
  if (fs.existsSync(cleanDir)) {
    try {
      const files = fs.readdirSync(cleanDir).filter(f => f.endsWith('.html'));
      files.forEach(file => {
        const html = fs.readFileSync(path.join(cleanDir, file), 'utf8');
        
        // Simple regex to match <strong>...</strong> or <b>...</b>
        const boldRegex = /<(strong|b)>(.*?)<\/\1>/gi;
        let match;
        while ((match = boldRegex.exec(html)) !== null) {
          const rawTerm = match[2].replace(/<[^>]*>/g, '').trim();
          // Filter out words that are too short, too long, or contain specific elements
          if (rawTerm.length > 2 && rawTerm.length < 50 && !rawTerm.includes('<') && !/^\d+$/.test(rawTerm)) {
            candidates.push({
              term: rawTerm,
              translation: '',
              source: 'html_bold_tag',
              chapterRefs: chapterId
            });
          }
        }
      });
    } catch (err) {
      // Ignore directory scan errors
    }
  }

  return candidates;
}

module.exports = {
  extractCandidatesFromChapter
};

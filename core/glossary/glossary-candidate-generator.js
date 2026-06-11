'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { listChapters, scanBook } = require('../scanner/scan-book');
const { loadGlossary } = require('../translation/glossary-context-builder');
const { extractCandidatesFromChapter } = require('./glossary-candidate-extractor');

// RFC 4180 compliant CSV stringifier
function toCSVString(headers, rows) {
  const escapeField = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [headers.map(escapeField).join(',')];
  rows.forEach(row => {
    csvRows.push(row.map(escapeField).join(','));
  });
  return csvRows.join('\n');
}

function generateGlossaryCandidates(bookSlug, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const existingGlossary = loadGlossary(bookSlug);
  
  const scan = scanBook(bookSlug);
  const chapterIds = scan.chaptersFound;

  const rawCandidates = [];
  chapterIds.forEach(chapterId => {
    const chapterCandidates = extractCandidatesFromChapter(bookSlug, chapterId);
    rawCandidates.push(...chapterCandidates);
  });

  // Consolidate candidates
  const consolidated = new Map(); // term (lowercase) -> consolidated data
  
  rawCandidates.forEach(cand => {
    const termClean = cand.term.trim();
    const termLower = termClean.toLowerCase();
    
    // Skip if already in existing glossary
    if (existingGlossary[termLower]) {
      return;
    }

    if (consolidated.has(termLower)) {
      const existing = consolidated.get(termLower);
      existing.frequency = (existing.frequency || 1) + 1;
      const chaptersSet = new Set(existing.chapterRefs.split(', '));
      chaptersSet.add(cand.chapterRefs);
      existing.chapterRefs = Array.from(chaptersSet).join(', ');
      if (!existing.translation && cand.translation) {
        existing.translation = cand.translation;
      }
    } else {
      consolidated.set(termLower, {
        term: termClean,
        translation: cand.translation || '',
        category: 'other',
        status: 'candidate',
        confidence: 'medium',
        source: 'auto_extraction',
        chapterRefs: cand.chapterRefs,
        reviewer: '',
        reviewedAt: '',
        locked: false,
        notes: `Extracted via ${cand.source}`,
        frequency: 1
      });
    }
  });

  // Filter & sort candidates
  const candidatesList = Array.from(consolidated.values())
    .filter(c => c.term.length > 2 && c.term.length < 60)
    .sort((a, b) => b.frequency - a.frequency);

  const headers = [
    'term', 'translation', 'category', 'status', 'confidence',
    'source', 'chapterRefs', 'reviewer', 'reviewedAt', 'locked', 'notes'
  ];

  const rows = candidatesList.map(c => [
    c.term, c.translation, c.category, c.status, c.confidence,
    c.source, c.chapterRefs, c.reviewer, c.reviewedAt, c.locked ? 'true' : 'false', c.notes
  ]);

  const csvContent = toCSVString(headers, rows);
  
  const csvPath = path.join(bookRoot, 'glossary-candidates.csv');
  const jsonPath = path.join(bookRoot, 'glossary-candidates.json');
  const mdReportPath = path.join(bookRoot, 'reports', 'glossary-candidates-report.md');
  const jsonReportPath = path.join(bookRoot, 'reports', 'glossary-candidates-report.json');

  if (!options.dryRun) {
    // Ensure reports dir exists
    const reportsDir = path.join(bookRoot, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(csvPath, csvContent, 'utf8');
    fs.writeFileSync(jsonPath, JSON.stringify(candidatesList, null, 2), 'utf8');

    // Write reports
    const reportData = {
      generatedAt: new Date().toISOString(),
      totalCandidates: candidatesList.length,
      candidates: candidatesList.map(c => ({
        term: c.term,
        frequency: c.frequency,
        chapterRefs: c.chapterRefs,
        suggestedTranslation: c.translation
      }))
    };
    fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2), 'utf8');

    // MD report
    let md = `# Glossary Candidates Report\n\n`;
    md += `- **Generated At**: ${reportData.generatedAt}\n`;
    md += `- **Total Candidates Found**: ${reportData.totalCandidates}\n\n`;
    md += `| Term | Frequency | Chapters | Suggested Translation |\n`;
    md += `|---|---|---|---|\n`;
    candidatesList.slice(0, 100).forEach(c => {
      md += `| ${c.term} | ${c.frequency} | ${c.chapterRefs} | ${c.translation || '*None*'} |\n`;
    });
    if (candidatesList.length > 100) {
      md += `\n*Showing top 100 candidates out of ${candidatesList.length} total.*\n`;
    }
    fs.writeFileSync(mdReportPath, md, 'utf8');
  }

  return {
    status: 'success',
    totalCandidates: candidatesList.length,
    candidates: candidatesList,
    filesCreated: options.dryRun ? [] : [
      'glossary-candidates.csv',
      'glossary-candidates.json',
      'reports/glossary-candidates-report.md',
      'reports/glossary-candidates-report.json'
    ]
  };
}

module.exports = {
  generateGlossaryCandidates,
  toCSVString
};

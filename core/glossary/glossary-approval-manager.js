'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { parseCSV, loadGlossary } = require('../translation/glossary-context-builder');
const { parseCSVRow } = require('./glossary-normalizer');
const { validateGlossaryCSVContent, VALID_STATUSES } = require('./glossary-schema-validator');
const { backupGlossary, writeChangeLog } = require('./glossary-version-manager');
const { checkLockViolations } = require('./glossary-lock-policy');
const { computeGlossaryDiff, writeDiffReport } = require('./glossary-diff');
const { analyzeGlossaryImpact } = require('./glossary-impact-analyzer');
const { toCSVString } = require('./glossary-candidate-generator');

function exportReviewSheet(bookSlug) {
  const bookRoot = getBookRoot(bookSlug);
  const glossaryPath = path.join(bookRoot, 'glossary.csv');
  
  if (!fs.existsSync(glossaryPath)) {
    throw new Error(`glossary.csv not found at ${glossaryPath}`);
  }

  const reviewDir = path.join(bookRoot, 'glossary-review');
  if (!fs.existsSync(reviewDir)) {
    fs.mkdirSync(reviewDir, { recursive: true });
  }

  const csvContent = fs.readFileSync(glossaryPath, 'utf8');
  const validation = validateGlossaryCSVContent(csvContent);
  if (!validation.valid) {
    throw new Error(`Cannot export review sheet: glossary.csv has errors:\n${validation.errors.join('\n')}`);
  }

  const terms = validation.terms;
  const headers = [
    'term', 'translation', 'category', 'status', 'confidence',
    'source', 'chapterRefs', 'reviewer', 'reviewedAt', 'locked', 'notes'
  ];

  // We only export terms that need review: status candidate, needs_review, or changed
  const reviewTerms = terms.filter(t => ['candidate', 'needs_review', 'changed'].includes(t.status));
  const rows = reviewTerms.map(t => [
    t.term, t.translation, t.category, t.status, t.confidence,
    t.source, t.chapterRefs, t.reviewer, t.reviewedAt, t.locked ? 'true' : 'false', t.notes
  ]);

  const reviewCsv = toCSVString(headers, rows);
  fs.writeFileSync(path.join(reviewDir, 'glossary-review-sheet.csv'), reviewCsv, 'utf8');

  // Export human instructions
  const instructions = `# Glossary Human Review Instructions

Dear Expert Reviewer,

Please review the vocabulary sheet in \`glossary-review-sheet.csv\`.

## Review Workflow

1. Open \`glossary-review-sheet.csv\` in your preferred spreadsheet tool (Excel, Google Sheets, LibreOffice).
2. For each term:
   - Verify the English term in the \`term\` column.
   - Propose or correct the Vietnamese translation in the \`translation\` column.
   - Adjust the \`status\` to one of the valid statuses:
     - \`approved\`: Approved and ready for translation.
     - \`needs_review\`: Needs further expert discussion.
     - \`rejected\`: Do not use this term.
     - \`deprecated\`: Old translation, no longer in use.
   - Set \`locked\` to \`true\` if this term is highly critical and should not be modified by automated runs.
3. Save the resulting file as \`glossary-review-result.csv\` in this folder.
4. Run CLI to import:
   \`\`\`bash
   node cli/index.js glossary ${bookSlug} --approve
   \`\`\`
`;
  fs.writeFileSync(path.join(reviewDir, 'glossary-review-instructions.md'), instructions, 'utf8');

  // MD Sheet representation
  let md = `# Glossary Review Sheet\n\n`;
  md += `| Term | Translation | Category | Status | Notes |\n`;
  md += `|---|---|---|---|---|\n`;
  reviewTerms.forEach(t => {
    md += `| ${t.term} | ${t.translation || '*Needs translation*'} | ${t.category} | ${t.status} | ${t.notes || ''} |\n`;
  });
  fs.writeFileSync(path.join(reviewDir, 'glossary-review-sheet.md'), md, 'utf8');

  return {
    status: 'success',
    totalExported: reviewTerms.length,
    filesCreated: [
      'glossary-review/glossary-review-sheet.csv',
      'glossary-review/glossary-review-sheet.md',
      'glossary-review/glossary-review-instructions.md'
    ]
  };
}

function approveGlossary(bookSlug, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const glossaryPath = path.join(bookRoot, 'glossary.csv');
  
  if (!fs.existsSync(glossaryPath)) {
    throw new Error(`glossary.csv not found at ${glossaryPath}`);
  }

  // Load existing glossary
  const csvText = fs.readFileSync(glossaryPath, 'utf8');
  const validation = validateGlossaryCSVContent(csvText);
  if (!validation.valid) {
    throw new Error(`Glossary is invalid: ${validation.errors.join('\n')}`);
  }

  const existingTerms = validation.terms;
  const existingMap = new Map();
  existingTerms.forEach(t => existingMap.set(t.term.toLowerCase(), t));

  // Check if a human review result file is present to merge
  const resultCsvPath = path.join(bookRoot, 'glossary-review', 'glossary-review-result.csv');
  let proposedChanges = [];

  if (fs.existsSync(resultCsvPath)) {
    const resultText = fs.readFileSync(resultCsvPath, 'utf8');
    const resultRows = parseCSV(resultText);
    if (resultRows.length > 0) {
      const resultHeaders = resultRows[0];
      for (let i = 1; i < resultRows.length; i++) {
        if (resultRows[i].length > 0 && (resultRows[i].length > 1 || resultRows[i][0] !== '')) {
          proposedChanges.push(parseCSVRow(resultRows[i], resultHeaders));
        }
      }
    }
  }

  // If no review file, we auto-approve candidate terms that already have a translation
  if (proposedChanges.length === 0) {
    existingTerms.forEach(t => {
      if ((t.status === 'candidate' || t.status === 'needs_review' || t.status === 'changed') && t.translation) {
        proposedChanges.push({
          ...t,
          status: 'approved',
          reviewer: 'operator',
          reviewedAt: new Date().toISOString()
        });
      }
    });
  }

  if (proposedChanges.length === 0) {
    return {
      status: 'no_changes',
      message: 'No terms to approve or merge.'
    };
  }

  // Check lock policy violations
  const lockCheck = checkLockViolations(
    Object.fromEntries(Array.from(existingMap.entries())),
    proposedChanges
  );
  if (lockCheck.hasViolations) {
    throw new Error(`Lock policy violations detected:\n${lockCheck.violations.map(v => `- ${v.term}: ${v.reason}`).join('\n')}`);
  }

  // Merge proposed changes into existing terms
  const updatedTermsMap = new Map(existingMap);
  const termsAddedIds = [];
  const termsUpdatedDetails = [];
  const termsDeprecatedIds = [];
  const termsLockedIds = [];

  proposedChanges.forEach(p => {
    const termLower = p.term.toLowerCase();
    const existing = existingMap.get(termLower);

    if (existing) {
      const translationChanged = p.translation !== existing.translation;
      const statusChanged = p.status !== existing.status;
      const lockedChanged = Boolean(p.locked) !== Boolean(existing.locked);

      if (translationChanged || statusChanged || lockedChanged) {
        termsUpdatedDetails.push({
          term: p.term,
          oldTranslation: existing.translation,
          newTranslation: p.translation
        });
      }

      if (p.status === 'deprecated' && existing.status !== 'deprecated') {
        termsDeprecatedIds.push(p.term);
      }
      if ((p.status === 'locked' || p.locked) && !(existing.status === 'locked' || existing.locked)) {
        termsLockedIds.push(p.term);
      }

      // Merge
      updatedTermsMap.set(termLower, {
        ...existing,
        ...p,
        locked: p.locked || p.status === 'locked'
      });
    } else {
      termsAddedIds.push(p.term);
      updatedTermsMap.set(termLower, {
        ...p,
        locked: p.locked || p.status === 'locked'
      });
    }
  });

  const updatedTermsList = Array.from(updatedTermsMap.values());

  const headers = [
    'term', 'translation', 'category', 'status', 'confidence',
    'source', 'chapterRefs', 'reviewer', 'reviewedAt', 'locked', 'notes', 'options', 'desc_en', 'desc_vi'
  ];

  const rows = updatedTermsList.map(t => [
    t.term, t.translation, t.category, t.status, t.confidence,
    t.source, t.chapterRefs, t.reviewer, t.reviewedAt, t.locked ? 'true' : 'false', t.notes, t.options || '', t.desc_en || '', t.desc_vi || ''
  ]);

  const newCsvContent = toCSVString(headers, rows);

  if (options.dryRun) {
    const diff = computeGlossaryDiff(existingTerms, updatedTermsList);
    const impact = analyzeGlossaryImpact(bookSlug, diff, { dryRun: true });
    
    return {
      status: 'dry_run_passed',
      termsAddedCount: termsAddedIds.length,
      termsUpdatedCount: termsUpdatedDetails.length,
      diff,
      impact,
      message: 'Dry-run successful. Glossary would be updated.'
    };
  }

  // Backup first
  const backup = backupGlossary(bookSlug, 'Approve glossary execution');
  if (!backup) {
    throw new Error('Failed to create backup before applying changes.');
  }

  // Write new glossary
  fs.writeFileSync(glossaryPath, newCsvContent, 'utf8');

  // Compute diff & impact
  const diff = computeGlossaryDiff(existingTerms, updatedTermsList);
  writeDiffReport(bookSlug, diff);

  const impact = analyzeGlossaryImpact(bookSlug, diff);

  // Write change log
  const changeId = `glossary-change-${backup.timestamp}`;
  writeChangeLog(bookSlug, {
    changeId,
    changedAt: new Date().toISOString(),
    changedBy: 'human_review_approver',
    reason: proposedChanges.length > 0 && fs.existsSync(resultCsvPath) ? 'Expert human review import' : 'Operator auto-approval',
    termsAdded: termsAddedIds,
    termsUpdated: termsUpdatedDetails,
    termsDeprecated: termsDeprecatedIds,
    termsLocked: termsLockedIds,
    backup: backup.backupCsv
  });

  // Remove the resultCsv file if we merged it to prevent repeating it
  if (fs.existsSync(resultCsvPath)) {
    try {
      fs.unlinkSync(resultCsvPath);
    } catch (e) {
      // Ignore
    }
  }

  return {
    status: 'success',
    changeId,
    termsAddedCount: termsAddedIds.length,
    termsUpdatedCount: termsUpdatedDetails.length,
    diff,
    impact,
    message: 'Glossary approved and updated successfully.'
  };
}

module.exports = {
  exportReviewSheet,
  approveGlossary
};

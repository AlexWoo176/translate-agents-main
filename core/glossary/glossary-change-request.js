'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { parseCSV } = require('../translation/glossary-context-builder');
const { parseCSVRow } = require('./glossary-normalizer');
const { validateGlossaryCSVContent } = require('./glossary-schema-validator');
const { backupGlossary, writeChangeLog } = require('./glossary-version-manager');
const { checkLockViolations } = require('./glossary-lock-policy');
const { computeGlossaryDiff, writeDiffReport } = require('./glossary-diff');
const { analyzeGlossaryImpact } = require('./glossary-impact-analyzer');
const { toCSVString } = require('./glossary-candidate-generator');

function processGlossaryChangeRequest(bookSlug, changeRequestFilePath, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const glossaryPath = path.join(bookRoot, 'glossary.csv');

  if (!fs.existsSync(glossaryPath)) {
    throw new Error(`glossary.csv not found at ${glossaryPath}`);
  }

  if (!fs.existsSync(changeRequestFilePath)) {
    throw new Error(`Change request file not found at ${changeRequestFilePath}`);
  }

  // Load existing glossary
  const existingCsv = fs.readFileSync(glossaryPath, 'utf8');
  const existingValidation = validateGlossaryCSVContent(existingCsv);
  if (!existingValidation.valid) {
    throw new Error(`Existing glossary is invalid:\n${existingValidation.errors.join('\n')}`);
  }

  const existingTerms = existingValidation.terms;
  const existingMap = new Map();
  existingTerms.forEach(t => existingMap.set(t.term.toLowerCase(), t));

  // Load proposed changes
  const changeRequestContent = fs.readFileSync(changeRequestFilePath, 'utf8');
  const changeRequestRows = parseCSV(changeRequestContent);
  if (changeRequestRows.length === 0) {
    throw new Error('Change request file is empty.');
  }

  const crHeaders = changeRequestRows[0];
  const proposedChanges = [];
  for (let i = 1; i < changeRequestRows.length; i++) {
    const row = changeRequestRows[i];
    if (row.length > 0 && (row.length > 1 || row[0] !== '')) {
      proposedChanges.push(parseCSVRow(row, crHeaders));
    }
  }

  // Safety checks & Lock checks
  const lockCheck = checkLockViolations(
    Object.fromEntries(Array.from(existingMap.entries())),
    proposedChanges
  );
  if (lockCheck.hasViolations) {
    throw new Error(`Change request rejected due to locked term violations:\n${lockCheck.violations.map(v => `- ${v.term}: ${v.reason}`).join('\n')}`);
  }

  // Merge changes
  const updatedTermsMap = new Map(existingMap);
  const termsAddedIds = [];
  const termsUpdatedDetails = [];
  const termsDeprecatedIds = [];
  const termsLockedIds = [];

  proposedChanges.forEach(p => {
    const termLower = p.term.toLowerCase();
    const existing = existingMap.get(termLower);

    if (existing) {
      const translationChanged = p.translation !== undefined && p.translation !== existing.translation;
      const statusChanged = p.status !== undefined && p.status !== existing.status;
      const lockedChanged = p.locked !== undefined && Boolean(p.locked) !== Boolean(existing.locked);

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

      // Merge values
      const merged = { ...existing };
      if (p.translation !== undefined && p.translation !== '') merged.translation = p.translation;
      if (p.category !== undefined && p.category !== '') merged.category = p.category;
      if (p.status !== undefined && p.status !== '') merged.status = p.status;
      if (p.confidence !== undefined && p.confidence !== '') merged.confidence = p.confidence;
      if (p.notes !== undefined && p.notes !== '') merged.notes = p.notes;
      if (p.locked !== undefined) merged.locked = p.locked;

      updatedTermsMap.set(termLower, merged);
    } else {
      termsAddedIds.push(p.term);
      updatedTermsMap.set(termLower, {
        ...p,
        status: p.status || 'candidate',
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
      message: 'Change request dry-run passed. No changes were saved.'
    };
  }

  // Backup first
  const backup = backupGlossary(bookSlug, 'Change request application');
  if (!backup) {
    throw new Error('Failed to backup glossary.csv.');
  }

  // Write new content
  fs.writeFileSync(glossaryPath, newCsvContent, 'utf8');

  // Compute diff & impact
  const diff = computeGlossaryDiff(existingTerms, updatedTermsList);
  writeDiffReport(bookSlug, diff);
  
  const impact = analyzeGlossaryImpact(bookSlug, diff);

  // Write Change Log
  const changeId = `glossary-change-${backup.timestamp}`;
  writeChangeLog(bookSlug, {
    changeId,
    changedAt: new Date().toISOString(),
    changedBy: 'change_request_operator',
    reason: `Change request applied: ${path.basename(changeRequestFilePath)}`,
    termsAdded: termsAddedIds,
    termsUpdated: termsUpdatedDetails,
    termsDeprecated: termsDeprecatedIds,
    termsLocked: termsLockedIds,
    backup: backup.backupCsv
  });

  return {
    status: 'success',
    changeId,
    termsAddedCount: termsAddedIds.length,
    termsUpdatedCount: termsUpdatedDetails.length,
    diff,
    impact,
    message: 'Change request applied successfully.'
  };
}

module.exports = {
  processGlossaryChangeRequest
};

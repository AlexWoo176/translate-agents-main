/**
 * run-archive-phase.js
 *
 * Core execution logic for the archive phase: 05-translated -> 07-archive/vn-only.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');
const { runQualityGate } = require('../gates/run-quality-gate');
const { generateWorkflowState } = require('../state/generate-workflow-state');
const { createPhaseRunResult } = require('./phase-run-result');
const { transformToVnOnly, backupArchiveFolder } = require('./archive-runner-utils');

// Helper: Formats timestamp to YYYYMMDD-HHMMSS
function getTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const sec = pad(now.getSeconds());
  return `${yyyy}${mm}${dd}-${hh}${min}${sec}`;
}

async function runArchivePhase(bookSlug, options = {}) {
  const startedAt = new Date().toISOString();
  const timestamp = getTimestamp();
  const bookRoot = getBookRoot(bookSlug);
  
  const dryRun = !!options.dryRun;
  const force = !!options.force;
  const checkOnly = !!options.checkOnly;
  
  const filesCreated = [];
  const filesUpdated = [];
  const filesSkipped = [];
  const warnings = [];
  const errors = [];
  const inputs = [];
  const outputs = [];
  
  let chaptersToProcess = [];
  let scope = 'chapter';
  
  if (options.all) {
    scope = 'book';
    const scan = scanBook(bookSlug);
    chaptersToProcess = [...scan.chaptersFound];
    if (scan.hasBookLevel) {
      chaptersToProcess.push('_book-level');
    }
  } else if (options.chapterId) {
    chaptersToProcess = [options.chapterId];
  } else {
    throw new Error('Either options.chapterId or options.all must be provided.');
  }

  const backedUpChapters = new Set();

  for (const chId of chaptersToProcess) {
    const isBookLevel = chId === '_book-level';
    const relativeFolder = isBookLevel ? '_book-level' : path.join('chapters', chId);
    
    const transDir = path.join(bookRoot, relativeFolder, '05-translated');
    const archiveDir = path.join(bookRoot, relativeFolder, '07-archive');
    const vnOnlyDir = path.join(archiveDir, 'vn-only');
    
    const cssHref = isBookLevel ? '../../../css/style.css' : '../../../../css/style.css';
    
    if (!fs.existsSync(transDir)) {
      filesSkipped.push({
        chapterId: chId,
        reason: 'missing_translated_html'
      });
      warnings.push(`Scope ${chId} skipped: 05-translated directory does not exist.`);
      continue;
    }
    
    const transFiles = fs.readdirSync(transDir).filter(f => f.endsWith('.html'));
    if (transFiles.length === 0) {
      filesSkipped.push({
        chapterId: chId,
        reason: 'missing_translated_html'
      });
      warnings.push(`Scope ${chId} skipped: 05-translated directory contains no HTML files.`);
      continue;
    }
    
    inputs.push(path.relative(bookRoot, transDir).replace(/\\/g, '/'));
    outputs.push(path.relative(bookRoot, vnOnlyDir).replace(/\\/g, '/'));

    if (!dryRun && !checkOnly) {
      fs.mkdirSync(vnOnlyDir, { recursive: true });
      fs.mkdirSync(path.join(archiveDir, 'assets'), { recursive: true });
      fs.mkdirSync(path.join(archiveDir, 'md'), { recursive: true });
      fs.mkdirSync(path.join(archiveDir, 'pdf'), { recursive: true });
    }

    for (const file of transFiles) {
      const transFilePath = path.join(transDir, file);
      const vnOnlyFilePath = path.join(vnOnlyDir, file);
      
      const existsBefore = fs.existsSync(vnOnlyFilePath);
      
      if (existsBefore) {
        if (!force) {
          filesSkipped.push({
            chapterId: chId,
            file,
            reason: 'archive_file_exists_no_force'
          });
          continue;
        }
        
        // Backup before overwrite under force
        if (!backedUpChapters.has(chId) && !dryRun && !checkOnly) {
          try {
            backupArchiveFolder(bookSlug, chId, timestamp);
            backedUpChapters.add(chId);
          } catch (err) {
            errors.push(`Backup failed for ${chId}: ${err.message}. Overwrite aborted.`);
            filesSkipped.push({
              chapterId: chId,
              file,
              reason: 'backup_failure_aborted'
            });
            continue;
          }
        }
        
        filesUpdated.push({ chapterId: chId, file });
      } else {
        filesCreated.push({ chapterId: chId, file });
      }
      
      // Transform and write
      if (!dryRun && !checkOnly) {
        try {
          const transHtml = fs.readFileSync(transFilePath, 'utf8');
          const vnOnlyHtml = transformToVnOnly(transHtml, cssHref);
          fs.writeFileSync(vnOnlyFilePath, vnOnlyHtml, 'utf8');
        } catch (err) {
          errors.push(`Transformation failed for ${chId}/${file}: ${err.message}`);
          if (existsBefore) {
            filesUpdated.pop();
          } else {
            filesCreated.pop();
          }
          filesSkipped.push({
            chapterId: chId,
            file,
            reason: `transformation_error: ${err.message}`
          });
        }
      }
    }
  }

  let qualityGateResult = { id: 'archiveCompleteness', status: 'unknown' };
  
  if (!dryRun && !checkOnly) {
    try {
      // Programmatically run the archive completeness quality gate
      const qgRes = await runQualityGate(bookSlug, 'archiveCompleteness', { allowWrite: true });
      qualityGateResult.status = qgRes.status;
      
      // Regenerate workflow state
      generateWorkflowState(bookSlug);
    } catch (err) {
      warnings.push(`Quality gate or state regeneration failed: ${err.message}`);
    }
  }

  const finishedAt = new Date().toISOString();
  
  // Overall status
  let status = 'passed';
  if (errors.length > 0) {
    status = 'failed';
  } else if (warnings.length > 0 || filesSkipped.some(f => f.reason === 'archive_file_exists_no_force')) {
    status = 'passed_with_warnings';
  }

  const runResult = createPhaseRunResult({
    phase: 'archive',
    bookSlug,
    scope,
    chapterId: scope === 'chapter' ? chaptersToProcess[0] : 'all',
    status,
    startedAt,
    finishedAt,
    dryRun,
    force,
    inputs,
    outputs,
    filesCreated,
    filesUpdated,
    filesSkipped,
    warnings,
    errors,
    qualityGate: qualityGateResult
  });

  if (!dryRun) {
    writePhaseReports(bookSlug, runResult, timestamp);
  }

  return runResult;
}

function writePhaseReports(bookSlug, result, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports', 'phase-runs');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filePrefix = result.scope === 'chapter' ? `archive-${result.chapterId}` : 'archive-all';
  const jsonPath = path.join(reportsDir, `${filePrefix}-${timestamp}.json`);
  const mdPath = path.join(reportsDir, `${filePrefix}-${timestamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  let md = `# Phase Run Report: archive\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|---|---||\n`;
  md += `| **Book** | ${result.bookSlug} |\n`;
  md += `| **Scope** | ${result.scope} |\n`;
  md += `| **Target Scope(s)** | ${result.chapterId} |\n`;
  md += `| **Status** | **${result.status.toUpperCase()}** |\n`;
  md += `| **Dry Run** | ${result.dryRun ? '✅ Yes' : '❌ No'} |\n`;
  md += `| **Force Overwrite** | ${result.force ? '✅ Yes' : '❌ No'} |\n`;
  md += `| **Started At** | ${result.startedAt} |\n`;
  md += `| **Finished At** | ${result.finishedAt} |\n`;
  md += `\n---\n\n`;

  md += `## Execution Statistics\n\n`;
  md += `- **Files Created**: ${result.filesCreated.length}\n`;
  md += `- **Files Updated**: ${result.filesUpdated.length}\n`;
  md += `- **Files Skipped**: ${result.filesSkipped.length}\n`;
  md += `- **Warnings**: ${result.warnings.length}\n`;
  md += `- **Errors**: ${result.errors.length}\n\n`;

  if (result.filesCreated.length > 0) {
    md += `### Files Created\n\n`;
    result.filesCreated.forEach(f => {
      md += `- \`chapters/${f.chapterId}/07-archive/vn-only/${f.file}\`\n`;
    });
    md += `\n`;
  }

  if (result.filesUpdated.length > 0) {
    md += `### Files Overwritten (Updated)\n\n`;
    result.filesUpdated.forEach(f => {
      md += `- \`chapters/${f.chapterId}/07-archive/vn-only/${f.file}\`\n`;
    });
    md += `\n`;
  }

  if (result.filesSkipped.length > 0) {
    md += `### Files Skipped\n\n`;
    result.filesSkipped.forEach(f => {
      md += `- \`chapters/${f.chapterId}/07-archive/vn-only/${f.file || ''}\` (Reason: ${f.reason})\n`;
    });
    md += `\n`;
  }

  if (result.warnings.length > 0) {
    md += `### Warnings\n\n`;
    result.warnings.forEach(w => {
      md += `- ⚠️ ${w}\n`;
    });
    md += `\n`;
  }

  if (result.errors.length > 0) {
    md += `### Errors\n\n`;
    result.errors.forEach(e => {
      md += `- ❌ ${e}\n`;
    });
    md += `\n`;
  }

  md += `## Quality Gate Execution\n\n`;
  md += `- **Gate ID**: \`${result.qualityGate?.id || 'archiveCompleteness'}\`\n`;
  md += `- **Status**: **${(result.qualityGate?.status || 'unknown').toUpperCase()}**\n`;

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  runArchivePhase
};

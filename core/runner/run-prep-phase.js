'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot, getChaptersDir } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');
const { runQualityGate } = require('../gates/run-quality-gate');
const { generateWorkflowState } = require('../state/generate-workflow-state');
const { createPhaseRunResult } = require('./phase-run-result');
const { backupPrepFolder, ensurePrepDebugCss, transformToPrep } = require('./phase-runner-utils');

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

async function runPrepPhase(bookSlug, options = {}) {
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
    chaptersToProcess = scan.chaptersFound;
  } else if (options.chapterId) {
    chaptersToProcess = [options.chapterId];
  } else {
    throw new Error('Either options.chapterId or options.all must be provided.');
  }

  const backedUpChapters = new Set();

  for (const chId of chaptersToProcess) {
    const cleanDir = path.join(bookRoot, 'chapters', chId, '02-clean');
    const prepDir = path.join(bookRoot, 'chapters', chId, '04-prep');
    
    if (!fs.existsSync(cleanDir)) {
      filesSkipped.push({
        chapterId: chId,
        reason: 'missing_clean_html'
      });
      warnings.push(`Chapter ${chId} skipped: 02-clean directory does not exist.`);
      continue;
    }
    
    const cleanFiles = fs.readdirSync(cleanDir).filter(f => f.endsWith('.html'));
    if (cleanFiles.length === 0) {
      filesSkipped.push({
        chapterId: chId,
        reason: 'missing_clean_html'
      });
      warnings.push(`Chapter ${chId} skipped: 02-clean directory contains no HTML files.`);
      continue;
    }
    
    inputs.push(path.relative(bookRoot, cleanDir).replace(/\\/g, '/'));
    outputs.push(path.relative(bookRoot, prepDir).replace(/\\/g, '/'));

    if (!dryRun && !checkOnly && !fs.existsSync(prepDir)) {
      fs.mkdirSync(prepDir, { recursive: true });
    }

    for (const file of cleanFiles) {
      const cleanFilePath = path.join(cleanDir, file);
      const prepFilePath = path.join(prepDir, file);
      const relativePrepPath = path.relative(bookRoot, prepFilePath).replace(/\\/g, '/');
      
      const existsBefore = fs.existsSync(prepFilePath);
      
      if (existsBefore) {
        if (!force) {
          filesSkipped.push({
            chapterId: chId,
            file,
            reason: 'prep_file_exists_no_force'
          });
          continue;
        }
        
        // Under force, backup before overwrite
        if (!backedUpChapters.has(chId) && !dryRun && !checkOnly) {
          try {
            backupPrepFolder(bookSlug, chId, timestamp);
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
      
      // Perform transformation and write
      if (!dryRun && !checkOnly) {
        try {
          const cleanHtml = fs.readFileSync(cleanFilePath, 'utf8');
          const prepHtml = transformToPrep(cleanHtml);
          fs.writeFileSync(prepFilePath, prepHtml, 'utf8');
        } catch (err) {
          errors.push(`Transformation failed for ${chId}/${file}: ${err.message}`);
          // Remove from created/updated list and add to skipped/errors
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

  // Create prep-debug.css if not present
  if (!dryRun && !checkOnly) {
    try {
      ensurePrepDebugCss(bookSlug);
    } catch (err) {
      warnings.push(`Failed to ensure prep-debug.css: ${err.message}`);
    }
  }

  let qualityGateResult = { id: 'prepCompleteness', status: 'unknown' };
  
  // Run quality gate and regenerate state
  if (!dryRun && !checkOnly) {
    try {
      const qgRes = await runQualityGate(bookSlug, 'prepCompleteness', { allowWrite: true });
      qualityGateResult.status = qgRes.status;
      
      generateWorkflowState(bookSlug);
    } catch (err) {
      warnings.push(`Quality gate or state regeneration failed: ${err.message}`);
    }
  }

  const finishedAt = new Date().toISOString();
  
  // Determine overall status
  let status = 'passed';
  if (errors.length > 0) {
    status = 'failed';
  } else if (warnings.length > 0 || filesSkipped.some(f => f.reason === 'prep_file_exists_no_force')) {
    status = 'passed_with_warnings';
  }

  const runResult = createPhaseRunResult({
    phase: 'prep',
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

  // Write reports
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

  const filePrefix = result.scope === 'chapter' ? `prep-${result.chapterId}` : 'prep-all';
  const jsonPath = path.join(reportsDir, `${filePrefix}-${timestamp}.json`);
  const mdPath = path.join(reportsDir, `${filePrefix}-${timestamp}.md`);

  // Write JSON
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  // Build Markdown
  let md = `# Phase Run Report: prep\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|---|---||\n`;
  md += `| **Book** | ${result.bookSlug} |\n`;
  md += `| **Scope** | ${result.scope} |\n`;
  md += `| **Target Chapter(s)** | ${result.chapterId} |\n`;
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
      md += `- \`chapters/${f.chapterId}/04-prep/${f.file}\`\n`;
    });
    md += `\n`;
  }

  if (result.filesUpdated.length > 0) {
    md += `### Files Overwritten (Updated)\n\n`;
    result.filesUpdated.forEach(f => {
      md += `- \`chapters/${f.chapterId}/04-prep/${f.file}\`\n`;
    });
    md += `\n`;
  }

  if (result.filesSkipped.length > 0) {
    md += `### Files Skipped\n\n`;
    result.filesSkipped.forEach(f => {
      md += `- \`chapters/${f.chapterId}/04-prep/${f.file || ''}\` (Reason: ${f.reason})\n`;
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
  md += `- **Gate ID**: \`${result.qualityGate?.id || 'prepCompleteness'}\`\n`;
  md += `- **Status**: **${(result.qualityGate?.status || 'unknown').toUpperCase()}**\n`;

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  runPrepPhase
};

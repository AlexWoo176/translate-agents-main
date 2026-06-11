'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');
const { runQualityGate } = require('../gates/run-quality-gate');
const { generateWorkflowState } = require('../state/generate-workflow-state');
const { createPhaseRunResult } = require('./phase-run-result');
const { backupCleanFolder } = require('./clean-runner-utils');
const { cleanHtml } = require('../clean/html-cleaner');

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

async function runCleanPhase(bookSlug, options = {}) {
  const startedAt = new Date().toISOString();
  const timestamp = getTimestamp();
  const bookRoot = getBookRoot(bookSlug);
  
  const dryRun = !!options.dryRun;
  const force = !!options.force;
  
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
    const rawDir = path.join(bookRoot, 'chapters', chId, '01-raw');
    const cleanDir = path.join(bookRoot, 'chapters', chId, '02-clean');
    
    // Check if raw directory exists
    if (!fs.existsSync(rawDir)) {
      filesSkipped.push({
        chapterId: chId,
        reason: 'missing_raw_html'
      });
      warnings.push(`Chapter ${chId} skipped: 01-raw directory does not exist.`);
      continue;
    }
    
    // Scan raw HTML files
    const rawFiles = fs.readdirSync(rawDir).filter(f => f.endsWith('.html'));
    if (rawFiles.length === 0) {
      filesSkipped.push({
        chapterId: chId,
        reason: 'missing_raw_html'
      });
      warnings.push(`Chapter ${chId} skipped: 01-raw directory contains no HTML files.`);
      continue;
    }
    
    inputs.push(path.relative(bookRoot, rawDir).replace(/\\/g, '/'));
    outputs.push(path.relative(bookRoot, cleanDir).replace(/\\/g, '/'));

    if (!dryRun && !fs.existsSync(cleanDir)) {
      fs.mkdirSync(cleanDir, { recursive: true });
    }

    // Process files
    let scriptsRemovedCh = 0;
    let leaksRemovedCh = 0;
    let handlersRemovedCh = 0;
    let emptyElementsRemovedCh = 0;
    const chWarnings = [];
    const chErrors = [];
    const chFilesCreated = [];
    const chFilesUpdated = [];

    for (const file of rawFiles) {
      const rawFilePath = path.join(rawDir, file);
      const cleanFilePath = path.join(cleanDir, file);
      
      const existsBefore = fs.existsSync(cleanFilePath);
      
      if (existsBefore) {
        if (!force) {
          filesSkipped.push({
            chapterId: chId,
            file,
            reason: 'clean_file_exists_no_force'
          });
          continue;
        }
        
        // Under force, backup before overwrite
        if (!backedUpChapters.has(chId) && !dryRun) {
          try {
            backupCleanFolder(bookSlug, chId, timestamp);
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
        chFilesUpdated.push(file);
      } else {
        filesCreated.push({ chapterId: chId, file });
        chFilesCreated.push(file);
      }
      
      // Perform transformation and write
      if (!dryRun) {
        try {
          const rawHtml = fs.readFileSync(rawFilePath, 'utf8');
          const cleanResult = cleanHtml(rawHtml, bookRoot, chId, file);
          
          fs.writeFileSync(cleanFilePath, cleanResult.cleanHtml, 'utf8');
          
          scriptsRemovedCh += cleanResult.stats.scriptsRemoved;
          leaksRemovedCh += cleanResult.stats.localPathsRemoved;
          handlersRemovedCh += cleanResult.stats.handlersRemoved;
          emptyElementsRemovedCh += cleanResult.stats.emptyElementsRemoved;
          
          if (cleanResult.warnings.length > 0) {
            chWarnings.push(...cleanResult.warnings);
            warnings.push(...cleanResult.warnings.map(w => `[${chId}/${file}] ${w}`));
          }
          if (cleanResult.errors.length > 0) {
            chErrors.push(...cleanResult.errors);
            errors.push(...cleanResult.errors.map(e => `[${chId}/${file}] ${e}`));
          }
        } catch (err) {
          errors.push(`Clean transformation failed for ${chId}/${file}: ${err.message}`);
          chErrors.push(err.message);
          // Remove from created/updated list and add to skipped/errors
          if (existsBefore) {
            filesUpdated.pop();
            chFilesUpdated.pop();
          } else {
            filesCreated.pop();
            chFilesCreated.pop();
          }
          filesSkipped.push({
            chapterId: chId,
            file,
            reason: `transformation_error: ${err.message}`
          });
        }
      }
    }

    // Write Chapter local reports if not dryRun and we processed files
    const totalProcessed = chFilesCreated.length + chFilesUpdated.length;
    if (!dryRun && (totalProcessed > 0 || force)) {
      writeChapterReports(bookSlug, chId, {
        timestamp,
        startedAt,
        filesCreated: chFilesCreated,
        filesUpdated: chFilesUpdated,
        scriptsRemoved: scriptsRemovedCh,
        localPathsRemoved: leaksRemovedCh,
        handlersRemoved: handlersRemovedCh,
        emptyElementsRemoved: emptyElementsRemovedCh,
        warnings: chWarnings,
        errors: chErrors
      });
    }
  }

  let qualityGateResult = { id: 'cleanHtmlValid', status: 'unknown' };
  
  // Run quality gate and regenerate state
  if (!dryRun) {
    try {
      const qgRes = await runQualityGate(bookSlug, 'cleanHtmlValid', { allowWrite: true });
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
  } else if (warnings.length > 0 || filesSkipped.some(f => f.reason === 'clean_file_exists_no_force')) {
    status = 'passed_with_warnings';
  }

  const runResult = createPhaseRunResult({
    phase: 'clean',
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

  // Write Phase reports
  if (!dryRun) {
    writePhaseReports(bookSlug, runResult, timestamp);
  }

  return runResult;
}

function writeChapterReports(bookSlug, chapterId, runDetails) {
  const bookRoot = getBookRoot(bookSlug);
  const cleanDir = path.join(bookRoot, 'chapters', chapterId, '02-clean');
  
  if (!fs.existsSync(cleanDir)) {
    fs.mkdirSync(cleanDir, { recursive: true });
  }

  const jsonPath = path.join(cleanDir, `clean-summary-${runDetails.timestamp}.json`);
  const mdPath = path.join(cleanDir, `clean-summary-${runDetails.timestamp}.md`);

  let status = 'passed';
  if (runDetails.errors.length > 0) {
    status = 'failed';
  } else if (runDetails.warnings.length > 0) {
    status = 'passed_with_warnings';
  }

  const summaryData = {
    phase: "clean",
    bookSlug,
    chapterId,
    status,
    startedAt: runDetails.startedAt,
    finishedAt: new Date().toISOString(),
    inputFiles: [...runDetails.filesCreated, ...runDetails.filesUpdated],
    outputFiles: [...runDetails.filesCreated, ...runDetails.filesUpdated],
    filesCreated: runDetails.filesCreated,
    filesUpdated: runDetails.filesUpdated,
    scriptsRemoved: runDetails.scriptsRemoved,
    localPathsRemoved: runDetails.localPathsRemoved,
    handlersRemoved: runDetails.handlersRemoved,
    emptyElementsRemoved: runDetails.emptyElementsRemoved,
    warnings: runDetails.warnings,
    errors: runDetails.errors
  };

  // Write JSON
  fs.writeFileSync(jsonPath, JSON.stringify(summaryData, null, 2), 'utf8');

  // Build Markdown
  let md = `# Chapter Clean Summary: ${chapterId}\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|---|---||\n`;
  md += `| **Book** | ${bookSlug} |\n`;
  md += `| **Chapter** | ${chapterId} |\n`;
  md += `| **Status** | **${status.toUpperCase()}** |\n`;
  md += `| **Started At** | ${runDetails.startedAt} |\n`;
  md += `| **Finished At** | ${summaryData.finishedAt} |\n`;
  md += `\n---\n\n`;

  md += `## Clean Statistics\n\n`;
  md += `- **Files Created**: ${runDetails.filesCreated.length}\n`;
  md += `- **Files Updated**: ${runDetails.filesUpdated.length}\n`;
  md += `- **Scripts Removed**: ${runDetails.scriptsRemoved}\n`;
  md += `- **Local Path Leaks Removed**: ${runDetails.localPathsRemoved}\n`;
  md += `- **Inline Event Handlers Removed**: ${runDetails.handlersRemoved}\n`;
  md += `- **Empty Elements Removed**: ${runDetails.emptyElementsRemoved}\n\n`;

  if (runDetails.warnings.length > 0) {
    md += `### Warnings\n\n`;
    runDetails.warnings.forEach(w => {
      md += `- ⚠️ ${w}\n`;
    });
    md += `\n`;
  }

  if (runDetails.errors.length > 0) {
    md += `### Errors\n\n`;
    runDetails.errors.forEach(e => {
      md += `- ❌ ${e}\n`;
    });
    md += `\n`;
  }

  fs.writeFileSync(mdPath, md, 'utf8');
}

function writePhaseReports(bookSlug, result, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports', 'phase-runs');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filePrefix = result.scope === 'chapter' ? `clean-${result.chapterId}` : 'clean-all';
  const jsonPath = path.join(reportsDir, `${filePrefix}-${timestamp}.json`);
  const mdPath = path.join(reportsDir, `${filePrefix}-${timestamp}.md`);

  // Write JSON
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  // Build Markdown
  let md = `# Phase Run Report: clean\n\n`;
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
      md += `- \`chapters/${f.chapterId}/02-clean/${f.file}\`\n`;
    });
    md += `\n`;
  }

  if (result.filesUpdated.length > 0) {
    md += `### Files Overwritten (Updated)\n\n`;
    result.filesUpdated.forEach(f => {
      md += `- \`chapters/${f.chapterId}/02-clean/${f.file}\`\n`;
    });
    md += `\n`;
  }

  if (result.filesSkipped.length > 0) {
    md += `### Files Skipped\n\n`;
    result.filesSkipped.forEach(f => {
      md += `- \`chapters/${f.chapterId}/02-clean/${f.file || ''}\` (Reason: ${f.reason})\n`;
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
  md += `- **Gate ID**: \`${result.qualityGate?.id || 'cleanHtmlValid'}\`\n`;
  md += `- **Status**: **${(result.qualityGate?.status || 'unknown').toUpperCase()}**\n`;

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  runCleanPhase
};

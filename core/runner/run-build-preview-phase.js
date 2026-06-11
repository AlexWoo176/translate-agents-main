/**
 * run-build-preview-phase.js
 *
 * Core execution logic for the build_preview phase: 07-archive/vn-only -> preview/html/.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');
const { runQualityGate } = require('../gates/run-quality-gate');
const { generateWorkflowState } = require('../state/generate-workflow-state');
const { createPhaseRunResult } = require('./phase-run-result');
const { backupPreviewFolder } = require('./archive-runner-utils');

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

// Rewrites CSS href links to be relative to the preview directory structure
function rewriteCssLinks(html) {
  return html.replace(/(<link[^>]+href=")([^"]+)("[^>]*>)/gi, (match, prefix, href, suffix) => {
    if (/rel="stylesheet"/i.test(match) || href.endsWith('.css')) {
      return `${prefix}../css/style.css${suffix}`;
    }
    return match;
  });
}

async function runBuildPreviewPhase(bookSlug, options = {}) {
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
  
  const previewDir = path.join(bookRoot, 'preview', 'html');
  
  // 1. Scan book to resolve chapters and _book-level
  const scan = scanBook(bookSlug);
  const scopes = [...scan.chaptersFound];
  if (scan.hasBookLevel) {
    scopes.push('_book-level');
  }

  // Backup entire preview/html folder under force
  let backupCreated = null;
  if (!dryRun && !checkOnly && force) {
    try {
      backupCreated = backupPreviewFolder(bookSlug, timestamp);
    } catch (err) {
      errors.push(`Backup of preview folder failed: ${err.message}. Operation aborted.`);
      return createPhaseRunResult({
        phase: 'build_preview',
        bookSlug,
        scope: 'book',
        status: 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        dryRun,
        force,
        errors
      });
    }
  }

  for (const scId of scopes) {
    const isBookLevel = scId === '_book-level';
    const relativeFolder = isBookLevel ? '_book-level' : path.join('chapters', scId);
    
    const archiveVnOnlyDir = path.join(bookRoot, relativeFolder, '07-archive', 'vn-only');
    const targetPreviewDir = path.join(previewDir, scId);
    
    if (!fs.existsSync(archiveVnOnlyDir)) {
      warnings.push(`Scope ${scId} skipped: 07-archive/vn-only directory does not exist.`);
      continue;
    }
    
    const archiveFiles = fs.readdirSync(archiveVnOnlyDir).filter(f => f.endsWith('.html'));
    if (archiveFiles.length === 0) {
      warnings.push(`Scope ${scId} skipped: 07-archive/vn-only directory contains no HTML files.`);
      continue;
    }
    
    inputs.push(path.relative(bookRoot, archiveVnOnlyDir).replace(/\\/g, '/'));
    outputs.push(path.relative(bookRoot, targetPreviewDir).replace(/\\/g, '/'));

    if (!dryRun && !checkOnly) {
      fs.mkdirSync(targetPreviewDir, { recursive: true });
    }

    for (const file of archiveFiles) {
      const srcPath = path.join(archiveVnOnlyDir, file);
      const destPath = path.join(targetPreviewDir, file);
      
      const existsBefore = fs.existsSync(destPath);
      
      if (existsBefore) {
        if (!force) {
          filesSkipped.push({
            chapterId: scId,
            file,
            reason: 'preview_file_exists_no_force'
          });
          continue;
        }
        filesUpdated.push({ chapterId: scId, file });
      } else {
        filesCreated.push({ chapterId: scId, file });
      }
      
      // Copy and rewrite stylesheet links
      if (!dryRun && !checkOnly) {
        try {
          const archiveHtml = fs.readFileSync(srcPath, 'utf8');
          const previewHtml = rewriteCssLinks(archiveHtml);
          fs.writeFileSync(destPath, previewHtml, 'utf8');
        } catch (err) {
          errors.push(`Copy/rewrite failed for ${scId}/${file}: ${err.message}`);
          if (existsBefore) {
            filesUpdated.pop();
          } else {
            filesCreated.pop();
          }
          filesSkipped.push({
            chapterId: scId,
            file,
            reason: `rewrite_error: ${err.message}`
          });
        }
      }
    }
  }

  let qualityGateResult = { id: 'previewCssReferences', status: 'unknown' };

  if (!dryRun && !checkOnly) {
    try {
      // Programmatically run the previewCssReferences quality gate
      const qgRes = await runQualityGate(bookSlug, 'previewCssReferences', { allowWrite: true });
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
  } else if (warnings.length > 0 || filesSkipped.some(f => f.reason === 'preview_file_exists_no_force')) {
    status = 'passed_with_warnings';
  }

  const runResult = createPhaseRunResult({
    phase: 'build_preview',
    bookSlug,
    scope: 'book',
    chapterId: 'all',
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

  const jsonPath = path.join(reportsDir, `build-preview-${timestamp}.json`);
  const mdPath = path.join(reportsDir, `build-preview-${timestamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  let md = `# Phase Run Report: build_preview\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|---|---||\n`;
  md += `| **Book** | ${result.bookSlug} |\n`;
  md += `| **Scope** | ${result.scope} |\n`;
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
      md += `- \`preview/html/${f.chapterId}/${f.file}\`\n`;
    });
    md += `\n`;
  }

  if (result.filesUpdated.length > 0) {
    md += `### Files Overwritten (Updated)\n\n`;
    result.filesUpdated.forEach(f => {
      md += `- \`preview/html/${f.chapterId}/${f.file}\`\n`;
    });
    md += `\n`;
  }

  if (result.filesSkipped.length > 0) {
    md += `### Files Skipped\n\n`;
    result.filesSkipped.forEach(f => {
      md += `- \`preview/html/${f.chapterId}/${f.file || ''}\` (Reason: ${f.reason})\n`;
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
  md += `- **Gate ID**: \`${result.qualityGate?.id || 'previewCssReferences'}\`\n`;
  md += `- **Status**: **${(result.qualityGate?.status || 'unknown').toUpperCase()}**\n`;

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  runBuildPreviewPhase
};

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot, getChaptersDir, getBookConfigPath } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');
const { runQualityGate } = require('../gates/run-quality-gate');
const { generateWorkflowState } = require('../state/generate-workflow-state');
const { createPhaseRunResult } = require('./phase-run-result');
const { backupTranslatedFolder, loadProgress, saveProgress } = require('./translate-runner-utils');
const { getTranslationProvider } = require('../translation/translation-provider');
const { extractTranslationBlocks } = require('../translation/translation-block-extractor');
const { writeTranslationsToFile } = require('../translation/translation-block-writer');

// Helper: Formats timestamp to YYYYMMDD-HHMMSS
function getTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function runTranslatePhase(bookSlug, options = {}) {
  const startedAt = new Date().toISOString();
  const timestamp = getTimestamp();
  const bookRoot = getBookRoot(bookSlug);
  
  // Default values for options
  const dryRun = !!options.dryRun;
  const force = !!options.force;
  const writeFinal = !!options.writeFinal;
  const outputSuffix = options.outputSuffix || 'draft';
  const providerName = options.provider || 'mock';
  const maxBlocks = options.maxBlocks !== undefined ? options.maxBlocks : null;
  const resume = options.resume !== false && !force;

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

  // Load book config
  let bookConfig = {};
  const configPath = getBookConfigPath(bookSlug);
  if (fs.existsSync(configPath)) {
    try {
      bookConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      warnings.push(`Failed to parse book config: ${e.message}`);
    }
  }

  // Load provider instance
  let providerInstance;
  try {
    providerInstance = getTranslationProvider(providerName, bookSlug);
  } catch (err) {
    throw new Error(`Failed to initialize translation provider: ${err.message}`);
  }

  // Check glossary approval gate before translation run
  const { getGlossaryStatus } = require('../glossary/glossary-status');
  const glossaryStatus = getGlossaryStatus(bookSlug);
  const isFullBookTranslation = !!options.all || chaptersToProcess.length > 1;

  if (glossaryStatus.status === 'missing' || glossaryStatus.status === 'invalid') {
    throw new Error(`Glossary is missing or invalid. Blocked translation. Details: ${glossaryStatus.message || ''}`);
  }

  if (isFullBookTranslation) {
    if (glossaryStatus.status === 'needs_human_review') {
      if (!options.force) {
        throw new Error(`Glossary has unapproved terms (status: needs_human_review). Full-book translation is blocked. You can run translate with a specific --chapter, or use --force to bypass.`);
      } else {
        warnings.push(`Warning: Glossary is not fully approved, but --force was provided. Proceeding with full-book translation.`);
      }
    }
  } else {
    // If it's a single chapter (pilot chapter)
    if (glossaryStatus.status === 'needs_human_review') {
      warnings.push(`Glossary chưa được duyệt toàn bộ. Bản dịch pilot chỉ dùng để kiểm tra quy trình/chất lượng ban đầu.`);
    }
  }

  let totalBlocksDetected = 0;
  let totalBlocksTranslated = 0;
  let totalBlocksSkipped = 0;

  const backedUpChapters = new Set();

  for (const chId of chaptersToProcess) {
    const prepDir = path.join(bookRoot, 'chapters', chId, '04-prep');
    const phaseFolder = writeFinal ? '05-translated' : `05-translated-${outputSuffix}`;
    const outputDir = path.join(bookRoot, 'chapters', chId, phaseFolder);

    if (!fs.existsSync(prepDir)) {
      filesSkipped.push({
        chapterId: chId,
        reason: 'missing_prep_html'
      });
      warnings.push(`Chapter ${chId} skipped: 04-prep directory does not exist.`);
      continue;
    }

    let prepFiles = fs.readdirSync(prepDir).filter(f => f.endsWith('.html'));
    if (options.file) {
      const targetFile = path.basename(options.file);
      if (prepFiles.includes(targetFile)) {
        prepFiles = [targetFile];
      } else {
        filesSkipped.push({
          chapterId: chId,
          file: options.file,
          reason: 'specified_file_not_found_in_prep'
        });
        warnings.push(`File ${options.file} not found in chapter ${chId} prep directory.`);
        continue;
      }
    }

    if (prepFiles.length === 0) {
      filesSkipped.push({
        chapterId: chId,
        reason: 'no_html_files_in_prep'
      });
      warnings.push(`Chapter ${chId} skipped: 04-prep directory contains no HTML files.`);
      continue;
    }

    inputs.push(path.relative(bookRoot, prepDir).replace(/\\/g, '/'));
    outputs.push(path.relative(bookRoot, outputDir).replace(/\\/g, '/'));

    // Check directory existence and backup for final output
    const outputDirExists = fs.existsSync(outputDir);
    if (outputDirExists && writeFinal) {
      if (!force) {
        filesSkipped.push({
          chapterId: chId,
          reason: 'final_directory_exists_no_force'
        });
        warnings.push(`Chapter ${chId} skipped: Final output directory exists and --force is not specified.`);
        continue;
      }

      // Backup before overwrite if force is true and not a dry-run
      if (!backedUpChapters.has(chId) && !dryRun) {
        try {
          const backupDest = backupTranslatedFolder(bookSlug, chId, timestamp);
          if (backupDest) {
            backedUpChapters.add(chId);
            console.log(`Backed up existing final translation for ${chId} to ${backupDest}`);
          }
        } catch (err) {
          errors.push(`Backup failed for ${chId}: ${err.message}. Overwrite aborted.`);
          filesSkipped.push({
            chapterId: chId,
            reason: 'backup_failure_aborted'
          });
          continue;
        }
      }
    }

    if (!dryRun && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Load progress
    const progress = loadProgress(outputDir) || {
      bookSlug,
      chapterId: chId,
      provider: providerName,
      files: {},
      completedBlocks: [],
      failedBlocks: [],
      updatedAt: new Date().toISOString()
    };

    for (const file of prepFiles) {
      const prepFilePath = path.join(prepDir, file);
      const outputFilePath = path.join(outputDir, file);
      const relativePrepPath = path.relative(bookRoot, prepFilePath).replace(/\\/g, '/');
      const relativeOutputPath = path.relative(bookRoot, outputFilePath).replace(/\\/g, '/');

      const existsBefore = fs.existsSync(outputFilePath);

      // Extract blocks from prep file
      const prepHtml = fs.readFileSync(prepFilePath, 'utf8');
      const blocks = extractTranslationBlocks(prepHtml, relativePrepPath, bookSlug, chId);
      totalBlocksDetected += blocks.length;

      const blockTranslations = {};
      let fileTranslatedCount = 0;
      let fileSkippedCount = 0;

      // If resuming and output exists, preserve existing non-pending translations
      if (existsBefore && resume) {
        try {
          const existingHtml = fs.readFileSync(outputFilePath, 'utf8');
          const existingBlocks = extractTranslationBlocks(existingHtml, relativeOutputPath, bookSlug, chId);
          for (const eb of existingBlocks) {
            if (!eb.isPending && eb.targetText) {
              blockTranslations[eb.blockId] = {
                translatedText: eb.targetText,
                status: eb.existingStatus || 'translated'
              };
            }
          }
        } catch (err) {
          warnings.push(`Could not read existing translations from ${file}: ${err.message}`);
        }
      }

      // Translate pending blocks
      for (const block of blocks) {
        if (blockTranslations[block.blockId]) {
          totalBlocksSkipped++;
          fileSkippedCount++;
          continue;
        }

        if (maxBlocks !== null && totalBlocksTranslated >= maxBlocks) {
          totalBlocksSkipped++;
          fileSkippedCount++;
          continue;
        }

        if (dryRun) {
          totalBlocksTranslated++;
          fileTranslatedCount++;
          continue;
        }

        try {
          const result = await providerInstance.translateBlock({
            sourceText: block.sourceText,
            glossaryTerms: block.glossaryTerms,
            chapterContext: { chapterId: chId },
            bookConfig,
            blockMeta: { blockId: block.blockId, file, index: block.index }
          });

          // Determine status to assign to the block
          let blockStatus = 'translated';
          if (result.metadata?.status) {
            blockStatus = result.metadata.status;
          } else if (result.status) {
            blockStatus = result.status;
          } else if (providerName === 'mock') {
            blockStatus = 'mock';
          } else if (result.translatedText.includes('[MANUAL_TRANSLATION_MISSING]')) {
            blockStatus = 'missing-manual-translation';
          } else if (result.translatedText.includes('[PROVIDER_NOT_CONFIGURED]')) {
            blockStatus = 'provider-not-configured';
          }

          blockTranslations[block.blockId] = {
            translatedText: result.translatedText,
            status: blockStatus
          };

          totalBlocksTranslated++;
          fileTranslatedCount++;
        } catch (err) {
          errors.push(`Translation failed for block ${block.blockId} in ${file}: ${err.message}`);
        }
      }

      // Write output file
      if (!dryRun) {
        try {
          writeTranslationsToFile(prepFilePath, outputFilePath, blockTranslations);
          
          if (existsBefore) {
            filesUpdated.push({ chapterId: chId, file, translatedBlocks: fileTranslatedCount, skippedBlocks: fileSkippedCount });
          } else {
            filesCreated.push({ chapterId: chId, file, translatedBlocks: fileTranslatedCount, skippedBlocks: fileSkippedCount });
          }

          // Update progress
          progress.files[file] = {
            translatedBlocks: fileTranslatedCount,
            skippedBlocks: fileSkippedCount,
            totalBlocks: blocks.length
          };
        } catch (err) {
          errors.push(`Writing translation output failed for ${file}: ${err.message}`);
        }
      }
    }

    if (!dryRun) {
      progress.completedBlocks = Object.keys(progress.files);
      progress.updatedAt = new Date().toISOString();
      saveProgress(outputDir, progress);
    }
  }

  let qualityGateResult = { id: 'translationCompleteness', status: 'unknown' };

  // Run quality gate and regenerate state
  if (!dryRun) {
    try {
      const qgRes = await runQualityGate(bookSlug, 'translationCompleteness', { allowWrite: true });
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
  } else if (providerName === 'mock') {
    status = 'passed_with_warnings'; // Mock run is passed with warnings
  } else if (warnings.length > 0 || filesSkipped.length > 0) {
    status = 'passed_with_warnings';
  }

  const runResult = createPhaseRunResult({
    phase: 'translate',
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

  // Add translation specific counts
  runResult.provider = providerName;
  runResult.blocksDetected = totalBlocksDetected;
  runResult.blocksTranslated = totalBlocksTranslated;
  runResult.blocksSkipped = totalBlocksSkipped;

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

  const filePrefix = result.scope === 'chapter' ? `translate-${result.chapterId}` : 'translate-all';
  const jsonPath = path.join(reportsDir, `${filePrefix}-${timestamp}.json`);
  const mdPath = path.join(reportsDir, `${filePrefix}-${timestamp}.md`);

  // Write JSON
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  // Build Markdown
  let md = `# Phase Run Report: translate\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|---|---||\n`;
  md += `| **Book** | ${result.bookSlug} |\n`;
  md += `| **Scope** | ${result.scope} |\n`;
  md += `| **Target Chapter(s)** | ${result.chapterId} |\n`;
  md += `| **Status** | **${result.status.toUpperCase()}** |\n`;
  md += `| **Provider** | \`${result.provider}\` |\n`;
  md += `| **Dry Run** | ${result.dryRun ? '✅ Yes' : '❌ No'} |\n`;
  md += `| **Force Overwrite** | ${result.force ? '✅ Yes' : '❌ No'} |\n`;
  md += `| **Started At** | ${result.startedAt} |\n`;
  md += `| **Finished At** | ${result.finishedAt} |\n`;
  md += `\n---\n\n`;

  md += `## Translation Statistics\n\n`;
  md += `- **Blocks Detected**: ${result.blocksDetected}\n`;
  md += `- **Blocks Translated**: ${result.blocksTranslated}\n`;
  md += `- **Blocks Skipped/Resumed**: ${result.blocksSkipped}\n`;
  md += `- **Files Created**: ${result.filesCreated.length}\n`;
  md += `- **Files Updated**: ${result.filesUpdated.length}\n`;
  md += `- **Files Skipped**: ${result.filesSkipped.length}\n`;
  md += `- **Warnings**: ${result.warnings.length}\n`;
  md += `- **Errors**: ${result.errors.length}\n\n`;

  if (result.filesCreated.length > 0) {
    md += `### Files Created\n\n`;
    result.filesCreated.forEach(f => {
      md += `- \`chapters/${f.chapterId}/05-translated.../${f.file}\` (translated ${f.translatedBlocks} blocks, skipped ${f.skippedBlocks})\n`;
    });
    md += `\n`;
  }

  if (result.filesUpdated.length > 0) {
    md += `### Files Overwritten (Updated)\n\n`;
    result.filesUpdated.forEach(f => {
      md += `- \`chapters/${f.chapterId}/05-translated.../${f.file}\` (translated ${f.translatedBlocks} blocks, skipped ${f.skippedBlocks})\n`;
    });
    md += `\n`;
  }

  if (result.filesSkipped.length > 0) {
    md += `### Files Skipped\n\n`;
    result.filesSkipped.forEach(f => {
      md += `- \`chapters/${f.chapterId}/${f.file || ''}\` (Reason: ${f.reason})\n`;
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
  md += `- **Gate ID**: \`${result.qualityGate?.id || 'translationCompleteness'}\`\n`;
  md += `- **Status**: **${(result.qualityGate?.status || 'unknown').toUpperCase()}**\n`;

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  runTranslatePhase
};

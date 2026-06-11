'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');
const cheerio = require('cheerio');

// Simple parser for block analysis in gate
function analyzeOutputBlocks(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(content);

  let totalTargets = 0;
  let pendingCount = 0;
  let mockCount = 0;
  let missingManualCount = 0;
  let providerNotConfiguredCount = 0;
  let translatedCount = 0;

  $('[data-prep-role="target"]').each((idx, elem) => {
    totalTargets++;
    const node = $(elem);
    const text = node.text() || '';
    const prepStatus = node.attr('data-prep-status');
    const transStatus = node.attr('data-translation-status');

    if (prepStatus === 'pending-translation') {
      pendingCount++;
    } else if (transStatus === 'mock' || text.includes('[MOCK_TRANSLATION_REQUIRED]')) {
      mockCount++;
    } else if (transStatus === 'missing-manual-translation' || text.includes('[MANUAL_TRANSLATION_MISSING]')) {
      missingManualCount++;
    } else if (transStatus === 'provider-not-configured' || text.includes('[PROVIDER_NOT_CONFIGURED]')) {
      providerNotConfiguredCount++;
    } else {
      translatedCount++;
    }
  });

  return {
    totalTargets,
    pendingCount,
    mockCount,
    missingManualCount,
    providerNotConfiguredCount,
    translatedCount
  };
}

async function run(bookSlug, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports');
  
  const reportJsonPath = path.join(reportsDir, 'translation-completeness-report.json');
  const reportMdPath = path.join(reportsDir, 'translation-completeness-report.md');
  
  const scan = scanBook(bookSlug);
  const chapters = scan.chaptersFound;

  const result = {
    gateId: 'translationCompleteness',
    status: 'passed',
    success: true,
    stats: {
      totalChapters: chapters.length,
      translatedChapters: 0,
      failedChapters: 0,
      needsReviewChapters: 0,
      warningsChapters: 0
    },
    chapters: {},
    warnings: [],
    errors: []
  };

  if (chapters.length === 0) {
    result.errors.push("No chapters found in the book.");
    result.status = 'failed';
    result.success = false;
    writeReports(result, reportJsonPath, reportMdPath);
    return result;
  }

  let overallStatus = 'passed';

  for (const chapId of chapters) {
    const chapDir = path.join(bookRoot, 'chapters', chapId);
    const prepDir = path.join(chapDir, '04-prep');
    
    // Check if final translated folder or draft exists
    const transFinalDir = path.join(chapDir, '05-translated');
    const transDraftDir = path.join(chapDir, '05-translated-draft');
    
    let activeTransDir = null;
    let folderName = '';
    
    if (fs.existsSync(transFinalDir)) {
      activeTransDir = transFinalDir;
      folderName = '05-translated';
    } else if (fs.existsSync(transDraftDir)) {
      activeTransDir = transDraftDir;
      folderName = '05-translated-draft';
    }

    const chapInfo = {
      status: 'missing',
      folderUsed: folderName || 'none',
      hasPrepDir: fs.existsSync(prepDir),
      hasTransDir: !!activeTransDir,
      filesExpected: 0,
      filesFound: 0,
      totalBlocks: 0,
      pendingBlocks: 0,
      mockBlocks: 0,
      missingManualBlocks: 0,
      providerNotConfiguredBlocks: 0,
      translatedBlocks: 0,
      issues: [],
      warnings: [],
      errors: []
    };

    if (!chapInfo.hasPrepDir) {
      chapInfo.warnings.push(`Missing 04-prep directory.`);
      chapInfo.status = 'passed_with_warnings';
      result.stats.warningsChapters++;
      result.chapters[chapId] = chapInfo;
      continue;
    }

    const prepFiles = fs.readdirSync(prepDir).filter(f => f.endsWith('.html'));
    chapInfo.filesExpected = prepFiles.length;

    if (prepFiles.length === 0) {
      chapInfo.warnings.push(`04-prep contains no HTML files.`);
      chapInfo.status = 'passed_with_warnings';
      result.stats.warningsChapters++;
      result.chapters[chapId] = chapInfo;
      continue;
    }

    if (!chapInfo.hasTransDir) {
      chapInfo.errors.push(`Missing translation directory (neither 05-translated nor 05-translated-draft exists).`);
      chapInfo.status = 'failed';
      result.stats.failedChapters++;
      result.chapters[chapId] = chapInfo;
      continue;
    }

    const transFiles = fs.readdirSync(activeTransDir).filter(f => f.endsWith('.html'));
    chapInfo.filesFound = transFiles.length;

    // Check if all expected files are present
    for (const file of prepFiles) {
      const transFilePath = path.join(activeTransDir, file);
      if (!fs.existsSync(transFilePath)) {
        chapInfo.errors.push(`Missing translation output for file: ${file}`);
        continue;
      }

      try {
        const stats = analyzeOutputBlocks(transFilePath);
        chapInfo.totalBlocks += stats.totalTargets;
        chapInfo.pendingBlocks += stats.pendingCount;
        chapInfo.mockBlocks += stats.mockCount;
        chapInfo.missingManualBlocks += stats.missingManualCount;
        chapInfo.providerNotConfiguredBlocks += stats.providerNotConfiguredCount;
        chapInfo.translatedBlocks += stats.translatedCount;
      } catch (err) {
        chapInfo.errors.push(`Failed to parse translation file ${file}: ${err.message}`);
      }
    }

    // Determine status of the chapter based on block analysis
    let chapStatus = 'passed';
    if (chapInfo.errors.length > 0) {
      chapStatus = 'failed';
    } else if (chapInfo.pendingBlocks > 0 || chapInfo.providerNotConfiguredBlocks > 0) {
      // Pending or provider-not-configured blocks require review or failed depending on expectations
      chapStatus = 'needs_human_review';
      chapInfo.warnings.push(`Chapter has ${chapInfo.pendingBlocks} pending blocks and ${chapInfo.providerNotConfiguredBlocks} unconfigured provider blocks.`);
    } else if (chapInfo.missingManualBlocks > 0) {
      chapStatus = 'needs_human_review';
      chapInfo.warnings.push(`Chapter has ${chapInfo.missingManualBlocks} missing manual translations.`);
    } else if (chapInfo.mockBlocks > 0 || chapInfo.folderUsed === '05-translated-draft') {
      chapStatus = 'passed_with_warnings';
      if (chapInfo.mockBlocks > 0) {
        chapInfo.warnings.push(`Chapter uses mock translations for ${chapInfo.mockBlocks} blocks.`);
      } else {
        chapInfo.warnings.push(`Chapter output is in draft folder.`);
      }
    }

    chapInfo.status = chapStatus;
    result.chapters[chapId] = chapInfo;

    if (chapStatus === 'failed') {
      result.stats.failedChapters++;
    } else if (chapStatus === 'needs_human_review') {
      result.stats.needsReviewChapters++;
    } else if (chapStatus === 'passed_with_warnings') {
      result.stats.warningsChapters++;
    }
    result.stats.translatedChapters++;
  }

  // Decide overall status
  if (result.stats.failedChapters > 0) {
    overallStatus = 'failed';
  } else if (result.stats.needsReviewChapters > 0) {
    overallStatus = 'needs_human_review';
  } else if (result.stats.warningsChapters > 0) {
    overallStatus = 'passed_with_warnings';
  }

  result.status = overallStatus;
  result.success = overallStatus !== 'failed';

  writeReports(result, reportJsonPath, reportMdPath);
  return result;
}

function writeReports(result, jsonPath, mdPath) {
  const dir = path.dirname(jsonPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  let md = `# Translation Completeness Report\n\n`;
  md += `## Summary\n`;
  md += `**${result.status.toUpperCase()}**\n\n`;
  md += `## Statistics\n`;
  md += `- **Total Chapters**: ${result.stats.totalChapters}\n`;
  md += `- **Translated Chapters**: ${result.stats.translatedChapters}\n`;
  md += `- **Failed Chapters**: ${result.stats.failedChapters}\n`;
  md += `- **Needs Human Review**: ${result.stats.needsReviewChapters}\n`;
  md += `- **Passed with Warnings**: ${result.stats.warningsChapters}\n\n`;

  md += `## Chapter Details\n\n`;
  md += `| Chapter | Status | Folder | Files (Found/Expected) | Blocks (Trans/Pending/Mock/Missing) | Warnings/Errors |\n`;
  md += `|---|---|---|---|---|---|\n`;

  for (const chapId in result.chapters) {
    const ch = result.chapters[chapId];
    const statusText = ch.status.toUpperCase();
    
    const countWarnErr = ch.errors.length + ch.warnings.length;
    const notes = countWarnErr > 0 
      ? ch.errors.concat(ch.warnings).map(e => `• ${e}`).join('<br>') 
      : 'None';

    const blocksStr = `${ch.translatedBlocks} / ${ch.pendingBlocks} / ${ch.mockBlocks} / ${ch.missingManualBlocks + ch.providerNotConfiguredBlocks}`;

    md += `| \`${chapId}\` | **${statusText}** | \`${ch.folderUsed}\` | ${ch.filesFound} / ${ch.filesExpected} | ${blocksStr} | ${notes} |\n`;
  }

  md += `\n## Warnings\n\n`;
  if (result.warnings.length > 0) {
    result.warnings.forEach(w => {
      md += `- ⚠️ ${w}\n`;
    });
  } else {
    md += `None\n`;
  }
  md += `\n`;

  md += `## Errors\n\n`;
  if (result.errors.length > 0) {
    result.errors.forEach(e => {
      md += `- ❌ ${e}\n`;
    });
  } else {
    md += `None\n`;
  }
  md += `\n`;

  md += `## Final Result\n`;
  if (result.status === 'passed') {
    md += `**SUCCESS**: All chapters are translated completely and successfully.\n`;
  } else if (result.status === 'needs_human_review') {
    md += `**NEEDS HUMAN REVIEW**: Translations exist but have pending, missing manual, or provider-not-configured placeholders.\n`;
  } else if (result.status === 'passed_with_warnings') {
    md += `**WARNING**: Translations exist but some chapters use mock translations or are in draft folders.\n`;
  } else {
    md += `**FAILURE**: Some chapters are missing translations or contain errors.\n`;
  }

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  run
};

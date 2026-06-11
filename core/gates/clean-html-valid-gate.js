'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { getBookRoot } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');
const { validateHtmlStructure } = require('../clean/html-structure-validator');

/**
 * Runs the cleanHtmlValid Quality Gate.
 *
 * @param {string} bookSlug - The slug of the book.
 * @param {object} options - Options for the gate.
 * @returns {object} - The gate results.
 */
async function run(bookSlug, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports');
  
  const reportJsonPath = path.join(reportsDir, 'clean-html-valid-report.json');
  const reportMdPath = path.join(reportsDir, 'clean-html-valid-report.md');
  
  const scan = scanBook(bookSlug);
  const chapters = scan.chaptersFound;

  const result = {
    gateId: 'cleanHtmlValid',
    status: 'passed',
    success: true,
    stats: {
      totalChapters: chapters.length,
      cleanedChapters: 0,
      failedChapters: 0,
      passedWithWarningsChapters: 0,
      totalFilesChecked: 0,
      totalErrors: 0,
      totalWarnings: 0
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
    const rawDir = path.join(chapDir, '01-raw');
    const cleanDir = path.join(chapDir, '02-clean');
    
    const chapInfo = {
      status: 'missing',
      filesChecked: 0,
      errors: [],
      warnings: []
    };

    // 1. Check if 01-raw exists. If it has files, we expect 02-clean to exist.
    const rawExists = fs.existsSync(rawDir);
    const rawFiles = rawExists ? fs.readdirSync(rawDir).filter(f => f.endsWith('.html')) : [];

    if (rawFiles.length === 0) {
      // No raw files, skip clean gate checking for this chapter
      chapInfo.status = 'skipped';
      chapInfo.warnings.push("No raw HTML files found in 01-raw directory.");
      result.chapters[chapId] = chapInfo;
      continue;
    }

    if (!fs.existsSync(cleanDir)) {
      chapInfo.errors.push(`Missing 02-clean directory.`);
      chapInfo.status = 'failed';
      result.stats.failedChapters++;
      result.stats.totalErrors++;
      result.chapters[chapId] = chapInfo;
      continue;
    }

    const cleanFiles = fs.readdirSync(cleanDir).filter(f => f.endsWith('.html'));

    // Check if each raw HTML file exists in clean dir
    for (const file of rawFiles) {
      const rawFilePath = path.join(rawDir, file);
      const cleanFilePath = path.join(cleanDir, file);

      if (!fs.existsSync(cleanFilePath)) {
        chapInfo.errors.push(`Missing cleaned HTML file: ${file}`);
        continue;
      }

      // Read and validate clean HTML
      try {
        const rawHtml = fs.readFileSync(rawFilePath, 'utf8');
        const cleanHtml = fs.readFileSync(cleanFilePath, 'utf8');
        const $ = cheerio.load(cleanHtml);

        const fileValidation = validateHtmlStructure($, rawHtml, file, chapInfo.warnings);
        if (!fileValidation.valid) {
          chapInfo.errors.push(...fileValidation.errors.map(err => `[${file}] ${err}`));
        }
        
        chapInfo.filesChecked++;
        result.stats.totalFilesChecked++;
      } catch (err) {
        chapInfo.errors.push(`Failed to parse/validate ${file}: ${err.message}`);
      }
    }

    // Determine status of the chapter
    let chapStatus = 'passed';
    if (chapInfo.errors.length > 0) {
      chapStatus = 'failed';
      result.stats.failedChapters++;
      result.stats.totalErrors += chapInfo.errors.length;
    } else if (chapInfo.warnings.length > 0) {
      chapStatus = 'passed_with_warnings';
      result.stats.passedWithWarningsChapters++;
      result.stats.totalWarnings += chapInfo.warnings.length;
    }
    
    result.stats.cleanedChapters++;
    chapInfo.status = chapStatus;
    result.chapters[chapId] = chapInfo;
  }

  // Decide overall status
  if (result.stats.failedChapters > 0) {
    overallStatus = 'failed';
  } else if (result.stats.passedWithWarningsChapters > 0) {
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

  let md = `# Clean HTML Validity Report\n\n`;
  md += `## Summary\n`;
  md += `**${result.status.toUpperCase()}**\n\n`;
  md += `## Statistics\n`;
  md += `- **Total Chapters**: ${result.stats.totalChapters}\n`;
  md += `- **Cleaned Chapters**: ${result.stats.cleanedChapters}\n`;
  md += `- **Failed Chapters**: ${result.stats.failedChapters}\n`;
  md += `- **Passed with Warnings**: ${result.stats.passedWithWarningsChapters}\n`;
  md += `- **Total Files Checked**: ${result.stats.totalFilesChecked}\n`;
  md += `- **Total Errors**: ${result.stats.totalErrors}\n`;
  md += `- **Total Warnings**: ${result.stats.totalWarnings}\n\n`;

  md += `## Chapter Details\n\n`;
  md += `| Chapter | Status | Files Checked | Errors/Warnings |\n`;
  md += `|---|---|---|---|\n`;

  for (const chapId in result.chapters) {
    const ch = result.chapters[chapId];
    const statusText = ch.status.toUpperCase();
    const countWarnErr = ch.errors.length + ch.warnings.length;
    const notes = countWarnErr > 0 
      ? ch.errors.concat(ch.warnings).map(e => `• ${e}`).join('<br>') 
      : 'None';

    md += `| \`${chapId}\` | **${statusText}** | ${ch.filesChecked} | ${notes} |\n`;
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
    md += `**SUCCESS**: All chapters contain complete and successful cleaned HTML.\n`;
  } else if (result.status === 'passed_with_warnings') {
    md += `**WARNING**: All chapters cleaned, but some HTML structures contain non-blocking warnings.\n`;
  } else {
    md += `**FAILURE**: Some chapters are missing cleaned HTML or contain structural/security errors.\n`;
  }

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  run
};

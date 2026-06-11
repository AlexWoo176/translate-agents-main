'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');

/**
 * Runs the rawHtmlExists Quality Gate.
 * Checks that 01-raw directories exist, contain non-empty HTML files,
 * and match the source-map.json (if present).
 *
 * @param {string} bookSlug
 * @param {object} options
 * @returns {object} - Gate result
 */
async function run(bookSlug, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports');

  const reportJsonPath = path.join(reportsDir, 'raw-html-exists-report.json');
  const reportMdPath = path.join(reportsDir, 'raw-html-exists-report.md');

  const scan = scanBook(bookSlug);
  const chapters = scan.chaptersFound;

  // Also check _book-level
  const bookLevelRaw = path.join(bookRoot, '_book-level', '01-raw');
  const checkBookLevel = fs.existsSync(path.join(bookRoot, '_book-level'));

  // Read source map if available
  let sourceMap = {};
  const sourceMapPath = path.join(bookRoot, 'source-map.json');
  if (fs.existsSync(sourceMapPath)) {
    try {
      sourceMap = JSON.parse(fs.readFileSync(sourceMapPath, 'utf8'));
    } catch (e) {
      // Ignore parse errors
    }
  }

  const result = {
    gateId: 'rawHtmlExists',
    status: 'passed',
    success: true,
    stats: {
      totalChapters: chapters.length + (checkBookLevel ? 1 : 0),
      chaptersWithRaw: 0,
      chaptersWithoutRaw: 0,
      chaptersWithErrors: 0,
      totalHtmlFiles: 0,
      totalErrors: 0,
      totalWarnings: 0
    },
    sourceMapEntries: Object.keys(sourceMap).length,
    chapters: {},
    warnings: [],
    errors: []
  };

  if (chapters.length === 0 && !checkBookLevel) {
    result.errors.push('No chapters found in the book.');
    result.status = 'failed';
    result.success = false;
    writeReports(result, reportJsonPath, reportMdPath);
    return result;
  }

  let overallFailed = false;
  let overallWarnings = false;

  const allChapters = checkBookLevel ? [...chapters, '_book-level'] : chapters;

  for (const chapId of allChapters) {
    const rawDir = chapId === '_book-level'
      ? path.join(bookRoot, '_book-level', '01-raw')
      : path.join(bookRoot, 'chapters', chapId, '01-raw');

    const chapInfo = {
      status: 'missing',
      htmlCount: 0,
      errors: [],
      warnings: []
    };

    if (!fs.existsSync(rawDir)) {
      chapInfo.errors.push(`Missing 01-raw directory`);
      chapInfo.status = 'failed';
      result.stats.chaptersWithoutRaw++;
      result.stats.chaptersWithErrors++;
      result.stats.totalErrors++;
      result.chapters[chapId] = chapInfo;
      overallFailed = true;
      continue;
    }

    const htmlFiles = fs.readdirSync(rawDir).filter(f => f.endsWith('.html'));

    if (htmlFiles.length === 0) {
      chapInfo.errors.push(`01-raw directory exists but contains no HTML files`);
      chapInfo.status = 'failed';
      result.stats.chaptersWithoutRaw++;
      result.stats.chaptersWithErrors++;
      result.stats.totalErrors++;
      result.chapters[chapId] = chapInfo;
      overallFailed = true;
      continue;
    }

    chapInfo.htmlCount = htmlFiles.length;
    result.stats.totalHtmlFiles += htmlFiles.length;
    result.stats.chaptersWithRaw++;

    // Validate each HTML file is non-empty
    for (const file of htmlFiles) {
      const filePath = path.join(rawDir, file);
      const stat = fs.statSync(filePath);
      if (stat.size === 0) {
        chapInfo.errors.push(`Empty HTML file: ${file}`);
        result.stats.totalErrors++;
        overallFailed = true;
      } else if (stat.size < 500) {
        chapInfo.warnings.push(`Very small HTML file (${stat.size} bytes): ${file}`);
        result.stats.totalWarnings++;
        overallWarnings = true;
      }
    }

    // Cross-check against source map
    if (Object.keys(sourceMap).length > 0) {
      const prefix = chapId === '_book-level' ? '_book-level' : `chapters/${chapId}`;
      const mapEntries = Object.keys(sourceMap).filter(k => k.startsWith(`${prefix}/01-raw/`));
      const mapFiles = mapEntries.map(e => path.basename(e));

      for (const mapFile of mapFiles) {
        if (!htmlFiles.includes(mapFile)) {
          chapInfo.warnings.push(`In source map but missing locally: ${mapFile}`);
          result.stats.totalWarnings++;
          overallWarnings = true;
        }
      }

      for (const localFile of htmlFiles) {
        if (mapFiles.length > 0 && !mapFiles.includes(localFile)) {
          chapInfo.warnings.push(`Exists locally but not in source map: ${localFile}`);
          result.stats.totalWarnings++;
          overallWarnings = true;
        }
      }
    }

    // Determine chapter status
    if (chapInfo.errors.length > 0) {
      chapInfo.status = 'failed';
      result.stats.chaptersWithErrors++;
      overallFailed = true;
    } else if (chapInfo.warnings.length > 0) {
      chapInfo.status = 'passed_with_warnings';
      overallWarnings = true;
    } else {
      chapInfo.status = 'passed';
    }

    result.chapters[chapId] = chapInfo;
  }

  // Overall status
  if (overallFailed) {
    result.status = 'failed';
    result.success = false;
  } else if (overallWarnings) {
    result.status = 'passed_with_warnings';
    result.success = true;
  }

  // Collect top-level errors/warnings from chapters
  for (const [chapId, ch] of Object.entries(result.chapters)) {
    result.errors.push(...ch.errors.map(e => `[${chapId}] ${e}`));
    result.warnings.push(...ch.warnings.map(w => `[${chapId}] ${w}`));
  }

  writeReports(result, reportJsonPath, reportMdPath);
  return result;
}

function writeReports(result, jsonPath, mdPath) {
  const dir = path.dirname(jsonPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  let md = `# Raw HTML Exists Report\n\n`;
  md += `## Summary\n\n`;
  md += `**${result.status.toUpperCase()}**\n\n`;
  md += `## Statistics\n\n`;
  md += `- **Total Chapters**: ${result.stats.totalChapters}\n`;
  md += `- **Chapters With Raw**: ${result.stats.chaptersWithRaw}\n`;
  md += `- **Chapters Without Raw**: ${result.stats.chaptersWithoutRaw}\n`;
  md += `- **Chapters With Errors**: ${result.stats.chaptersWithErrors}\n`;
  md += `- **Total HTML Files**: ${result.stats.totalHtmlFiles}\n`;
  md += `- **Source Map Entries**: ${result.sourceMapEntries}\n`;
  md += `- **Total Errors**: ${result.stats.totalErrors}\n`;
  md += `- **Total Warnings**: ${result.stats.totalWarnings}\n\n`;

  md += `## Chapter Details\n\n`;
  md += `| Chapter | Status | HTML Files | Errors/Warnings |\n`;
  md += `|---|---|---|---|\n`;

  for (const [chapId, ch] of Object.entries(result.chapters)) {
    const statusText = ch.status.toUpperCase();
    const count = ch.errors.length + ch.warnings.length;
    const notes = count > 0
      ? ch.errors.concat(ch.warnings).map(e => `• ${e}`).join('<br>')
      : 'None';
    md += `| \`${chapId}\` | **${statusText}** | ${ch.htmlCount} | ${notes} |\n`;
  }

  md += `\n## Errors\n\n`;
  if (result.errors.length > 0) {
    result.errors.forEach(e => { md += `- ❌ ${e}\n`; });
  } else {
    md += `None\n`;
  }

  md += `\n## Warnings\n\n`;
  if (result.warnings.length > 0) {
    result.warnings.forEach(w => { md += `- ⚠️ ${w}\n`; });
  } else {
    md += `None\n`;
  }

  md += `\n## Final Result\n\n`;
  if (result.status === 'passed') {
    md += `**SUCCESS**: All chapters have raw HTML files present and non-empty.\n`;
  } else if (result.status === 'passed_with_warnings') {
    md += `**WARNING**: Raw HTML files exist but some chapters have non-blocking issues (source map mismatches or small files).\n`;
  } else {
    md += `**FAILURE**: Some chapters are missing raw HTML or have empty HTML files. Run \`--phase scrape\` to fetch them.\n`;
  }

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  run
};

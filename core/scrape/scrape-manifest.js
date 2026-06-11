'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

/**
 * Writes the scrape manifest (JSON + Markdown) to books/{bookSlug}/scrape-manifest.json/.md
 *
 * @param {object} params
 * @param {string} params.bookSlug
 * @param {object} params.stats
 * @param {string} params.runId - Timestamp-based run ID
 * @param {string} params.startedAt
 * @param {string} params.finishedAt
 * @param {Array} params.chapters - Per-chapter stats
 * @param {string[]} params.warnings
 * @param {string[]} params.errors
 * @param {boolean} [params.dryRun]
 * @param {boolean} [params.offline]
 * @param {boolean} [params.force]
 */
function writeScrapeManifest({
  bookSlug,
  stats,
  runId,
  startedAt,
  finishedAt,
  chapters = [],
  warnings = [],
  errors = [],
  dryRun = false,
  offline = false,
  force = false
}) {
  const bookRoot = getBookRoot(bookSlug);
  const jsonPath = path.join(bookRoot, 'scrape-manifest.json');
  const mdPath = path.join(bookRoot, 'scrape-manifest.md');

  const manifest = {
    runId,
    bookSlug,
    startedAt,
    finishedAt,
    dryRun,
    offline,
    force,
    stats: {
      chaptersProcessed: stats.chaptersProcessed || 0,
      pagesDiscovered: stats.pagesDiscovered || 0,
      pagesFetched: stats.pagesFetched || 0,
      pagesSkipped: stats.pagesSkipped || 0,
      pagesFailed: stats.pagesFailed || 0,
      assetsDownloaded: stats.assetsDownloaded || 0,
      assetsSkipped: stats.assetsSkipped || 0,
      assetsFailed: stats.assetsFailed || 0,
    },
    chapters,
    warnings,
    errors
  };

  fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf8');

  // Build Markdown
  let overallStatus = 'PASSED';
  if (errors.length > 0) overallStatus = 'FAILED';
  else if (warnings.length > 0) overallStatus = 'PASSED WITH WARNINGS';

  let md = `# Scrape Manifest\n\n`;
  md += `**Run ID**: \`${runId}\`\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|---|---|\n`;
  md += `| **Book** | ${bookSlug} |\n`;
  md += `| **Status** | **${overallStatus}** |\n`;
  md += `| **Mode** | ${offline ? 'Offline' : 'Online'}${dryRun ? ' (Dry Run)' : ''}${force ? ' (Force)' : ''} |\n`;
  md += `| **Started At** | ${startedAt} |\n`;
  md += `| **Finished At** | ${finishedAt} |\n`;
  md += `\n---\n\n`;
  md += `## Scrape Statistics\n\n`;
  md += `- **Chapters Processed**: ${manifest.stats.chaptersProcessed}\n`;
  md += `- **Pages Discovered**: ${manifest.stats.pagesDiscovered}\n`;
  md += `- **Pages Fetched**: ${manifest.stats.pagesFetched}\n`;
  md += `- **Pages Skipped**: ${manifest.stats.pagesSkipped}\n`;
  md += `- **Pages Failed**: ${manifest.stats.pagesFailed}\n`;
  md += `- **Assets Downloaded**: ${manifest.stats.assetsDownloaded}\n`;
  md += `- **Assets Skipped**: ${manifest.stats.assetsSkipped}\n`;
  md += `- **Assets Failed**: ${manifest.stats.assetsFailed}\n\n`;

  if (chapters.length > 0) {
    md += `## Chapters\n\n`;
    md += `| Chapter | Pages | Assets | Status |\n`;
    md += `|---|---|---|---|\n`;
    for (const ch of chapters) {
      md += `| \`${ch.chapterId}\` | ${ch.pageCount || 0} | ${ch.assetCount || 0} | ${(ch.status || 'unknown').toUpperCase()} |\n`;
    }
    md += `\n`;
  }

  if (warnings.length > 0) {
    md += `## Warnings\n\n`;
    warnings.forEach(w => { md += `- ⚠️ ${w}\n`; });
    md += `\n`;
  }

  if (errors.length > 0) {
    md += `## Errors\n\n`;
    errors.forEach(e => { md += `- ❌ ${e}\n`; });
    md += `\n`;
  }

  fs.writeFileSync(mdPath, md, 'utf8');

  return { jsonPath, mdPath };
}

module.exports = {
  writeScrapeManifest
};

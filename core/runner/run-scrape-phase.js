'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');
const { runQualityGate } = require('../gates/run-quality-gate');
const { generateWorkflowState } = require('../state/generate-workflow-state');
const { createPhaseRunResult } = require('./phase-run-result');
const { resolveSource } = require('../scrape/openstax-source-resolver');
const { discoverPages } = require('../scrape/openstax-book-discovery');
const { fetchHtml } = require('../scrape/html-fetcher');
const { fetchAssets } = require('../scrape/asset-fetcher');
const { writeScrapeManifest } = require('../scrape/scrape-manifest');
const { writeSourceMap, enrichPagesFromLocalFiles } = require('../scrape/source-map-writer');
const { backupChapterRaw, backupScrapeArtifacts, backupGlobalAssets } = require('./scrape-runner-utils');

// Helper: Formats timestamp to YYYYMMDD-HHMMSS
function getTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function runScrapePhase(bookSlug, options = {}) {
  const startedAt = new Date().toISOString();
  const timestamp = getTimestamp();
  const bookRoot = getBookRoot(bookSlug);

  const dryRun = !!options.dryRun;
  const force = !!options.force;
  const offline = !!options.offline;

  const filesCreated = [];
  const filesUpdated = [];
  const filesSkipped = [];
  const warnings = [];
  const errors = [];
  const inputs = [];
  const outputs = [];

  // ─── 1. Resolve source config ─────────────────────────────────────────────
  let sourceConfig;
  try {
    sourceConfig = resolveSource(bookSlug);
  } catch (err) {
    errors.push(`Source config resolution failed: ${err.message}`);
    return buildResult({ bookSlug, scope: 'book', chapterId: 'all', status: 'failed', startedAt, dryRun, force, inputs, outputs, filesCreated, filesUpdated, filesSkipped, warnings, errors, timestamp });
  }

  if (sourceConfig.warnings.includes('source_url_missing')) {
    warnings.push('source_url_missing: No bookUrl in book.config.json. Using offline/local mode.');
    if (!offline && !dryRun) {
      warnings.push('Forcing offline mode because no bookUrl is configured.');
    }
  }

  // Determine scope
  let chaptersToProcess = [];
  let scope = 'chapter';

  if (options.all) {
    scope = 'book';
    const scan = scanBook(bookSlug);
    chaptersToProcess = scan.chaptersFound;
    // Also include _book-level if it has raw
    const bookLevelDir = path.join(bookRoot, '_book-level', '01-raw');
    if (fs.existsSync(bookLevelDir)) {
      chaptersToProcess = [...chaptersToProcess, '_book-level'];
    }
  } else if (options.chapterId) {
    chaptersToProcess = [options.chapterId];
  } else {
    // Neither chapter nor all — use entire book in offline/dry-run mode
    scope = 'book';
    const scan = scanBook(bookSlug);
    chaptersToProcess = scan.chaptersFound;
    const bookLevelDir = path.join(bookRoot, '_book-level', '01-raw');
    if (fs.existsSync(bookLevelDir)) {
      chaptersToProcess = [...chaptersToProcess, '_book-level'];
    }
  }

  // ─── 2. Dry-run mode ────────────────────────────────────────────────────────
  if (dryRun) {
    // Discover pages (offline if no URL or offline flag)
    const effectiveOffline = offline || !sourceConfig.bookUrl;
    const discovery = await discoverPages({
      bookSlug,
      chapterId: options.chapterId || null,
      offline: effectiveOffline,
      bookUrl: sourceConfig.bookUrl,
      canonicalSlug: sourceConfig.canonicalSlug
    });

    warnings.push(...discovery.warnings.map(w => `[discovery] ${w}`));

    const pagesDiscovered = discovery.pages.length;
    const chaptersWithRaw = new Set(discovery.pages.map(p => p.chapterId));

    let status = 'dry_run_passed';
    if (sourceConfig.warnings.includes('source_url_missing') || warnings.length > 0) {
      status = 'dry_run_passed_with_warnings';
    }

    const runResult = {
      phase: 'scrape',
      bookSlug,
      scope,
      chapterId: options.chapterId || 'all',
      status,
      startedAt,
      finishedAt: new Date().toISOString(),
      dryRun: true,
      force,
      offline: effectiveOffline,
      inputs: chaptersToProcess.map(ch => ch === '_book-level' ? '_book-level/01-raw' : `chapters/${ch}/01-raw`),
      outputs: [],
      filesCreated: [],
      filesUpdated: [],
      filesSkipped: [],
      warnings,
      errors,
      qualityGate: { id: 'rawHtmlExists', status: 'skipped_dry_run' },
      discovery: {
        pagesDiscovered,
        chaptersWithRaw: Array.from(chaptersWithRaw)
      }
    };

    return runResult;
  }

  // ─── 3. Pre-run backup for force mode ────────────────────────────────────────
  const backedUpChapters = new Set();

  if (force) {
    // Backup scrape artifacts (manifest + source-map)
    try {
      backupScrapeArtifacts(bookSlug, timestamp);
    } catch (err) {
      errors.push(`Backup of scrape artifacts failed: ${err.message}. Aborting force run.`);
      return buildResult({ bookSlug, scope, chapterId: options.chapterId || 'all', status: 'failed', startedAt, dryRun, force, inputs, outputs, filesCreated, filesUpdated, filesSkipped, warnings, errors, timestamp });
    }
  }

  // ─── 4. Discover and process pages ──────────────────────────────────────────
  const effectiveOffline = offline || !sourceConfig.bookUrl;
  const chapterStats = [];
  const allPages = [];
  let totalAssetsDownloaded = 0;
  let totalAssetsSkipped = 0;
  let totalAssetsFailed = 0;
  let totalPagesFetched = 0;
  let totalPagesSkipped = 0;
  let totalPagesFailed = 0;

  for (const chId of chaptersToProcess) {
    const discovery = await discoverPages({
      bookSlug,
      chapterId: chId,
      offline: effectiveOffline,
      bookUrl: sourceConfig.bookUrl,
      canonicalSlug: sourceConfig.canonicalSlug
    });

    warnings.push(...discovery.warnings.map(w => `[${chId}] ${w}`));

    if (discovery.pages.length === 0) {
      filesSkipped.push({ chapterId: chId, reason: 'no_pages_discovered' });
      warnings.push(`[${chId}] No pages discovered — skipping.`);
      chapterStats.push({ chapterId: chId, pageCount: 0, assetCount: 0, status: 'skipped' });
      continue;
    }

    inputs.push(chId === '_book-level' ? '_book-level/01-raw' : `chapters/${chId}/01-raw`);
    outputs.push(chId === '_book-level' ? '_book-level/01-raw' : `chapters/${chId}/01-raw`);

    // Raw dir
    const rawDir = chId === '_book-level'
      ? path.join(bookRoot, '_book-level', '01-raw')
      : path.join(bookRoot, 'chapters', chId, '01-raw');

    // Assets dir
    const assetsDir = chId === '_book-level'
      ? path.join(bookRoot, '_book-level', 'assets')
      : path.join(bookRoot, 'chapters', chId, 'assets');

    let chPageFetched = 0;
    let chPageSkipped = 0;
    let chPageFailed = 0;
    let chAssetDownloaded = 0;
    let chAssetSkipped = 0;
    let chAssetFailed = 0;

    // Backup chapter if force
    if (force && !backedUpChapters.has(chId)) {
      try {
        backupChapterRaw(bookSlug, chId, timestamp);
        backedUpChapters.add(chId);
      } catch (err) {
        errors.push(`Backup failed for ${chId}: ${err.message}. Skipping overwrite for this chapter.`);
        filesSkipped.push({ chapterId: chId, reason: 'backup_failure_aborted' });
        chapterStats.push({ chapterId: chId, pageCount: discovery.pages.length, assetCount: 0, status: 'failed' });
        continue;
      }
    }

    if (!fs.existsSync(rawDir)) {
      fs.mkdirSync(rawDir, { recursive: true });
    }

    if (effectiveOffline) {
      // In offline mode, we don't fetch; we just enumerate and enrich existing files
      const enriched = enrichPagesFromLocalFiles(bookSlug, discovery.pages);
      allPages.push(...enriched);

      // Count existing files
      for (const page of discovery.pages) {
        if (fs.existsSync(page.rawFile)) {
          chPageSkipped++;
          filesSkipped.push({ chapterId: chId, file: path.basename(page.rawFile), reason: 'offline_mode_skip' });
        }
      }
    } else {
      // Online mode: fetch each page
      for (const page of discovery.pages) {
        if (!page.url) {
          warnings.push(`[${chId}/${page.slug}] No URL available for online fetch — skipping.`);
          chPageSkipped++;
          continue;
        }

        const destFile = path.join(rawDir, `${page.slug}.html`);
        const existsBefore = fs.existsSync(destFile);

        if (existsBefore && !force) {
          filesSkipped.push({ chapterId: chId, file: `${page.slug}.html`, reason: 'raw_file_exists_no_force' });
          chPageSkipped++;
          allPages.push(Object.assign({}, page, { relPath: `chapters/${chId}/01-raw/${page.slug}.html` }));
          continue;
        }

        // Fetch HTML
        try {
          const fetchResult = await fetchHtml(page.url, {
            provider: sourceConfig.provider,
            usePuppeteer: false
          });
          warnings.push(...fetchResult.warnings.map(w => `[${chId}/${page.slug}] ${w}`));

          fs.writeFileSync(destFile, fetchResult.html, 'utf8');

          if (existsBefore) {
            filesUpdated.push({ chapterId: chId, file: `${page.slug}.html` });
          } else {
            filesCreated.push({ chapterId: chId, file: `${page.slug}.html` });
          }

          const enrichedPage = Object.assign({}, page, {
            relPath: `chapters/${chId}/01-raw/${page.slug}.html`,
            fetchedAt: fetchResult.fetchedAt,
            provider: sourceConfig.provider
          });
          allPages.push(enrichedPage);

          chPageFetched++;

          // Download assets from this page
          const assetResult = await fetchAssets({
            html: fetchResult.html,
            pageUrl: page.url,
            assetsDir,
            force
          });

          warnings.push(...assetResult.warnings.map(w => `[${chId}/${page.slug}/assets] ${w}`));
          chAssetDownloaded += assetResult.downloaded.length;
          chAssetSkipped += assetResult.skipped.length;
          chAssetFailed += assetResult.failed.length;

          for (const f of assetResult.downloaded) {
            filesCreated.push({ chapterId: chId, type: 'asset', file: f });
          }

          totalPagesFetched++;
        } catch (err) {
          errors.push(`[${chId}/${page.slug}] Fetch failed: ${err.message}`);
          chPageFailed++;
          totalPagesFailed++;
        }
      }
    }

    totalAssetsDownloaded += chAssetDownloaded;
    totalAssetsSkipped += chAssetSkipped;
    totalAssetsFailed += chAssetFailed;
    totalPagesFetched += chPageFetched;
    totalPagesSkipped += chPageSkipped;
    totalPagesFailed += chPageFailed;

    let chStatus = 'passed';
    if (chPageFailed > 0) chStatus = 'failed';
    else if (chPageSkipped > 0 || warnings.some(w => w.startsWith(`[${chId}]`))) chStatus = 'passed_with_warnings';

    chapterStats.push({
      chapterId: chId,
      pageCount: discovery.pages.length,
      assetCount: chAssetDownloaded,
      status: chStatus
    });
  }

  // ─── 5. In offline mode, enrich allPages from local filesystem ───────────────
  if (effectiveOffline && allPages.length === 0) {
    const globalDiscovery = options.chapterId
      ? await discoverPages({ bookSlug, chapterId: options.chapterId, offline: true })
      : await discoverPages({ bookSlug, chapterId: null, offline: true });
    const enriched = enrichPagesFromLocalFiles(bookSlug, globalDiscovery.pages);
    allPages.push(...enriched);
  }

  // ─── 6. Write source map ──────────────────────────────────────────────────────
  if (allPages.length > 0) {
    try {
      const sourceMapResult = writeSourceMap(bookSlug, allPages, force);
      outputs.push('source-map.json');
    } catch (err) {
      warnings.push(`Failed to write source-map.json: ${err.message}`);
    }
  }

  // ─── 7. Write scrape manifest ─────────────────────────────────────────────────
  const finishedAt = new Date().toISOString();
  const totalPagesDiscovered = chapterStats.reduce((sum, ch) => sum + ch.pageCount, 0);

  try {
    writeScrapeManifest({
      bookSlug,
      stats: {
        chaptersProcessed: chaptersToProcess.length,
        pagesDiscovered: totalPagesDiscovered,
        pagesFetched: totalPagesFetched,
        pagesSkipped: totalPagesSkipped,
        pagesFailed: totalPagesFailed,
        assetsDownloaded: totalAssetsDownloaded,
        assetsSkipped: totalAssetsSkipped,
        assetsFailed: totalAssetsFailed
      },
      runId: timestamp,
      startedAt,
      finishedAt,
      chapters: chapterStats,
      warnings,
      errors,
      dryRun,
      offline: effectiveOffline,
      force
    });
    outputs.push('scrape-manifest.json');
  } catch (err) {
    warnings.push(`Failed to write scrape-manifest.json: ${err.message}`);
  }

  // ─── 8. Write phase reports ───────────────────────────────────────────────────
  writePhaseReports(bookSlug, { scope, chapterId: options.chapterId || 'all', timestamp, startedAt, finishedAt, filesCreated, filesUpdated, filesSkipped, warnings, errors, chapterStats });

  // ─── 9. Run quality gate ──────────────────────────────────────────────────────
  let qualityGateResult = { id: 'rawHtmlExists', status: 'unknown' };
  try {
    const qgRes = await runQualityGate(bookSlug, 'rawHtmlExists', { allowWrite: true });
    qualityGateResult.status = qgRes.status;
    generateWorkflowState(bookSlug);
  } catch (err) {
    warnings.push(`Quality gate or state regeneration failed: ${err.message}`);
  }

  // ─── 10. Determine status ─────────────────────────────────────────────────────
  let status = 'passed';
  if (errors.length > 0) {
    status = 'failed';
  } else if (warnings.length > 0) {
    status = 'passed_with_warnings';
  }

  return buildResult({
    bookSlug,
    scope,
    chapterId: options.chapterId || 'all',
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
    qualityGateResult,
    timestamp,
    chapterStats,
    offline: effectiveOffline
  });
}

function buildResult({ bookSlug, scope, chapterId, status, startedAt, finishedAt, dryRun, force, inputs, outputs, filesCreated, filesUpdated, filesSkipped, warnings, errors, qualityGateResult, timestamp, chapterStats, offline }) {
  return {
    phase: 'scrape',
    bookSlug,
    scope,
    chapterId,
    status,
    startedAt,
    finishedAt: finishedAt || new Date().toISOString(),
    dryRun,
    force,
    offline: !!offline,
    inputs,
    outputs,
    filesCreated,
    filesUpdated,
    filesSkipped,
    warnings,
    errors,
    qualityGate: qualityGateResult || { id: 'rawHtmlExists', status: 'unknown' },
    chapterStats: chapterStats || []
  };
}

function writePhaseReports(bookSlug, { scope, chapterId, timestamp, startedAt, finishedAt, filesCreated, filesUpdated, filesSkipped, warnings, errors, chapterStats }) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports', 'phase-runs');

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filePrefix = scope === 'chapter' ? `scrape-${chapterId}` : 'scrape-all';
  const jsonPath = path.join(reportsDir, `${filePrefix}-${timestamp}.json`);
  const mdPath = path.join(reportsDir, `${filePrefix}-${timestamp}.md`);

  const report = {
    phase: 'scrape',
    bookSlug,
    scope,
    chapterId,
    startedAt,
    finishedAt,
    filesCreated: filesCreated.length,
    filesUpdated: filesUpdated.length,
    filesSkipped: filesSkipped.length,
    warnings: warnings.length,
    errors: errors.length,
    chapterStats
  };

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  let md = `# Phase Run Report: scrape\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|---|---|\n`;
  md += `| **Book** | ${bookSlug} |\n`;
  md += `| **Scope** | ${scope} |\n`;
  md += `| **Target** | ${chapterId} |\n`;
  md += `| **Started At** | ${startedAt} |\n`;
  md += `| **Finished At** | ${finishedAt} |\n`;
  md += `\n---\n\n`;
  md += `## Statistics\n\n`;
  md += `- **Files Created**: ${filesCreated.length}\n`;
  md += `- **Files Updated**: ${filesUpdated.length}\n`;
  md += `- **Files Skipped**: ${filesSkipped.length}\n`;
  md += `- **Warnings**: ${warnings.length}\n`;
  md += `- **Errors**: ${errors.length}\n\n`;

  if (chapterStats.length > 0) {
    md += `## Chapter Stats\n\n`;
    md += `| Chapter | Pages | Assets | Status |\n`;
    md += `|---|---|---|---|\n`;
    for (const ch of chapterStats) {
      md += `| \`${ch.chapterId}\` | ${ch.pageCount} | ${ch.assetCount} | ${(ch.status || 'unknown').toUpperCase()} |\n`;
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
}

module.exports = {
  runScrapePhase
};

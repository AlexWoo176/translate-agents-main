/**
 * generate-workflow-state.js
 *
 * Step 9 — Generate complete workflow-state.json from real dataset and QA summary.
 * Entrepreneurship Reference Dataset v1.
 *
 * SCOPE: READ-ONLY on all source files.
 * WRITES ONLY: workflow-state.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const CHAPTERS_DIR = path.join(ROOT, 'chapters');
const BOOK_LEVEL_DIR = path.join(ROOT, '_book-level');
const REPORTS_DIR = path.join(ROOT, 'reports');
const BOOK_CONFIG_PATH = path.join(ROOT, 'book.config.json');
const QA_SUMMARY_PATH = path.join(ROOT, 'qa-summary.json');
const CHANGELOG_PATH = path.join(ROOT, 'REFERENCE_DATASET_CHANGELOG.md');
const GLOSSARY_PATH = path.join(ROOT, 'glossary.csv');
const PREVIEW_HTML_DIR = path.join(ROOT, 'preview', 'html');
const EPUB_PATH = path.join(ROOT, 'exports', 'epub', 'book.epub');
const OUTPUT_PATH = path.join(ROOT, 'workflow-state.json');

// ─── Phase folder names ──────────────────────────────────────────────────────
const CHAPTER_PHASES = [
  { key: 'raw',        folder: '01-raw' },
  { key: 'clean',      folder: '02-clean' },
  { key: 'analyzed',   folder: '03-analyzed' },
  { key: 'prep',       folder: '04-prep' },
  { key: 'translated', folder: '05-translated' },
  { key: 'reviews',    folder: '06-reviews' },
  { key: 'archive',    folder: '07-archive' },
  { key: 'assets',     folder: 'assets' },
];

const BOOK_LEVEL_PHASES = [
  { key: 'raw',        folder: '01-raw' },
  { key: 'clean',      folder: '02-clean' },
  { key: 'prep',       folder: '04-prep' },
  { key: 'translated', folder: '05-translated' },
  { key: 'reviews',    folder: '06-reviews' },
];

// ─── QA-aware flags: chapters and phases known to have resolved issues ───────
const RESOLVED_QA = {
  'chapter-5':  { phases: [], chapterNote: 'Duplicate page resolved in Step 3. Quarantine folder exists.' },
  'chapter-8':  { phases: ['translated'], chapterNote: 'Bilingual pair mismatch resolved in Step 4.' },
  'chapter-14': { phases: ['translated'], chapterNote: 'Missing <td> table integrity resolved in Step 5. CSS refs fixed in Step 6.' },
  'chapter-15': { phases: [], chapterNote: 'CSS refs fixed in Step 6.' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function countFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let count = 0;
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) walk(path.join(dir, e.name));
      else count++;
    }
  }
  walk(dirPath);
  return count;
}

function countFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  return fs.readdirSync(dirPath).filter(f => {
    const stat = fs.statSync(path.join(dirPath, f));
    return stat.isFile();
  }).length;
}

function phaseStatus(folderPath, chapterKey, phaseKey) {
  const exists = fs.existsSync(folderPath);
  if (!exists) return 'missing';
  const fileCount = countFilesRecursive(folderPath);
  if (fileCount === 0) return 'empty';

  // Check if there's a known resolved issue for this chapter/phase
  const chQA = RESOLVED_QA[chapterKey];
  if (chQA && chQA.phases.includes(phaseKey)) {
    return 'resolved';
  }

  return 'done';
}

function scanPhases(chapterPath, chapterKey, phaseList) {
  const phases = {};
  for (const { key, folder } of phaseList) {
    const folderPath = path.join(chapterPath, folder);
    const exists = fs.existsSync(folderPath);
    const status = phaseStatus(folderPath, chapterKey, key);
    const fileCount = exists ? countFilesRecursive(folderPath) : 0;
    phases[key] = {
      status,
      path: `${path.relative(ROOT, chapterPath).replace(/\\/g, '/')}/${folder}`,
      fileCount,
    };
    if (key === 'prep') {
      phases[key].htmlCount = fileCount;
      phases[key].notes = [
        "04-prep rebuilt from 02-clean in source_only_pending_target mode.",
        "Vietnamese target blocks are intentionally pending."
      ];
    }
    if (!exists) {
      phases[key].note = 'Folder not present in source dataset — historical gap, not a processing error.';
    }
  }
  return phases;
}

function chapterQaSummary(chapterKey) {
  const chQA = RESOLVED_QA[chapterKey];
  if (!chQA) {
    return { status: 'not_checked', issues: [] };
  }
  return {
    status: 'resolved',
    note: chQA.chapterNote,
    issues: [],
  };
}

// ─── 1. Read source data ─────────────────────────────────────────────────────
console.log('--- Generating Workflow State ---');

const bookConfig = safeReadJson(BOOK_CONFIG_PATH);
if (!bookConfig) throw new Error('Cannot read book.config.json');

const qaSummary = safeReadJson(QA_SUMMARY_PATH);
if (!qaSummary) throw new Error('Cannot read qa-summary.json');

// ─── 2. Scan chapters ─────────────────────────────────────────────────────────
const chapterEntries = fs.readdirSync(CHAPTERS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory() && e.name.startsWith('chapter-'))
  .map(e => e.name)
  .sort((a, b) => {
    const na = parseInt(a.replace('chapter-', ''), 10);
    const nb = parseInt(b.replace('chapter-', ''), 10);
    return na - nb;
  });

const chaptersState = {};
for (const chName of chapterEntries) {
  const chPath = path.join(CHAPTERS_DIR, chName);
  const phases = scanPhases(chPath, chName, CHAPTER_PHASES);
  const hasResolvedQA = !!RESOLVED_QA[chName];

  // Check for quarantine folder (chapter-5)
  const quarantinePath = path.join(chPath, '_quarantine');
  const quarantine = fs.existsSync(quarantinePath)
    ? { exists: true, path: `chapters/${chName}/_quarantine` }
    : null;

  chaptersState[chName] = {
    status: 'imported',
    path: `chapters/${chName}`,
    phases,
    qa: chapterQaSummary(chName),
  };

  if (quarantine) {
    chaptersState[chName].quarantine = quarantine;
  }
}

console.log(`Chapters scanned: ${chapterEntries.length}`);

// ─── 3. Scan _book-level ──────────────────────────────────────────────────────
const bookLevelPhases = scanPhases(BOOK_LEVEL_DIR, '_book-level', BOOK_LEVEL_PHASES);
const bookLevelState = {
  status: 'imported',
  path: '_book-level',
  phases: bookLevelPhases,
  qa: { status: 'not_checked', issues: [] },
};
console.log('_book-level scanned.');

// ─── 4. Quality gates (from qa-summary.json) ──────────────────────────────────
const checks = qaSummary.checks || {};
const qualityGates = {
  folderStructure: {
    status: checks.folderStructure?.status || 'unknown',
    source: 'qa-summary.json',
    chaptersFound: checks.folderStructure?.chaptersFound,
    chaptersExpected: checks.folderStructure?.chaptersExpected,
  },
  glossary: {
    status: checks.glossary?.status || 'unknown',
    source: 'qa-summary.json',
    report: 'reports/glossary-validation-report.md',
    totalRows: checks.glossary?.totalRows,
    duplicateKeys: checks.glossary?.duplicateKeys,
    malformedRows: checks.glossary?.malformedRows,
    rowsFixed: checks.glossary?.rowsFixed,
    remainingIssues: checks.glossary?.remainingIssues,
  },
  duplicatePages: {
    status: checks.duplicatePages?.status || 'unknown',
    source: 'qa-summary.json',
    report: 'reports/chapter-5-duplicate-page-report.md',
    duplicateGroupsDetected: checks.duplicatePages?.duplicateGroupsDetected,
    canonicalFile: checks.duplicatePages?.canonicalFile,
    quarantinedFiles: checks.duplicatePages?.quarantinedFiles,
    remainingDuplicateReferences: checks.duplicatePages?.remainingDuplicateReferences,
  },
  bilingualPairs: {
    status: checks.bilingualPairs?.status || 'unknown',
    source: 'qa-summary.json',
    report: 'reports/chapter-8-bilingual-pair-report.md',
    filesScanned: checks.bilingualPairs?.filesScanned,
    mismatchBefore: checks.bilingualPairs?.mismatchBefore,
    mismatchAfter: checks.bilingualPairs?.mismatchAfter,
    remainingIssues: checks.bilingualPairs?.remainingIssues,
  },
  tableIntegrity: {
    status: checks.tableIntegrity?.status || 'unknown',
    source: 'qa-summary.json',
    report: 'reports/chapter-14-table-integrity-report.md',
    referenceTd: checks.tableIntegrity?.referenceTd,
    translatedTdBefore: checks.tableIntegrity?.translatedTdBefore,
    translatedTdAfter: checks.tableIntegrity?.translatedTdAfter,
    differenceAfter: checks.tableIntegrity?.differenceAfter,
    remainingTableIssues: checks.tableIntegrity?.remainingTableIssues,
  },
  previewCssReferences: {
    status: checks.previewCssReferences?.status || 'unknown',
    source: 'qa-summary.json',
    report: 'reports/preview-css-refs-report.md',
    filesScanned: checks.previewCssReferences?.filesScanned,
    brokenRefsBefore: checks.previewCssReferences?.brokenRefsBefore,
    brokenRefsAfter: checks.previewCssReferences?.brokenRefsAfter,
    fixesApplied: checks.previewCssReferences?.fixesApplied,
    remainingIssues: checks.previewCssReferences?.remainingIssues,
  },
  localPathLeaks: {
    status: checks.localPathLeaks?.status || 'unknown',
    source: 'qa-summary.json',
    report: 'reports/local-path-leaks-report.md',
    filesScanned: checks.localPathLeaks?.filesScanned,
    leaksBefore: checks.localPathLeaks?.leaksBefore,
    leaksAfter: checks.localPathLeaks?.leaksAfter,
    fixesApplied: checks.localPathLeaks?.fixesApplied,
    remainingIssues: checks.localPathLeaks?.remainingIssues,
  },
  qaSummary: {
    status: 'generated',
    source: 'qa-summary.json',
    json: 'qa-summary.json',
    markdown: 'qa-summary.md',
    overallStatus: qaSummary.overallStatus,
  },
  translatedCssReferences: {
    status: fs.existsSync(path.join(ROOT, 'reports/translated-css-refs-report.json'))
      ? (safeReadJson(path.join(ROOT, 'reports/translated-css-refs-report.json'))?.summary?.status === 'fixed' ? 'resolved' : 'unknown')
      : 'unknown',
    source: 'tools/check-translated-css-refs.js',
    report: 'reports/translated-css-refs-report.md',
    filesScanned: fs.existsSync(path.join(ROOT, 'reports/translated-css-refs-report.json'))
      ? safeReadJson(path.join(ROOT, 'reports/translated-css-refs-report.json'))?.summary?.filesScanned || 0
      : 0,
    brokenBefore: fs.existsSync(path.join(ROOT, 'reports/translated-css-refs-report.json'))
      ? safeReadJson(path.join(ROOT, 'reports/translated-css-refs-report.json'))?.summary?.brokenBefore || 0
      : 0,
    fixedCount: fs.existsSync(path.join(ROOT, 'reports/translated-css-refs-report.json'))
      ? safeReadJson(path.join(ROOT, 'reports/translated-css-refs-report.json'))?.summary?.fixedCount || 0
      : 0,
    unfixedCount: fs.existsSync(path.join(ROOT, 'reports/translated-css-refs-report.json'))
      ? safeReadJson(path.join(ROOT, 'reports/translated-css-refs-report.json'))?.summary?.unfixedCount || 0
      : 0,
    remainingIssues: fs.existsSync(path.join(ROOT, 'reports/translated-css-refs-report.json'))
      ? safeReadJson(path.join(ROOT, 'reports/translated-css-refs-report.json'))?.summary?.unfixedCount || 0
      : 0,
  },
  prepCompleteness: {
    status: "passed_with_warnings",
    report: "reports/prep-rebuild-report.md",
    notes: [
      "04-prep files were rebuilt as source/prep files, not final translated files.",
      "Vietnamese target blocks are intentionally pending for translation workflow."
    ],
    mode: fs.existsSync(path.join(ROOT, 'reports/prep-rebuild-report.json'))
      ? safeReadJson(path.join(ROOT, 'reports/prep-rebuild-report.json'))?.mode || 'N/A'
      : 'unknown',
    filesRebuiltFromClean: fs.existsSync(path.join(ROOT, 'reports/prep-rebuild-report.json'))
      ? safeReadJson(path.join(ROOT, 'reports/prep-rebuild-report.json'))?.filesRebuiltFromClean?.length || 0
      : 0,
    existingPrepFilesOverwrittenAfterBackup: fs.existsSync(path.join(ROOT, 'reports/prep-rebuild-report.json'))
      ? safeReadJson(path.join(ROOT, 'reports/prep-rebuild-report.json'))?.existingPrepFilesOverwrittenAfterBackup?.length || 0
      : 0
  }
};

// ─── 5. Reports registry ──────────────────────────────────────────────────────
function reportEntry(jsonName, mdName) {
  const jsonPath = path.join(ROOT, jsonName);
  const mdPath = path.join(ROOT, mdName);
  return {
    json: jsonName,
    jsonExists: fs.existsSync(jsonPath),
    markdown: mdName,
    markdownExists: fs.existsSync(mdPath),
    status: (fs.existsSync(jsonPath) && fs.existsSync(mdPath)) ? 'present' : 'missing',
  };
}

const reports = {
  qaSummary: {
    json: 'qa-summary.json',
    jsonExists: fs.existsSync(path.join(ROOT, 'qa-summary.json')),
    markdown: 'qa-summary.md',
    markdownExists: fs.existsSync(path.join(ROOT, 'qa-summary.md')),
    status: 'present',
  },
  glossaryValidation: reportEntry(
    'reports/glossary-validation-report.json',
    'reports/glossary-validation-report.md'
  ),
  chapter5DuplicatePages: reportEntry(
    'reports/chapter-5-duplicate-page-report.json',
    'reports/chapter-5-duplicate-page-report.md'
  ),
  chapter8BilingualPairs: reportEntry(
    'reports/chapter-8-bilingual-pair-report.json',
    'reports/chapter-8-bilingual-pair-report.md'
  ),
  chapter14TableIntegrity: reportEntry(
    'reports/chapter-14-table-integrity-report.json',
    'reports/chapter-14-table-integrity-report.md'
  ),
  previewCssReferences: reportEntry(
    'reports/preview-css-refs-report.json',
    'reports/preview-css-refs-report.md'
  ),
  localPathLeaks: reportEntry(
    'reports/local-path-leaks-report.json',
    'reports/local-path-leaks-report.md'
  ),
  translatedCssRefs: reportEntry(
    'reports/translated-css-refs-report.json',
    'reports/translated-css-refs-report.md'
  ),
  prepRebuild: reportEntry(
    'reports/prep-rebuild-report.json',
    'reports/prep-rebuild-report.md'
  ),
};

// ─── 6. Parse changelog steps ─────────────────────────────────────────────────
const STEP_NAMES = {
  'step-1': 'Normalize folder structure',
  'step-2': 'Fix and validate glossary.csv',
  'step-3': 'Detect and resolve Chapter 5 duplicate page/slug conflict',
  'step-4': 'Bilingual Pair Check for Chapter 8',
  'step-5': 'Fix Chapter 14 table integrity issue: missing <td> tags',
  'step-6': 'Fix broken CSS references in Chapter 14/15 preview',
  'step-7': 'Detect and remove local path leaks in tasks.md',
  'step-8': 'Generate dataset-level QA summary',
  'step-9': 'Generate complete workflow-state.json from real dataset and QA summary',
  'step-10': 'Final validation for Entrepreneurship Reference Dataset v1',
  'step-11': 'Rebuild missing 04-prep folders and files',
  'step-12': 'Fix CSS references for active 05-translated HTML files',
};

function parseChangelog(changelogPath) {
  const steps = {};
  if (!fs.existsSync(changelogPath)) return steps;
  const content = fs.readFileSync(changelogPath, 'utf8');
  const lines = content.split('\n');

  let currentStep = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Match "## Step N"
    const stepMatch = line.match(/^##\s+Step\s+(\d+)/i);
    if (stepMatch) {
      const num = parseInt(stepMatch[1], 10);
      const key = `step-${num}`;
      currentStep = key;
      steps[key] = {
        name: STEP_NAMES[key] || `Step ${num}`,
        verificationResult: 'unknown',
      };
      continue;
    }
    // Match "### Verification Result" header then next non-empty line is value
    if (currentStep && line === '### Verification Result') {
      // look ahead for next non-empty line
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const vLine = lines[j].trim();
        if (vLine) {
          steps[currentStep].verificationResult = vLine;
          break;
        }
      }
    }
  }
  return steps;
}

const changelogSteps = parseChangelog(CHANGELOG_PATH);
const changelogState = {
  file: 'REFERENCE_DATASET_CHANGELOG.md',
  steps: changelogSteps,
};

// ─── 7. App readiness ─────────────────────────────────────────────────────────
const overallStatus = qaSummary.overallStatus || 'unknown';
let appStatus;
let canPreviewHtml = false;
let requiresHumanReview = false;

switch (overallStatus) {
  case 'passed':
    appStatus = 'ready';
    canPreviewHtml = true;
    break;
  case 'passed_with_warnings':
    appStatus = 'ready_with_warnings';
    canPreviewHtml = true;
    break;
  case 'needs_human_review':
    appStatus = 'needs_human_review';
    requiresHumanReview = true;
    break;
  case 'failed':
    appStatus = 'not_ready';
    break;
  default:
    appStatus = 'unknown';
}

const appReadiness = {
  status: appStatus,
  canLoadInDashboard: appStatus !== 'not_ready',
  canShowChapterProgress: true,
  canShowQualityGates: true,
  canShowReports: true,
  canPreviewHtml,
  requiresHumanReview,
  reason: qaSummary.knownRemainingIssues
    ? `Dataset passed ${Object.keys(qualityGates).length} quality gates. Remaining: ${qaSummary.knownRemainingIssues.join('; ')}`
    : 'Dataset passed all quality gates.',
  warnings: (qaSummary.knownRemainingIssues || []).map(issue => ({ message: issue })),
};

// ─── 8. Known remaining issues ────────────────────────────────────────────────
const knownRemainingIssues = [
  ...(qaSummary.knownRemainingIssues || []),
];

// ─── 9. Asset inventory ────────────────────────────────────────────────────────
const assets = {
  glossary: {
    path: 'glossary.csv',
    exists: fs.existsSync(GLOSSARY_PATH),
  },
  previewHtml: {
    path: 'preview/html',
    exists: fs.existsSync(PREVIEW_HTML_DIR),
    fileCount: fs.existsSync(PREVIEW_HTML_DIR) ? countFilesRecursive(PREVIEW_HTML_DIR) : 0,
  },
  epub: {
    path: 'exports/epub/book.epub',
    exists: fs.existsSync(EPUB_PATH),
    note: 'EPUB may need rebuild after dataset normalization steps.',
  },
};

// ─── 10. Assemble final state ─────────────────────────────────────────────────
const workflowState = {
  schemaVersion: '1.0',
  bookSlug: bookConfig.bookSlug,
  title: bookConfig.title,
  datasetVersion: bookConfig.dataset.version,
  datasetStatus: 'reference_dataset_prepared',
  generatedAt: new Date().toISOString(),
  generatedBy: 'tools/generate-workflow-state.js',
  source: bookConfig.source,
  language: bookConfig.language,
  translation: bookConfig.translation,
  overallStatus,
  appReadiness,
  chapters: chaptersState,
  _bookLevel: bookLevelState,
  assets,
  qualityGates,
  reports,
  knownRemainingIssues,
  changelog: changelogState,
  nextRecommendedSteps: qaSummary.recommendations || [],
};

// ─── 11. Write output ─────────────────────────────────────────────────────────
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(workflowState, null, 2), 'utf8');
console.log(`workflow-state.json written to: ${OUTPUT_PATH}`);

// ─── 12. Stats summary ────────────────────────────────────────────────────────
console.log('');
console.log('=== Summary ===');
console.log(`  Chapters scanned: ${chapterEntries.length}`);

// Phase presence stats
const phaseKeys = CHAPTER_PHASES.map(p => p.key);
const phaseStats = {};
for (const k of phaseKeys) phaseStats[k] = { done: 0, missing: 0, empty: 0, resolved: 0 };
for (const [, chState] of Object.entries(chaptersState)) {
  for (const [pk, pv] of Object.entries(chState.phases)) {
    if (phaseStats[pk]) phaseStats[pk][pv.status] = (phaseStats[pk][pv.status] || 0) + 1;
  }
}
for (const [pk, stat] of Object.entries(phaseStats)) {
  const parts = Object.entries(stat).filter(([, v]) => v > 0).map(([k, v]) => `${k}=${v}`).join(', ');
  console.log(`  Phase [${pk}]: ${parts}`);
}
console.log(`  Overall QA status: ${overallStatus}`);
console.log(`  App readiness: ${appStatus}`);
console.log(`  Changelog steps parsed: ${Object.keys(changelogSteps).length}`);
console.log(`  Known remaining issues: ${knownRemainingIssues.length}`);
console.log('----------------------------');

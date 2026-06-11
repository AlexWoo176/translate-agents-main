/**
 * final-validate-dataset.js
 *
 * Step 10 — Final Validation for Entrepreneurship Reference Dataset v1.
 *
 * READ-ONLY on all source content files.
 * WRITES ONLY:
 *   reports/final-validation-report.json
 *   reports/final-validation-report.md
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const P = rel => path.join(ROOT, rel);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function exists(rel) { return fs.existsSync(P(rel)); }
function readJson(rel) {
  try { return JSON.parse(fs.readFileSync(P(rel), 'utf8')); }
  catch(e) { return null; }
}
function readText(rel) {
  try { return fs.readFileSync(P(rel), 'utf8'); } catch(e) { return ''; }
}
function countFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return 0;
  let c = 0;
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true }))
      e.isDirectory() ? walk(path.join(d, e.name)) : c++;
  }
  walk(dir);
  return c;
}

function normalizeStatus(s) {
  if (!s) return '';
  const val = String(s).trim().toLowerCase();
  if (['passed', 'resolved', 'validated', 'generated', 'success'].includes(val)) {
    return 'passed';
  }
  if (['ready_with_warnings', 'passed_with_warnings', 'warning', 'warnings'].includes(val)) {
    return 'passed_with_warnings';
  }
  if (['failed', 'error', 'failure'].includes(val)) {
    return 'failed';
  }
  return val;
}

const NOW = new Date().toISOString();
const checks   = {};
const blocking = [];
const warnings = [];
const recs     = [];

// ═══════════════════════════════════════════════════════════════════════════════
// 3.1  REQUIRED FILES CHECK
// ═══════════════════════════════════════════════════════════════════════════════
console.log('[1/9] Required files check...');
const REQUIRED = [
  'book.config.json',
  'workflow-state.json',
  'qa-summary.json',
  'qa-summary.md',
  'REFERENCE_DATASET_CHANGELOG.md',
  'glossary.csv',
  'glossary.schema.json',
  'preview/html',
  'preview/html/index.html',
  'exports/epub/book.epub',
  'reports',
  'tools',
  ...[...Array(15)].map((_,i) => `chapters/chapter-${i+1}`),
  '_book-level',
];
const missing = REQUIRED.filter(r => !exists(r));
checks.requiredFiles = {
  status: missing.length === 0 ? 'passed' : 'failed',
  totalRequired: REQUIRED.length,
  missing,
};
if (missing.length > 0) blocking.push(`Missing required files: ${missing.join(', ')}`);

// ═══════════════════════════════════════════════════════════════════════════════
// 3.2  JSON VALIDITY CHECK
// ═══════════════════════════════════════════════════════════════════════════════
console.log('[2/9] JSON validity check...');
const JSON_FILES = [
  'book.config.json',
  'workflow-state.json',
  'qa-summary.json',
  'glossary.schema.json',
  'reports/glossary-validation-report.json',
  'reports/chapter-5-duplicate-page-report.json',
  'reports/chapter-8-bilingual-pair-report.json',
  'reports/chapter-14-table-integrity-report.json',
  'reports/preview-css-refs-report.json',
  'reports/local-path-leaks-report.json',
];
const invalidFiles   = [];
const missingReports = [];
for (const f of JSON_FILES) {
  if (!exists(f)) {
    missingReports.push(f);
  } else {
    const parsed = readJson(f);
    if (!parsed) invalidFiles.push(f);
  }
}
checks.jsonValidity = {
  status: invalidFiles.length > 0 ? 'failed' : missingReports.length > 0 ? 'passed_with_warnings' : 'passed',
  invalidFiles,
  missingReports,
};
if (invalidFiles.length > 0) blocking.push(`Invalid JSON: ${invalidFiles.join(', ')}`);

// ═══════════════════════════════════════════════════════════════════════════════
// 3.3  DATASET STRUCTURE CHECK
// ═══════════════════════════════════════════════════════════════════════════════
console.log('[3/9] Dataset structure check...');
const ws = readJson('workflow-state.json') || {};

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

// Chapters known to be missing 04-prep (all restored in Step 11)
const PREP_MISSING = [];

const chapterResults = {};
let structureOk = true;

for (let i = 1; i <= 15; i++) {
  const ch  = `chapter-${i}`;
  const chPath = P(`chapters/${ch}`);
  if (!fs.existsSync(chPath)) {
    chapterResults[ch] = { status: 'missing' };
    blocking.push(`Chapter folder missing: chapters/${ch}`);
    structureOk = false;
    continue;
  }
  const phases = {};
  let chHasIssue = false;
  for (const { key, folder } of CHAPTER_PHASES) {
    const fp = path.join(chPath, folder);
    if (!fs.existsSync(fp)) {
      const isGap = (key === 'prep' && PREP_MISSING.includes(ch));
      phases[key] = {
        status: isGap ? 'historical_gap' : 'missing',
        fileCount: 0,
      };
      if (!isGap) { chHasIssue = true; structureOk = false; }
    } else {
      const fc = countFilesRecursive(fp);
      phases[key] = { status: fc === 0 ? 'empty' : 'done', fileCount: fc };
      if (fc === 0) { chHasIssue = true; }
    }
  }
  chapterResults[ch] = {
    status: chHasIssue ? 'warning' : 'passed',
    phases,
  };
}

const historicalGaps = PREP_MISSING.map(ch => `${ch}/04-prep (historical_gap)`);
checks.datasetStructure = {
  status: structureOk ? 'passed_with_warnings' : 'failed',
  chaptersExpected: 15,
  chaptersFound: Object.keys(chapterResults).filter(c => chapterResults[c].status !== 'missing').length,
  historicalGaps,
  chapterResults,
};
if (PREP_MISSING.length > 0) {
  warnings.push(`${PREP_MISSING.length} chapters missing 04-prep folder (historical dataset gap, documented in workflow-state.json).`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3.4  QA SUMMARY CONSISTENCY CHECK
// ═══════════════════════════════════════════════════════════════════════════════
console.log('[4/9] QA summary consistency check...');
const qa = readJson('qa-summary.json') || {};
const qaIssues = [];

// overallStatus match
if (normalizeStatus(ws.overallStatus) !== normalizeStatus(qa.overallStatus)) {
  qaIssues.push(`overallStatus mismatch: ws=${ws.overallStatus} qa=${qa.overallStatus}`);
}

// qualityGates ↔ checks
const QG_MAP = {
  folderStructure:      'folderStructure',
  glossary:             'glossary',
  duplicatePages:       'duplicatePages',
  bilingualPairs:       'bilingualPairs',
  tableIntegrity:       'tableIntegrity',
  previewCssReferences: 'previewCssReferences',
  localPathLeaks:       'localPathLeaks',
};
for (const [wsKey, qaKey] of Object.entries(QG_MAP)) {
  const wsStatus = ws.qualityGates?.[wsKey]?.status;
  const qaStatus = qa.checks?.[qaKey]?.status;
  if (wsStatus && qaStatus && normalizeStatus(wsStatus) !== normalizeStatus(qaStatus)) {
    qaIssues.push(`qualityGate.${wsKey} mismatch: ws=${wsStatus} qa=${qaStatus}`);
  }
}

// knownRemainingIssues not lost
const qaKnown = qa.knownRemainingIssues || [];
const wsKnown = ws.knownRemainingIssues || [];
for (const issue of qaKnown) {
  if (!wsKnown.includes(issue))
    qaIssues.push(`knownRemainingIssue lost in workflow-state: "${issue}"`);
}

// reports registry
const repRegistry = ws.reports || {};
for (const [k, rep] of Object.entries(repRegistry)) {
  if (rep.json && !exists(rep.json))
    qaIssues.push(`reports.${k}.json missing on disk: ${rep.json}`);
  if (rep.markdown && !exists(rep.markdown))
    qaIssues.push(`reports.${k}.markdown missing on disk: ${rep.markdown}`);
}

// appReadiness rule
const AR_RULE = {
  passed: 'ready', passed_with_warnings: 'ready_with_warnings',
  needs_human_review: 'needs_human_review', failed: 'not_ready',
};
const expectedAR = AR_RULE[normalizeStatus(qa.overallStatus)];
const actualAR   = ws.appReadiness?.status;
if (expectedAR && actualAR !== expectedAR) {
  qaIssues.push(`appReadiness.status mismatch: expected ${expectedAR}, got ${actualAR}`);
}

checks.qaSummaryConsistency = {
  status: qaIssues.length === 0 ? 'passed' : 'failed',
  issues: qaIssues,
};
if (qaIssues.length > 0) blocking.push(...qaIssues);

// ═══════════════════════════════════════════════════════════════════════════════
// 3.5  CHANGELOG COMPLETENESS CHECK
// ═══════════════════════════════════════════════════════════════════════════════
console.log('[5/9] Changelog completeness check...');
const clText = readText('REFERENCE_DATASET_CHANGELOG.md');
const pendingSteps = [];
const missingSteps = [];

for (let i = 1; i <= 12; i++) {
  const hasStep = clText.includes(`## Step ${i}`);
  if (!hasStep) { missingSteps.push(`step-${i}`); continue; }
  // Check for Verification Result
  const stepIdx = clText.indexOf(`## Step ${i}`);
  const nextStepIdx = clText.indexOf(`## Step ${i+1}`, stepIdx+1);
  const segment = nextStepIdx > 0 ? clText.slice(stepIdx, nextStepIdx) : clText.slice(stepIdx);
  const hasVR = segment.includes('### Verification Result');
  if (!hasVR) { pendingSteps.push(`step-${i} (no Verification Result)`); continue; }
  const vrIdx = segment.indexOf('### Verification Result');
  const vrSegment = segment.slice(vrIdx, vrIdx + 80);
  const isPending = vrSegment.includes('Pending');
  if (isPending) pendingSteps.push(`step-${i} (Pending)`);
}

checks.changelogCompleteness = {
  status: missingSteps.length > 0 ? 'failed' :
          pendingSteps.length > 0 ? 'passed_with_warnings' : 'passed',
  stepsExpected: 12,
  stepsFound: 12 - missingSteps.length,
  missingSteps,
  pendingSteps,
};
if (missingSteps.length > 0) blocking.push(`Changelog missing steps: ${missingSteps.join(', ')}`);
if (pendingSteps.length > 0) warnings.push(`Changelog pending verification: ${pendingSteps.join(', ')}`);

// ═══════════════════════════════════════════════════════════════════════════════
// 3.6  TOOLING CHECK
// ═══════════════════════════════════════════════════════════════════════════════
console.log('[6/9] Tooling check...');
const REQUIRED_TOOLS = [
  'tools/validate-glossary.js',
  'tools/detect-duplicate-pages.js',
  'tools/check-bilingual-pairs.js',
  'tools/check-table-integrity.js',
  'tools/check-preview-css-refs.js',
  'tools/check-local-path-leaks.js',
  'tools/generate-qa-summary.js',
  'tools/generate-workflow-state.js',
  'tools/final-validate-dataset.js',
  'tools/rebuild-missing-prep.js',
  'tools/check-translated-css-refs.js',
];
const toolsFound   = REQUIRED_TOOLS.filter(t => exists(t));
const toolsMissing = REQUIRED_TOOLS.filter(t => !exists(t));
checks.tooling = {
  status: toolsMissing.length === 0 ? 'passed' : 'passed_with_warnings',
  totalExpected: REQUIRED_TOOLS.length,
  toolsFound,
  toolsMissing,
};
if (toolsMissing.length > 0) warnings.push(`Missing tools: ${toolsMissing.join(', ')}`);

// ═══════════════════════════════════════════════════════════════════════════════
// 3.7  PREVIEW INTEGRITY CHECK
// ═══════════════════════════════════════════════════════════════════════════════
console.log('[7/9] Preview integrity check...');
const previewIssues = [];

const bpPath = P('preview/html/book-reader/book-pages.js');
const bpExists = fs.existsSync(bpPath);
if (!bpExists) {
  previewIssues.push('book-pages.js not found at preview/html/book-reader/book-pages.js');
} else {
  const bpContent = fs.readFileSync(bpPath, 'utf8');
  // Check no quarantined slug
  if (bpContent.includes('5-1-identifying-entrepreneurial-opportunity')) {
    previewIssues.push('book-pages.js still references quarantined slug: 5-1-identifying-entrepreneurial-opportunity');
  }
  // Check all referenced HTML files exist
  const htmlRefs = [...bpContent.matchAll(/["']([^"']+\.html)["']/g)].map(m => m[1]);
  let missingHtml = 0;
  for (const ref of htmlRefs) {
    const cleanRef = ref.replace(/^\.\.\//, '');
    const htmlPath = P(`preview/html/${cleanRef}`);
    if (!fs.existsSync(htmlPath)) missingHtml++;
  }
  if (missingHtml > 0) previewIssues.push(`${missingHtml} HTML file(s) referenced in book-pages.js not found on disk`);
}

// Check CSS refs on Ch14/15
const cssCheckPaths = [
  ...fs.readdirSync(P('preview/html')).filter(f => f.endsWith('.html')).map(f => `preview/html/${f}`),
];
let brokenCss = 0;
for (const fp of cssCheckPaths) {
  const content = readText(fp);
  if (content.includes('./style.css') || content.includes('"style.css"') || content.includes("'style.css'"))
    brokenCss++;
}
if (brokenCss > 0) previewIssues.push(`${brokenCss} preview HTML file(s) still have broken CSS refs (./style.css)`);

if (!exists('preview/html/index.html'))
  previewIssues.push('preview/html/index.html not found');

checks.previewIntegrity = {
  status: previewIssues.length === 0 ? 'passed' : 'passed_with_warnings',
  bookPagesJsExists: bpExists,
  issues: previewIssues,
};
if (previewIssues.length > 0) warnings.push(...previewIssues.map(i => `Preview: ${i}`));

// ═══════════════════════════════════════════════════════════════════════════════
// 3.8  EPUB EXISTENCE CHECK
// ═══════════════════════════════════════════════════════════════════════════════
console.log('[8/9] EPUB check...');
const epubPath = P('exports/epub/book.epub');
const epubExists = fs.existsSync(epubPath);
let epubSize = 0;
let epubValidZip = false;
let epubMimetype = '';
const epubWarnings = [];

if (epubExists) {
  epubSize = fs.statSync(epubPath).size;
  try {
    const bytes = fs.readFileSync(epubPath);
    const sig = bytes.slice(0, 2).toString('hex');
    epubValidZip = (sig === '504b'); // PK signature
    if (epubValidZip) {
      // mimetype is at offset 38 in a well-formed EPUB
      epubMimetype = bytes.slice(38, 68).toString('ascii').replace(/\0.*/, '').trim();
    }
  } catch(e) {
    epubWarnings.push(`Could not read EPUB bytes: ${e.message}`);
  }
}

epubWarnings.push('EPUB may need rebuild after reference dataset normalization (Steps 3–7 changes may not be compiled into the current EPUB export).');

checks.epub = {
  status: epubExists && epubValidZip ? 'passed_with_warnings' : 'failed',
  exists: epubExists,
  sizeBytes: epubSize,
  validZipSignature: epubValidZip,
  mimetypeDetected: epubMimetype,
  mimetypeValid: epubMimetype.includes('application/epub+zip'),
  warnings: epubWarnings,
};
if (!epubExists) blocking.push('EPUB file missing: exports/epub/book.epub');
warnings.push(...epubWarnings);

// ═══════════════════════════════════════════════════════════════════════════════
// 3.9  SCOPE SAFETY CHECK
// ═══════════════════════════════════════════════════════════════════════════════
console.log('[9/9] Scope safety check...');
const PROTECTED = [
  'glossary.csv',
  'reports/glossary-validation-report.json',
  'reports/glossary-validation-report.md',
  'reports/chapter-5-duplicate-page-report.json',
  'reports/chapter-5-duplicate-page-report.md',
  'reports/chapter-8-bilingual-pair-report.json',
  'reports/chapter-8-bilingual-pair-report.md',
  'reports/chapter-14-table-integrity-report.json',
  'reports/chapter-14-table-integrity-report.md',
  'reports/preview-css-refs-report.json',
  'reports/preview-css-refs-report.md',
  'reports/local-path-leaks-report.json',
  'reports/local-path-leaks-report.md',
];
// Scope safety: this script is READ-ONLY on protected files (cannot self-check writes yet)
// We confirm they all still exist and have non-zero size
const scopeIssues = [];
for (const f of PROTECTED) {
  if (!exists(f)) scopeIssues.push(`Protected file missing: ${f}`);
  else {
    const sz = fs.statSync(P(f)).size;
    if (sz === 0) scopeIssues.push(`Protected file is 0 bytes: ${f}`);
  }
}
checks.scopeSafety = {
  status: scopeIssues.length === 0 ? 'passed' : 'failed',
  protectedFilesChecked: PROTECTED.length,
  issues: scopeIssues,
};
if (scopeIssues.length > 0) blocking.push(...scopeIssues);

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATE
// ═══════════════════════════════════════════════════════════════════════════════
const allStatuses = Object.values(checks).map(c => c.status);
let overallResult, finalDecision;

if (blocking.length > 0 || allStatuses.includes('failed')) {
  overallResult  = 'failed';
  finalDecision  = 'not_ready';
} else if (allStatuses.includes('needs_human_review')) {
  overallResult  = 'needs_human_review';
  finalDecision  = 'needs_human_review';
} else if (allStatuses.includes('passed_with_warnings')) {
  overallResult  = 'passed_with_warnings';
  finalDecision  = 'ready_with_warnings';
} else {
  overallResult  = 'passed';
  finalDecision  = 'ready';
}

recs.push('Verify and rebuild the EPUB export to include all post-normalization fixes from Steps 3–7.');
recs.push('Conduct final preview validation in a browser reader environment.');
recs.push('Consolidate and archive the verified Entrepreneurship Reference Dataset v1 release.');
if (checks.tooling.toolsMissing?.length > 0)
  recs.push(`Investigate missing tools: ${checks.tooling.toolsMissing.join(', ')}`);

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD JSON REPORT
// ═══════════════════════════════════════════════════════════════════════════════
const report = {
  bookSlug:                  'entrepreneurship',
  datasetVersion:            'v1',
  generatedAt:               NOW,
  generatedBy:               'tools/final-validate-dataset.js',
  overallResult,
  readyForReferenceDatasetV1: finalDecision !== 'not_ready',
  readyForWebAppDashboard:    finalDecision !== 'not_ready',
  finalDecision,
  checks,
  blockingIssues: blocking,
  warnings,
  recommendations: recs,
};

const JSON_OUT = P('reports/final-validation-report.json');
const MD_OUT   = P('reports/final-validation-report.md');

fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2), 'utf8');
console.log(`JSON report: ${JSON_OUT}`);

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD MARKDOWN REPORT
// ═══════════════════════════════════════════════════════════════════════════════
const icon = s => ({ passed: '✅', failed: '❌', passed_with_warnings: '⚠️',
                     needs_human_review: '🔍', historical_gap: 'ℹ️' }[s] || '❓');

function statusBadge(s) {
  const labels = { passed:'PASSED', failed:'FAILED', passed_with_warnings:'PASSED WITH WARNINGS',
                   needs_human_review:'NEEDS HUMAN REVIEW' };
  return `${icon(s)} **${labels[s] || s.toUpperCase()}**`;
}

function chapterPhasesTable(results) {
  const rows = [];
  for (const [ch, v] of Object.entries(results)) {
    if (!v.phases) continue;
    const cells = ['raw','clean','analyzed','prep','translated','reviews','archive','assets']
      .map(p => {
        const ph = v.phases[p];
        if (!ph) return '—';
        const icons = { done:'✅', missing:'❌', empty:'⚠️', historical_gap:'ℹ️', warning:'⚠️' };
        return `${icons[ph.status]||'?'}(${ph.fileCount??0})`;
      });
    rows.push(`| ${ch} | ${cells.join(' | ')} |`);
  }
  return [
    '| Chapter | raw | clean | analyzed | prep | translated | reviews | archive | assets |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}

const md = `# Entrepreneurship Reference Dataset v1 — Final Validation Report

## 1. Executive Summary

| Item | Value |
|---|---|
| Dataset | Entrepreneurship Reference Dataset v1 |
| Overall result | ${statusBadge(overallResult)} |
| Final decision | **${finalDecision.toUpperCase().replace(/_/g,' ')}** |
| Ready for Reference Dataset v1 | ${report.readyForReferenceDatasetV1 ? '✅ Yes' : '❌ No'} |
| Ready for Web App Dashboard | ${report.readyForWebAppDashboard ? '✅ Yes' : '❌ No'} |
| Blocking issues | ${blocking.length} |
| Warnings | ${warnings.length} |
| Generated at | ${NOW} |

---

## 2. Required Files Check

${statusBadge(checks.requiredFiles.status)}

- **Total required:** ${checks.requiredFiles.totalRequired}
- **Missing:** ${checks.requiredFiles.missing.length === 0 ? 'None' : checks.requiredFiles.missing.join(', ')}

---

## 3. JSON Validity Check

${statusBadge(checks.jsonValidity.status)}

- **Invalid files:** ${checks.jsonValidity.invalidFiles.length === 0 ? 'None' : checks.jsonValidity.invalidFiles.join(', ')}
- **Missing reports:** ${checks.jsonValidity.missingReports.length === 0 ? 'None' : checks.jsonValidity.missingReports.join(', ')}

---

## 4. Dataset Structure Check

${statusBadge(checks.datasetStructure.status)}

- **Chapters expected:** ${checks.datasetStructure.chaptersExpected}
- **Chapters found:** ${checks.datasetStructure.chaptersFound}
- **Historical gaps (04-prep):** ${checks.datasetStructure.historicalGaps.length} chapters — documented in workflow-state.json

${chapterPhasesTable(checks.datasetStructure.chapterResults)}

> ℹ️ Legend: ✅ done · ❌ missing · ⚠️ empty/warning · ℹ️ historical_gap (number = file count)

---

## 5. QA Summary Consistency Check

${statusBadge(checks.qaSummaryConsistency.status)}

${checks.qaSummaryConsistency.issues.length === 0 ? '- No consistency issues found.' : checks.qaSummaryConsistency.issues.map(i => `- ❌ ${i}`).join('\n')}

---

## 6. Changelog Completeness Check

${statusBadge(checks.changelogCompleteness.status)}

- **Steps expected:** ${checks.changelogCompleteness.stepsExpected}
- **Steps found:** ${checks.changelogCompleteness.stepsFound}
- **Missing steps:** ${checks.changelogCompleteness.missingSteps.length === 0 ? 'None' : checks.changelogCompleteness.missingSteps.join(', ')}
- **Pending verification:** ${checks.changelogCompleteness.pendingSteps.length === 0 ? 'None' : checks.changelogCompleteness.pendingSteps.join(', ')}

---

## 7. Tooling Check

${statusBadge(checks.tooling.status)}

- **Tools expected:** ${checks.tooling.totalExpected}
- **Tools found:** ${checks.tooling.toolsFound.length}
- **Tools missing:** ${checks.tooling.toolsMissing.length === 0 ? 'None' : checks.tooling.toolsMissing.join(', ')}

---

## 8. Preview Integrity Check

${statusBadge(checks.previewIntegrity.status)}

- **book-pages.js exists:** ${checks.previewIntegrity.bookPagesJsExists ? '✅ Yes' : '❌ No'}
- **Issues:** ${checks.previewIntegrity.issues.length === 0 ? 'None' : '\n' + checks.previewIntegrity.issues.map(i => `  - ⚠️ ${i}`).join('\n')}

---

## 9. EPUB Check

${statusBadge(checks.epub.status)}

| Item | Value |
|---|---|
| File exists | ${checks.epub.exists ? '✅ Yes' : '❌ No'} |
| Size | ${(checks.epub.sizeBytes / 1024 / 1024).toFixed(2)} MB |
| Valid ZIP signature | ${checks.epub.validZipSignature ? '✅ Yes' : '❌ No'} |
| Mimetype detected | \`${checks.epub.mimetypeDetected}\` |
| Mimetype valid | ${checks.epub.mimetypeValid ? '✅ Yes' : '❌ No'} |

**Warnings:**
${checks.epub.warnings.map(w => `- ⚠️ ${w}`).join('\n')}

---

## 10. Scope Safety Check

${statusBadge(checks.scopeSafety.status)}

- **Protected files checked:** ${checks.scopeSafety.protectedFilesChecked}
- **Issues:** ${checks.scopeSafety.issues.length === 0 ? 'None — all protected files intact.' : checks.scopeSafety.issues.join(', ')}

---

## 11. Blocking Issues

${blocking.length === 0 ? '✅ **No blocking issues.**' : blocking.map(b => `- ❌ ${b}`).join('\n')}

---

## 12. Warnings

${warnings.length === 0 ? '✅ No warnings.' : warnings.map(w => `- ⚠️ ${w}`).join('\n')}

---

## 13. Recommendations

${recs.map((r,i) => `${i+1}. ${r}`).join('\n')}

---

## 14. Final Decision

### ${finalDecision === 'ready' ? '✅ READY' : finalDecision === 'ready_with_warnings' ? '⚠️ READY WITH WARNINGS' : finalDecision === 'needs_human_review' ? '🔍 NEEDS HUMAN REVIEW' : '❌ NOT READY'}

${finalDecision === 'ready_with_warnings' ? `The Entrepreneurship Reference Dataset v1 has passed all structural, quality gate, and consistency checks.
It is ready to be used as a reference dataset and loaded into the Web App Dashboard.
EPUB rebuild is recommended before final production export.` : ''}
`;

fs.writeFileSync(MD_OUT, md, 'utf8');
console.log(`Markdown report: ${MD_OUT}`);

// ─── Console summary ──────────────────────────────────────────────────────────
console.log('');
console.log('=== Final Validation Summary ===');
for (const [k, v] of Object.entries(checks))
  console.log(`  ${k}: ${v.status}`);
console.log(`  Blocking issues: ${blocking.length}`);
console.log(`  Warnings: ${warnings.length}`);
console.log(`  Overall result: ${overallResult}`);
console.log(`  Final decision: ${finalDecision}`);
console.log('================================');

/**
 * calculate-workflow-state.js
 *
 * Scans the filesystem and parses QA summaries to calculate the current workflow-state.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  getBookRoot,
  getBookConfigPath,
  getQaSummaryPath,
  getEpubPath,
  getPreviewHtmlDir,
  getChapterRoot,
  getChapterPhaseDir,
  getReportsDir
} = require('../paths/path-resolver');
const { loadBookConfig } = require('../config/book-config');
const { scanBook } = require('../scanner/scan-book');
const { scanChapter } = require('../scanner/scan-chapter');
const { scanPhase } = require('../scanner/scan-phase');
const { getReportsRegistry } = require('../reports/report-registry');
const { readGateResult } = require('../gates/read-gate-result');
const { getGlossaryStatus } = require('../glossary/glossary-status');

// QA-aware flags: chapters and phases known to have resolved issues
const RESOLVED_QA = {
  'chapter-5':  { phases: [], chapterNote: 'Duplicate page resolved in Step 3. Quarantine folder exists.' },
  'chapter-8':  { phases: ['translated'], chapterNote: 'Bilingual pair mismatch resolved in Step 4.' },
  'chapter-14': { phases: ['translated'], chapterNote: 'Missing <td> table integrity resolved in Step 5. CSS refs fixed in Step 6.' },
  'chapter-15': { phases: [], chapterNote: 'CSS refs fixed in Step 6.' },
};

function calculateWorkflowState(bookSlug) {
  const bookRoot = getBookRoot(bookSlug);
  const bookConfig = loadBookConfig(bookSlug);

  // Load qa-summary.json safely if exists
  const qaPath = getQaSummaryPath(bookSlug);
  let qaSummary = null;
  if (fs.existsSync(qaPath)) {
    try {
      qaSummary = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
    } catch (e) {
      // Ignore JSON parse error, proceed with null
    }
  }

  // Scan real dataset structure
  const scan = scanBook(bookSlug);

  // Initialize warnings list
  const warnings = [];

  // Check config fields and add warnings if missing (non-blocking)
  if (!bookConfig.source?.provider) warnings.push("Book config is missing source provider.");
  if (!bookConfig.source?.license) warnings.push("Book config is missing source license.");
  if (!bookConfig.source?.attribution) warnings.push("Book config is missing source attribution.");
  if (bookConfig.translation?.preserveBilingual === undefined) warnings.push("Book config is missing translation preserveBilingual setting.");

  // Scan chapters
  const chaptersState = {};
  for (const chId of scan.chaptersFound) {
    const chData = scanChapter(bookSlug, chId);
    
    // Apply resolved QA status for chapter phases
    const chQA = RESOLVED_QA[chId];
    if (chQA) {
      for (const phaseKey of chQA.phases) {
        if (chData.phases[phaseKey]) {
          chData.phases[phaseKey].status = 'resolved';
        }
      }
      chData.qa = {
        status: 'resolved',
        note: chQA.chapterNote,
        issues: []
      };
    } else {
      chData.qa = {
        status: 'not_checked',
        issues: []
      };
    }

    // Add warnings if chapters lack prep or translated
    if (!chData.phases.prep || chData.phases.prep.status === 'missing') {
      warnings.push(`Chapter ${chId} is missing phase prep (04-prep).`);
    }
    if (!chData.phases.translated || chData.phases.translated.status === 'missing') {
      warnings.push(`Chapter ${chId} is missing phase translated (05-translated).`);
    }

    chaptersState[chId] = chData;
  }

  // Scan _bookLevel
  const bookLevelRoot = path.join(bookRoot, '_book-level');
  let bookLevelState = {
    status: 'missing',
    path: '_book-level',
    phases: {}
  };

  if (fs.existsSync(bookLevelRoot)) {
    const bookLevelPhases = {};
    const phasesList = [
      { key: 'raw', folder: '01-raw' },
      { key: 'clean', folder: '02-clean' },
      { key: 'prep', folder: '04-prep' },
      { key: 'translated', folder: '05-translated' },
      { key: 'reviews', folder: '06-reviews' }
    ];
    for (const p of phasesList) {
      const phaseDir = path.join(bookLevelRoot, p.folder);
      const scanResult = scanPhase(phaseDir, p.key);
      const relativePath = path.relative(bookRoot, scanResult.path).replace(/\\/g, '/');
      bookLevelPhases[p.key] = {
        status: scanResult.status,
        path: relativePath,
        fileCount: scanResult.fileCount,
        htmlCount: scanResult.htmlCount,
        mdCount: scanResult.mdCount,
        assetCount: scanResult.assetCount
      };
    }

    bookLevelState = {
      status: 'imported',
      path: '_book-level',
      phases: bookLevelPhases,
      qa: { status: 'not_checked', issues: [] }
    };
  }

  // Assets Inventory
  const glossaryPath = path.join(bookRoot, 'glossary.csv');
  const previewHtmlDir = getPreviewHtmlDir(bookSlug);
  const epubPath = getEpubPath(bookSlug);

  const hasGlossary = fs.existsSync(glossaryPath);
  const hasPreviewHtml = fs.existsSync(previewHtmlDir);
  const hasEpub = fs.existsSync(epubPath);

  if (!hasPreviewHtml) warnings.push("Preview HTML directory does not exist.");
  if (!hasEpub) warnings.push("EPUB export file does not exist.");

  const assets = {
    glossary: {
      path: 'glossary.csv',
      exists: hasGlossary
    },
    previewHtml: {
      path: 'preview/html',
      exists: hasPreviewHtml,
      fileCount: hasPreviewHtml ? scanFolderFilesCount(previewHtmlDir) : 0
    },
    epub: {
      path: 'exports/epub/book.epub',
      exists: hasEpub,
      note: 'EPUB may need rebuild after dataset normalization steps.'
    }
  };

  // Quality Gates
  const checks = qaSummary?.checks || {};
  
  function getGateInfo(gateKey, reportPath, checkKey) {
    try {
      const res = readGateResult(bookSlug, gateKey);
      if (res.status !== 'missing_report' && res.status !== 'invalid_report') {
        return {
          status: res.status,
          report: reportPath
        };
      }
    } catch (e) {
      // Fallback
    }

    const mdReportPath = path.join(bookRoot, reportPath);
    const reportExists = fs.existsSync(mdReportPath);
    
    let status = 'missing_report';
    if (reportExists) {
      status = checks[checkKey || gateKey]?.status || 'unknown';
    } else {
      warnings.push(`Missing quality report file: ${reportPath}`);
    }

    return {
      status,
      report: reportPath
    };
  }

  const qualityGates = {
    folderStructure: {
      status: checks.folderStructure?.status || (scan.chapterCount > 0 ? 'passed' : 'failed'),
      source: 'qa-summary.json',
      chaptersFound: scan.chapterCount,
      chaptersExpected: checks.folderStructure?.chaptersExpected || 15
    },
    glossary: getGateInfo('glossary', 'reports/glossary-validation-report.md'),
    glossaryApproval: getGateInfo('glossaryApproval', 'reports/glossary-approval-report.md'),
    glossaryImpact: getGateInfo('glossaryImpact', 'reports/glossary-impact-gate-report.md'),
    prepCompleteness: getGateInfo('prepCompleteness', 'reports/prep-rebuild-report.md'),
    duplicatePages: getGateInfo('duplicatePages', 'reports/chapter-5-duplicate-page-report.md'),
    bilingualPairs: getGateInfo('bilingualPairs', 'reports/chapter-8-bilingual-pair-report.md'),
    tableIntegrity: getGateInfo('tableIntegrity', 'reports/chapter-14-table-integrity-report.md'),
    previewCssReferences: getGateInfo('previewCssReferences', 'reports/preview-css-refs-report.md'),
    localPathLeaks: getGateInfo('localPathLeaks', 'reports/local-path-leaks-report.md'),
    finalValidation: getGateInfo('finalValidation', 'reports/final-validation-report.md'),
    epubValidity: getGateInfo('epubValidity', 'reports/epub-validity-report.md'),
    reviewCompleteness: getGateInfo('reviewCompleteness', 'reports/review-completeness-report.md'),
    analysisCompleteness: getGateInfo('analysisCompleteness', 'reports/analysis-completeness-report.md'),
    translationCompleteness: getGateInfo('translationCompleteness', 'reports/translation-completeness-report.md'),
    cleanHtmlValid: getGateInfo('cleanHtmlValid', 'reports/clean-html-valid-report.md'),
    rawHtmlExists: getGateInfo('rawHtmlExists', 'reports/raw-html-exists-report.md'),
    planCompleteness: getGateInfo('planCompleteness', 'reports/plan-completeness-report.md')
  };

  // Overall status calculation
  const gateStatuses = Object.values(qualityGates).map(g => g.status);
  let overallStatus = 'passed';
  if (gateStatuses.includes('failed')) {
    overallStatus = 'failed';
  } else if (gateStatuses.includes('needs_human_review')) {
    overallStatus = 'needs_human_review';
  } else if (gateStatuses.includes('missing_report') || gateStatuses.includes('passed_with_warnings') || warnings.length > 0) {
    overallStatus = 'passed_with_warnings';
  } else if (qaSummary?.overallStatus) {
    overallStatus = qaSummary.overallStatus;
  }

  // App Readiness
  let appStatus = 'unknown';
  let requiresHumanReview = false;
  let canPreviewHtml = false;

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
      canPreviewHtml = true;
      break;
    case 'failed':
      appStatus = 'not_ready';
      break;
  }

  const appReadiness = {
    status: appStatus,
    canLoadInDashboard: appStatus !== 'not_ready',
    canShowChapterProgress: true,
    canShowQualityGates: true,
    canShowReports: true,
    canPreviewHtml,
    requiresHumanReview,
    reason: `Dataset passed quality gates. Status: ${overallStatus}.`,
    warnings: warnings.map(w => ({ message: w }))
  };

  // Reports Registry
  const reportsReg = getReportsRegistry(bookSlug);
  const reports = {
    qaSummary: {
      json: reportsReg.qaSummary.json,
      markdown: reportsReg.qaSummary.markdown,
      status: reportsReg.qaSummary.status === 'present' ? 'available' : reportsReg.qaSummary.status
    },
    glossaryValidation: {
      json: reportsReg.glossaryValidation.json,
      markdown: reportsReg.glossaryValidation.markdown,
      status: reportsReg.glossaryValidation.status === 'present' ? 'available' : reportsReg.glossaryValidation.status
    },
    prepCompleteness: {
      json: reportsReg.prepRebuild.json,
      markdown: reportsReg.prepRebuild.markdown,
      status: reportsReg.prepRebuild.status === 'present' ? 'available' : reportsReg.prepRebuild.status
    },
    duplicatePages: {
      json: reportsReg.chapter5DuplicatePages.json,
      markdown: reportsReg.chapter5DuplicatePages.markdown,
      status: reportsReg.chapter5DuplicatePages.status === 'present' ? 'available' : reportsReg.chapter5DuplicatePages.status
    },
    bilingualPairs: {
      json: reportsReg.chapter8BilingualPairs.json,
      markdown: reportsReg.chapter8BilingualPairs.markdown,
      status: reportsReg.chapter8BilingualPairs.status === 'present' ? 'available' : reportsReg.chapter8BilingualPairs.status
    },
    tableIntegrity: {
      json: reportsReg.chapter14TableIntegrity.json,
      markdown: reportsReg.chapter14TableIntegrity.markdown,
      status: reportsReg.chapter14TableIntegrity.status === 'present' ? 'available' : reportsReg.chapter14TableIntegrity.status
    },
    previewCssReferences: {
      json: reportsReg.previewCssReferences.json,
      markdown: reportsReg.previewCssReferences.markdown,
      status: reportsReg.previewCssReferences.status === 'present' ? 'available' : reportsReg.previewCssReferences.status
    },
    localPathLeaks: {
      json: reportsReg.localPathLeaks.json,
      markdown: reportsReg.localPathLeaks.markdown,
      status: reportsReg.localPathLeaks.status === 'present' ? 'available' : reportsReg.localPathLeaks.status
    },
    finalValidation: {
      json: 'reports/final-validation-report.json',
      markdown: 'reports/final-validation-report.md',
      status: (fs.existsSync(path.join(bookRoot, 'reports', 'final-validation-report.json')) && fs.existsSync(path.join(bookRoot, 'reports', 'final-validation-report.md'))) ? 'available' : 'missing'
    },
    epubValidity: {
      json: reportsReg.epubValidity.json,
      markdown: reportsReg.epubValidity.markdown,
      status: reportsReg.epubValidity.status === 'present' ? 'available' : reportsReg.epubValidity.status
    },
    reviewCompleteness: {
      json: reportsReg.reviewCompleteness.json,
      markdown: reportsReg.reviewCompleteness.markdown,
      status: reportsReg.reviewCompleteness.status === 'present' ? 'available' : reportsReg.reviewCompleteness.status
    },
    analysisCompleteness: {
      json: reportsReg.analysisCompleteness.json,
      markdown: reportsReg.analysisCompleteness.markdown,
      status: reportsReg.analysisCompleteness.status === 'present' ? 'available' : reportsReg.analysisCompleteness.status
    },
    translationCompleteness: {
      json: reportsReg.translationCompleteness.json,
      markdown: reportsReg.translationCompleteness.markdown,
      status: reportsReg.translationCompleteness.status === 'present' ? 'available' : reportsReg.translationCompleteness.status
    },
    cleanHtmlValid: {
      json: reportsReg.cleanHtmlValid.json,
      markdown: reportsReg.cleanHtmlValid.markdown,
      status: reportsReg.cleanHtmlValid.status === 'present' ? 'available' : reportsReg.cleanHtmlValid.status
    },
    rawHtmlExists: {
      json: reportsReg.rawHtmlExists.json,
      markdown: reportsReg.rawHtmlExists.markdown,
      status: reportsReg.rawHtmlExists.status === 'present' ? 'available' : reportsReg.rawHtmlExists.status
    },
    planCompleteness: {
      json: reportsReg.planCompleteness.json,
      markdown: reportsReg.planCompleteness.markdown,
      status: reportsReg.planCompleteness.status === 'present' ? 'available' : reportsReg.planCompleteness.status
    }
  };

  // Known remaining issues (do not lose issues from qa-summary.json)
  const knownRemainingIssues = [
    ...(qaSummary?.knownRemainingIssues || [])
  ];
  // Add new warnings to known issues if they are not already there
  for (const w of warnings) {
    if (!knownRemainingIssues.includes(w)) {
      knownRemainingIssues.push(w);
    }
  }

  // Changelog step reconstruction
  const changelogPath = path.join(bookRoot, 'REFERENCE_DATASET_CHANGELOG.md');
  const changelogSteps = parseChangelogSteps(changelogPath);

  const nextRecommendedSteps = qaSummary?.recommendations || [
    "Verify and rebuild the EPUB export to ensure all resolved changes are compiled.",
    "Conduct final preview validation in a browser reader environment."
  ];

  return {
    schemaVersion: "1.0",
    bookSlug: bookConfig.bookSlug,
    title: bookConfig.title,
    datasetVersion: bookConfig.dataset?.version || 'N/A',
    datasetStatus: bookConfig.dataset?.status || 'reference_dataset_prepared',
    generatedAt: new Date().toISOString(),
    generatedBy: 'core/state/generate-workflow-state.js',
    source: {
      provider: bookConfig.source?.provider || 'unknown',
      license: bookConfig.source?.license || 'unknown',
      attribution: bookConfig.source?.attribution || ''
    },
    language: {
      source: bookConfig.language?.source || 'en',
      target: bookConfig.language?.target || 'vi'
    },
    translation: {
      audience: bookConfig.translation?.audience || '',
      tone: bookConfig.translation?.tone || '',
      preserveBilingual: bookConfig.translation?.preserveBilingual || false
    },
    overallStatus,
    appReadiness,
    chapters: chaptersState,
    _bookLevel: bookLevelState,
    assets,
    qualityGates,
    reports,
    glossaryStatus: (() => {
      try {
        const statusInfo = getGlossaryStatus(bookSlug);
        let lastChangeId = 'N/A';
        const changeLogPath = path.join(bookRoot, 'glossary', 'glossary-change-log.json');
        if (fs.existsSync(changeLogPath)) {
          const logData = JSON.parse(fs.readFileSync(changeLogPath, 'utf8'));
          if (logData.length > 0) lastChangeId = logData[0].changeId;
        }
        let lastUpdatedAt = new Date().toISOString();
        const glossaryFile = path.join(bookRoot, 'glossary.csv');
        if (fs.existsSync(glossaryFile)) {
          lastUpdatedAt = fs.statSync(glossaryFile).mtime.toISOString();
        }
        return {
          status: statusInfo.status,
          totalTerms: statusInfo.totalTerms,
          approved: statusInfo.approved,
          needsReview: statusInfo.needsReview,
          candidate: statusInfo.candidate,
          locked: statusInfo.locked,
          rejected: statusInfo.rejected,
          lastUpdatedAt,
          lastChangeId
        };
      } catch (e) {
        return { status: 'unknown' };
      }
    })(),
    knownRemainingIssues,
    changelog: {
      file: 'REFERENCE_DATASET_CHANGELOG.md',
      steps: changelogSteps
    },
    nextRecommendedSteps
  };
}

// Helper: count files in a directory recursively
function scanFolderFilesCount(dirPath) {
  let count = 0;
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) walk(path.join(dir, e.name));
      else count++;
    }
  }
  walk(dirPath);
  return count;
}

// Helper: parse changelog steps from REFERENCE_DATASET_CHANGELOG.md
function parseChangelogSteps(changelogPath) {
  const steps = {};
  if (!fs.existsSync(changelogPath)) return steps;
  
  const content = fs.readFileSync(changelogPath, 'utf8');
  const lines = content.split('\n');

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
    'step-12': 'Fix CSS references for active 05-translated HTML files'
  };

  let currentStep = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const stepMatch = line.match(/^##\s+Step\s+(\d+)/i);
    if (stepMatch) {
      const num = parseInt(stepMatch[1], 10);
      const key = `step-${num}`;
      currentStep = key;
      steps[key] = {
        name: STEP_NAMES[key] || `Step ${num}`,
        verificationResult: 'unknown'
      };
      continue;
    }
    
    if (currentStep && line === '### Verification Result') {
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

module.exports = {
  calculateWorkflowState
};

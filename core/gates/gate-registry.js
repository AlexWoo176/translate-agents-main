/**
 * gate-registry.js
 *
 * Registry mapping quality gates to their respective validation scripts and report files.
 */

'use strict';

const QUALITY_GATE_REGISTRY = {
  glossary: {
    tool: "tools/validate-glossary.js",
    reportJson: "reports/glossary-validation-report.json",
    reportMarkdown: "reports/glossary-validation-report.md"
  },
  glossaryApproval: {
    tool: null,
    internalRunner: "glossary-approval-gate",
    reportJson: "reports/glossary-approval-report.json",
    reportMarkdown: "reports/glossary-approval-report.md"
  },
  glossaryImpact: {
    tool: null,
    internalRunner: "glossary-impact-gate",
    reportJson: "reports/glossary-impact-gate-report.json",
    reportMarkdown: "reports/glossary-impact-gate-report.md"
  },
  prepCompleteness: {
    tool: "tools/rebuild-missing-prep.js",
    reportJson: "reports/prep-rebuild-report.json",
    reportMarkdown: "reports/prep-rebuild-report.md"
  },
  archiveCompleteness: {
    tool: "tools/check-archive-completeness.js",
    reportJson: "reports/archive-completeness-report.json",
    reportMarkdown: "reports/archive-completeness-report.md"
  },
  duplicatePages: {
    tool: "tools/detect-duplicate-pages.js",
    reportJson: "reports/chapter-5-duplicate-page-report.json",
    reportMarkdown: "reports/chapter-5-duplicate-page-report.md"
  },
  bilingualPairs: {
    tool: "tools/check-bilingual-pairs.js",
    reportJson: "reports/chapter-8-bilingual-pair-report.json",
    reportMarkdown: "reports/chapter-8-bilingual-pair-report.md"
  },
  tableIntegrity: {
    tool: "tools/check-table-integrity.js",
    reportJson: "reports/chapter-14-table-integrity-report.json",
    reportMarkdown: "reports/chapter-14-table-integrity-report.md"
  },
  previewCssReferences: {
    tool: "tools/check-preview-css-refs.js",
    reportJson: "reports/preview-css-refs-report.json",
    reportMarkdown: "reports/preview-css-refs-report.md"
  },
  localPathLeaks: {
    tool: "tools/check-local-path-leaks.js",
    reportJson: "reports/local-path-leaks-report.json",
    reportMarkdown: "reports/local-path-leaks-report.md"
  },
  qaSummary: {
    tool: "tools/generate-qa-summary.js",
    reportJson: "qa-summary.json",
    reportMarkdown: "qa-summary.md"
  },
  finalValidation: {
    tool: "tools/final-validate-dataset.js",
    reportJson: "reports/final-validation-report.json",
    reportMarkdown: "reports/final-validation-report.md"
  },
  epubValidity: {
    tool: null,
    internalRunner: "epub-validity-gate",
    reportJson: "reports/epub-validity-report.json",
    reportMarkdown: "reports/epub-validity-report.md"
  },
  reviewCompleteness: {
    tool: null,
    internalRunner: "review-completeness-gate",
    reportJson: "reports/review-completeness-report.json",
    reportMarkdown: "reports/review-completeness-report.md"
  },
  analysisCompleteness: {
    tool: null,
    internalRunner: "analysis-completeness-gate",
    reportJson: "reports/analysis-completeness-report.json",
    reportMarkdown: "reports/analysis-completeness-report.md"
  },
  translationCompleteness: {
    tool: null,
    internalRunner: "translation-completeness-gate",
    reportJson: "reports/translation-completeness-report.json",
    reportMarkdown: "reports/translation-completeness-report.md"
  },
  cleanHtmlValid: {
    tool: null,
    internalRunner: "clean-html-valid-gate",
    reportJson: "reports/clean-html-valid-report.json",
    reportMarkdown: "reports/clean-html-valid-report.md"
  },
  rawHtmlExists: {
    tool: null,
    internalRunner: "raw-html-exists-gate",
    reportJson: "reports/raw-html-exists-report.json",
    reportMarkdown: "reports/raw-html-exists-report.md"
  },
  planCompleteness: {
    tool: null,
    internalRunner: "plan-completeness-gate",
    reportJson: "reports/plan-completeness-report.json",
    reportMarkdown: "reports/plan-completeness-report.md"
  }
};

function listQualityGates() {
  return Object.keys(QUALITY_GATE_REGISTRY);
}

function getQualityGate(gateId) {
  if (!hasQualityGate(gateId)) {
    throw new Error(`Quality gate not found in registry: ${gateId}`);
  }
  return QUALITY_GATE_REGISTRY[gateId];
}

function hasQualityGate(gateId) {
  return Object.prototype.hasOwnProperty.call(QUALITY_GATE_REGISTRY, gateId);
}

module.exports = {
  QUALITY_GATE_REGISTRY,
  listQualityGates,
  getQualityGate,
  hasQualityGate
};

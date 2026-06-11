/**
 * core/index.js
 *
 * Main entry point exporting all core functionalities of translate-agents-main.
 */

'use strict';

const pathResolver = require('./paths/path-resolver');
const bookConfig = require('./config/book-config');
const loadWorkflowState = require('./state/load-workflow-state');
const validateWorkflowState = require('./state/validate-workflow-state');
const scanBook = require('./scanner/scan-book');
const scanChapter = require('./scanner/scan-chapter');
const scanPhase = require('./scanner/scan-phase');
const qualityGates = require('./gates/quality-gates');
const reportRegistry = require('./reports/report-registry');
const backupWorkflowState = require('./state/backup-workflow-state');
const validateGeneratedState = require('./state/validate-generated-state');
const calculateWorkflowState = require('./state/calculate-workflow-state');
const writeWorkflowState = require('./state/write-workflow-state');
const generateWorkflowState = require('./state/generate-workflow-state');
const loadMasterWorkflow = require('./workflow/load-master-workflow');
const validateMasterWorkflow = require('./workflow/validate-master-workflow');
const phaseRegistry = require('./workflow/phase-registry');
const workflowGraph = require('./workflow/workflow-graph');
const gateRegistry = require('./gates/gate-registry');
const normalizeGateStatus = require('./gates/normalize-gate-status');
const readGateResult = require('./gates/read-gate-result');
const runQualityGate = require('./gates/run-quality-gate');
const runQualityGates = require('./gates/run-quality-gates');
const runPhase = require('./runner/run-phase');
const runPrepPhase = require('./runner/run-prep-phase');
const { runArchivePhase } = require('./runner/run-archive-phase');
const { runBuildPreviewPhase } = require('./runner/run-build-preview-phase');
const { runExportEpubPhase } = require('./runner/run-export-epub-phase');
const { runReviewPhase } = require('./runner/run-review-phase');
const { runAnalyzePhase } = require('./runner/run-analyze-phase');
const { runTranslatePhase } = require('./runner/run-translate-phase');
const { runCleanPhase } = require('./runner/run-clean-phase');
const { runScrapePhase } = require('./runner/run-scrape-phase');
const { runPlanPhase } = require('./runner/run-plan-phase');
const { runGlossaryPhase } = require('./runner/run-glossary-phase');
const { getGlossaryStatus } = require('./glossary/glossary-status');
const { generateGlossaryCandidates } = require('./glossary/glossary-candidate-generator');
const { exportReviewSheet, approveGlossary } = require('./glossary/glossary-approval-manager');
const { processGlossaryChangeRequest } = require('./glossary/glossary-change-request');
const { analyzeGlossaryImpact } = require('./glossary/glossary-impact-analyzer');
const { applyGlossaryChanges } = require('./glossary/glossary-applier');
const { initBookProject } = require('./project/init-book-project');
const { runWorkflowOrchestrator } = require('./orchestrator/workflow-orchestrator');
const { buildRunPlan } = require('./orchestrator/workflow-run-plan');

// Validation, Logging, Errors
const validateBookConfig = require('./validation/validate-book-config');
const validateWorkflowConfig = require('./validation/validate-workflow-config');
const validateCoreEnvironment = require('./validation/validate-core-environment');
const validateProductionReadiness = require('./validation/validate-production-readiness');
const logger = require('./logging/logger');
const ErrorCodes = require('./errors/error-codes');
const WorkflowError = require('./errors/workflow-error');
const errorNormalizer = require('./errors/error-normalizer');

module.exports = {
  ...pathResolver,
  ...bookConfig,
  ...loadWorkflowState,
  ...validateWorkflowState,
  ...scanBook,
  ...scanChapter,
  ...scanPhase,
  ...qualityGates,
  ...reportRegistry,
  ...backupWorkflowState,
  ...validateGeneratedState,
  ...calculateWorkflowState,
  ...writeWorkflowState,
  ...generateWorkflowState,
  ...loadMasterWorkflow,
  ...validateMasterWorkflow,
  ...phaseRegistry,
  ...workflowGraph,
  phaseRegistry,
  workflowGraph,
  ...gateRegistry,
  ...normalizeGateStatus,
  ...readGateResult,
  ...runQualityGate,
  ...runQualityGates,
  ...runPhase,
  ...runPrepPhase,
  runArchivePhase,
  runBuildPreviewPhase,
  runExportEpubPhase,
  runReviewPhase,
  runAnalyzePhase,
  runTranslatePhase,
  runCleanPhase,
  runScrapePhase,
  runPlanPhase,
  runGlossaryPhase,
  getGlossaryStatus,
  generateGlossaryCandidates,
  exportReviewSheet,
  approveGlossary,
  processGlossaryChangeRequest,
  analyzeGlossaryImpact,
  applyGlossaryChanges,
  initBookProject,
  runWorkflowOrchestrator,
  buildRunPlan,
  ...validateBookConfig,
  ...validateWorkflowConfig,
  ...validateCoreEnvironment,
  ...validateProductionReadiness,
  logger,
  ErrorCodes,
  WorkflowError,
  ...errorNormalizer
};

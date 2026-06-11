/**
 * cli/index.js
 *
 * Command-line interface for translate-agents-main workflow status, definition, and QA.
 */

'use strict';

const {
  loadBookConfig,
  loadWorkflowState,
  scanBook,
  readQualityGates,
  generateWorkflowState,
  loadMasterWorkflow,
  getWorkflowPhases,
  getPhaseDefinition,
  validateMasterWorkflow,
  listPhases,
  getPhase,
  listQualityGates,
  readGateResult,
  runQualityGate,
  runAllQualityGates,
  runPhase,
  initBookProject,
  runWorkflowOrchestrator,
  buildRunPlan,
  validateProductionReadiness,
  getGlossaryStatus,
  generateGlossaryCandidates,
  exportReviewSheet,
  approveGlossary,
  processGlossaryChangeRequest,
  analyzeGlossaryImpact,
  applyGlossaryChanges,
  formatErrorForCLI,
  logger
} = require('../core');

function showUsage() {
  console.log('Usage:');
  console.log('  node cli/index.js status <bookSlug>');
  console.log('  node cli/index.js generate-state <bookSlug>');
  console.log('  node cli/index.js validate-production <bookSlug>');
  console.log('  node cli/index.js init-book --slug <bookSlug> --title "<Book Title>" --source-url "<OpenStax URL>" [--chapter-count <count>] [--dry-run] [--force]');
  console.log('  node cli/index.js workflow-run <bookSlug> [options]');
  console.log('  node cli/index.js workflow');
  console.log('  node cli/index.js workflow validate');
  console.log('  node cli/index.js workflow phase <phaseId>');
  console.log('  node cli/index.js workflow graph');
  console.log('  node cli/index.js qa <bookSlug> --list');
  console.log('  node cli/index.js qa <bookSlug> --read <gateId>');
  console.log('  node cli/index.js qa <bookSlug> --gate <gateId> [--allow-write]');
  console.log('  node cli/index.js qa <bookSlug> --all [--allow-write]');
  console.log('  node cli/index.js run <bookSlug> --phase <phaseId> [--chapter <chapterId>|--all] [--dry-run] [--force] [--check-only]');
  console.log('  node cli/index.js run <bookSlug> --phase plan [--dry-run] [--force]');
  console.log('  node cli/index.js run <bookSlug> --phase clean [--chapter <chapterId>|--all] [--dry-run] [--force]');
  console.log('  node cli/index.js run <bookSlug> --phase archive --chapter <chapterId> [--dry-run] [--force]');
  console.log('  node cli/index.js run <bookSlug> --phase archive --all [--dry-run] [--force]');
  console.log('  node cli/index.js run <bookSlug> --phase build_preview [--dry-run] [--force]');
  console.log('  node cli/index.js run <bookSlug> --phase export_epub [--dry-run] [--force] [--validate-only]');
  console.log('  node cli/index.js run <bookSlug> --phase review [--chapter <chapterId>|--all] [--dry-run] [--force] [--review-types integrity,glossary]');
  console.log('  node cli/index.js run <bookSlug> --phase analyze [--chapter <chapterId>|--all] [--dry-run] [--force] [--analysis-types structure,terminology]');
  console.log('  node cli/index.js run <bookSlug> --phase translate [--chapter <chapterId>|--all] [--dry-run] [--force] [--provider mock|manual|external-ai] [--write-final] [--output-suffix <suffix>]');
  console.log('  node cli/index.js run <bookSlug> --phase scrape [--chapter <chapterId>|--all] [--dry-run] [--force] [--offline]');
  console.log('  node cli/index.js glossary <bookSlug> --status');
  console.log('  node cli/index.js glossary <bookSlug> --generate-candidates [--dry-run]');
  console.log('  node cli/index.js glossary <bookSlug> --review-export');
  console.log('  node cli/index.js glossary <bookSlug> --approve [--dry-run]');
  console.log('  node cli/index.js glossary <bookSlug> --change-request <changes.csv> [--dry-run]');
  console.log('  node cli/index.js glossary <bookSlug> --impact');
  console.log('  node cli/index.js glossary <bookSlug> --apply-to-draft --chapters affected [--dry-run]');
  console.log('  node cli/index.js glossary <bookSlug> --apply-to-final [--dry-run] [--confirm-final]');
}

async function run() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    showUsage();
    process.exit(1);
  }

  const command = args[0];

  try {
    if (command === 'workflow-run') {
      if (args.length < 2) {
        console.error('Error: bookSlug is required for workflow-run command.');
        showUsage();
        process.exit(1);
      }
      const bookSlug = args[1];
      const runArgs = args.slice(2);

      const dryRun = runArgs.includes('--dry-run');
      
      const fromIdx = runArgs.indexOf('--from');
      const from = fromIdx !== -1 ? runArgs[fromIdx + 1] : null;
      
      const toIdx = runArgs.indexOf('--to');
      const to = toIdx !== -1 ? runArgs[toIdx + 1] : null;
      
      const phasesIdx = runArgs.indexOf('--phases');
      const phases = phasesIdx !== -1 ? runArgs[phasesIdx + 1] : null;
      
      const resume = runArgs.includes('--resume');
      const force = runArgs.includes('--force');
      
      const stopOnFailure = runArgs.includes('--stop-on-failure') || !runArgs.includes('--no-stop-on-failure');
      const continueOnWarning = runArgs.includes('--continue-on-warning');
      
      const chapterIdx = runArgs.indexOf('--chapter');
      const chapterId = chapterIdx !== -1 ? runArgs[chapterIdx + 1] : null;
      const all = runArgs.includes('--all');
      
      const providerIdx = runArgs.indexOf('--provider');
      const provider = providerIdx !== -1 ? runArgs[providerIdx + 1] : null;
      
      const writeFinal = runArgs.includes('--write-final');

      // Build plan first to display info
      const plan = buildRunPlan(bookSlug, {
        from,
        to,
        phases,
        resume,
        force,
        provider,
        writeFinal
      });

      console.log('Workflow run plan:');
      plan.planPhases.forEach((p, index) => {
        console.log(`${index + 1}. ${p.id}`);
      });
      if (plan.skippedPhases.length > 0) {
        console.log('\nSkipped phases:');
        plan.skippedPhases.forEach(p => {
          console.log(`- ${p.id} (Reason: ${p.reason})`);
        });
      }
      console.log('\nScope:');
      console.log(`Book: ${bookSlug}`);
      console.log(`Chapter: ${chapterId || (all ? 'all' : 'all (default)')}`);
      
      if (plan.risks.length > 0) {
        console.log('\nRisks:');
        plan.risks.forEach(r => {
          console.log(`- ${r.description}`);
        });
      }

      if (dryRun) {
        console.log('\nResult: dry_run_passed');
        process.exit(0);
      }

      console.log('\nStarting workflow execution...\n');
      
      const context = await runWorkflowOrchestrator(bookSlug, {
        from,
        to,
        phases,
        resume,
        force,
        stopOnFailure,
        continueOnWarning,
        chapterId,
        all,
        provider,
        writeFinal
      });

      console.log('\nFinal:');
      console.log(`Status: ${context.status.toUpperCase()}`);
      console.log(`Completed: ${context.executedPhases.filter(p => p.status === 'passed' || p.status === 'passed_with_warnings' || p.status === 'needs_human_review').length}`);
      console.log(`Failed: ${context.executedPhases.filter(p => p.status === 'failed').length || 0}`);
      console.log(`Warnings: ${context.warnings.length}`);
      
      if (context.errors.length > 0) {
        console.log(`Errors: ${context.errors.length}`);
      }

      console.log(`\nReport:`);
      console.log(`books/${bookSlug}/reports/workflow-runs/workflow-run-...`);
      
    } else if (command === 'validate-production' || command === 'production-check') {
      if (args.length < 2) {
        console.error('Error: bookSlug is required for validate-production command.');
        showUsage();
        process.exit(1);
      }
      const bookSlug = args[1];
      console.log('Production Readiness Check');
      console.log(`Book: ${bookSlug}\n`);

      const report = validateProductionReadiness(bookSlug);

      console.log('Core:');
      console.log(`- Config validation: ${report.core.config}`);
      console.log(`- Workflow validation: ${report.core.workflow}`);
      console.log(`- Environment validation: ${report.core.environment}`);

      console.log('\nDataset:');
      console.log(`- Workflow state: ${report.dataset.workflowState}`);
      console.log(`- Reports: ${report.dataset.reports}`);
      console.log(`- Quality gates: ${report.dataset.qualityGates}`);

      console.log('\nDocs:');
      console.log(`- CLI reference: ${report.docs.cliReference}`);
      console.log(`- Quality gates reference: ${report.docs.qualityGatesReference}`);
      console.log(`- Release checklist: ${report.docs.releaseChecklist}`);

      if (report.warnings.length > 0) {
        console.log('\nWarnings:');
        report.warnings.forEach(w => console.log(`- ${w}`));
      }
      if (report.errors.length > 0) {
        console.log('\nErrors:');
        report.errors.forEach(e => console.error(`- ${e}`));
      }

      console.log(`\nResult: ${report.status}`);
      if (report.status === 'not_ready' || report.status === 'failed') {
        process.exit(1);
      }
      process.exit(0);
    } else if (command === 'init-book') {
      const initArgs = args.slice(1);
      
      const slugIdx = initArgs.indexOf('--slug');
      const slug = slugIdx !== -1 ? initArgs[slugIdx + 1] : null;
      
      const titleIdx = initArgs.indexOf('--title');
      const title = titleIdx !== -1 ? initArgs[titleIdx + 1] : null;
      
      const sourceUrlIdx = initArgs.indexOf('--source-url');
      const sourceUrl = sourceUrlIdx !== -1 ? initArgs[sourceUrlIdx + 1] : '';
      
      const providerIdx = initArgs.indexOf('--source-provider');
      const sourceProvider = providerIdx !== -1 ? initArgs[providerIdx + 1] : 'openstax';
      
      const sourceLangIdx = initArgs.indexOf('--source-language');
      const sourceLanguage = sourceLangIdx !== -1 ? initArgs[sourceLangIdx + 1] : 'en';
      
      const targetLangIdx = initArgs.indexOf('--target-language');
      const langIdx = initArgs.indexOf('--language');
      const targetLanguage = targetLangIdx !== -1 ? initArgs[targetLangIdx + 1] : (langIdx !== -1 ? initArgs[langIdx + 1] : 'vi');
      
      const datasetVersionIdx = initArgs.indexOf('--dataset-version');
      const datasetVersion = datasetVersionIdx !== -1 ? initArgs[datasetVersionIdx + 1] : 'v1';
      
      const chapterCountIdx = initArgs.indexOf('--chapter-count');
      const chapterCount = chapterCountIdx !== -1 ? parseInt(initArgs[chapterCountIdx + 1], 10) : 0;
      
      const dryRun = initArgs.includes('--dry-run');
      const force = initArgs.includes('--force');

      if (!slug || !title) {
        console.error('Error: Both --slug and --title are required for init-book command.');
        console.log('Example: node cli/index.js init-book --slug psychology-2e --title "Psychology 2e" --source-url "https://openstax.org/details/books/psychology-2e"');
        process.exit(1);
      }

      console.log(`Initializing book project: ${slug}`);
      if (dryRun) console.log('Mode: dry-run');
      console.log('');

      const result = await initBookProject({
        bookSlug: slug,
        title,
        sourceUrl,
        sourceProvider,
        sourceLanguage,
        targetLanguage,
        datasetVersion,
        chapterCount,
        dryRun,
        force
      });

      if (result.status === 'failed') {
        console.error('Initialization Failed:');
        result.errors.forEach(e => console.error(`- ${e}`));
        process.exit(1);
      }

      if (dryRun) {
        console.log('Would create:');
        result.foldersWouldCreate.forEach(f => console.log(`  books/${f}`));
        result.filesWouldCreate.forEach(f => console.log(`  books/${f}`));
        console.log('');
        console.log('Next:');
        console.log(`  node cli/index.js run ${slug} --phase scrape --dry-run`);
        console.log('');
        console.log('Result: dry_run_passed');
      } else {
        console.log('Initialization Succeeded!');
        console.log(`Files Created (${result.filesCreated.length}):`);
        result.filesCreated.forEach(f => console.log(`- books/${f}`));
        if (result.filesUpdated.length > 0) {
          console.log(`Files Updated (${result.filesUpdated.length}):`);
          result.filesUpdated.forEach(f => console.log(`- books/${f}`));
        }
        if (result.filesSkipped.length > 0) {
          console.log(`Files Skipped (${result.filesSkipped.length}):`);
          result.filesSkipped.forEach(f => console.log(`- books/${f}`));
        }
        if (result.warnings.length > 0) {
          console.log('Warnings:');
          result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
        }
        console.log('');
        console.log('Next:');
        console.log(`  node cli/index.js run ${slug} --phase scrape --dry-run`);
        console.log('');
        console.log('Result: passed');
      }
    } else if (command === 'status') {
      if (args.length < 2) {
        console.error('Error: bookSlug is required for status command.');
        showUsage();
        process.exit(1);
      }
      const bookSlug = args[1];
      
      const config = loadBookConfig(bookSlug);
      const state = loadWorkflowState(bookSlug);
      const scan = scanBook(bookSlug);
      const { gates, overallStatus } = readQualityGates(bookSlug);

      console.log(`Book: ${config.title}`);
      console.log(`Book slug: ${bookSlug}`);
      console.log(`Dataset version: ${config.dataset?.version || 'N/A'}`);
      console.log(`Dataset status: ${state.datasetStatus || 'N/A'}`);
      console.log(`Overall status: ${overallStatus}`);
      console.log(`App readiness: ${state.appReadiness?.status || 'N/A'}`);
      console.log(`Chapters: ${scan.chapterCount}`);
      console.log(`Preview HTML: ${scan.hasPreviewHtml ? 'available' : 'missing'}`);
      console.log(`EPUB: ${scan.hasEpub ? 'available' : 'missing'}`);
      console.log(`Reports: ${scan.reportsFound.length > 0 ? 'available' : 'missing'}`);
      console.log('');
      console.log('Quality gates:');
      console.log(`- Plan completeness: ${gates.planCompleteness}`);
      console.log(`- Glossary: ${gates.glossary}`);
      console.log(`- Glossary Approval: ${gates.glossaryApproval || 'N/A'}`);
      console.log(`- Glossary Impact: ${gates.glossaryImpact || 'N/A'}`);
      console.log(`- Prep completeness: ${gates.prepCompleteness}`);
      console.log(`- Duplicate pages: ${gates.duplicatePages}`);
      console.log(`- Bilingual pairs: ${gates.bilingualPairs}`);
      console.log(`- Table integrity: ${gates.tableIntegrity}`);
      console.log(`- Preview CSS references: ${gates.previewCssReferences}`);
      console.log(`- Local path leaks: ${gates.localPathLeaks}`);
      console.log(`- Final validation: ${gates.finalValidation}`);
      console.log(`- EPUB validity: ${gates.epubValidity}`);
      console.log(`- Review completeness: ${gates.reviewCompleteness}`);
      console.log(`- Analysis completeness: ${gates.analysisCompleteness}`);
      console.log(`- Translation completeness: ${gates.translationCompleteness}`);
      console.log(`- Clean HTML validity: ${gates.cleanHtmlValid}`);
      console.log(`- Raw HTML exists: ${gates.rawHtmlExists}`);
      console.log('');
      console.log('Known remaining issues:');
      if (state.knownRemainingIssues && state.knownRemainingIssues.length > 0) {
        for (const issue of state.knownRemainingIssues) {
          console.log(`- ${issue}`);
        }
      } else {
        console.log('- None');
      }
    } else if (command === 'generate-state') {
      if (args.length < 2) {
        console.error('Error: bookSlug is required for generate-state command.');
        showUsage();
        process.exit(1);
      }
      const bookSlug = args[1];
      console.log(`Generating workflow state for: ${bookSlug}`);
      console.log('');
      
      const result = generateWorkflowState(bookSlug);
      const config = loadBookConfig(bookSlug);
      const scan = scanBook(bookSlug);
      const { gates, overallStatus } = readQualityGates(bookSlug);

      const gateEntries = Object.values(gates);
      const passed = gateEntries.filter(g => ['passed', 'resolved', 'validated', 'generated', 'Passed with warnings', 'passed_with_warnings'].includes(g)).length;
      const missing = gateEntries.filter(g => g === 'missing_report').length;
      const failed = gateEntries.filter(g => g === 'failed').length;

      console.log(`Book: ${config.title}`);
      console.log(`Chapters scanned: ${scan.chapterCount}`);
      console.log(`Book-level found: ${scan.hasBookLevel ? 'yes' : 'no'}`);
      console.log(`Reports found: ${scan.reportsFound.length}`);
      console.log(`Quality gates: ${passed} passed, ${missing} missing reports, ${failed} failed`);
      console.log(`Overall status: ${overallStatus}`);
      console.log(`App readiness: ${result.state.appReadiness?.status || 'N/A'}`);
      console.log('');
      console.log('Backup created:');
      console.log(result.backupFile ? result.backupFile : 'None (no previous state file existed)');
      console.log('');
      console.log('Generated:');
      console.log(`books/${bookSlug}/workflow-state.json`);
      console.log('');
      
      let finalResult = 'Failed';
      if (overallStatus === 'passed') {
        finalResult = 'Passed';
      } else if (overallStatus === 'passed_with_warnings') {
        finalResult = 'Passed with warnings';
      } else if (overallStatus === 'needs_human_review') {
        finalResult = 'Needs Human Review';
      }
      console.log(`Result: ${finalResult}`);
    } else if (command === 'workflow') {
      const subCommand = args[1];
      
      if (!subCommand) {
        const workflow = loadMasterWorkflow();
        console.log(`Workflow: ${workflow.name}`);
        console.log(`Version: ${workflow.version}`);
        console.log(`Phases: ${workflow.phases?.length || 0}`);
        console.log('');
        
        const phases = listPhases();
        phases.forEach((p, idx) => {
          console.log(`${idx + 1}. ${p.id}`);
        });
      } else if (subCommand === 'validate') {
        console.log('Validating workflow/master-workflow.json...');
        console.log('');
        
        const workflow = loadMasterWorkflow();
        const validation = validateMasterWorkflow(workflow);
        
        console.log(`Result: ${validation.valid ? 'Passed' : 'Failed'}`);
        console.log('');
        console.log('Checks:');
        console.log(`- Schema: ${validation.checks.schema}`);
        console.log(`- Required fields: ${validation.checks.requiredFields}`);
        console.log(`- Unique phase ids: ${validation.checks.uniquePhaseIds}`);
        console.log(`- Unique order: ${validation.checks.uniqueOrder}`);
        console.log(`- Dependencies: ${validation.checks.dependencies}`);
        console.log(`- Circular dependency: ${validation.checks.circularDependency}`);
        console.log(`- Agent references: ${validation.checks.agentReferences}`);
        
        if (!validation.valid) {
          console.log('');
          console.log('Errors:');
          validation.errors.forEach(err => console.error(`- ${err}`));
          process.exit(1);
        }
      } else if (subCommand === 'phase') {
        const phaseId = args[2];
        if (!phaseId) {
          console.error('Error: phaseId is required for workflow phase command.');
          console.log('Example: node cli/index.js workflow phase prep');
          process.exit(1);
        }
        
        const phase = getPhase(phaseId);
        console.log(`Phase: ${phase.id}`);
        console.log(`Name: ${phase.name}`);
        console.log(`Agent: ${phase.agent}`);
        console.log(`Scope: ${phase.scope.join(', ')}`);
        console.log(`Input phases: ${phase.inputPhases.length > 0 ? phase.inputPhases.join(', ') : 'none'}`);
        console.log(`Output phase: ${phase.outputPhase}`);
        console.log(`Input paths: ${phase.inputPaths.join(', ')}`);
        console.log(`Output paths: ${phase.outputPaths.join(', ')}`);
        console.log(`Quality gate: ${phase.qualityGate}`);
        console.log(`Can run automatically: ${phase.canRunAutomatically ? 'yes' : 'no'}`);
        console.log(`Writes dataset: ${phase.writesDataset ? 'yes' : 'no'}`);
      } else if (subCommand === 'graph') {
        console.log('plan');
        console.log('  → scrape');
        console.log('    → clean');
        console.log('      → analyze');
        console.log('      → prep');
        console.log('        → translate');
        console.log('          → review');
        console.log('            → archive');
        console.log('              → build_preview');
        console.log('                → export_epub');
        console.log('                → qa_summary');
        console.log('                  → generate_state');
        console.log('                    → final_validate');
      } else {
        console.error(`Unknown workflow subcommand: ${subCommand}`);
        showUsage();
        process.exit(1);
      }
    } else if (command === 'qa') {
      if (args.length < 2) {
        console.error('Error: bookSlug is required for qa command.');
        showUsage();
        process.exit(1);
      }
      const bookSlug = args[1];
      const qaArgs = args.slice(2);
      
      const listFlag = qaArgs.includes('--list');
      const allFlag = qaArgs.includes('--all');
      const allowWrite = qaArgs.includes('--allow-write');
      
      const readIdx = qaArgs.indexOf('--read');
      const readGate = readIdx !== -1 ? qaArgs[readIdx + 1] : null;
      
      const gateIdx = qaArgs.indexOf('--gate');
      const runGate = gateIdx !== -1 ? qaArgs[gateIdx + 1] : null;

      if (listFlag) {
        console.log('Available quality gates:');
        listQualityGates().forEach(g => console.log(`- ${g}`));
      } else if (readGate) {
        const result = readGateResult(bookSlug, readGate);
        console.log(`Gate: ${result.gateId}`);
        console.log(`Status: ${result.status}`);
        console.log(`Report: ${result.reportMarkdown || 'N/A'}`);
        console.log(`JSON: ${result.reportJson || 'N/A'}`);
      } else if (runGate) {
        console.log(`Running quality gate: ${runGate}`);
        const result = await runQualityGate(bookSlug, runGate, { allowWrite });
        
        let stateRegenerated = 'no';
        try {
          generateWorkflowState(bookSlug);
          stateRegenerated = 'yes';
        } catch (e) {
          console.error(`Warning: Failed to regenerate workflow state: ${e.message}`);
        }

        console.log(`Tool: ${result.tool || 'N/A'}`);
        console.log(`Result: ${result.status}`);
        console.log(`Report: ${result.reportMarkdown || 'N/A'}`);
        console.log(`Workflow state regenerated: ${stateRegenerated}`);
      } else if (allFlag || qaArgs.length === 0) {
        console.log('Running all quality gates...');
        const results = await runAllQualityGates(bookSlug, { allowWrite });

        let stateRegenerated = 'no';
        try {
          generateWorkflowState(bookSlug);
          stateRegenerated = 'yes';
        } catch (e) {
          console.error(`Warning: Failed to regenerate workflow state: ${e.message}`);
        }

        const { overallStatus } = readQualityGates(bookSlug);

        console.log('');
        console.log('Quality Gate Summary');
        console.log('');
        console.log('| Gate | Status | Report |');
        console.log('|---|---|---|');
        for (const res of results) {
          console.log(`| ${res.gateId} | ${res.status} | ${res.reportMarkdown || 'N/A'} |`);
        }
        console.log('');
        console.log(`Overall: ${overallStatus}`);
        console.log(`Workflow state regenerated: ${stateRegenerated}`);
      } else {
        console.error('Error: Invalid QA command arguments.');
        showUsage();
        process.exit(1);
      }
    } else if (command === 'run') {
      if (args.length < 2) {
        console.error('Error: bookSlug is required for run command.');
        showUsage();
        process.exit(1);
      }
      const bookSlug = args[1];
      const runArgs = args.slice(2);

      const phaseIdx = runArgs.indexOf('--phase');
      if (phaseIdx === -1 || !runArgs[phaseIdx + 1]) {
        console.error('Error: --phase <phaseId> is required.');
        showUsage();
        process.exit(1);
      }
      const phaseId = runArgs[phaseIdx + 1];

      const chapterIdx = runArgs.indexOf('--chapter');
      const chapterId = chapterIdx !== -1 ? runArgs[chapterIdx + 1] : null;
      const all = runArgs.includes('--all');

      const isBookLevelPhase = ['build_preview', 'build-preview', 'export_epub', 'export-epub', 'scrape', 'plan', 'glossary'].includes(phaseId);
      if (!isBookLevelPhase && !chapterId && !all) {
        console.error('Error: Either --chapter <chapterId> or --all is required for this phase.');
        showUsage();
        process.exit(1);
      }

      const dryRun = runArgs.includes('--dry-run');
      const force = runArgs.includes('--force');
      const checkOnly = runArgs.includes('--check-only');
      const validateOnly = runArgs.includes('--validate-only');
      
      const reviewTypesIdx = runArgs.indexOf('--review-types');
      const reviewTypes = reviewTypesIdx !== -1 ? runArgs[reviewTypesIdx + 1] : null;
      
      const analysisTypesIdx = runArgs.indexOf('--analysis-types');
      const analysisTypes = analysisTypesIdx !== -1 ? runArgs[analysisTypesIdx + 1] : null;

      const providerIdx = runArgs.indexOf('--provider');
      const provider = providerIdx !== -1 ? runArgs[providerIdx + 1] : null;

      const writeFinal = runArgs.includes('--write-final');

      const outputSuffixIdx = runArgs.indexOf('--output-suffix');
      const outputSuffix = outputSuffixIdx !== -1 ? runArgs[outputSuffixIdx + 1] : null;

      const offline = runArgs.includes('--offline');

      console.log(`Running phase "${phaseId}" for book "${bookSlug}"...`);
      if (chapterId) console.log(`Chapter: ${chapterId}`);
      if (all) console.log(`Scope: all chapters`);
      if (dryRun) console.log(`Mode: dry-run`);
      if (force) console.log(`Mode: force-overwrite`);
      if (checkOnly) console.log(`Mode: check-only`);
      if (validateOnly) console.log(`Mode: validate-only`);
      if (reviewTypes) console.log(`Review Types: ${reviewTypes}`);
      if (analysisTypes) console.log(`Analysis Types: ${analysisTypes}`);
      if (provider) console.log(`Provider: ${provider}`);
      if (writeFinal) console.log(`Write Final: yes`);
      if (outputSuffix) console.log(`Output Suffix: ${outputSuffix}`);
      if (offline) console.log(`Mode: offline`);
      console.log('');

      const result = await runPhase(bookSlug, phaseId, {
        chapterId,
        all,
        dryRun,
        force,
        checkOnly,
        validateOnly,
        reviewTypes,
        analysisTypes,
        provider,
        writeFinal,
        outputSuffix,
        offline
      });

      if (result.status === 'unsupported_phase') {
        console.error(`Error: ${result.message}`);
        process.exit(1);
      }

      console.log('Run results:');
      console.log(`- Status: ${result.status.toUpperCase()}`);
      if (result.blocksDetected !== undefined) console.log(`- Blocks detected: ${result.blocksDetected}`);
      if (result.blocksTranslated !== undefined) console.log(`- Blocks translated: ${result.blocksTranslated}`);
      if (result.blocksSkipped !== undefined) console.log(`- Blocks skipped/resumed: ${result.blocksSkipped}`);
      console.log(`- Files created: ${result.filesCreated.length}`);
      console.log(`- Files updated: ${result.filesUpdated.length}`);
      console.log(`- Files skipped: ${result.filesSkipped.length}`);
      if (result.warnings.length > 0) {
        console.log(`- Warnings (${result.warnings.length}):`);
        result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
      }
      if (result.errors.length > 0) {
        console.log(`- Errors (${result.errors.length}):`);
        result.errors.forEach(e => console.error(`  ❌  ${e}`));
      }
      if (result.qualityGate) {
        console.log(`- Quality Gate: ${result.qualityGate.id} -> ${result.qualityGate.status.toUpperCase()}`);
      }

      if (result.status === 'failed') {
        process.exit(1);
      }
    } else if (command === 'glossary') {
      if (args.length < 2) {
        console.error('Error: bookSlug is required for glossary command.');
        showUsage();
        process.exit(1);
      }
      const bookSlug = args[1];
      const runArgs = args.slice(2);
      const dryRun = runArgs.includes('--dry-run');

      if (runArgs.includes('--status')) {
        const stats = getGlossaryStatus(bookSlug);
        console.log(`Glossary Status for "${bookSlug}":`);
        console.log(`- Overall Status: ${stats.status.toUpperCase()}`);
        console.log(`- Ready for Full Book: ${stats.readyForFullBook ? 'YES' : 'NO'}`);
        console.log(`- Total Terms: ${stats.totalTerms}`);
        console.log(`- Approved: ${stats.approved}`);
        console.log(`- Needs Review: ${stats.needsReview}`);
        console.log(`- Candidate: ${stats.candidate}`);
        console.log(`- Locked: ${stats.locked}`);
        console.log(`- Rejected: ${stats.rejected}`);
        console.log(`- Deprecated: ${stats.deprecated}`);
        console.log(`- Changed: ${stats.changed}`);
        if (stats.message) console.log(`- Message: ${stats.message}`);
        if (stats.errors && stats.errors.length > 0) {
          console.error('\nErrors:');
          stats.errors.forEach(e => console.error(`  ❌  ${e}`));
          process.exit(1);
        }
        process.exit(0);
      } else if (runArgs.includes('--generate-candidates')) {
        console.log(`Generating glossary candidates for "${bookSlug}"...`);
        const result = generateGlossaryCandidates(bookSlug, { dryRun });
        console.log(`- Status: ${result.status.toUpperCase()}`);
        console.log(`- Total Candidates: ${result.totalCandidates}`);
        if (!dryRun) {
          console.log('- Files Created:');
          result.filesCreated.forEach(f => console.log(`  - books/${bookSlug}/${f}`));
        } else {
          console.log('- Dry-run: No files were written.');
        }
        process.exit(0);
      } else if (runArgs.includes('--review-export')) {
        console.log(`Exporting glossary review sheets for "${bookSlug}"...`);
        const result = exportReviewSheet(bookSlug);
        console.log(`- Status: ${result.status.toUpperCase()}`);
        console.log(`- Total Exported: ${result.totalExported}`);
        console.log('- Files Created:');
        result.filesCreated.forEach(f => console.log(`  - books/${bookSlug}/${f}`));
        process.exit(0);
      } else if (runArgs.includes('--approve')) {
        console.log(`Running glossary approval for "${bookSlug}"...`);
        const result = approveGlossary(bookSlug, { dryRun });
        console.log(`- Status: ${result.status.toUpperCase()}`);
        console.log(`- Terms Added: ${result.termsAddedCount}`);
        console.log(`- Terms Updated: ${result.termsUpdatedCount}`);
        if (result.message) console.log(`- Message: ${result.message}`);
        process.exit(0);
      } else if (runArgs.includes('--change-request')) {
        const crIdx = runArgs.indexOf('--change-request');
        const crPath = runArgs[crIdx + 1];
        if (!crPath) {
          console.error('Error: File path is required for --change-request.');
          process.exit(1);
        }
        console.log(`Processing glossary change request from: ${crPath}`);
        const result = processGlossaryChangeRequest(bookSlug, crPath, { dryRun });
        console.log(`- Status: ${result.status.toUpperCase()}`);
        console.log(`- Terms Added: ${result.termsAddedCount}`);
        console.log(`- Terms Updated: ${result.termsUpdatedCount}`);
        if (result.message) console.log(`- Message: ${result.message}`);
        process.exit(0);
      } else if (runArgs.includes('--impact')) {
        console.log(`Analyzing glossary impact for "${bookSlug}"...`);
        const fs = require('fs');
        const path = require('path');
        const { getBookRoot } = require('../core');
        const { validateGlossaryCSVContent } = require('../core/glossary/glossary-schema-validator');
        const { computeGlossaryDiff } = require('../core/glossary/glossary-diff');
        
        const bookRoot = getBookRoot(bookSlug);
        const glossaryPath = path.join(bookRoot, 'glossary.csv');
        const versionsDir = path.join(bookRoot, 'glossary', 'versions');

        if (!fs.existsSync(glossaryPath)) {
          console.error(`Error: glossary.csv not found.`);
          process.exit(1);
        }

        let oldTerms = [];
        if (fs.existsSync(versionsDir)) {
          const files = fs.readdirSync(versionsDir).filter(f => f.endsWith('.csv'));
          if (files.length > 0) {
            files.sort();
            const latestBackup = files[files.length - 1];
            const oldContent = fs.readFileSync(path.join(versionsDir, latestBackup), 'utf8');
            oldTerms = validateGlossaryCSVContent(oldContent).terms || [];
            console.log(`Using latest backup for comparison: ${latestBackup}`);
          }
        }

        const newTerms = validateGlossaryCSVContent(fs.readFileSync(glossaryPath, 'utf8')).terms || [];
        const diff = computeGlossaryDiff(oldTerms, newTerms);
        const report = analyzeGlossaryImpact(bookSlug, diff, { dryRun });
        
        console.log(`- Impact Status: ${report.status.toUpperCase()}`);
        console.log(`- Affected Chapters: ${report.summary.affectedChaptersCount}`);
        console.log(`- Draft Stale: ${report.summary.draftStale ? 'YES' : 'NO'}`);
        console.log(`- Final Stale: ${report.summary.finalStale ? 'YES' : 'NO'}`);
        if (!dryRun) {
          console.log(`- Reports written to reports/glossary-impact-report.md and reports/affected-chapters-by-glossary.json`);
        }
        process.exit(0);
      } else if (runArgs.includes('--apply-to-draft')) {
        console.log(`Applying glossary changes to draft translations for "${bookSlug}"...`);
        const result = applyGlossaryChanges(bookSlug, 'draft', { dryRun });
        console.log(`- Status: ${result.status.toUpperCase()}`);
        console.log(`- Files Updated: ${result.filesUpdated.length}`);
        result.filesUpdated.forEach(f => console.log(`  - ${f.path} (${f.status})`));
        if (result.warnings.length > 0) {
          console.log('- Warnings:');
          result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
        }
        process.exit(0);
      } else if (runArgs.includes('--apply-to-final')) {
        console.log(`Applying glossary changes to final translations for "${bookSlug}"...`);
        const confirmFinal = runArgs.includes('--confirm-final');
        if (!confirmFinal) {
          console.error('Error: Blocked. Applying to final translations is high-risk.');
          console.error('This action affects final translation. Please confirm explicitly by adding the --confirm-final flag.');
          process.exit(1);
        }
        const result = applyGlossaryChanges(bookSlug, 'final', { dryRun, confirmFinal });
        console.log(`- Status: ${result.status.toUpperCase()}`);
        console.log(`- Files Updated: ${result.filesUpdated.length}`);
        result.filesUpdated.forEach(f => console.log(`  - ${f.path} (${f.status})`));
        process.exit(0);
      } else {
        console.error('Error: Invalid glossary command option. Support: --status, --generate-candidates, --review-export, --approve, --change-request, --impact, --apply-to-draft, --apply-to-final.');
        process.exit(1);
      }
    } else {
      console.error(`Unknown command: ${command}`);
      showUsage();
      process.exit(1);
    }
  } catch (err) {
    const debugMode = args.includes('--debug');
    console.error(formatErrorForCLI(err, debugMode));
    process.exit(1);
  }
}

run();

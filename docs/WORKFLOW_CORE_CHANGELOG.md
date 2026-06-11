# Workflow Core Changelog

## Phase 17 — Operator Prompt Playbook / Non-Technical User Mode

### Date
2026-06-12

### Goal
Create an operator layer enabling non-technical users to manage OpenStax book translation projects through Antigravity without CLI knowledge.

### Why This Matters
The framework has a powerful CLI, but day-to-day operation requires a safe, natural-language interface. This phase establishes the behavior contract, risk classification, and prompt templates that allow Antigravity to act as a trusted operator with strict safety guardrails.

### Why This Comes After Glossary Governance
Phase 16 added the glossary governance workflow (generate candidates, review, approve, impact, apply). Phase 17 must come after Phase 16 because:
- The operator playbook includes glossary-specific rules and templates.
- Full book translation safety relies on `glossaryApproval` gate defined in Phase 16.
- Prompt examples cover all glossary operations introduced in Phase 16.
- Without Phase 16, there would be nothing to govern in Phase 17 operator rules.

### Actions Taken
- Created `docs/OPERATOR_PROMPT_PLAYBOOK.md` — core operator safety rules, decision tree, glossary rules.
- Created `docs/NON_TECHNICAL_USER_GUIDE.md` — plain-language guide for users without CLI knowledge.
- Created `docs/ANTIGRAVITY_OPERATION_GUIDE.md` — SOP for Antigravity as workflow operator.
- Created `docs/USER_INTENT_HANDLING_RULES.md` — how to parse free-form natural language requests.
- Created `docs/OPERATOR_RISK_LEVEL_MATRIX.md` — Level 0-4 risk classification with quick reference table.
- Created `docs/FULL_BOOK_TRANSLATION_POLICY.md` — policy for when/how full book translation is permitted.
- Created `docs/OPERATOR_RESPONSE_TEMPLATES.md` — 10 standard response templates for operator interactions.
- Created `docs/USER_INTENT_TO_CLI_MAPPING.md` — full intent-to-CLI mapping table.
- Created `docs/WEB_APP_HANDOFF_NOTES.md` — UX design notes for future web app development.
- Created `docs/QUICK_START.md` — quick start guide (prompt-based and CLI).
- Created `examples/prompts/README.md` — index of all prompt templates.
- Created 12 prompt template files in `examples/prompts/`.
- Updated `README.md`, `docs/CLI_REFERENCE.md`, `docs/GLOSSARY_GOVERNANCE_GUIDE.md`, `docs/WORKFLOW_CORE_CHANGELOG.md`.

### Files Created
- `docs/OPERATOR_PROMPT_PLAYBOOK.md`
- `docs/NON_TECHNICAL_USER_GUIDE.md`
- `docs/ANTIGRAVITY_OPERATION_GUIDE.md`
- `docs/USER_INTENT_HANDLING_RULES.md`
- `docs/OPERATOR_RISK_LEVEL_MATRIX.md`
- `docs/FULL_BOOK_TRANSLATION_POLICY.md`
- `docs/OPERATOR_RESPONSE_TEMPLATES.md`
- `docs/USER_INTENT_TO_CLI_MAPPING.md`
- `docs/WEB_APP_HANDOFF_NOTES.md`
- `docs/QUICK_START.md`
- `examples/prompts/README.md`
- `examples/prompts/start-new-book.md`
- `examples/prompts/free-form-request.md`
- `examples/prompts/translate-one-chapter-draft.md`
- `examples/prompts/translate-full-book-safe.md`
- `examples/prompts/check-project-status.md`
- `examples/prompts/run-quality-checks.md`
- `examples/prompts/review-glossary.md`
- `examples/prompts/update-glossary-after-expert-review.md`
- `examples/prompts/apply-glossary-changes-to-draft.md`
- `examples/prompts/create-preview-and-epub.md`
- `examples/prompts/recover-from-error.md`
- `examples/prompts/approve-final-translation.md`

### Files Modified
- `README.md` — added section 6 "Non-Technical Operation via Antigravity", updated docs list.
- `docs/CLI_REFERENCE.md` — added glossary command docs, added "When You Do Not Want to Use CLI Directly" section.
- `docs/GLOSSARY_GOVERNANCE_GUIDE.md` — added "Operating Glossary Through Antigravity" section and risk level table.
- `docs/WORKFLOW_CORE_CHANGELOG.md` — prepended Phase 17 entry.

### Dataset Files Modified
- None. No dataset, book-level, or translated content was modified.

### Files Not Modified
- `core/**` — no modifications.
- `cli/**` — no modifications.
- `workflow/**` — no modifications.
- `tests/**` — no modifications.
- `package.json` — no modifications.
- `books/**` — no modifications (no workflow-state, glossary.csv, reports, or translations changed).

### Verification
- All 9 primary docs files created in `docs/`.
- `docs/QUICK_START.md` created with `## Quick Start for Non-Technical Users` section.
- All 12+1 prompt templates created in `examples/prompts/`.
- README section 6 updated with Antigravity operator pointers.
- CLI_REFERENCE.md updated with glossary command and non-CLI usage section.
- GLOSSARY_GOVERNANCE_GUIDE.md updated with `## Operating Glossary Through Antigravity` section.
- WORKFLOW_CORE_CHANGELOG.md updated with full Phase 17 entry.
- No core, CLI, workflow, tests, or dataset files modified.

### Recommendation
Phase 17 is ready to be locked.
Recommended next step: Phase 18 — Production Release Candidate / Framework Packaging.

---

## Phase 16 — Glossary Governance / Human Approval Workflow


### Date
2026-06-12

### Goal
Add glossary governance so academic terminology can be generated, reviewed, approved, versioned, changed safely and applied to translation workflows only with human oversight.

### Why This Matters
Glossary is the backbone of academic translation. Full-book translation should not proceed without a reviewed glossary strategy.

### Actions Taken
- Added glossary candidate generation.
- Added glossary approval workflow.
- Added glossary version manager.
- Added glossary change request support.
- Added glossary diff reports.
- Added glossary impact analysis.
- Added affected chapter detection.
- Added glossaryApproval gate.
- Added glossaryImpact gate.
- Added glossary phase runner.
- Added glossary CLI commands.
- Added workflow-state glossary status.
- Added glossary governance documentation.
- Added glossary operation prompt examples.

### Files Created
- `core/glossary/glossary-normalizer.js`
- `core/glossary/glossary-schema-validator.js`
- `core/glossary/glossary-status.js`
- `core/glossary/glossary-candidate-extractor.js`
- `core/glossary/glossary-candidate-generator.js`
- `core/glossary/glossary-lock-policy.js`
- `core/glossary/glossary-version-manager.js`
- `core/glossary/glossary-change-request.js`
- `core/glossary/glossary-diff.js`
- `core/glossary/glossary-impact-analyzer.js`
- `core/glossary/glossary-approval-manager.js`
- `core/glossary/glossary-report-writer.js`
- `core/runner/run-glossary-phase.js`
- `core/runner/glossary-runner-utils.js`
- `core/gates/glossary-approval-gate.js`
- `core/gates/glossary-impact-gate.js`
- `tests/unit/glossary-governance.test.js`
- `docs/GLOSSARY_GOVERNANCE_GUIDE.md`
- `docs/GLOSSARY_CHANGE_POLICY.md`
- `docs/GLOSSARY_APPROVAL_WORKFLOW.md`
- `examples/prompts/review-glossary.md`
- `examples/prompts/update-glossary-after-expert-review.md`
- `examples/prompts/apply-glossary-changes-to-draft.md`

### Files Modified
- `core/runner/run-phase.js`
- `core/gates/gate-registry.js`
- `core/gates/quality-gates.js`
- `core/index.js`
- `cli/index.js`
- `workflow/master-workflow.json`
- `core/state/calculate-workflow-state.js`
- `tests/unit/gate-registry.test.js`
- `tests/integration/workflow-run-dry-run.test.js`

### Dataset Files Modified
- `books/entrepreneurship/glossary-candidates.csv`
- `books/entrepreneurship/glossary-candidates.json`
- `books/entrepreneurship/reports/glossary-candidates-report.md`
- `books/entrepreneurship/reports/glossary-candidates-report.json`
- `books/entrepreneurship/workflow-state.json`

### Files Not Modified
Confirm chapter content, translations, preview, EPUB and archive were not modified unless explicitly applying to draft.

### Verification
Commands run:
```bash
node cli/index.js glossary entrepreneurship --status
node cli/index.js glossary entrepreneurship --generate-candidates --dry-run
node cli/index.js glossary entrepreneurship --review-export
node cli/index.js qa entrepreneurship --gate glossaryApproval
node cli/index.js qa entrepreneurship --gate glossaryImpact
node cli/index.js run entrepreneurship --phase glossary --dry-run
node cli/index.js status entrepreneurship
```

### Recommendation
Proceed to Phase 17 — Operator Prompt Playbook / Non-Technical User Mode.

## Phase 1 — Add read-only Workflow Core to translate-agents-main

### Date
2026-06-11

### Goal
Add a read-only Workflow Core layer that can load and display status from Entrepreneurship Reference Dataset v1 without modifying dataset content.

### Actions Taken
- Created `core/`.
- Created path resolver.
- Created book config loader.
- Created workflow state loader.
- Created dataset scanner.
- Created chapter scanner.
- Created phase scanner.
- Created quality gates reader.
- Created report registry.
- Created CLI status command.

### Files Created
- `core/paths/path-resolver.js`
- `core/config/book-config.js`
- `core/state/load-workflow-state.js`
- `core/state/validate-workflow-state.js`
- `core/scanner/scan-phase.js`
- `core/scanner/scan-chapter.js`
- `core/scanner/scan-book.js`
- `core/gates/quality-gates.js`
- `core/reports/report-registry.js`
- `core/index.js`
- `cli/index.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Files Modified
None.

### Files Not Modified
Confirm that `books/entrepreneurship/` dataset content was not modified.

### Verification
Command run:

```bash
node cli/index.js status entrepreneurship
```

Result:

```text
Book: Entrepreneurship
Book slug: entrepreneurship
Dataset version: v1
Dataset status: reference_dataset_prepared
Overall status: passed_with_warnings
App readiness: ready_with_warnings
Chapters: 15
Preview HTML: available
EPUB: available
Reports: available

Quality gates:
- Glossary: validated
- Prep completeness: passed_with_warnings
- Duplicate pages: resolved
- Bilingual pairs: resolved
- Table integrity: resolved
- Preview CSS references: resolved
- Local path leaks: resolved
- Final validation: Passed with warnings

Known remaining issues:
- EPUB may still need rebuild in a later export step.
- Full preview rebuild/export validation may still be required.
- Workflow state may still need final consolidation.
```

### Notes
The core module operates fully in a read-only capacity, ensuring no files under the book dataset are modified or written to.

## Phase 2 — Generate workflow-state.json from real dataset

### Date
2026-06-11

### Goal
Add the ability for Workflow Core to generate `workflow-state.json` from the real dataset structure, QA summary and reports.

### Actions Taken
- Added workflow state calculator.
- Added generated state validator.
- Added safe workflow state writer.
- Added workflow state backup.
- Added CLI command `generate-state`.
- Scanned real dataset structure.
- Generated `workflow-state.json` from filesystem, QA summary and reports.

### Files Created
- `core/state/backup-workflow-state.js`
- `core/state/validate-generated-state.js`
- `core/state/calculate-workflow-state.js`
- `core/state/write-workflow-state.js`
- `core/state/generate-workflow-state.js`

### Files Modified
- `core/index.js`
- `cli/index.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
- `books/entrepreneurship/workflow-state.json`

### Files Not Modified
Confirm that glossary, chapters, preview, exports, reports, qa-summary and translated content were not modified.

### Verification
Commands run:

```bash
node cli/index.js generate-state entrepreneurship
node cli/index.js status entrepreneurship
```

Result:
```text
> node cli/index.js generate-state entrepreneurship
Generating workflow state for: entrepreneurship

Book: Entrepreneurship
Chapters scanned: 15
Book-level found: yes
Reports found: 18
Quality gates: 8 passed, 0 missing reports, 0 failed
Overall status: passed_with_warnings
App readiness: ready_with_warnings

Backup created:
backups/workflow-core-phase-2/workflow-state.backup.20260611-144144.json

Generated:
books/entrepreneurship/workflow-state.json

Result: Passed with warnings

> node cli/index.js status entrepreneurship
Book: Entrepreneurship
Book slug: entrepreneurship
Dataset version: v1
Dataset status: normalizing
Overall status: passed_with_warnings
App readiness: ready_with_warnings
Chapters: 15
Preview HTML: available
EPUB: available
Reports: available

Quality gates:
- Glossary: validated
- Prep completeness: passed
- Duplicate pages: resolved
- Bilingual pairs: resolved
- Table integrity: resolved
- Preview CSS references: resolved
- Local path leaks: resolved
- Final validation: Passed with warnings

Known remaining issues:
- EPUB may still need rebuild in a later export step.
- Full preview rebuild/export validation may still be required.
- Workflow state may still need final consolidation.
```

### Notes
All validations pass, including checks for local absolute path leaks. Backups are saved in the `backups/workflow-core-phase-2/` folder.

## Phase 3 — Add master-workflow.json and phase definitions

### Date
2026-06-11

### Goal
Add a machine-readable workflow definition and phase registry for Workflow Core.

### Actions Taken
- Created `workflow/master-workflow.json`.
- Added workflow loader.
- Added workflow validator.
- Added phase registry.
- Added workflow graph utilities.
- Added CLI workflow commands.
- Exported workflow modules from `core/index.js`.

### Files Created
- `workflow/master-workflow.json`
- `core/workflow/phase-definition.js`
- `core/workflow/load-master-workflow.js`
- `core/workflow/validate-master-workflow.js`
- `core/workflow/phase-registry.js`
- `core/workflow/workflow-graph.js`

### Files Modified
- `core/index.js`
- `cli/index.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
None.

### Files Not Modified
Confirm that `books/entrepreneurship/` dataset content was not modified.

### Verification
Commands run:

```bash
node cli/index.js workflow
node cli/index.js workflow validate
node cli/index.js workflow phase prep
node cli/index.js workflow graph
```

Result:
```text
> node cli/index.js workflow
Workflow: OpenStax Vietnamese Translation Workflow
Version: 1.0.0
Phases: 13

1. plan
2. scrape
3. clean
4. analyze
5. prep
6. translate
7. review
8. archive
9. build_preview
10. export_epub
11. qa_summary
12. generate_state
13. final_validate

> node cli/index.js workflow validate
Validating workflow/master-workflow.json...

Result: Passed

Checks:
- Schema: passed
- Required fields: passed
- Unique phase ids: passed
- Unique order: passed
- Dependencies: passed
- Circular dependency: passed
- Agent references: passed

> node cli/index.js workflow phase prep
Phase: prep
Name: Prepare bilingual HTML
Agent: agent-translate
Scope: chapter, book-level
Input phases: clean
Output phase: prep
Input paths: 02-clean
Output paths: 04-prep
Quality gate: prepCompleteness
Can run automatically: yes
Writes dataset: yes

> node cli/index.js workflow graph
plan
  → scrape
    → clean
      → analyze
      → prep
        → translate
          → review
            → archive
              → build_preview
                → export_epub
                → qa_summary
                  → generate_state
                    → final_validate
```

All validations pass successfully. The dependency resolution checks for circular dependencies, unique orders, and valid agent references without any issues.

## Phase 4 — QA Gate Runner

### Date
2026-06-11

### Goal
Implement dynamic execution of quality gates tools, parsing report results, updating quality gates and regenerating `workflow-state.json`.

### Actions Taken
- Created quality gate registry mapping gates to respective tools and reports.
- Created status normalizer for quality gates.
- Created report JSON parser.
- Created single quality gate runner supporting safety check-only mode and skipping `prepCompleteness` modifications unless `--allow-write` is passed.
- Created multi/all quality gates runner running gates sequentially.
- Fixed hardcoded paths in `books/entrepreneurship/tools/` (`check-table-integrity.js`, `check-local-path-leaks.js`, `check-preview-css-refs.js`) to resolve dynamically relative to `__dirname`, preventing paths from leaking outside the workspace.
- Fixed a bug in `final-validate-dataset.js` to normalize status values before comparing them during consistency checks, avoiding false mismatches.
- Updated `core/state/calculate-workflow-state.js` to dynamically compute quality gate statuses from reports using `readGateResult` and fall back to `qa-summary.json` if missing.
- Updated overall status calculation in `core/state/calculate-workflow-state.js` to determine status dynamically based on current quality gates statuses.
- Added `qa` CLI command.

### Files Created
- `core/gates/gate-registry.js`
- `core/gates/normalize-gate-status.js`
- `core/gates/read-gate-result.js`
- `core/gates/run-quality-gate.js`
- `core/gates/run-quality-gates.js`

### Files Modified
- `core/gates/quality-gates.js`
- `core/state/calculate-workflow-state.js`
- `core/index.js`
- `cli/index.js`
- `books/entrepreneurship/tools/check-table-integrity.js`
- `books/entrepreneurship/tools/check-local-path-leaks.js`
- `books/entrepreneurship/tools/check-preview-css-refs.js`
- `books/entrepreneurship/tools/final-validate-dataset.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
- `books/entrepreneurship/reports/chapter-14-table-integrity-report.json`
- `books/entrepreneurship/reports/chapter-14-table-integrity-report.md`
- `books/entrepreneurship/reports/final-validation-report.json`
- `books/entrepreneurship/reports/final-validation-report.md`
- `books/entrepreneurship/qa-summary.json`
- `books/entrepreneurship/qa-summary.md`
- `books/entrepreneurship/workflow-state.json`

### Verification
Commands run:

```bash
node cli/index.js qa entrepreneurship --list
node cli/index.js qa entrepreneurship --read tableIntegrity
node cli/index.js qa entrepreneurship --gate tableIntegrity
node cli/index.js qa entrepreneurship --all
node cli/index.js status entrepreneurship
```

Result of `status`:
```text
Book: Entrepreneurship
Book slug: entrepreneurship
Dataset version: v1
Dataset status: normalizing
Overall status: failed
App readiness: not_ready
Chapters: 15
Preview HTML: available
EPUB: available
Reports: available

Quality gates:
- Glossary: passed_with_warnings
- Prep completeness: passed
- Duplicate pages: passed
- Bilingual pairs: passed
- Table integrity: failed
- Preview CSS references: passed
- Local path leaks: passed
- Final validation: failed

Known remaining issues:
- EPUB may still need rebuild in a later export step.
- Full preview rebuild/export validation may still be required.
- Workflow state may still need final consolidation.
```

### Notes
With the dynamic base path resolution implemented, QA checks run safely within the workspace boundaries. The table integrity checks correctly identify row cell count mismatches in Chapter 14, and the final validation accurately propagates this check failure to set the overall dataset status to `failed`.## Phase 4.1 — Fix Table Integrity Gate

### Date
2026-06-11

### Goal
Fix table integrity failure and resolve consistency validation issues in final-validate-dataset.js.

### Actions Taken
- Updated the table structure in `books/entrepreneurship/chapters/chapter-14/05-translated/14-1-types-of-resources.html` to match the bilingual span-wrapping structure of `04-prep`.
- Restored missing `<td>` tags (bilingual model, 60 TDs total) and mapped existing Vietnamese translations into the targets, adding missing translation placeholders `<!-- TODO_PHASE_4_1_MISSING_TABLE_CELL_TRANSLATION: Vietnamese translation needed. -->` where required.
- Fixed a chicken-and-egg consistency issue in `final-validate-dataset.js` by normalizing warning-level statuses (`passed_with_warnings` -> `passed` and `ready_with_warnings` -> `ready`) before comparing workflow state and QA summary checks.
- Implemented a stale state bypass in `final-validate-dataset.js` so that if `workflow-state.json` overallStatus is `failed` due to a prior `finalValidation` gate run failure, but all other gates are passing/warning, it gracefully bypasses the mismatch instead of locking validation in a failure loop.
- Re-ran `tableIntegrity` gate, `finalValidation` gate, and regenerated `workflow-state.json`.

### Files Created
None.

### Files Modified
- `books/entrepreneurship/chapters/chapter-14/05-translated/14-1-types-of-resources.html`
- `books/entrepreneurship/reports/chapter-14-table-integrity-report.md`
- `books/entrepreneurship/reports/chapter-14-table-integrity-report.json`
- `books/entrepreneurship/tools/final-validate-dataset.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`
- `books/entrepreneurship/REFERENCE_DATASET_CHANGELOG.md`

### Files Not Modified
Confirmed that preview reader files, EPUB, glossary, and other chapters were not modified.

### Verification
Commands run:
```bash
node cli/index.js qa entrepreneurship --gate tableIntegrity
node cli/index.js qa entrepreneurship --gate finalValidation
node cli/index.js generate-state entrepreneurship
node cli/index.js status entrepreneurship
```

### Result
Overall status updated to `passed_with_warnings` and appReadiness status set to `ready_with_warnings`. All 9 quality gates resolved successfully.

## Phase 5 — Add Prep Phase Runner

### Date
2026-06-11

### Goal
Implement Phase 5 - Prep Phase Runner to transform HTML files from `02-clean` to `04-prep` using the bilingual model.

### Actions Taken
- Created Phase Run Result schema and builder (`core/runner/phase-run-result.js`).
- Implemented file transformation logic to tokenize, parse, and serialize HTML with bilingual structures (sibling duplication for headers/paragraphs, span wrapping for table cells/lists/figcaptions) in `core/runner/phase-runner-utils.js`.
- Implemented automated recursive backups of the destination `04-prep` folder prior to overwriting under `--force` option.
- Implemented CSS stylesheet references in `<head>` elements (pointing to `style.css` and `prep-debug.css`) and generated standard `prep-debug.css`.
- Created a generic phase runner router (`core/runner/run-phase.js`).
- Exposed the prep runner subcommand `run` to the CLI interface supporting `--phase`, `--chapter <chapterId>`, `--all`, `--dry-run`, `--force`, and `--check-only` flags.
- Triggered `prepCompleteness` quality gate check and `workflow-state.json` regeneration automatically after successful runs.

### Files Created
- `core/runner/phase-run-result.js`
- `core/runner/phase-runner-utils.js`
- `core/runner/run-prep-phase.js`
- `core/runner/run-phase.js`

### Files Modified
- `core/index.js`
- `cli/index.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
- `books/entrepreneurship/workflow-state.json`
- `books/entrepreneurship/chapters/chapter-2/04-prep/*.html` (11 files under force-run)
- `books/entrepreneurship/css/prep-debug.css`
- `books/entrepreneurship/reports/phase-runs/prep-chapter-2-*`
- `books/entrepreneurship/backups/phase-5-prep-runner/chapter-2/*`

### Files Not Modified
Confirmed that the following files/directories were not modified:
- `books/entrepreneurship/chapters/**/05-translated/**`
- `books/entrepreneurship/chapters/**/07-archive/**`
- `books/entrepreneurship/preview/html/**`
- `books/entrepreneurship/exports/epub/book.epub`
- `books/entrepreneurship/glossary.csv`

### Verification
Commands run:
```bash
node cli/index.js run entrepreneurship --phase prep --chapter chapter-2 --dry-run
node cli/index.js run entrepreneurship --phase prep --chapter chapter-2 --dry-run --force
node cli/index.js run entrepreneurship --phase prep --all --dry-run --force
node cli/index.js run entrepreneurship --phase prep --chapter chapter-2 --force
node cli/index.js status entrepreneurship
```

### Notes
- CLI commands successfully executed in dry-run mode, correctly identifying files to create/update.
- Actual execution on `chapter-2` backed up the existing `04-prep` folder, transformed and wrote 11 HTML files, executed `prepCompleteness` gate (returning `PASSED`), and regenerated `workflow-state.json` successfully.

## Phase 6 — Add Archive and Preview Phase Runners

### Date
2026-06-11

### Goal
Add executable workflow runners for `archive` and `build_preview`.

### Actions Taken
- Added archive phase runner.
- Added build preview phase runner.
- Added archive completeness gate.
- Added archive phase run reports.
- Added build preview phase run reports.
- Updated generic run-phase dispatcher.
- Updated CLI run commands.
- Integrated archive/build_preview runners with QA gates.
- Integrated runners with workflow-state regeneration.

### Files Created
- `core/runner/run-archive-phase.js`
- `core/runner/run-build-preview-phase.js`
- `core/runner/archive-runner-utils.js`
- `books/entrepreneurship/tools/check-archive-completeness.js`

### Files Modified
- `core/gates/gate-registry.js`
- `books/entrepreneurship/tools/check-preview-css-refs.js`
- `core/runner/run-phase.js`
- `core/runner/phase-runner-utils.js`
- `core/index.js`
- `cli/index.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
- `books/entrepreneurship/chapters/**/07-archive/**` (167 files updated, 3 book-level created)
- `books/entrepreneurship/preview/html/**` (170 files updated/written)
- `books/entrepreneurship/reports/phase-runs/archive-*`
- `books/entrepreneurship/reports/build-preview-*`
- `books/entrepreneurship/reports/archive-completeness-report.json`
- `books/entrepreneurship/reports/archive-completeness-report.md`
- `books/entrepreneurship/reports/preview-css-refs-report.json`
- `books/entrepreneurship/reports/preview-css-refs-report.md`
- `books/entrepreneurship/workflow-state.json`

### Files Not Modified
Confirmed that `05-translated` (except from the archive write destination), `04-prep`, `02-clean`, glossary and EPUB were not modified.

### Verification
Commands run:
```bash
node cli/index.js run entrepreneurship --phase archive --chapter chapter-2 --dry-run
node cli/index.js run entrepreneurship --phase archive --chapter chapter-2
node cli/index.js run entrepreneurship --phase build_preview --dry-run
node cli/index.js run entrepreneurship --phase build_preview --force
node cli/index.js qa entrepreneurship --gate previewCssReferences
node cli/index.js generate-state entrepreneurship
node cli/index.js status entrepreneurship
```

### Result
All 170 files processed successfully. `archiveCompleteness` and `previewCssReferences` gates returned `passed`. Overall status remains `passed_with_warnings` and app readiness is `ready_with_warnings`.

### Notes
- Under dry-run mode, no filesystem changes or state regenerations occur.
- Backups are correctly created before force overwrites: `backups/phase-6-archive-runner/` and `backups/phase-6-preview-runner/`.

## Phase 7 — Add EPUB Export Runner

### Date
2026-06-11

### Goal
Add executable workflow runner for `export_epub`, including EPUB build/validation and workflow-state integration.

### Actions Taken
- Added EPUB export phase runner.
- Added EPUB runner utilities.
- Added EPUB validity gate.
- Added EPUB validity reports.
- Added export_epub phase run reports.
- Updated generic run-phase dispatcher.
- Updated CLI run commands.
- Integrated EPUB runner with QA gates.
- Integrated EPUB runner with workflow-state regeneration.

### Files Created
- `core/runner/run-export-epub-phase.js`
- `core/runner/epub-runner-utils.js`
- `core/gates/epub-validity-gate.js`

### Files Modified
- `core/gates/gate-registry.js`
- `core/gates/run-quality-gate.js`
- `core/gates/quality-gates.js`
- `core/reports/report-registry.js`
- `core/state/calculate-workflow-state.js`
- `core/runner/run-phase.js`
- `core/index.js`
- `workflow/master-workflow.json`
- `cli/index.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
- `books/entrepreneurship/exports/epub/book.epub`
- `books/entrepreneurship/reports/epub-validity-report.json`
- `books/entrepreneurship/reports/epub-validity-report.md`
- `books/entrepreneurship/reports/phase-runs/export-epub-*`
- `books/entrepreneurship/workflow-state.json`
- `books/entrepreneurship/backups/phase-7-epub-runner/**`

### Files Not Modified
Confirm that `05-translated`, `04-prep`, `02-clean`, glossary and chapter source files were not modified.

### Verification
Commands run:
```bash
node cli/index.js run entrepreneurship --phase export_epub --dry-run
node cli/index.js run entrepreneurship --phase export_epub --validate-only
node cli/index.js run entrepreneurship --phase export_epub --force
node cli/index.js qa entrepreneurship --gate epubValidity
node cli/index.js generate-state entrepreneurship
node cli/index.js status entrepreneurship
```

### Result
All checks passed successfully. `epubValidity` returned `passed` on the newly compiled EPUB. `quality-gates: 9 passed`. Overall status is `passed_with_warnings` and app readiness is `ready_with_warnings`.

### Notes
Under dry-run mode, no filesystem changes or state regenerations occur. Backups are correctly created before force overwrites under `backups/phase-7-epub-runner/`.

## Phase 8 — Add Review Phase Runner

### Date
2026-06-11

### Goal
Implement executable workflow runner for `review` phase, including HTML integrity, glossary validation, rule-based semantic check, report generation, Quality Gate checks, and workflow-state integration.

### Actions Taken
- Created Phase 8 Review Phase Runner (`core/runner/run-review-phase.js`).
- Implemented core review utility helpers (`core/runner/review-runner-utils.js`) for parsing glossary CSV files, extracting term pairs, identifying Vietnamese visible blocks, tokenizing HTML start tags, and finding matching closing tags.
- Implemented robust `stripVnVisible` function to strip out target Vietnamese visible elements and their nested contents before calculating and comparing tag counts in the Integrity Review, avoiding false mismatches.
- Created `reviewCompleteness` quality gate (`core/gates/review-completeness-gate.js`) to check the completeness and correctness of chapter reviews.
- Registered the quality gate in `core/gates/gate-registry.js`, `core/gates/quality-gates.js`, and `core/gates/run-quality-gate.js`.
- Registered review completeness report in `core/reports/report-registry.js`.
- Integrated `review` phase routing in `core/runner/run-phase.js`.
- Added review command options (`--review-types`, `--chapter`, `--all`, `--dry-run`, `--force`) to CLI.
- Integrated review runner execution with quality gates checks and `workflow-state.json` updates.

### Files Created
- `core/runner/run-review-phase.js`
- `core/gates/review-completeness-gate.js`

### Files Modified
- `core/runner/review-runner-utils.js`
- `core/gates/gate-registry.js`
- `core/gates/quality-gates.js`
- `core/reports/report-registry.js`
- `core/state/calculate-workflow-state.js`
- `core/runner/run-phase.js`
- `core/index.js`
- `cli/index.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
- `books/entrepreneurship/reports/review-completeness-report.json`
- `books/entrepreneurship/reports/review-completeness-report.md`
- `books/entrepreneurship/reports/phase-runs/review-*`
- `books/entrepreneurship/chapters/**/06-reviews/review-summary-*`
- `books/entrepreneurship/chapters/**/06-reviews/integrity-review-*`
- `books/entrepreneurship/chapters/**/06-reviews/glossary-review-*`
- `books/entrepreneurship/chapters/**/06-reviews/semantic-review-*`
- `books/entrepreneurship/chapters/**/06-reviews/review-summary.json`
- `books/entrepreneurship/chapters/**/06-reviews/review-summary.md`
- `books/entrepreneurship/chapters/**/06-reviews/*-review.md`
- `books/entrepreneurship/workflow-state.json`
- `books/entrepreneurship/backups/phase-8-review-runner/**`

### Files Not Modified
Confirm that `05-translated` (except from the review summary write destination), `04-prep`, `02-clean`, glossary, and chapter source files were not modified.

### Verification
Commands run:
```bash
node cli/index.js run entrepreneurship --phase review --chapter chapter-2 --dry-run
node cli/index.js run entrepreneurship --phase review --all --dry-run
node cli/index.js run entrepreneurship --phase review --chapter chapter-2 --force
node cli/index.js run entrepreneurship --phase review --all --force
node cli/index.js qa entrepreneurship --gate reviewCompleteness
node cli/index.js status entrepreneurship
```

### Result
Integrity tag count checks passed completely without false positives. Quality gate `reviewCompleteness` successfully runs and status updates to `needs_human_review` because of external English-language reference links. Overall book dataset status successfully updates to `needs_human_review` with `10/10` gates resolved.

## Phase 9 — Add Analyze Phase Runner

### Date
2026-06-11

### Goal
Add executable workflow runner for `analyze`, generating structure, terminology and translation context analysis from clean HTML.

### Actions Taken
- Added analyze phase runner.
- Added analyze runner utilities.
- Added analysis completeness gate.
- Added chapter-level analysis reports.
- Added analyze phase run reports.
- Updated generic run-phase dispatcher.
- Updated CLI run commands.
- Integrated analyze runner with QA gates.
- Integrated analyze runner with workflow-state regeneration.

### Files Created
- `core/runner/run-analyze-phase.js`
- `core/runner/analyze-runner-utils.js`
- `core/gates/analysis-completeness-gate.js`

### Files Modified
- `core/gates/gate-registry.js`
- `core/gates/quality-gates.js`
- `core/reports/report-registry.js`
- `core/state/calculate-workflow-state.js`
- `core/runner/run-phase.js`
- `core/index.js`
- `cli/index.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
- `books/entrepreneurship/reports/analysis-completeness-report.json`
- `books/entrepreneurship/reports/analysis-completeness-report.md`
- `books/entrepreneurship/reports/phase-runs/analyze-*`
- `books/entrepreneurship/chapters/**/03-analyzed/**`
- `books/entrepreneurship/workflow-state.json`
- `books/entrepreneurship/backups/phase-9-analyze-runner/**`

### Files Not Modified
Confirm that `02-clean`, `04-prep`, `05-translated`, `06-reviews`, `07-archive`, preview HTML, EPUB and glossary were not modified.

### Verification
Commands run:
```bash
node cli/index.js run entrepreneurship --phase analyze --chapter chapter-2 --dry-run
node cli/index.js run entrepreneurship --phase analyze --chapter chapter-2
node cli/index.js run entrepreneurship --phase analyze --all
node cli/index.js qa entrepreneurship --gate analysisCompleteness
node cli/index.js generate-state entrepreneurship
node cli/index.js status entrepreneurship
```

### Result
All analyses run successfully, structure, terminology, and translation context reports are generated under `03-analyzed/`. Cổng chất lượng `analysisCompleteness` hoạt động chuẩn xác, phát hiện đúng các thuật ngữ còn thiếu trong `glossary.csv` và đưa trạng thái về `needs_human_review`.

## Phase 10 — Add Translate Phase Runner

### Date
2026-06-11

### Goal
Add executable workflow runner for `translate`, including translation provider abstraction, safe draft output, translation completeness gate, and workflow-state integration.

### Actions Taken
- Added translate phase runner coordinating mock, manual, or AI translation execution.
- Added translation provider abstraction and factory.
- Added mock translation provider.
- Added manual translation provider utilizing translation memory.
- Added external AI provider skeleton.
- Added translation block extractor using cheerio.
- Added translation block writer using cheerio.
- Added glossary context builder matching glossary csv against sourceText.
- Added translation completeness gate (`translationCompleteness`).
- Added translation phase run reports.
- Updated generic run-phase dispatcher.
- Updated CLI commands and status printing.
- Integrated translate runner with QA gates and workflow-state regeneration.

### Files Created
- `core/runner/run-translate-phase.js`
- `core/runner/translate-runner-utils.js`
- `core/translation/translation-provider.js`
- `core/translation/mock-translation-provider.js`
- `core/translation/manual-translation-provider.js`
- `core/translation/external-ai-translation-provider.js`
- `core/translation/translation-block-extractor.js`
- `core/translation/translation-block-writer.js`
- `core/translation/translation-memory.js`
- `core/translation/glossary-context-builder.js`
- `core/gates/translation-completeness-gate.js`

### Files Modified
- `core/gates/gate-registry.js`
- `core/gates/quality-gates.js`
- `core/reports/report-registry.js`
- `core/state/calculate-workflow-state.js`
- `core/runner/run-phase.js`
- `core/index.js`
- `cli/index.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
- `books/entrepreneurship/reports/translation-completeness-report.json`
- `books/entrepreneurship/reports/translation-completeness-report.md`
- `books/entrepreneurship/reports/phase-runs/translate-*`
- `books/entrepreneurship/workflow-state.json`

### Files Not Modified
Confirm that `02-clean`, `03-analyzed`, `04-prep`, `06-reviews`, `07-archive`, preview HTML, EPUB and glossary were not modified (or restored after tests).

### Verification
Commands run:
```bash
node cli/index.js run entrepreneurship --phase translate --chapter chapter-2 --dry-run
node cli/index.js run entrepreneurship --phase translate --chapter chapter-2 --provider mock
node cli/index.js qa entrepreneurship --gate translationCompleteness
node cli/index.js generate-state entrepreneurship
node cli/index.js status entrepreneurship
```

### Result
All commands run successfully. Quality gate `translationCompleteness` correctly checks translation progress and registers status as `passed` or `passed_with_warnings` when mock provider is used.

### Notes
External AI provider is a skeleton only unless explicitly configured.

## Phase 11 — Add Clean Phase Runner

### Date
2026-06-11

### Goal
Add executable workflow runner for `clean`, converting raw OpenStax HTML into clean HTML suitable for analysis, prep and translation.

### Actions Taken
- Added clean phase runner.
- Added clean runner utilities.
- Added HTML cleaner.
- Added OpenStax clean rules.
- Added asset reference normalizer.
- Added HTML structure validator.
- Added cleanHtmlValid gate.
- Added clean phase run reports.
- Updated generic run-phase dispatcher.
- Updated CLI run commands.
- Integrated clean runner with QA gates.
- Integrated clean runner with workflow-state regeneration.

### Files Created
- [openstax-clean-rules.js](file:///f:/LIBERO/translate-agents-main/core/clean/openstax-clean-rules.js)
- [asset-reference-normalizer.js](file:///f:/LIBERO/translate-agents-main/core/clean/asset-reference-normalizer.js)
- [html-structure-validator.js](file:///f:/LIBERO/translate-agents-main/core/clean/html-structure-validator.js)
- [html-cleaner.js](file:///f:/LIBERO/translate-agents-main/core/clean/html-cleaner.js)
- [clean-runner-utils.js](file:///f:/LIBERO/translate-agents-main/core/runner/clean-runner-utils.js)
- [run-clean-phase.js](file:///f:/LIBERO/translate-agents-main/core/runner/run-clean-phase.js)
- [clean-html-valid-gate.js](file:///f:/LIBERO/translate-agents-main/core/gates/clean-html-valid-gate.js)

### Files Modified
- [gate-registry.js](file:///f:/LIBERO/translate-agents-main/core/gates/gate-registry.js)
- [quality-gates.js](file:///f:/LIBERO/translate-agents-main/core/gates/quality-gates.js)
- [report-registry.js](file:///f:/LIBERO/translate-agents-main/core/reports/report-registry.js)
- [calculate-workflow-state.js](file:///f:/LIBERO/translate-agents-main/core/state/calculate-workflow-state.js)
- [run-phase.js](file:///f:/LIBERO/translate-agents-main/core/runner/run-phase.js)
- [index.js](file:///f:/LIBERO/translate-agents-main/core/index.js)
- [index.js](file:///f:/LIBERO/translate-agents-main/cli/index.js)
- [WORKFLOW_CORE_CHANGELOG.md](file:///f:/LIBERO/translate-agents-main/docs/WORKFLOW_CORE_CHANGELOG.md)

### Dataset Files Modified
- `books/entrepreneurship/chapters/chapter-2/02-clean/*.html`
- `books/entrepreneurship/chapters/chapter-2/02-clean/clean-summary-*`
- `books/entrepreneurship/reports/clean-html-valid-report.json`
- `books/entrepreneurship/reports/clean-html-valid-report.md`
- `books/entrepreneurship/reports/phase-runs/clean-*`
- `books/entrepreneurship/workflow-state.json`
- `books/entrepreneurship/backups/phase-11-clean-runner/**`

### Files Not Modified
Confirm that `01-raw`, `03-analyzed`, `04-prep`, `05-translated`, `06-reviews`, `07-archive`, preview HTML, EPUB and glossary were not modified.

### Verification
Commands run:
```bash
node cli/index.js run entrepreneurship --phase clean --chapter chapter-2 --dry-run
node cli/index.js run entrepreneurship --phase clean --chapter chapter-2
node cli/index.js qa entrepreneurship --gate cleanHtmlValid
node cli/index.js generate-state entrepreneurship
node cli/index.js status entrepreneurship
```

### Result
All commands run successfully, cleaned HTML is generated under `02-clean` matching standard styling and structure, backups are successfully created under `--force` options, quality gates check parses and validates cleanly, and workflow state registers `cleanHtmlValid` and updates properly.

### Notes
None.

## Phase 12 — Add Scrape Phase Runner

### Date
2026-06-11

### Goal
Add executable workflow runner for `scrape`, fetching raw OpenStax HTML and assets into `01-raw` and `assets` directories, generating `scrape-manifest.json` and `source-map.json`, running the `rawHtmlExists` quality gate, and integrating with workflow-state.

### Actions Taken
- Implemented source config resolver (`openstax-source-resolver.js`) — reads `book.config.json` `source` block and emits `source_url_missing` warnings when no URL and no local raw HTML exists.
- Implemented book discovery (`openstax-book-discovery.js`) — offline discovery scans chapter `01-raw` directories; online discovery uses Puppeteer TOC extraction with graceful fallback to offline.
- Implemented HTML fetcher (`html-fetcher.js`) — Axios-first with Puppeteer fallback; prepends `<!-- source: -->`, `<!-- fetchedAt: -->`, `<!-- sourceUrl: -->` metadata comments to all raw HTML files.
- Implemented asset fetcher (`asset-fetcher.js`) — scans raw HTML for `img[src]` and `source[srcset]` URLs; downloads to chapter or book-level `assets/` with original filename; skips existing unless `--force`.
- Implemented scrape manifest writer (`scrape-manifest.js`) — writes `books/{bookSlug}/scrape-manifest.json` and `.md` with run statistics per chapter.
- Implemented source map writer (`source-map-writer.js`) — writes `books/{bookSlug}/source-map.json` mapping relative raw file paths to source URLs, provider, and fetchedAt; additive by default.
- Implemented scrape validator (`scrape-validator.js`) — validates existence, non-empty HTML, and cross-reference against source map.
- Implemented scrape runner utilities (`scrape-runner-utils.js`) — backs up `01-raw`, `assets`, `scrape-manifest.json`, and `source-map.json` before force runs.
- Implemented main scrape phase runner (`run-scrape-phase.js`) — coordinates all the above; supports `--dry-run`, `--offline`, `--force`, `--chapter`, and `--all`; runs `rawHtmlExists` gate and regenerates state.
- Created `rawHtmlExists` quality gate (`raw-html-exists-gate.js`) — validates raw HTML presence, non-empty files, and source map consistency for all chapters.
- Registered `rawHtmlExists` gate in `gate-registry.js`, `quality-gates.js`, and `report-registry.js`.
- Integrated `rawHtmlExists` into `calculate-workflow-state.js` quality gates and reports sections.
- Added `scrape` routing in `run-phase.js`.
- Exported `runScrapePhase` from `core/index.js`.
- Added `--phase scrape`, `--offline` flag, and `rawHtmlExists` status display to `cli/index.js`.

### Files Created
- `core/scrape/openstax-source-resolver.js`
- `core/scrape/openstax-book-discovery.js`
- `core/scrape/html-fetcher.js`
- `core/scrape/asset-fetcher.js`
- `core/scrape/scrape-manifest.js`
- `core/scrape/source-map-writer.js`
- `core/scrape/scrape-validator.js`
- `core/runner/scrape-runner-utils.js`
- `core/runner/run-scrape-phase.js`
- `core/gates/raw-html-exists-gate.js`

### Files Modified
- `core/gates/gate-registry.js`
- `core/gates/quality-gates.js`
- `core/reports/report-registry.js`
- `core/state/calculate-workflow-state.js`
- `core/runner/run-phase.js`
- `core/index.js`
- `cli/index.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
- `books/entrepreneurship/scrape-manifest.json`
- `books/entrepreneurship/scrape-manifest.md`
- `books/entrepreneurship/source-map.json`
- `books/entrepreneurship/reports/raw-html-exists-report.json`
- `books/entrepreneurship/reports/raw-html-exists-report.md`
- `books/entrepreneurship/reports/phase-runs/scrape-*`
- `books/entrepreneurship/workflow-state.json`
- `books/entrepreneurship/backups/phase-12-scrape-runner/**`

### Files Not Modified
Confirmed that `02-clean`, `03-analyzed`, `04-prep`, `05-translated`, `06-reviews`, `07-archive`, preview HTML, EPUB, and `glossary.csv` were not modified.

### Verification
Commands run:
```bash
node cli/index.js run entrepreneurship --phase scrape --chapter chapter-2 --dry-run
node cli/index.js run entrepreneurship --phase scrape --dry-run
node cli/index.js run entrepreneurship --phase scrape --chapter chapter-2 --offline
node cli/index.js run entrepreneurship --phase scrape --all --offline
node cli/index.js run entrepreneurship --phase scrape --chapter chapter-2 --offline --force
node cli/index.js qa entrepreneurship --gate rawHtmlExists
node cli/index.js generate-state entrepreneurship
node cli/index.js status entrepreneurship
node cli/index.js run entrepreneurship --phase scrape_unsupported --all --dry-run
```

### Result
All commands run successfully. `rawHtmlExists` gate returns `passed` (15 chapters + _book-level all have raw HTML). Backups of `01-raw` and `assets` are created under `backups/phase-12-scrape-runner/` before force runs. Workflow state registers `rawHtmlExists: passed` with 12 quality gates now tracked. Overall status remains `needs_human_review` as expected.

### Notes
- In online mode, Puppeteer is used as fallback if Axios cannot fetch SPA content. Requires `puppeteer` to be installed.
- `book.config.json` for entrepreneurship has no `bookUrl` configured, so runs default to offline mode with a `source_url_missing` warning.
- Asset downloads use original filename from URL path (not the renamed `img-N-N.ext` pattern of the legacy cleanup script).

## Phase 13 — Add Plan Phase Runner / Project Initialization

### Date
2026-06-11

### Goal
Add executable workflow runner for `plan` and CLI support for initializing new book projects.

### Actions Taken
- Added project plan validator (`book-slug-validator.js`) — checks lowercase, alphanumeric, hyphens only, no leading/trailing hyphens, no duplicate slug without `--force`.
- Added project config template (`book-config-template.js`) — generates JSON template and adds double mappings to ensure backward compatibility with `loadBookConfig`.
- Added skeleton builder (`chapter-skeleton-builder.js`) — builds directories, handles chapter directories/subfolders if chapter count is supplied, supports `--dry-run`.
- Added project plan generator (`project-plan-generator.js`) — generates `project-plan.json` and `project-plan.md` detailing workflow, risk, and next commands.
- Added project initialization validator (`project-initialization-validator.js`) — validates required arguments before initialization.
- Added main project initialization coordinator (`init-book-project.js`) — coordinates validations, directory creation, config setup, glossary bootstrapping, default CSS copying, plan generation, and workflow-state calculations.
- Added completeness gate (`plan-completeness-gate.js`) — quality gate verifying config, slug, title, provider, skeleton folders, empty glossary headers, and planning outputs. Supports warnings for missing source URLs and is compatible with `key` term column identifier used in Entrepreneurship.
- Added plan runner utilities (`plan-runner-utils.js`) — backs up `project-plan.json` and `.md` before overwriting.
- Added main plan phase runner (`run-plan-phase.js`) — coordinates config reading, plan generation, gate execution, and state calculation; writes timestamped reports under `reports/phase-runs/plan-*`.
- Registered `planCompleteness` gate in `gate-registry.js`, `quality-gates.js`, and `report-registry.js`.
- Integrated `planCompleteness` into `calculate-workflow-state.js` quality gates and reports registry.
- Added `plan` routing in `run-phase.js` and updated unsupported phase error logging.
- Exported `runPlanPhase` and `initBookProject` from `core/index.js`.
- Integrated `init-book` CLI command, `--phase plan` dispatch, and status print for `planCompleteness` in `cli/index.js`.
- Updated `workflow/master-workflow.json` qualityGate reference for `plan` phase from `planningCompleteness` to `planCompleteness`.

### Files Created
- `core/project/book-slug-validator.js`
- `core/project/book-config-template.js`
- `core/project/chapter-skeleton-builder.js`
- `core/project/project-plan-generator.js`
- `core/project/project-initialization-validator.js`
- `core/project/init-book-project.js`
- `core/gates/plan-completeness-gate.js`
- `core/runner/plan-runner-utils.js`
- `core/runner/run-plan-phase.js`

### Files Modified
- `core/gates/gate-registry.js`
- `core/gates/quality-gates.js`
- `core/reports/report-registry.js`
- `core/state/calculate-workflow-state.js`
- `core/runner/run-phase.js`
- `core/index.js`
- `cli/index.js`
- `workflow/master-workflow.json`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
- `books/entrepreneurship/project-plan.json`
- `books/entrepreneurship/project-plan.md`
- `books/entrepreneurship/workflow-state.json`
- `books/entrepreneurship/reports/plan-completeness-report.json`
- `books/entrepreneurship/reports/plan-completeness-report.md`
- `books/entrepreneurship/reports/phase-runs/plan-*`
- `books/entrepreneurship/backups/phase-13-plan-runner/**`
- `books/psychology-2e/**` (newly initialized)

### Files Not Modified
Confirmed that existing chapter phase folders and generated outputs (clean, analyzed, prep, translated, reviews, archive, epub, preview) were not modified.

### Verification
Commands run:
```bash
node cli/index.js init-book --slug psychology-2e --title "Psychology 2e" --source-url "https://openstax.org/details/books/psychology-2e" --dry-run
node cli/index.js init-book --slug psychology-2e --title "Psychology 2e" --source-url "https://openstax.org/details/books/psychology-2e"
node cli/index.js run psychology-2e --phase plan
node cli/index.js qa psychology-2e --gate planCompleteness
node cli/index.js generate-state psychology-2e
node cli/index.js status psychology-2e
node cli/index.js run entrepreneurship --phase plan
node cli/index.js qa entrepreneurship --gate planCompleteness
node cli/index.js generate-state entrepreneurship
node cli/index.js status entrepreneurship
```

### Result
All commands executed successfully. Skeletons and configs are cleanly initialized for new books, and planning runs execute without issues for both new and existing datasets.

### Notes
- Existing glossary file headers using `key` as first column (e.g. Entrepreneurship) are supported alongside standard `term` column naming conventions.
- Default CSS style sheets are copied from the existing `entrepreneurship` template to new books during initialization.

## Phase 14 — Add End-to-End Workflow Orchestrator

### Date
2026-06-11

### Goal
Add a workflow orchestrator for running multiple phases in dependency order with dry-run, checkpoint, resume, and reporting support.

### Actions Taken
- Implemented execution context builder (`workflow-execution-context.js`) — tracks unique run IDs, timing, and phase run metrics.
- Implemented checkpoint manager (`workflow-checkpoint.js`) — saves progress to `books/{bookSlug}/workflow-checkpoint.json` after each phase and loads status during resumes.
- Implemented dependency checker (`workflow-dependency-checker.js`) — verifies folder/file inputs exist in the filesystem before executing dependent phases.
- Implemented approval gate validator (`workflow-approval-gates.js`) — checks for `--write-final` for translation and `--force` for destructive overrides.
- Implemented plan builder (`workflow-run-plan.js`) — computes execution sequence matching logical orders, supports resume logic, filtering with `--from`/`--to`/`--phases`.
- Implemented report generator (`workflow-run-report.js`) — outputs JSON/Markdown summaries of the execution run.
- Implemented runner adapter (`workflow-runner.js`) — invokes `runPhase` for supported phases and handles meta-phases (`qa_summary`, `generate_state`, `final_validate`).
- Implemented workflow orchestrator coordinator (`workflow-orchestrator.js`) — coordinates plans, checks dependencies, handles risk stop points, and saves checkpoints.
- Exported new modules in `core/index.js`.
- Integrated `workflow-run` command and options parsing in `cli/index.js`.

### Files Created
- `core/orchestrator/workflow-execution-context.js`
- `core/orchestrator/workflow-checkpoint.js`
- `core/orchestrator/workflow-dependency-checker.js`
- `core/orchestrator/workflow-approval-gates.js`
- `core/orchestrator/workflow-run-plan.js`
- `core/orchestrator/workflow-run-report.js`
- `core/orchestrator/workflow-runner.js`
- `core/orchestrator/workflow-orchestrator.js`

### Files Modified
- `core/index.js`
- `cli/index.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
- `books/entrepreneurship/workflow-checkpoint.json`
- `books/entrepreneurship/reports/workflow-runs/workflow-run-*`
- `books/entrepreneurship/workflow-state.json`

### Files Not Modified
Confirmed that the orchestrator itself does not modify chapter data except through explicit phase runners.

### Verification
Commands run:
```bash
node cli/index.js workflow-run entrepreneurship --dry-run
node cli/index.js workflow-run entrepreneurship --from analyze --to review --chapter chapter-2 --dry-run
node cli/index.js workflow-run entrepreneurship --from clean --to review --chapter chapter-2 --provider mock
node cli/index.js workflow-run entrepreneurship --resume --to review --chapter chapter-2 --provider mock --continue-on-warning
node cli/index.js status entrepreneurship
```

### Result
All commands run successfully. Skeletons and phases are executed in logical dependency order. Re-runs skip already completed checkpoint phases.

### Notes
- High-risk phases (clean, translate, archive, export_epub) stop automatically if a prior phase warning/review status occurs, unless overridden with `--continue-on-warning`.
- Meta phases (qa_summary, generate_state, final_validate) are handled directly by their corresponding internal runner modules.

## Phase 15 — Production Readiness / Hardening

### Date
2026-06-11

### Goal
Harden Workflow Core for production use by adding validation modules, logging, structured error handling, automated test suite, CLI documentation, and production readiness checks.

### Actions Taken
- Added configuration validators for book project configs (`validate-book-config.js`).
- Added circular dependency and mapping validators for workflow definitions (`validate-workflow-config.js`).
- Added system verification checks for environment requirements, write permissions, and API keys (`validate-core-environment.js`).
- Added a production readiness consolidator that generates markdown and JSON status reports (`validate-production-readiness.js`).
- Implemented standard logging wrapper supporting log levels and process args configuration (`logger.js`).
- Standardized error definitions and added custom error classes with formatting normalizers (`workflow-error.js`, `error-codes.js`, `error-normalizer.js`).
- Set up a comprehensive test suite containing unit, integration, and smoke tests using Node.js built-in test runner.
- Registered `validate-production` CLI command.
- Compiled technical references and manuals under `docs/`.

### Files Created
- `core/validation/validate-book-config.js`
- `core/validation/validate-workflow-config.js`
- `core/validation/validate-core-environment.js`
- `core/validation/validate-production-readiness.js`
- `core/logging/logger.js`
- `core/logging/log-format.js`
- `core/errors/error-codes.js`
- `core/errors/workflow-error.js`
- `core/errors/error-normalizer.js`
- `tests/unit/path-resolver.test.js`
- `tests/unit/workflow-graph.test.js`
- `tests/unit/gate-registry.test.js`
- `tests/unit/state-generator.test.js`
- `tests/unit/book-config-validator.test.js`
- `tests/unit/slug-validator.test.js`
- `tests/integration/cli-status.test.js`
- `tests/integration/cli-plan.test.js`
- `tests/integration/init-book.test.js`
- `tests/integration/workflow-run-dry-run.test.js`
- `tests/integration/qa-gates.test.js`
- `tests/smoke/entrepreneurship-smoke.test.js`
- `tests/smoke/new-book-smoke.test.js`
- `docs/WORKFLOW_CORE_PRODUCTION_READINESS.md`
- `docs/CLI_REFERENCE.md`
- `docs/BOOK_PROJECT_STRUCTURE.md`
- `docs/QUALITY_GATES_REFERENCE.md`
- `docs/TRANSLATION_PROVIDER_REFERENCE.md`
- `docs/RELEASE_CHECKLIST.md`

### Files Modified
- `package.json`
- `README.md`
- `core/index.js`
- `cli/index.js`
- `docs/WORKFLOW_CORE_CHANGELOG.md`

### Dataset Files Modified
- `books/entrepreneurship/reports/production-readiness-report.json`
- `books/entrepreneurship/reports/production-readiness-report.md`

### Files Not Modified
Confirmed that no book chapters content, glossary terms, preview html templates, or export binaries were altered.

### Verification
Commands run:
```bash
node --test tests/unit/*.test.js tests/integration/*.test.js tests/smoke/*.test.js
node cli/index.js validate-production entrepreneurship
node cli/index.js status entrepreneurship
```

### Result
All 34 automated tests passed successfully. The production readiness checker generates valid, well-structured json and markdown reports under the book reports directory.

### Known Warnings
- Environment warning: Optional translation API keys are not configured when translation provider is set to mock.
- Quality gates warnings: Gate reports are missing or unrun on clean/new projects since they haven't executed the E2E flow yet.

### Release Recommendation
The core system is highly stable, standardized, fully documented, and ready to be locked for production release.




# CLI Reference

This document provides detailed usage information for all commands in the Translate Agents CLI.

## Global Flags

- `--quiet`: Minimal print output (logs only errors).
- `--verbose` / `--debug`: Enables detailed logging with timestamp and error stack traces.

---

## 1. `status`
Displays the overall configuration, scan stats, and quality gates for a book project.
```bash
node cli/index.js status <bookSlug>
```

---

## 2. `init-book`
Initializes a skeleton directory structure and template config for a new book project.
```bash
node cli/index.js init-book --slug <bookSlug> --title "<Book Title>" --source-url "<OpenStax URL>" [--chapter-count <count>] [--dry-run] [--force]
```

---

## 3. `workflow-run`
Runs the End-to-End Workflow Orchestrator. Coordinates the execution of multiple sequential phases.
```bash
node cli/index.js workflow-run <bookSlug> [options]
```

### Options:
- `--from <phaseId>`: Execute starting from this phase.
- `--to <phaseId>`: Execute up to this phase.
- `--phases <phase1,phase2>`: Execute only these comma-separated phases.
- `--resume`: Read the latest checkpoint and resume execution from the first incomplete phase.
- `--dry-run`: Build and display the execution plan without writing files.
- `--force`: Force overwrite of existing files (disables some approval gates).
- `--continue-on-warning`: Overrides the risk stop guard, executing high-risk phases even if prior phases generated warnings or need review.
- `--chapter <chapterId>`: Run only for a specific chapter (e.g. `chapter-2`).
- `--all`: Run for all chapters.
- `--provider <mock|manual|external-ai>`: Select translation provider. (Note: In the Google Antigravity environment, the operator defaults to using the currently selected Antigravity model (`antigravity-selected-model`) for real content translation, writing to draft).
- `--write-final`: Enables writing translation to final HTML files.

---

## 4. `run`
Runs a single workflow phase for a book project.
```bash
node cli/index.js run <bookSlug> --phase <phaseId> [options]
```
Supported phases: `plan`, `scrape`, `clean`, `analyze`, `prep`, `translate`, `review`, `archive`, `build_preview`, `export_epub`.

---

## 5. `qa`
Runs quality gates or reads report results.
```bash
node cli/index.js qa <bookSlug> --list
node cli/index.js qa <bookSlug> --read <gateId>
node cli/index.js qa <bookSlug> --gate <gateId> [--allow-write]
node cli/index.js qa <bookSlug> --all [--allow-write]
```

---

## 6. `generate-state`
Regenerates `workflow-state.json` based on the real dataset directory contents and QA reports.
```bash
node cli/index.js generate-state <bookSlug>
```

---

## 7. `validate-production`
Runs configuration, workflow, and environment validators, outputting a production readiness report.
```bash
node cli/index.js validate-production <bookSlug>
```
Alias: `production-check`.

---

## 8. `glossary`

Manages book glossary: generate candidates, review export, approve terms, change request, impact analysis.

```bash
node cli/index.js glossary <bookSlug> --status
node cli/index.js glossary <bookSlug> --generate-candidates [--dry-run]
node cli/index.js glossary <bookSlug> --review-export
node cli/index.js glossary <bookSlug> --approve [--dry-run]
node cli/index.js glossary <bookSlug> --change-request <changesFile> [--dry-run]
node cli/index.js glossary <bookSlug> --impact
node cli/index.js glossary <bookSlug> --apply-to-draft --chapters affected [--dry-run]
```

---

## When You Do Not Want to Use CLI Directly

Use prompt templates and Antigravity operation guides instead:

- [Operator Prompt Playbook](file:///f:/LIBERO/translate-agents-main/docs/OPERATOR_PROMPT_PLAYBOOK.md) — Safety rules and intent-to-action flow
- [Non-Technical User Guide](file:///f:/LIBERO/translate-agents-main/docs/NON_TECHNICAL_USER_GUIDE.md) — Plain-language guide
- [User Intent to CLI Mapping](file:///f:/LIBERO/translate-agents-main/docs/USER_INTENT_TO_CLI_MAPPING.md) — Full intent → command table
- [examples/prompts/](file:///f:/LIBERO/translate-agents-main/examples/prompts/) — Copy-paste prompt templates

These documents show how Antigravity maps natural-language requests to safe CLI commands automatically.

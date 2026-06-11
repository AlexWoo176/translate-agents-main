# Workflow Core Production Readiness

This document outlines the standard requirements, safety model, and criteria for a book translation project to be marked as **Production Ready**.

## What is Production-Ready

A book project is considered production-ready when:
1. **Config is Valid**: `book.config.json` conforms to structure requirements and has no local machine path leaks.
2. **Workflow is Valid**: `master-workflow.json` has a valid, non-circular graph structure with mapping for all runners.
3. **Environment is Clean**: Required npm dependencies are installed, process has write permissions to report directories, and Node version is supported (>= 18.0.0).
4. **Dataset is Complete**: Chapters have been processed, and all required quality gates reports are present.
5. **Quality Gates Pass**: Mandatory quality gates have passed or resolved (any gate with a status of `failed` blocks release).

## Safety Model

To prevent dataset corruption:
- **Destructive Phase Guards**: Phases that modify raw or cleaned HTML files (`clean`, `prep`, etc.) require `--force` to overwrite existing outputs.
- **Translation Protection**: The `translate` phase will only write to draft files (`.draft.html`) by default. It will NOT overwrite final translation files (`05-translated/`) unless `--write-final` and `--force` are passed explicitly.
- **Risk Stop Guard**: Sequential workflow runs stop immediately before executing high-risk phases (`clean`, `translate`, `archive`, `export_epub`) if any previous phase resulted in `passed_with_warnings` or `needs_human_review`, unless overridden by `--continue-on-warning`.

## Production Validation Commands

To check the production readiness status of a book project:
```bash
node cli/index.js validate-production <bookSlug>
```

This runs all validators and generates reports:
- JSON Report: `books/{bookSlug}/reports/production-readiness-report.json`
- Markdown Report: `books/{bookSlug}/reports/production-readiness-report.md`

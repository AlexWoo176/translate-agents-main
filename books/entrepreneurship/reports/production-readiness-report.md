# Production Readiness Report

## Summary

- **Book**: entrepreneurship
- **Status**: ⚠️ **PRODUCTION_READY_WITH_WARNINGS**
- **Checked At**: 2026-06-11T17:20:09.548Z

## Core

- **Config**: passed_with_warnings
- **Workflow**: passed_with_warnings
- **Environment**: passed_with_warnings

## Dataset

- **Workflow State**: passed
- **Quality Gates**: needs_human_review
- **Reports**: passed

## CLI

- **Status command**: passed
- **QA command**: passed
- **Workflow run dry-run**: passed

## Docs

- **CLI reference**: passed
- **Quality gates reference**: passed
- **Release checklist**: passed

## Warnings

- [Config] OpenStax provider enabled, but no 'source.bookUrl' or 'source.sourceUrl' is specified. Project will operate in local/offline mode.
- [Workflow] Phase 'glossary' has no direct runner registration (unknown/custom phase)
- [Environment] Optional translation API keys (OPENAI_API_KEY, GEMINI_API_KEY) are not configured. External translation provider will not work.

## Errors

*None*

## Recommendations

- Review warning logs. Ensure missing quality gate reports are generated and docs are created.


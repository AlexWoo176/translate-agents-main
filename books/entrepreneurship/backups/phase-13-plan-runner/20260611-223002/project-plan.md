# Project Plan — Entrepreneurship

## Summary

- **Book Slug**: `entrepreneurship`
- **Title**: Entrepreneurship
- **Target Language**: vi
- **Status**: PLANNED

## Source

- **Provider**: openstax
- **Book URL**: *Pending/None*
- **License**: CC BY

## Workflow Phases

| Phase | Status |
|---|---|
| `plan` | ✅ **PASSED** |
| `scrape` | ⏳ *PENDING* |
| `clean` | ⏳ *PENDING* |
| `analyze` | ⏳ *PENDING* |
| `prep` | ⏳ *PENDING* |
| `translate` | ⏳ *PENDING* |
| `review` | ⏳ *PENDING* |
| `archive` | ⏳ *PENDING* |
| `build_preview` | ⏳ *PENDING* |
| `export_epub` | ⏳ *PENDING* |
| `qa_summary` | ⏳ *PENDING* |
| `generate_state` | ⏳ *PENDING* |
| `final_validate` | ⏳ *PENDING* |

## Quality Gates

| Gate | Initial Status |
|---|---|
| `planCompleteness` | ⏳ *PENDING* |
| `rawHtmlExists` | ⏳ *PENDING* |
| `cleanHtmlValid` | ⏳ *PENDING* |
| `analysisCompleteness` | ⏳ *PENDING* |
| `prepCompleteness` | ⏳ *PENDING* |
| `translationCompleteness` | ⏳ *PENDING* |
| `reviewCompleteness` | ⏳ *PENDING* |
| `archiveCompleteness` | ⏳ *PENDING* |
| `previewCssReferences` | ⏳ *PENDING* |
| `epubValidity` | ⏳ *PENDING* |
| `finalValidation` | ⏳ *PENDING* |

## Risks

- **[MEDIUM]** (source): Source URL (bookUrl) is not set. Scrape phase must run in offline/local mode.

## Next Recommended Commands

Run dry-run for scrape phase to discover chapters:
```bash
node cli/index.js run entrepreneurship --phase scrape --dry-run
```

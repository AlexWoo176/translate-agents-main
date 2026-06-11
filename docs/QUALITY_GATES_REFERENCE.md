# Quality Gates Reference

This document explains the purpose and target files of all 19 quality gates configured in the system.

## Summary of Gates

| Gate ID | Target Phase | Description |
|---|---|---|
| `planCompleteness` | `plan` | Checks that project configurations, folder skeletons, and plans are complete. |
| `rawHtmlExists` | `scrape` | Assures that source files have been scrape-crawled and downloaded locally. |
| `cleanHtmlValid` | `clean` | Validates that clean HTML files conform to structure schemas and preserve academic content tags. |
| `analysisCompleteness` | `analyze` | Validates that terminology lists, glossary candidates, and structural indices are created. |
| `glossaryApproval` | `glossary` | Validates that the glossary CSV schema is valid, contains no duplicates, and approved. |
| `glossaryImpact` | Core / QA | Verifies if recent glossary edits affect existing draft/final translations. |
| `prepCompleteness` | `prep` | Checks that prep bilingual files are constructed correctly with unique block IDs. |
| `translationCompleteness`| `translate` | Confirms that all bilingual segments are filled and no block is empty. |
| `reviewCompleteness` | `review` | Ensures that QA check feedback md files and revision round files are documented. |
| `archiveCompleteness` | `archive` | Validates that monolingual VN-only output HTML and Markdown files are exported. |
| `previewCssReferences` | `build_preview`| Assures that preview stylesheets are mapped and links do not point to local systems. |
| `epubValidity` | `export_epub` | Validates compiled EPUB structure and package compliance. |
| `glossary` | Core / QA | Checks structural integrity, column schemas, and duplicate keys in `glossary.csv`. |
| `duplicatePages` | Core / QA | Audits duplicate HTML file links or page titles in chapter outputs. |
| `bilingualPairs` | Core / QA | Verifies block ID pairing and segment counts match between prep and translations. |
| `tableIntegrity` | Core / QA | Checks table structures (`<table>`, `<tr>`, `<td>`, `<th>`) are preserved during translation. |
| `localPathLeaks` | Core / QA | Validates that output files contain no local machine paths (e.g. `C:\Users`). |
| `qaSummary` | Core / QA | Validates the compiled QA results and summaries. |
| `finalValidation` | Core / QA | Final project check combining validators to assert overall app readiness. |

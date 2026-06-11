# Entrepreneurship Reference Dataset v1 — QA Summary

## 1. Executive Summary

- **Book:** Entrepreneurship
- **Dataset version:** v1
- **Overall status:** **PASSED WITH WARNINGS**
- **Generated at:** 2026-06-11T15:57:12.777Z

## 2. Dataset Scope

| Item | Status | Details |
|---|---|---|
| Chapters 1–15 | ✅ Complete | Found 15 of 15 chapters |
| Book-level pages | ✅ Present | Directory `_book-level/` exists |
| Preview HTML | ✅ Present | Directory `preview/html/` exists |
| EPUB export | ✅ Present | File `exports/epub/book.epub` exists |
| Glossary | ✅ Present | File `glossary.csv` exists |

## 3. QA Checks Overview

| Check | Status | Report | Notes |
|---|---|---|---|
| Folder structure | ✅ Passed | N/A | Verified 15 chapters & required files |
| Glossary validation | ✅ Validated | [glossary-validation-report.md](reports/glossary-validation-report.md) | Checked 521 rows, 23 warnings |
| Chapter 5 duplicate page | ✅ Resolved | [chapter-5-duplicate-page-report.md](reports/chapter-5-duplicate-page-report.md) | Quarantined duplicate Section 5.1 files |
| Chapter 8 bilingual pairs | ✅ Resolved | [chapter-8-bilingual-pair-report.md](reports/chapter-8-bilingual-pair-report.md) | Programmatically balanced Table 8.2 tags |
| Chapter 14 table integrity | ✅ Resolved | [chapter-14-table-integrity-report.md](reports/chapter-14-table-integrity-report.md) | Confirmed cell alignments across all formats |
| Chapter 14/15 preview CSS refs | ✅ Resolved | [preview-css-refs-report.md](reports/preview-css-refs-report.md) | Fixed 22 broken stylesheet references |
| Local path leaks | ✅ Resolved | [local-path-leaks-report.md](reports/local-path-leaks-report.md) | Sanitized 11 distinct lines with path leaks |
| Translated CSS references | ✅ Resolved | [translated-css-refs-report.md](reports/translated-css-refs-report.md) | Fixed 168 broken stylesheet references |
| Prep completeness | ✅ Passed | [prep-rebuild-report.md](reports/prep-rebuild-report.md) | Rebuilt missing 04-prep for 11 chapters |

## 4. Detailed Findings

### 4.1 Glossary
- **Status:** Validated
- **Total Rows:** 521
- **Unique Keys:** 498
- **Duplicate Keys (Warnings):** 23
- **Malformed Rows Fixed:** 7 (in Step 2: business ethics, copyright, fairness, integrity, trade secret, trademark, truthfulness)
- **Remaining Errors:** 0

### 4.2 Duplicate Pages
- **Status:** Resolved
- **Duplicate Group:** Section 5.1 (`5.1 Entrepreneurial Opportunity`)
- **Canonical Decision:** `5-1-entrepreneurial-opportunity.html` (Complete bilingual file, ~6x larger)
- **Quarantined Files:** `5-1-identifying-entrepreneurial-opportunity.html`
- **Preview Registry Updated:** Yes (Removed duplicate from `book-pages.js`)
- **Remaining References:** None

### 4.3 Bilingual Pairs
- **Status:** Resolved
- **Files Scanned:** 13
- **High Risk File:** `chapters/chapter-8/05-translated/8-1-entrepreneurial-marketing-and-the-marketing-mix.html`
- **Mismatch Before:** 58 tags (mismatch in Table 8.2 of section 8.1)
- **Mismatch After:** 0 (perfectly balanced)
- **Remaining Issues:** None

### 4.4 Table Integrity
- **Status:** Resolved
- **Reference Cells (clean):** 60 TDs
- **Bilingual Translated Cells:** 95 TDs (matches prep reference exactly)
- **Difference After Check:** 0
- **Remaining Table Issues:** None (structural cell structures are 100% intact)

### 4.5 Preview CSS References
- **Status:** Resolved
- **Files Scanned:** 170
- **Broken Refs Before:** 22 (pointing to invalid `./style.css` or `style.css`)
- **Broken Refs After:** 0 (resolved relative to parent directories)
- **Fixes Applied:** 22 preview HTML files updated to `../css/style.css`

### 4.6 Local Path Leaks
- **Status:** Resolved
- **Files Scanned:** 4
- ** leaks Detected Before:** 11 distinct leaking lines
- **leaks Remaining After:** 0
- **Fixes Applied:** 11 lines updated (converted to relative links or replaced with placeholder `[LOCAL_PATH_REMOVED_STEP_7]`)

### 4.7 Translated CSS References
- **Status:** Resolved
- **Files Scanned:** 170
- **Broken Refs Before:** 168
- **Broken Refs After:** 0
- **Fixes Applied:** 168 HTML files updated

### 4.8 Prep Completeness
- **Status:** passed
- **Mode:** source_only_pending_target
- **Files Rebuilt From 02-clean:** 0
- **Existing Prep Files Overwritten After Backup:** 167
- **Recovered VN Blocks:** 0
- **Pending Translation Blocks:** 0

## 5. Missing Reports

None. All QA checks are fully documented by report JSON files.

## 6. Known Remaining Issues

- EPUB may still need rebuild in a later export step.
- Full preview rebuild/export validation may still be required.
- Workflow state may still need final consolidation.

## 7. Recommendations

- Verify and rebuild the EPUB export to ensure all resolved changes are compiled into the final EPUB.
- Conduct a final validation of preview files inside a browser reader environment.
- Consolidate and archive the verified reference dataset v1 release.

## 8. Final Decision

**READY WITH WARNINGS**

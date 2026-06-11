# Entrepreneurship Reference Dataset v1 — Changelog

## Step 1 — Normalize folder structure

### Date
2026-06-11

### Goal
Normalize the completed Entrepreneurship translation project into the `books/entrepreneurship/` reference dataset structure.

### Actions Taken
- Created `books/entrepreneurship/`.
- Copied `glossary.csv`.
- Copied `tasks.md`.
- Copied `css/`.
- Copied `assets/`.
- Copied `_book-level/`.
- Copied `.html/` into `preview/html/`.
- Copied `book.epub` into `exports/epub/book.epub`.
- Copied `chapter-1` to `chapters/chapter-1`.
- Copied `chapter-2` to `chapters/chapter-2`.
- Copied `chapter-3` to `chapters/chapter-3`.
- Copied `chapter-4` to `chapters/chapter-4`.
- Copied `chapter-5` to `chapters/chapter-5`.
- Copied `chapter-6` to `chapters/chapter-6`.
- Copied `chapter-7` to `chapters/chapter-7`.
- Copied `chapter-8` to `chapters/chapter-8`.
- Copied `chapter-9` to `chapters/chapter-9`.
- Copied `chapter-10` to `chapters/chapter-10`.
- Copied `chapter-11` to `chapters/chapter-11`.
- Copied `chapter-12` to `chapters/chapter-12`.
- Copied `chapter-13` to `chapters/chapter-13`.
- Copied `chapter-14` to `chapters/chapter-14`.
- Copied `chapter-15` to `chapters/chapter-15`.
- Created `book.config.json`.
- Created `workflow-state.json`.

### Files Created
- `books/entrepreneurship/book.config.json`
- `books/entrepreneurship/workflow-state.json`
- `books/entrepreneurship/REFERENCE_DATASET_CHANGELOG.md`

### Files Moved or Copied
- `glossary.csv` -> `books/entrepreneurship/glossary.csv`
- `tasks.md` -> `books/entrepreneurship/tasks.md`
- `css/` -> `books/entrepreneurship/css/`
- `assets/` -> `books/entrepreneurship/assets/`
- `_book-level/` -> `books/entrepreneurship/_book-level/`
- `.html/` -> `books/entrepreneurship/preview/html/`
- `book.epub` -> `books/entrepreneurship/exports/epub/book.epub`
- `chapter-1/` to `chapter-15/` -> `books/entrepreneurship/chapters/chapter-1/` to `chapter-15/`

### Files Not Modified
Confirm that source HTML, translated HTML, glossary content, review reports, archive files and EPUB content were not modified in this step.

### Known Issues Not Fixed in This Step
- Glossary CSV may still contain malformed rows.
- Chapter 5 may still contain duplicate page/slug conflict.
- Chapter 8 may still contain bilingual pair mismatch.
- Chapter 14 may still contain integrity issue with missing `<td>` tags.
- Chapter 14/15 preview may still contain broken `./style.css` references.
- Some `tasks.md` files may still contain local path leaks.

### Verification Result
Passed

### Notes
All folder structures have been normalized to `books/entrepreneurship/` according to instructions. Source data under `entrepreneurship-master` remains untouched and intact.

## Step 2 — Fix and validate glossary.csv

### Date
2026-06-11

### Goal
Fix malformed CSV rows and validate glossary schema for Entrepreneurship Reference Dataset v1.

### Actions Taken
- Created backup `glossary.backup.step-2.csv`.
- Created `glossary.schema.json`.
- Created `tools/validate-glossary.js`.
- Created `reports/glossary-validation-report.md`.
- Created `reports/glossary-validation-report.json`.
- Fixed malformed CSV rows if found.
- Created `glossary.normalized.csv`.
- Updated `workflow-state.json`.

### Rows Reviewed
521 terms (522 rows including header)

### Rows Fixed
- `business ethics` (fixed malformed fields/columns and reconstructed descriptions)
- `copyright` (fixed column alignment, quoted fields containing commas, reconstructed descriptions, set chapter and status)
- `fairness` (fixed column alignment, quoted fields containing commas, reconstructed descriptions, set chapter and status)
- `integrity` (fixed column alignment, quoted fields containing commas, reconstructed descriptions, set chapter and status)
- `trade secret` (fixed column alignment, quoted fields containing commas, reconstructed descriptions, set chapter and status)
- `trademark` (fixed column alignment, quoted fields containing commas, added missing Vietnamese translation, set chapter and status)
- `truthfulness` (fixed column alignment, quoted fields containing commas, reconstructed descriptions, set chapter and status)

### Status Normalization
Corrected incorrect statuses caused by malformed column shifts (e.g. `status` was parsed as `employees`, `and equitable`, etc.) and set them to `approved` (and shifted the misplaced texts to their correct description/chapter fields). No semantic translation changes were made.

### Files Created
- `books/entrepreneurship/glossary.backup.step-2.csv`
- `books/entrepreneurship/glossary.normalized.csv`
- `books/entrepreneurship/glossary.schema.json`
- `books/entrepreneurship/tools/validate-glossary.js`
- `books/entrepreneurship/reports/glossary-validation-report.md`
- `books/entrepreneurship/reports/glossary-validation-report.json`

### Files Modified
- `books/entrepreneurship/glossary.csv`
- `books/entrepreneurship/workflow-state.json`
- `books/entrepreneurship/REFERENCE_DATASET_CHANGELOG.md`

### Files Not Modified
Confirm that translated HTML, review reports, archive files, preview files and EPUB were not modified in this step.

### Known Issues Not Fixed in This Step
- Chapter 5 may still contain duplicate page/slug conflict.
- Chapter 8 may still contain bilingual pair mismatch.
- Chapter 14 may still contain integrity issue with missing `<td>` tags.
- Chapter 14/15 preview may still contain broken `./style.css` references.
- Some `tasks.md` files may still contain local path leaks.

### Verification Result
Passed

### Notes
The validator script runs against the corrected glossary file using a custom RFC-4180 character-by-character CSV parser. It successfully completed verification with 0 errors and 23 warnings (representing duplicate keys, which are noted but not changed).

## Step 3 — Detect and resolve Chapter 5 duplicate page/slug conflict

### Date
2026-06-11

### Goal
Detect and resolve duplicate page/slug conflict for Chapter 5 section 5.1.

### Actions Taken
- Created backup under `backups/step-3/`.
- Created `tools/detect-duplicate-pages.js`.
- Created duplicate page reports.
- Analyzed Chapter 5 translated/archive/preview files.
- Identified canonical file for section 5.1.
- Quarantined duplicate file without deleting it.
- Updated `book-pages.js` to remove duplicate registry entry.
- Updated internal links pointing to duplicate filename if found.
- Updated `workflow-state.json`.

### Duplicate Group Detected
- Group: Section 5.1 (`5.1 Entrepreneurial Opportunity`)
- Variants:
  1. `5-1-entrepreneurial-opportunity.html` (size: 65,255 bytes translated, 36,057 bytes archive, 65,415 bytes preview)
  2. `5-1-identifying-entrepreneurial-opportunity.html` (size: 10,736 bytes translated, 5,512 bytes archive, 10,902 bytes preview)

### Canonical Decision
Selected `5-1-entrepreneurial-opportunity.html` as canonical because it contains the complete translated text (almost 6x larger in size and character count) and includes all figures and complete bilingual structure.

### Files Quarantined
- `chapters/chapter-5/05-translated/5-1-identifying-entrepreneurial-opportunity.html` -> `chapters/chapter-5/_quarantine/step-3-duplicate-pages/5-1-identifying-entrepreneurial-opportunity.html`
- `chapters/chapter-5/07-archive/vn-only/5-1-identifying-entrepreneurial-opportunity.html` -> `chapters/chapter-5/_quarantine/step-3-duplicate-pages/vn-only/5-1-identifying-entrepreneurial-opportunity.html`
- `preview/html/chapter-5/5-1-identifying-entrepreneurial-opportunity.html` -> `preview/html/chapter-5/_quarantine/step-3-duplicate-pages/5-1-identifying-entrepreneurial-opportunity.html`

### Registry Updates
Removed `'/chapter-5/5-1-identifying-entrepreneurial-opportunity.html'` from `window.BOOK_PAGES` array in `preview/html/book-reader/book-pages.js`.

### Links Updated
None. No internal link references to `5-1-identifying-entrepreneurial-opportunity.html` were found in production or preview folders.

### Files Created
- `books/entrepreneurship/tools/detect-duplicate-pages.js`
- `books/entrepreneurship/reports/chapter-5-duplicate-page-report.md`
- `books/entrepreneurship/reports/chapter-5-duplicate-page-report.json`
- `books/entrepreneurship/chapters/chapter-5/_quarantine/step-3-duplicate-pages/manifest.md`
- Backup files under `books/entrepreneurship/backups/step-3/`

### Files Modified
- `books/entrepreneurship/preview/html/book-reader/book-pages.js`
- `books/entrepreneurship/workflow-state.json`
- `books/entrepreneurship/REFERENCE_DATASET_CHANGELOG.md`

### Files Not Modified
Confirm that glossary, translated content meaning, review reports, archive content unrelated to duplicate, preview content unrelated to duplicate and EPUB were not modified.

### Known Issues Not Fixed in This Step
- Chapter 8 may still contain bilingual pair mismatch.
- Chapter 14 may still contain integrity issue with missing `<td>` tags.
- Chapter 14/15 preview may still contain broken `./style.css` references.
- Some `tasks.md` files may still contain local path leaks.
- EPUB may still need rebuild in a later export step.

### Verification Result
Passed

### Notes
All quarantines and page registry updates were successfully executed and verified. The duplicate file is kept in history for safety.



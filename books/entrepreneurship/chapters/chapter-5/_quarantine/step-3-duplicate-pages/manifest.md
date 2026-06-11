# Quarantine Manifest — Step 3

This manifest details the files quarantined during Step 3 of the normalization workflow for `Entrepreneurship Reference Dataset v1`.

## 1. Quarantined Files
- **Translated File Path:** `chapters/chapter-5/_quarantine/step-3-duplicate-pages/5-1-identifying-entrepreneurial-opportunity.html` (originally at `chapters/chapter-5/05-translated/5-1-identifying-entrepreneurial-opportunity.html`)
- **Archive File Path:** `chapters/chapter-5/_quarantine/step-3-duplicate-pages/vn-only/5-1-identifying-entrepreneurial-opportunity.html` (originally at `chapters/chapter-5/07-archive/vn-only/5-1-identifying-entrepreneurial-opportunity.html`)
- **Preview File Path:** `preview/html/chapter-5/_quarantine/step-3-duplicate-pages/5-1-identifying-entrepreneurial-opportunity.html` (originally at `preview/html/chapter-5/5-1-identifying-entrepreneurial-opportunity.html`)

## 2. Reason for Quarantine
The quarantined files represent a duplicate/summarized version of Section 5.1 (`5.1 Entrepreneurial Opportunity`). An analysis of size and content density showed:
- `5-1-identifying-entrepreneurial-opportunity.html` has an average size of **~9,050 bytes** and **~5,821 characters**, containing a heavily truncated summary of the chapter's content with no figures or complete bilingual structures.
- `5-1-entrepreneurial-opportunity.html` has an average size of **~55,576 bytes** and **~31,425 characters**, containing the full, correct textbook translation, footnotes, and figures.

To prevent duplicate page rendering and Web Reader layout issues, the summarized candidate has been quarantined.

## 3. Canonical Replacement File
- **Canonical File:** [5-1-entrepreneurial-opportunity.html](file:///chapters/chapter-5/05-translated/5-1-entrepreneurial-opportunity.html) (retained in all main production pipelines: `05-translated`, `07-archive/vn-only`, and `preview/html/chapter-5/`).

## 4. Administrative Details
- **Date Performed:** 2026-06-11
- **Workflow Phase:** Step 3 (Resolve duplicate page conflict)
- **Data Retention Statement:** No data has been permanently deleted. The files are kept in this quarantine directory to preserve full historical translation context.

## 5. How to Restore Quarantined Files
If you need to restore the quarantined files to their original positions, run the following commands from the book directory `books/entrepreneurship`:

```powershell
# Restore to translated directory
Move-Item -Path "chapters/chapter-5/_quarantine/step-3-duplicate-pages/5-1-identifying-entrepreneurial-opportunity.html" -Destination "chapters/chapter-5/05-translated/5-1-identifying-entrepreneurial-opportunity.html" -Force

# Restore to archive directory
Move-Item -Path "chapters/chapter-5/_quarantine/step-3-duplicate-pages/vn-only/5-1-identifying-entrepreneurial-opportunity.html" -Destination "chapters/chapter-5/07-archive/vn-only/5-1-identifying-entrepreneurial-opportunity.html" -Force

# Restore to preview directory
Move-Item -Path "preview/html/chapter-5/_quarantine/step-3-duplicate-pages/5-1-identifying-entrepreneurial-opportunity.html" -Destination "preview/html/chapter-5/5-1-identifying-entrepreneurial-opportunity.html" -Force

# Note: You must also restore the entry in preview/html/book-reader/book-pages.js
```

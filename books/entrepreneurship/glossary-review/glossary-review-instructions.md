# Glossary Human Review Instructions

Dear Expert Reviewer,

Please review the vocabulary sheet in `glossary-review-sheet.csv`.

## Review Workflow

1. Open `glossary-review-sheet.csv` in your preferred spreadsheet tool (Excel, Google Sheets, LibreOffice).
2. For each term:
   - Verify the English term in the `term` column.
   - Propose or correct the Vietnamese translation in the `translation` column.
   - Adjust the `status` to one of the valid statuses:
     - `approved`: Approved and ready for translation.
     - `needs_review`: Needs further expert discussion.
     - `rejected`: Do not use this term.
     - `deprecated`: Old translation, no longer in use.
   - Set `locked` to `true` if this term is highly critical and should not be modified by automated runs.
3. Save the resulting file as `glossary-review-result.csv` in this folder.
4. Run CLI to import:
   ```bash
   node cli/index.js glossary entrepreneurship --approve
   ```

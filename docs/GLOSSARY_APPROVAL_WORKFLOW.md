# Glossary Approval Workflow

A detailed step-by-step walkthrough of the glossary governance pipeline.

## Step 1 — Generate Candidates
Scan terminology analysis files and clean HTML source files to extract candidate terms:
```bash
node cli/index.js glossary entrepreneurship --generate-candidates
```
This produces `glossary-candidates.csv`.

## Step 2 — Export Review Sheet
Export review sheets for experts:
```bash
node cli/index.js glossary entrepreneurship --review-export
```
This creates `books/entrepreneurship/glossary-review/glossary-review-sheet.csv`.

## Step 3 — Human/Expert Review
The expert reviews the spreadsheet, adds translations, sets statuses to `approved` or `rejected`, and saves the file as `glossary-review-result.csv` in the review directory.

## Step 4 — Import Review Result
Run approval import to merge changes back:
```bash
node cli/index.js glossary entrepreneurship --approve
```

## Step 5 — Validate Glossary
Verify that quality gates pass:
```bash
node cli/index.js qa entrepreneurship --gate glossaryApproval
```

## Step 6 — Translate Using Approved Glossary
Run translation using the fully approved glossary terms:
```bash
node cli/index.js run entrepreneurship --phase translate --all
```

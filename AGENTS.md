# AGENTS.md
- Luôn gọi tôi là bro. 
## Repo Reality

- Trust the scripts under `agents/*/scripts` over the root `README.md`. The README describes a per-chapter pipeline, but the current executable scrape/cleanup flow still writes to `../<book>/raw`, `clean`, and `assets`; later phases operate inside `../entrepreneurship/chapter-*`.
- This repo is effectively single-book today. Multiple automation scripts hardcode `../entrepreneurship` or OpenStax Entrepreneurship URLs: `agents/agent-analyze/scripts/term-extract.js`, `agents/agent-review/scripts/glossary-check.py`, and `agents/agent-scrape/scripts/skill-scrape.js`.
- There is no repo-wide `test`, `lint`, `typecheck`, CI, or formatter config at the root. Verify by running the specific script you changed on a narrow input.

## High-Value Paths

- Source glossary: `../entrepreneurship/glossary.csv`.
- Canonical progress tracker for the book: `../entrepreneurship/tasks.md`.
- Workflow intent: `workflow/master-workflow.md`.
- Translation rules the repo already depends on: `book-reader/skills/skill-translate.md`.

## Commands

- Install root JS dependency set with `bun install` at repo root. Root `package.json` is minimal and matches `bun.lock`.
- Scrape raw OpenStax HTML: `node agents/agent-scrape/scripts/skill-scrape.js entrepreneurship <start-url>`.
- Clean raw HTML and download assets: `node agents/agent-scrape/scripts/skill-cleanup.js entrepreneurship`.
- Extract chapter glossary candidates: `node agents/agent-analyze/scripts/term-extract.js <chapter-number>`.
- Prepare one HTML file for bilingual translation: `node agents/agent-translate/scripts/prep_html.js <input-html> <output-html>`.
- Run glossary QA for one chapter or all chapters: `python3 agents/agent-review/scripts/glossary-check.py <chapter-number|all>`.
- Start a new semantic review round for one translated file: `python3 agents/agent-review/scripts/start-review-round.py ../entrepreneurship/chapter-<N>/05-translated/<file>.html`.
- Apply accepted review edits back into HTML: `python3 agents/agent-translate/scripts/apply-review-fixes.py <review.md> <translated.html>`.
- Export translated HTML to DOCX (Vietnamese only): `node agents/agent-export/scripts/export-docx.js <file|chapter-number|all> [bookName]`. Output goes to `../<bookName>/docx/`.

## Gotchas

- `skill-cleanup.js` deletes everything in `../<book>/assets` before re-downloading. Do not run it casually if that shared asset folder contains work you need.
- `skill-scrape.js` accepts a `bookName` argument for output, but its link filter is hardcoded to `https://openstax.org/books/entrepreneurship/pages/`. Reusing it for another book needs code changes.
- `prep_html.js` is file-by-file only; there is no verified chapter-wide wrapper script.
- `apply-review-fixes.py` does plain string replacement in the translated HTML and only succeeds when the review table's `Bản dịch hiện tại` text matches the file exactly.
- `agents/agent-archive/scripts/build-preview.py` has a broken default `book_dir` path. If you use it, pass an explicit `../entrepreneurship` path after fixing or wrapping the script.

## Working Conventions

- Preserve the repo's append-only review history: semantic review files are round-based in `06-reviews`, created via `start-review-round.py` rather than overwritten.
- For translation edits, keep `eng hidden` blocks untouched and only change `vn visible` content while preserving inline tags and IDs, per `book-reader/skills/skill-translate.md`.

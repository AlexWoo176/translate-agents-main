/**
 * check-translated-css-refs.js
 *
 * Step 11: Fix CSS references for active 05-translated HTML files.
 * Entrepreneurship Reference Dataset v1.
 *
 * Scans all HTML under chapters/chapter-N/05-translated/
 * and _book-level/05-translated/ (if exists).
 * Correct path from chapters/chapter-N/05-translated/file.html: ../../../css/style.css
 * Correct path from _book-level/05-translated/file.html:        ../../css/style.css
 *
 * SCOPE:
 *   - FIXES: stylesheet href attributes in 05-translated HTML files only
 *   - DOES NOT modify: body content, translated text, images, scripts
 *   - DOES NOT touch: preview/html, exports/epub, archive, glossary
 *
 * OUTPUTS:
 *   reports/translated-css-refs-report.json
 *   reports/translated-css-refs-report.md
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT         = path.resolve(__dirname, '..');
const CHAPTERS_DIR = path.join(ROOT, 'chapters');
const BOOK_LEVEL   = path.join(ROOT, '_book-level');
const REPORTS_DIR  = path.join(ROOT, 'reports');
const CSS_ROOT     = path.join(ROOT, 'css', 'style.css');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given the absolute path of an HTML file, return the correct relative
 * path to ROOT/css/style.css from that file's directory.
 */
function correctCssPath(htmlFilePath) {
  const htmlDir = path.dirname(htmlFilePath);
  return path.relative(htmlDir, CSS_ROOT).replace(/\\/g, '/');
}

/**
 * Determine if an href value is broken (not resolving to ROOT/css/style.css).
 * Returns true if broken.
 */
function isBrokenHref(href, htmlFilePath) {
  const htmlDir = path.dirname(htmlFilePath);
  const resolved = path.resolve(htmlDir, href);
  return resolved !== CSS_ROOT;
}

/**
 * Fix all <link ... href="...css..."> stylesheet references in content.
 * Only fixes the href that points to style.css (any name), leaving other
 * attributes and all body content untouched.
 * Returns { fixed: boolean, newContent: string, oldHrefs: string[], newHref: string }
 */
function fixStylesheetHrefs(content, htmlFilePath) {
  const correct = correctCssPath(htmlFilePath);
  let fixed = false;
  const oldHrefs = [];

  // Match <link ... rel="stylesheet" ... href="..."> or <link href="..." rel="stylesheet">
  // We target only href values that look like CSS (contain style.css or end in .css)
  const newContent = content.replace(
    /(<link\b[^>]*\bhref=)(["'])([^"']*\.css[^"']*)\2([^>]*>)/gi,
    (match, before, quote, href, after) => {
      // Only fix if this link resolves to a style.css (not book-reader.css or other)
      if (!href.includes('style.css') && !href.match(/\/style\.css$/i)) {
        return match; // leave book-reader.css and others untouched
      }
      if (isBrokenHref(href, htmlFilePath)) {
        oldHrefs.push(href);
        fixed = true;
        return before + quote + correct + quote + after;
      }
      return match;
    }
  );

  return { fixed, newContent, oldHrefs, newHref: correct };
}

// ─── Scan & fix ───────────────────────────────────────────────────────────────
console.log('--- Step 11: Fix translated CSS references ---');

// Verify CSS target exists
if (!fs.existsSync(CSS_ROOT)) {
  console.error('ERROR: CSS target not found: ' + CSS_ROOT);
  process.exit(1);
}
console.log('CSS target: ' + CSS_ROOT);

const fileResults = [];

/**
 * Process a 05-translated directory.
 */
function processTranslatedDir(transDir) {
  if (!fs.existsSync(transDir)) return;
  const files = fs.readdirSync(transDir).filter(f => f.endsWith('.html'));
  for (const f of files) {
    const htmlPath = path.join(transDir, f);
    const relPath  = path.relative(ROOT, htmlPath).replace(/\\/g, '/');
    const original = fs.readFileSync(htmlPath, 'utf8');
    const correct  = correctCssPath(htmlPath);

    // Detect current href(s)
    const hrefMatches = [...original.matchAll(/href=["']([^"']*\.css[^"'"]*)['"]/gi)]
      .map(m => m[1]);
    const stylesheetHrefs = hrefMatches.filter(h => h.includes('style.css') || h.match(/\/style\.css$/i));

    // Determine if any are broken
    const brokenHrefs = stylesheetHrefs.filter(h => isBrokenHref(h, htmlPath));

    const entry = {
      file: relPath,
      currentHrefs: hrefMatches,
      stylesheetHrefs,
      correctPath: correct,
      brokenHrefs,
      status: 'clean',
      fixApplied: false,
      oldHrefs: [],
    };

    if (brokenHrefs.length > 0) {
      entry.status = 'broken';
      // Apply fix
      const { fixed, newContent, oldHrefs } = fixStylesheetHrefs(original, htmlPath);
      if (fixed) {
        fs.writeFileSync(htmlPath, newContent, 'utf8');
        entry.fixApplied = true;
        entry.oldHrefs   = oldHrefs;
        entry.status     = 'fixed';
        console.log('  FIXED: ' + relPath + ' (' + oldHrefs.join(', ') + ' → ' + correct + ')');
      } else {
        entry.status = 'broken_unfixed';
        console.warn('  WARNING: Could not fix: ' + relPath);
      }
    } else if (stylesheetHrefs.length === 0) {
      entry.status = 'no_stylesheet';
      console.log('  INFO: No style.css link: ' + relPath);
    } else {
      console.log('  OK: ' + relPath);
    }

    fileResults.push(entry);
  }
}

// Process all chapters
const chapterDirs = fs.readdirSync(CHAPTERS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory() && e.name.startsWith('chapter-'))
  .sort((a, b) => {
    const na = parseInt(a.name.replace('chapter-', ''), 10);
    const nb = parseInt(b.name.replace('chapter-', ''), 10);
    return na - nb;
  })
  .map(e => e.name);

for (const ch of chapterDirs) {
  processTranslatedDir(path.join(CHAPTERS_DIR, ch, '05-translated'));
}

// Process _book-level if exists
const blTrans = path.join(BOOK_LEVEL, '05-translated');
processTranslatedDir(blTrans);

// ─── Stats ────────────────────────────────────────────────────────────────────
const totalFiles   = fileResults.length;
const brokenBefore = fileResults.filter(r => r.status === 'fixed' || r.status === 'broken_unfixed').length +
                     fileResults.filter(r => r.status === 'fixed').length;
// Actually count by original broken status
const fixedCount   = fileResults.filter(r => r.status === 'fixed').length;
const cleanCount   = fileResults.filter(r => r.status === 'clean').length;
const noLinkCount  = fileResults.filter(r => r.status === 'no_stylesheet').length;
const unfixedCount = fileResults.filter(r => r.status === 'broken_unfixed').length;
const brokenTotal  = fixedCount + unfixedCount;

console.log('\n=== Summary ===');
console.log('  Files scanned: ' + totalFiles);
console.log('  Already clean: ' + cleanCount);
console.log('  No stylesheet link: ' + noLinkCount);
console.log('  Broken (fixed): ' + fixedCount);
console.log('  Broken (unfixed): ' + unfixedCount);
console.log('  Total broken before: ' + brokenTotal);
console.log('===============');

// ─── Build JSON report ────────────────────────────────────────────────────────
const NOW = new Date().toISOString();
const report = {
  bookSlug: 'entrepreneurship',
  datasetVersion: 'v1',
  step: 'step-11',
  generatedAt: NOW,
  cssTarget: 'css/style.css',
  scanScope: ['chapters/**/05-translated/', '_book-level/05-translated/ (if exists)'],
  summary: {
    filesScanned: totalFiles,
    alreadyClean: cleanCount,
    noStylesheetLink: noLinkCount,
    brokenBefore: brokenTotal,
    fixedCount,
    unfixedCount,
    status: unfixedCount > 0 ? 'partial' : brokenTotal > 0 ? 'fixed' : 'clean',
  },
  files: fileResults,
};

const JSON_OUT = path.join(REPORTS_DIR, 'translated-css-refs-report.json');
const MD_OUT   = path.join(REPORTS_DIR, 'translated-css-refs-report.md');

fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2), 'utf8');
console.log('\nJSON report: ' + JSON_OUT);

// ─── Build Markdown report ────────────────────────────────────────────────────
const brokenFiles  = fileResults.filter(r => r.status === 'fixed');
const unfixedFiles = fileResults.filter(r => r.status === 'broken_unfixed');
const noLinkFiles  = fileResults.filter(r => r.status === 'no_stylesheet');
const cleanFiles   = fileResults.filter(r => r.status === 'clean');

const md = `# Entrepreneurship Reference Dataset v1 — Translated CSS Refs Report (Step 11)

## 1. Summary

| Item | Value |
|---|---|
| Step | Step 11 — Fix CSS references for active 05-translated HTML files |
| Generated at | ${NOW} |
| CSS target | \`css/style.css\` |
| Correct relative path (from chapter-N/05-translated/) | \`../../../css/style.css\` |
| Files scanned | ${totalFiles} |
| Already clean | ${cleanCount} |
| No stylesheet link | ${noLinkCount} |
| Broken before fix | ${brokenTotal} |
| Fixed | ${fixedCount} |
| Unfixed | ${unfixedCount} |
| **Overall status** | **${report.summary.status.toUpperCase()}** |

---

## 2. Fixed Files (${fixedCount})

${fixedCount === 0 ? '_None_' : brokenFiles.map(f =>
  `- \`${f.file}\`\n  - Before: \`${f.oldHrefs.join('`, `')}\`\n  - After: \`${f.correctPath}\``
).join('\n')}

---

## 3. Unfixed Files (${unfixedCount})

${unfixedCount === 0 ? '_None_' : unfixedFiles.map(f =>
  `- \`${f.file}\` — broken hrefs: \`${f.brokenHrefs.join('`, `')}\``
).join('\n')}

---

## 4. Files With No Stylesheet Link (${noLinkCount})

${noLinkCount === 0 ? '_None_' : noLinkFiles.map(f => `- \`${f.file}\``).join('\n')}

---

## 5. Already Clean Files (${cleanCount})

${cleanCount === 0 ? '_None_' : cleanFiles.map(f => `- \`${f.file}\` (\`${f.stylesheetHrefs[0]}\`)`).join('\n')}

---

## 6. Scope Safety

- ✅ Only \`href\` attributes on \`<link rel="stylesheet">\` pointing to style.css were modified.
- ✅ Body content, translated text, images, and scripts were not touched.
- ✅ preview/html, exports/epub, archive, glossary were not modified.
- ✅ book-reader.css and other non-style.css hrefs were left intact.
`;

fs.writeFileSync(MD_OUT, md, 'utf8');
console.log('MD report: ' + MD_OUT);
console.log('\n--- Done ---');

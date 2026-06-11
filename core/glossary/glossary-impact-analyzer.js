'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot, getChapterRoot } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');
const { stripHtml } = require('../translation/glossary-context-builder');

function analyzeGlossaryImpact(bookSlug, diff, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const scan = scanBook(bookSlug);
  const chapters = scan.chaptersFound;
  
  const affectedTermsSet = new Set();
  const changedTranslations = new Map(); // term (lower) -> { oldVal, newVal }

  diff.updated.forEach(u => {
    const termLower = u.term.toLowerCase();
    const transChange = u.changes.find(c => c.field === 'translation');
    if (transChange) {
      affectedTermsSet.add(termLower);
      changedTranslations.set(termLower, {
        term: u.term,
        oldVal: transChange.oldVal,
        newVal: transChange.newVal
      });
    }
  });

  diff.removed.forEach(t => {
    affectedTermsSet.add(t.term.toLowerCase());
  });

  const affectedChapters = [];
  let draftStale = false;
  let finalStale = false;
  let reviewStale = false;
  let previewStale = false;

  // Scan clean HTML to see which terms appear in which chapters
  chapters.forEach(ch => {
    const chapterId = ch;
    const chRoot = getChapterRoot(bookSlug, chapterId);
    
    // Read clean HTML files as representation of English content
    const cleanDir = path.join(chRoot, '02-clean');
    if (!fs.existsSync(cleanDir)) return;

    let hasCleanHtml = false;
    let combinedText = '';
    try {
      const files = fs.readdirSync(cleanDir).filter(f => f.endsWith('.html'));
      files.forEach(f => {
        const content = fs.readFileSync(path.join(cleanDir, f), 'utf8');
        combinedText += ' ' + stripHtml(content).toLowerCase();
        hasCleanHtml = true;
      });
    } catch (e) {
      return;
    }

    if (!hasCleanHtml) return;

    const termsInChapter = [];
    affectedTermsSet.forEach(termLower => {
      const escaped = termLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(combinedText)) {
        termsInChapter.push(termLower);
      }
    });

    if (termsInChapter.length > 0) {
      // Check if draft, final, or review exists in this chapter
      const draftDir = path.join(chRoot, '05-translated-draft');
      const finalDir = path.join(chRoot, '05-translated');
      const reviewDir = path.join(chRoot, '06-reviews');

      const draftExists = fs.existsSync(draftDir) && fs.readdirSync(draftDir).some(f => f.endsWith('.html'));
      const finalExists = fs.existsSync(finalDir) && fs.readdirSync(finalDir).some(f => f.endsWith('.html'));
      const reviewExists = fs.existsSync(reviewDir) && fs.readdirSync(reviewDir).some(f => f.endsWith('.md') || f.endsWith('.json'));

      if (draftExists) draftStale = true;
      if (finalExists) finalStale = true;
      if (reviewExists) reviewStale = true;

      const termsMapped = termsInChapter.map(tl => {
        const changeInfo = changedTranslations.get(tl);
        return {
          term: changeInfo ? changeInfo.term : tl,
          type: changeInfo ? 'translation_changed' : 'removed',
          oldTranslation: changeInfo ? changeInfo.oldVal : '',
          newTranslation: changeInfo ? changeInfo.newVal : ''
        };
      });

      affectedChapters.push({
        chapterId,
        affectedTerms: termsMapped,
        recommendedAction: finalExists ? 're-translate_and_re-review' : (draftExists ? 're-translate' : 'none')
      });
    }
  });

  // Check preview / EPUB states
  const previewDir = path.join(bookRoot, 'preview');
  if (fs.existsSync(previewDir) && fs.readdirSync(previewDir).some(f => f.endsWith('.html'))) {
    previewStale = true;
  }

  let overallStatus = 'no_impact';
  if (affectedChapters.length > 0) {
    if (finalStale) overallStatus = 'final_translation_affected';
    else if (draftStale) overallStatus = 'drafts_affected';
    else if (reviewStale) overallStatus = 'review_required';
    else overallStatus = 'needs_human_decision';
  }
  if (previewStale && overallStatus !== 'no_impact') {
    overallStatus = overallStatus + '_and_preview_stale';
  }

  const report = {
    changeId: `glossary-change-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    analyzedAt: new Date().toISOString(),
    status: overallStatus,
    summary: {
      affectedChaptersCount: affectedChapters.length,
      draftStale,
      finalStale,
      reviewStale,
      previewStale
    },
    affectedChapters
  };

  const reportsDir = path.join(bookRoot, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const jsonReportPath = path.join(reportsDir, 'glossary-impact-report.json');
  const mdReportPath = path.join(reportsDir, 'glossary-impact-report.md');
  const affectedJsonPath = path.join(reportsDir, 'affected-chapters-by-glossary.json');
  const affectedMdPath = path.join(reportsDir, 'affected-chapters-by-glossary.md');

  if (!options.dryRun) {
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2), 'utf8');
    fs.writeFileSync(affectedJsonPath, JSON.stringify({ bookSlug, affectedChapters }, null, 2), 'utf8');

    // MD report
    let md = `# Glossary Impact Report\n\n`;
    md += `- **Status**: **${overallStatus.toUpperCase()}**\n`;
    md += `- **Analyzed At**: ${report.analyzedAt}\n`;
    md += `- **Affected Chapters**: ${affectedChapters.length}\n`;
    md += `- **Draft Translations Stale**: ${draftStale ? 'YES' : 'NO'}\n`;
    md += `- **Final Translations Stale**: ${finalStale ? 'YES' : 'NO'}\n`;
    md += `- **Reviews Stale**: ${reviewStale ? 'YES' : 'NO'}\n`;
    md += `- **Preview Stale**: ${previewStale ? 'YES' : 'NO'}\n\n`;

    if (affectedChapters.length > 0) {
      md += `## Affected Chapters Detail\n\n`;
      affectedChapters.forEach(ac => {
        md += `### ${ac.chapterId}\n\n`;
        md += `- **Recommended Action**: \`${ac.recommendedAction}\`\n`;
        md += `- **Affected Terms**:\n`;
        ac.affectedTerms.forEach(at => {
          md += `  - **${at.term}** (${at.type}): "${at.oldTranslation}" → "${at.newTranslation}"\n`;
        });
        md += `\n`;
      });
    } else {
      md += `*No chapters are affected by this glossary update.*\n`;
    }

    fs.writeFileSync(mdReportPath, md, 'utf8');
    fs.writeFileSync(affectedMdPath, md, 'utf8');
  }

  return report;
}

module.exports = {
  analyzeGlossaryImpact
};

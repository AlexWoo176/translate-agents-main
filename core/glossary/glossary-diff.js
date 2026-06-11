'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

function computeGlossaryDiff(oldTerms, newTerms) {
  const diff = {
    added: [],      // array of terms
    updated: [],    // array of objects: { term, field, oldVal, newVal }
    removed: [],    // array of terms
    deprecated: [], // array of terms
    locked: []      // array of terms
  };

  const oldMap = new Map();
  oldTerms.forEach(t => oldMap.set(t.term.toLowerCase(), t));

  const newMap = new Map();
  newTerms.forEach(t => newMap.set(t.term.toLowerCase(), t));

  // 1. Check added & updated
  newTerms.forEach(newTerm => {
    const termLower = newTerm.term.toLowerCase();
    const oldTerm = oldMap.get(termLower);

    if (!oldTerm) {
      diff.added.push(newTerm);
    } else {
      const changes = [];
      
      if (newTerm.translation !== oldTerm.translation) {
        changes.push({ field: 'translation', oldVal: oldTerm.translation, newVal: newTerm.translation });
      }
      if (newTerm.status !== oldTerm.status) {
        changes.push({ field: 'status', oldVal: oldTerm.status, newVal: newTerm.status });
      }
      if (Boolean(newTerm.locked) !== Boolean(oldTerm.locked)) {
        changes.push({ field: 'locked', oldVal: oldTerm.locked, newVal: newTerm.locked });
      }
      if (newTerm.category !== oldTerm.category) {
        changes.push({ field: 'category', oldVal: oldTerm.category, newVal: newTerm.category });
      }

      if (changes.length > 0) {
        diff.updated.push({
          term: newTerm.term,
          chapterRefs: newTerm.chapterRefs || oldTerm.chapterRefs,
          changes
        });
      }

      if (newTerm.status === 'deprecated' && oldTerm.status !== 'deprecated') {
        diff.deprecated.push(newTerm.term);
      }
      if (newTerm.status === 'locked' && oldTerm.status !== 'locked') {
        diff.locked.push(newTerm.term);
      }
    }
  });

  // 2. Check removed
  oldTerms.forEach(oldTerm => {
    const termLower = oldTerm.term.toLowerCase();
    if (!newMap.has(termLower)) {
      diff.removed.push(oldTerm);
    }
  });

  return diff;
}

function writeDiffReport(bookSlug, diff, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const jsonReportPath = path.join(reportsDir, 'glossary-diff-report.json');
  const mdReportPath = path.join(reportsDir, 'glossary-diff-report.md');

  const report = {
    generatedAt: new Date().toISOString(),
    bookSlug,
    summary: {
      added: diff.added.length,
      updated: diff.updated.length,
      removed: diff.removed.length,
      deprecated: diff.deprecated.length,
      locked: diff.locked.length
    },
    diff
  };

  if (!options.dryRun) {
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2), 'utf8');

    // MD report
    let md = `# Glossary Diff Report\n\n`;
    md += `- **Generated At**: ${report.generatedAt}\n`;
    md += `- **Book**: ${bookSlug}\n\n`;
    md += `## Summary\n\n`;
    md += `- **Terms Added**: ${diff.added.length}\n`;
    md += `- **Terms Updated**: ${diff.updated.length}\n`;
    md += `- **Terms Removed**: ${diff.removed.length}\n`;
    md += `- **Terms Deprecated**: ${diff.deprecated.length}\n`;
    md += `- **Terms Locked**: ${diff.locked.length}\n\n`;

    if (diff.added.length > 0) {
      md += `### Added Terms\n\n`;
      md += `| Term | Suggested Translation | Chapters | Status |\n`;
      md += `|---|---|---|---|\n`;
      diff.added.forEach(t => {
        md += `| ${t.term} | ${t.translation || '*None*'} | ${t.chapterRefs || 'N/A'} | ${t.status} |\n`;
      });
      md += `\n`;
    }

    if (diff.updated.length > 0) {
      md += `### Updated Terms\n\n`;
      md += `| Term | Field | Old Value | New Value | Chapters |\n`;
      md += `|---|---|---|---|---|\n`;
      diff.updated.forEach(u => {
        u.changes.forEach(c => {
          md += `| ${u.term} | ${c.field} | ${c.oldVal || '*None*'} | ${c.newVal || '*None*'} | ${u.chapterRefs || 'N/A'} |\n`;
        });
      });
      md += `\n`;
    }

    if (diff.removed.length > 0) {
      md += `### Removed Terms\n\n`;
      md += `| Term | Old Translation | Status |\n`;
      md += `|---|---|---|\n`;
      diff.removed.forEach(t => {
        md += `| ${t.term} | ${t.translation} | ${t.status} |\n`;
      });
      md += `\n`;
    }

    fs.writeFileSync(mdReportPath, md, 'utf8');
  }

  return {
    jsonReportPath,
    mdReportPath,
    report
  };
}

module.exports = {
  computeGlossaryDiff,
  writeDiffReport
};

/**
 * review-completeness-gate.js
 *
 * Internal quality gate runner for 'reviewCompleteness'.
 * Verifies that review reports (integrity, glossary, semantic) and summaries exist and are valid for all chapters.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');

async function run(bookSlug, options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports');
  
  const reportJsonPath = path.join(reportsDir, 'review-completeness-report.json');
  const reportMdPath = path.join(reportsDir, 'review-completeness-report.md');
  
  const scan = scanBook(bookSlug);
  const chapters = scan.chaptersFound;

  const result = {
    gateId: 'reviewCompleteness',
    status: 'passed',
    success: true,
    stats: {
      totalChapters: chapters.length,
      reviewedChapters: 0,
      failedChapters: 0,
      needsReviewChapters: 0,
      warningsChapters: 0
    },
    chapters: {},
    warnings: [],
    errors: []
  };

  if (chapters.length === 0) {
    result.errors.push("No chapters found in the book.");
    result.status = 'failed';
    result.success = false;
    writeReports(result, reportJsonPath, reportMdPath);
    return result;
  }

  let overallStatus = 'passed';

  chapters.forEach(chapId => {
    const chapDir = path.join(bookRoot, 'chapters', chapId);
    const reviewsDir = path.join(chapDir, '06-reviews');
    
    const chapInfo = {
      status: 'missing',
      hasReviewsDir: false,
      hasSummary: false,
      hasIntegrity: false,
      hasGlossary: false,
      hasSemantic: false,
      issues: [],
      warnings: [],
      errors: []
    };

    if (!fs.existsSync(reviewsDir)) {
      chapInfo.errors.push(`Missing 06-reviews directory.`);
      chapInfo.status = 'failed';
      result.stats.failedChapters++;
      result.chapters[chapId] = chapInfo;
      return;
    }

    chapInfo.hasReviewsDir = true;
    const files = fs.readdirSync(reviewsDir);

    // Look for summaries
    const summaryFiles = files.filter(f => (f.startsWith('review-summary-') || f === 'review-summary.json') && f.endsWith('.json'));
    let latestSummary = null;
    let latestSummaryFile = '';
    
    if (summaryFiles.length > 0) {
      summaryFiles.sort();
      latestSummaryFile = summaryFiles[summaryFiles.length - 1];
      try {
        latestSummary = JSON.parse(fs.readFileSync(path.join(reviewsDir, latestSummaryFile), 'utf8'));
        chapInfo.hasSummary = true;
      } catch (e) {
        chapInfo.errors.push(`Failed to parse summary report ${latestSummaryFile}: ${e.message}`);
      }
    } else {
      // Check for legacy summaries or reports
      const legacySummary = files.find(f => f.endsWith('-review.md') || f.endsWith('-summary.md'));
      if (legacySummary) {
        chapInfo.hasSummary = true;
      }
    }

    // Check individual report types (look for either new timestamped or legacy names)
    chapInfo.hasIntegrity = files.some(f => f.includes('integrity') && (f.endsWith('.json') || f.endsWith('.md')));
    chapInfo.hasGlossary = files.some(f => (f.includes('glossary') || f.includes('term')) && (f.endsWith('.json') || f.endsWith('.md')));
    chapInfo.hasSemantic = files.some(f => f.includes('semantic') && (f.endsWith('.json') || f.endsWith('.md')));

    if (!chapInfo.hasSummary) {
      chapInfo.warnings.push("Missing review summary file.");
    }
    if (!chapInfo.hasIntegrity) {
      chapInfo.errors.push("Missing HTML integrity review report.");
    }
    if (!chapInfo.hasGlossary) {
      chapInfo.errors.push("Missing glossary validation report.");
    }
    if (!chapInfo.hasSemantic) {
      chapInfo.errors.push("Missing semantic review report.");
    }

    // Parse all json files to check readability
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    jsonFiles.forEach(jf => {
      try {
        JSON.parse(fs.readFileSync(path.join(reviewsDir, jf), 'utf8'));
      } catch (e) {
        chapInfo.errors.push(`JSON parse error in ${jf}: ${e.message}`);
      }
    });

    // Determine status of the chapter
    let chapStatus = 'passed';
    if (latestSummary) {
      chapStatus = latestSummary.status;
      if (latestSummary.issues && latestSummary.issues.length > 0) {
        chapInfo.issues.push(...latestSummary.issues.map(iss => iss.message));
      }
      if (latestSummary.warnings && latestSummary.warnings.length > 0) {
        chapInfo.warnings.push(...latestSummary.warnings);
      }
      if (latestSummary.errors && latestSummary.errors.length > 0) {
        chapInfo.errors.push(...latestSummary.errors);
      }
    } else {
      // If we don't have a structured summary but have all reports, we pass with warning
      if (chapInfo.hasIntegrity && chapInfo.hasGlossary && chapInfo.hasSemantic) {
        if (chapInfo.errors.length > 0) {
          chapStatus = 'failed';
        } else if (chapInfo.warnings.length > 0) {
          chapStatus = 'passed_with_warnings';
        } else {
          chapStatus = 'passed';
        }
      } else {
        chapStatus = 'failed';
      }
    }

    // Override with any direct parsing or structure errors
    if (chapInfo.errors.length > 0) {
      chapStatus = 'failed';
    }

    chapInfo.status = chapStatus;
    result.chapters[chapId] = chapInfo;

    if (chapStatus === 'failed') {
      result.stats.failedChapters++;
    } else if (chapStatus === 'needs_human_review') {
      result.stats.needsReviewChapters++;
    } else if (chapStatus === 'passed_with_warnings') {
      result.stats.warningsChapters++;
    }
    result.stats.reviewedChapters++;
  });

  // Decide overall status
  if (result.stats.failedChapters > 0) {
    overallStatus = 'failed';
  } else if (result.stats.needsReviewChapters > 0) {
    overallStatus = 'needs_human_review';
  } else if (result.stats.warningsChapters > 0) {
    overallStatus = 'passed_with_warnings';
  }

  result.status = overallStatus;
  result.success = overallStatus !== 'failed';

  writeReports(result, reportJsonPath, reportMdPath);
  return result;
}

function writeReports(result, jsonPath, mdPath) {
  const dir = path.dirname(jsonPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  let md = `# Review Completeness Report\n\n`;
  md += `## Summary\n`;
  md += `**${result.status.toUpperCase()}**\n\n`;
  md += `## Statistics\n`;
  md += `- **Total Chapters**: ${result.stats.totalChapters}\n`;
  md += `- **Reviewed Chapters**: ${result.stats.reviewedChapters}\n`;
  md += `- **Failed Chapters**: ${result.stats.failedChapters}\n`;
  md += `- **Needs Human Review**: ${result.stats.needsReviewChapters}\n`;
  md += `- **Passed with Warnings**: ${result.stats.warningsChapters}\n\n`;

  md += `## Chapter Details\n\n`;
  md += `| Chapter | Status | Summary | Integrity | Glossary | Semantic | Errors/Warnings |\n`;
  md += `|---|---|---|---|---|---|---|\n`;

  for (const chapId in result.chapters) {
    const ch = result.chapters[chapId];
    const statusText = ch.status.toUpperCase();
    const sumIcon = ch.hasSummary ? '✅' : '❌';
    const intIcon = ch.hasIntegrity ? '✅' : '❌';
    const gloIcon = ch.hasGlossary ? '✅' : '❌';
    const semIcon = ch.hasSemantic ? '✅' : '❌';
    
    const countWarnErr = ch.errors.length + ch.warnings.length;
    const notes = countWarnErr > 0 
      ? ch.errors.concat(ch.warnings).map(e => `• ${e}`).join('<br>') 
      : 'None';

    md += `| \`${chapId}\` | **${statusText}** | ${sumIcon} | ${intIcon} | ${gloIcon} | ${semIcon} | ${notes} |\n`;
  }

  md += `\n## Warnings\n\n`;
  if (result.warnings.length > 0) {
    result.warnings.forEach(w => {
      md += `- ⚠️ ${w}\n`;
    });
  } else {
    md += `None\n`;
  }
  md += `\n`;

  md += `## Errors\n\n`;
  if (result.errors.length > 0) {
    result.errors.forEach(e => {
      md += `- ❌ ${e}\n`;
    });
  } else {
    md += `None\n`;
  }
  md += `\n`;

  md += `## Final Result\n`;
  if (result.status === 'passed') {
    md += `**SUCCESS**: All chapters contain complete and successful review reports.\n`;
  } else if (result.status === 'needs_human_review') {
    md += `**NEEDS HUMAN REVIEW**: Review reports exist but contain terms or semantic issues requiring human review.\n`;
  } else if (result.status === 'passed_with_warnings') {
    md += `**WARNING**: All chapters reviewed but some contain non-blocking warnings.\n`;
  } else {
    md += `**FAILURE**: Some chapters are missing review reports or contain severe validation errors.\n`;
  }

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  run
};

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');
const { runQualityGate } = require('../gates/run-quality-gate');
const { generateWorkflowState } = require('../state/generate-workflow-state');
const { createPhaseRunResult } = require('./phase-run-result');
const {
  loadGlossary,
  stripHtml,
  extractTermPairs,
  parseElements,
  getElementInnerContent,
  stripVnVisible
} = require('./review-runner-utils');

// Helper: Formats timestamp to YYYYMMDD-HHMMSS
function getTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const sec = pad(now.getSeconds());
  return `${yyyy}${mm}${dd}-${hh}${min}${sec}`;
}

async function runReviewPhase(bookSlug, options = {}) {
  const startedAt = new Date().toISOString();
  const timestamp = getTimestamp();
  const bookRoot = getBookRoot(bookSlug);
  
  const dryRun = !!options.dryRun;
  const force = !!options.force;
  const all = !!options.all;
  
  let reviewTypes = options.reviewTypes || ['integrity', 'glossary', 'semantic'];
  if (typeof reviewTypes === 'string') {
    reviewTypes = reviewTypes.split(',').map(t => t.trim()).filter(Boolean);
  }

  const scan = scanBook(bookSlug);
  let chaptersToProcess = [];
  
  if (all) {
    chaptersToProcess = scan.chaptersFound;
  } else {
    if (!options.chapterId) {
      throw new Error('chapterId is required when --all is not specified.');
    }
    chaptersToProcess = [options.chapterId];
  }

  // 1. Gather all inputs and outputs for dry-run/statistics
  const inputs = [];
  const outputs = [];
  const filesCreated = [];
  const filesUpdated = [];
  const filesSkipped = [];
  const warnings = [];
  const errors = [];

  // Glossary file
  const glossaryPath = path.relative(bookRoot, path.join(bookRoot, 'glossary.csv')).replace(/\\/g, '/');
  inputs.push(glossaryPath);

  chaptersToProcess.forEach(chapId => {
    const chapDir = path.join(bookRoot, 'chapters', chapId);
    const transDir = path.join(chapDir, '05-translated');
    const prepDir = path.join(chapDir, '04-prep');
    
    if (fs.existsSync(transDir)) {
      const files = fs.readdirSync(transDir).filter(f => f.endsWith('.html'));
      files.forEach(f => {
        inputs.push(`chapters/${chapId}/05-translated/${f}`);
        if (fs.existsSync(path.join(prepDir, f))) {
          inputs.push(`chapters/${chapId}/04-prep/${f}`);
        }
      });
      
      outputs.push(`chapters/${chapId}/06-reviews/review-summary-${timestamp}.json`);
      outputs.push(`chapters/${chapId}/06-reviews/review-summary-${timestamp}.md`);
      
      reviewTypes.forEach(type => {
        outputs.push(`chapters/${chapId}/06-reviews/${type}-review-${timestamp}.json`);
        outputs.push(`chapters/${chapId}/06-reviews/${type}-review-${timestamp}.md`);
      });
    }
  });

  // 2. Dry-Run Check
  if (dryRun) {
    return createPhaseRunResult({
      phase: 'review',
      bookSlug,
      scope: all ? 'book' : 'chapter',
      chapterId: all ? undefined : options.chapterId,
      status: 'passed',
      startedAt,
      finishedAt: new Date().toISOString(),
      dryRun,
      force,
      inputs,
      outputs,
      warnings: [`Dry-run: detected ${chaptersToProcess.length} chapters and ${inputs.length - 1} HTML files to review.`],
      qualityGate: { id: 'reviewCompleteness', status: 'unknown' }
    });
  }

  // 3. Execution
  const glossary = loadGlossary(bookSlug);
  const chapterSummaries = [];
  
  for (const chapId of chaptersToProcess) {
    const chapDir = path.join(bookRoot, 'chapters', chapId);
    const transDir = path.join(chapDir, '05-translated');
    const prepDir = path.join(chapDir, '04-prep');
    const outDir = path.join(chapDir, '06-reviews');
    
    if (!fs.existsSync(transDir)) {
      warnings.push(`Translated directory does not exist for ${chapId}: ${transDir}`);
      continue;
    }
    
    fs.mkdirSync(outDir, { recursive: true });
    
    const htmlFiles = fs.readdirSync(transDir).filter(f => f.endsWith('.html'));
    if (htmlFiles.length === 0) {
      warnings.push(`No HTML files found to review in ${chapId}`);
      continue;
    }

    const reviewSummary = {
      phase: 'review',
      bookSlug,
      chapterId: chapId,
      status: 'passed',
      startedAt: new Date().toISOString(),
      finishedAt: '',
      reviewTypes,
      inputFiles: htmlFiles,
      reports: [],
      issues: [],
      warnings: [],
      errors: []
    };

    let integrityIssues = [];
    let glossaryIssues = [];
    let glossaryCorrectCount = 0;
    let glossarySkippedCount = 0;
    let semanticIssues = [];

    htmlFiles.forEach(file => {
      const transPath = path.join(transDir, file);
      const prepPath = path.join(prepDir, file);
      
      const transHtml = fs.readFileSync(transPath, 'utf8');
      const prepHtml = fs.existsSync(prepPath) ? fs.readFileSync(prepPath, 'utf8') : null;

      // A. Integrity Review
      if (reviewTypes.includes('integrity')) {
        // Tag count comparison
        if (prepHtml) {
          const strippedPrep = stripVnVisible(prepHtml);
          const strippedTrans = stripVnVisible(transHtml);
          const tagsToCheck = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'table', 'tr', 'th', 'td', 'img', 'figure', 'figcaption', 'a'];
          tagsToCheck.forEach(tag => {
            const prepMatches = strippedPrep.match(new RegExp(`<${tag}\\b`, 'gi'));
            const transMatches = strippedTrans.match(new RegExp(`<${tag}\\b`, 'gi'));
            const prepCount = prepMatches ? prepMatches.length : 0;
            const transCount = transMatches ? transMatches.length : 0;
            
            if (prepCount !== transCount) {
              integrityIssues.push({
                file,
                type: 'tag-count-mismatch',
                tag,
                expected: prepCount,
                actual: transCount,
                message: `Tag <${tag}> count mismatch. Expected prep count: ${prepCount}, found in translated: ${transCount}`
              });
            }
          });
        } else {
          reviewSummary.warnings.push(`Prep HTML file missing for integrity tag comparison: ${file}`);
        }

        // Local path leak check
        const leakPatterns = [
          /file:\/\//gi,
          /c:\\users/gi,
          /f:\\/gi,
          /\/users\//gi,
          /\\entrepreneurship/gi
        ];
        
        leakPatterns.forEach(pat => {
          if (pat.test(transHtml)) {
            // Find a snippet around the match
            const m = transHtml.match(pat);
            integrityIssues.push({
              file,
              type: 'local-path-leak',
              message: `Absolute local path leak found in ${file} matching pattern: ${pat.source}`
            });
          }
        });
      }

      // B. Glossary Review
      if (reviewTypes.includes('glossary')) {
        const pairs = extractTermPairs(transHtml);
        pairs.forEach(pair => {
          const eng = pair.eng_term;
          const engRaw = pair.eng_term_raw;
          const vn = pair.vn_term;
          const termId = pair.term_id;
          
          if (pair.no_emphasis) {
            glossarySkippedCount++;
            return;
          }
          
          if (!glossary[eng]) {
            glossarySkippedCount++;
            return;
          }
          
          const gl = glossary[eng];
          const matched = gl.options.some(opt => vn.toLowerCase().includes(opt));
          
          if (matched) {
            glossaryCorrectCount++;
          } else {
            glossaryIssues.push({
              file,
              type: 'glossary-violation',
              termId,
              eng: engRaw,
              expected: gl.translation,
              actual: vn,
              options: gl.options.join(' / '),
              message: `Bản dịch thuật ngữ "${engRaw}" là "${vn}" không khớp glossary chuẩn ("${gl.translation}")`
            });
          }
        });
      }

      // C. Semantic Review
      if (reviewTypes.includes('semantic')) {
        const elements = parseElements(transHtml);
        const elementsById = {};
        elements.forEach(el => {
          if (el.id) {
            elementsById[el.id] = el;
          }
        });

        elements.forEach(elem => {
          if (!elem.isVn) return; // Only check VN visible blocks
          
          const inner = getElementInnerContent(transHtml, elem);
          const innerText = stripHtml(inner);
          
          // Source element lookup
          let sourceText = "";
          if (elem.id && elem.id.endsWith('-vn')) {
            const srcId = elem.id.slice(0, -3);
            const srcElem = elementsById[srcId];
            if (srcElem) {
              const srcInner = getElementInnerContent(transHtml, srcElem);
              sourceText = stripHtml(srcInner);
            }
          }

          // Check 1: Empty target block
          if (innerText === "") {
            semanticIssues.push({
              file,
              type: 'empty-target-block',
              id: elem.id,
              tagName: elem.tagName,
              message: `Vietnamese target block <${elem.tagName} id="${elem.id}"> is empty.`
            });
          }

          // Check 2: English leakage (identical match)
          const isAlphanumeric = /[a-zA-Z]/i.test(sourceText);
          if (innerText.length > 5 && innerText === sourceText && isAlphanumeric) {
            semanticIssues.push({
              file,
              type: 'untranslated-leak',
              id: elem.id,
              tagName: elem.tagName,
              message: `Vietnamese target text matches English source exactly: "${innerText.substring(0, 50)}..."`
            });
          }

          // Check 3: Heading target empty
          if (elem.tagName.startsWith('h') && innerText === "") {
            semanticIssues.push({
              file,
              type: 'empty-heading',
              id: elem.id,
              tagName: elem.tagName,
              message: `Heading target is empty.`
            });
          }

          // Check 4: Table cell empty
          if ((elem.tagName === 'td' || elem.tagName === 'th') && innerText === "") {
            // Note: empty table cells are common but might be an issue. Flag as warning.
            semanticIssues.push({
              file,
              type: 'empty-table-cell',
              id: elem.id,
              tagName: elem.tagName,
              message: `Table cell target is empty.`
            });
          }

          // Check 5: Caption target empty
          if (elem.tagName === 'figcaption' && innerText === "") {
            semanticIssues.push({
              file,
              type: 'empty-caption',
              id: elem.id,
              tagName: elem.tagName,
              message: `Figcaption target is empty.`
            });
          }

          // Check 6: Text too short compared to source
          if (sourceText && sourceText.length > 30 && innerText.length > 0) {
            if (innerText.length < sourceText.length * 0.15) {
              semanticIssues.push({
                file,
                type: 'text-too-short',
                id: elem.id,
                tagName: elem.tagName,
                message: `Vietnamese translation text is unusually short (<15% of English source). Target length: ${innerText.length}, Source length: ${sourceText.length}.`
              });
            }
          }

          // Check 7: Placeholders / TODOs
          if (innerText.toLowerCase().includes('todo') || innerText.toLowerCase().includes('translation needed') || innerText.toLowerCase().includes('todo_phase')) {
            semanticIssues.push({
              file,
              type: 'placeholder-found',
              id: elem.id,
              tagName: elem.tagName,
              message: `Translation placeholder TODO found in text: "${innerText}"`
            });
          }
        });
      }
    });

    // Write individual reports for this chapter
    const integrityReportPathJson = path.join(outDir, `integrity-review-${timestamp}.json`);
    const integrityReportPathMd = path.join(outDir, `integrity-review-${timestamp}.md`);
    const glossaryReportPathJson = path.join(outDir, `glossary-review-${timestamp}.json`);
    const glossaryReportPathMd = path.join(outDir, `glossary-review-${timestamp}.md`);
    const semanticReportPathJson = path.join(outDir, `semantic-review-${timestamp}.json`);
    const semanticReportPathMd = path.join(outDir, `semantic-review-${timestamp}.md`);

    // Write Integrity Report
    if (reviewTypes.includes('integrity')) {
      const integrityStatus = integrityIssues.length === 0 ? 'passed' : 'failed';
      const integrityReport = {
        chapterId: chapId,
        status: integrityStatus,
        issues: integrityIssues
      };
      fs.writeFileSync(integrityReportPathJson, JSON.stringify(integrityReport, null, 2), 'utf8');
      filesCreated.push({ file: path.relative(bookRoot, integrityReportPathJson).replace(/\\/g, '/') });

      let md = `# HTML Integrity Review Report: ${chapId}\n\n`;
      md += `- **Status**: **${integrityStatus.toUpperCase()}**\n`;
      md += `- **Total Issues**: ${integrityIssues.length}\n\n`;
      if (integrityIssues.length > 0) {
        md += `| File | Type | Tag/Details | Message |\n|---|---|---|---|\n`;
        integrityIssues.forEach(iss => {
          md += `| \`${iss.file}\` | \`${iss.type}\` | ${iss.tag || '-'} | ${iss.message} |\n`;
        });
      } else {
        md += `✅ No HTML integrity issues found!\n`;
      }
      fs.writeFileSync(integrityReportPathMd, md, 'utf8');
      filesCreated.push({ file: path.relative(bookRoot, integrityReportPathMd).replace(/\\/g, '/') });

      reviewSummary.reports.push(`integrity-review-${timestamp}.json`);
      reviewSummary.issues.push(...integrityIssues.map(i => ({ ...i, reviewType: 'integrity' })));
    }

    // Write Glossary Report
    if (reviewTypes.includes('glossary')) {
      const glossaryStatus = glossaryIssues.length === 0 ? 'passed' : 'needs_human_review';
      const glossaryReport = {
        chapterId: chapId,
        status: glossaryStatus,
        stats: {
          total: glossaryCorrectCount + glossaryIssues.length,
          correct: glossaryCorrectCount,
          skipped: glossarySkippedCount,
          issues: glossaryIssues.length
        },
        issues: glossaryIssues
      };
      fs.writeFileSync(glossaryReportPathJson, JSON.stringify(glossaryReport, null, 2), 'utf8');
      filesCreated.push({ file: path.relative(bookRoot, glossaryReportPathJson).replace(/\\/g, '/') });

      let md = `# Glossary Match Review Report: ${chapId}\n\n`;
      md += `- **Status**: **${glossaryStatus.toUpperCase()}**\n`;
      md += `- **Total checked**: ${glossaryCorrectCount + glossaryIssues.length}\n`;
      md += `- **Correct**: ${glossaryCorrectCount}\n`;
      md += `- **Violations**: ${glossaryIssues.length}\n`;
      md += `- **Skipped**: ${glossarySkippedCount}\n\n`;
      if (glossaryIssues.length > 0) {
        md += `| File | Term ID | English Term | Glossary Translation | Actual Translation | Message |\n|---|---|---|---|---|---|\n`;
        glossaryIssues.forEach(iss => {
          md += `| \`${iss.file}\` | \`${iss.termId}\` | \`${iss.eng}\` | \`${iss.expected}\` | \`${iss.actual}\` | ${iss.message} |\n`;
        });
      } else {
        md += `✅ All term spans match the glossary terms correctly!\n`;
      }
      fs.writeFileSync(glossaryReportPathMd, md, 'utf8');
      filesCreated.push({ file: path.relative(bookRoot, glossaryReportPathMd).replace(/\\/g, '/') });

      reviewSummary.reports.push(`glossary-review-${timestamp}.json`);
      reviewSummary.issues.push(...glossaryIssues.map(i => ({ ...i, reviewType: 'glossary' })));
    }

    // Write Semantic Report
    if (reviewTypes.includes('semantic')) {
      const semanticStatus = semanticIssues.length === 0 ? 'passed' : 'needs_human_review';
      const semanticReport = {
        chapterId: chapId,
        status: semanticStatus,
        issues: semanticIssues
      };
      fs.writeFileSync(semanticReportPathJson, JSON.stringify(semanticReport, null, 2), 'utf8');
      filesCreated.push({ file: path.relative(bookRoot, semanticReportPathJson).replace(/\\/g, '/') });

      let md = `# Semantic (Rule-based) Review Report: ${chapId}\n\n`;
      md += `- **Status**: **${semanticStatus.toUpperCase()}**\n`;
      md += `- **Total Issues**: ${semanticIssues.length}\n\n`;
      if (semanticIssues.length > 0) {
        md += `| File | Type | Element | Message |\n|---|---|---|---|\n`;
        semanticIssues.forEach(iss => {
          md += `| \`${iss.file}\` | \`${iss.type}\` | \`<${iss.tagName} id="${iss.id}">\` | ${iss.message} |\n`;
        });
      } else {
        md += `✅ No semantic issues detected by rule-based scanning!\n`;
      }
      fs.writeFileSync(semanticReportPathMd, md, 'utf8');
      filesCreated.push({ file: path.relative(bookRoot, semanticReportPathMd).replace(/\\/g, '/') });

      reviewSummary.reports.push(`semantic-review-${timestamp}.json`);
      reviewSummary.issues.push(...semanticIssues.map(i => ({ ...i, reviewType: 'semantic' })));
    }

    // Determine Chapter Review Summary Status
    // passed: no errors or issues
    // passed_with_warnings: warnings exist
    // needs_human_review: glossary or semantic issues exist
    // failed: HTML broken or tag counts mismatch seriously
    let summaryStatus = 'passed';
    if (integrityIssues.length > 0) {
      // If table rows/cells/lists mismatch, mark as failed
      const seriousMismatches = integrityIssues.filter(i => ['tr', 'th', 'td', 'li', 'table'].includes(i.tag));
      if (seriousMismatches.length > 0) {
        summaryStatus = 'failed';
      } else {
        summaryStatus = 'passed_with_warnings';
      }
    }
    
    if (summaryStatus !== 'failed') {
      if (glossaryIssues.length > 0 || semanticIssues.length > 0) {
        summaryStatus = 'needs_human_review';
      } else if (reviewSummary.warnings.length > 0) {
        summaryStatus = 'passed_with_warnings';
      }
    }

    reviewSummary.status = summaryStatus;
    reviewSummary.finishedAt = new Date().toISOString();

    // Write Chapter Review Summary Reports
    const summaryPathJson = path.join(outDir, `review-summary-${timestamp}.json`);
    const summaryPathMd = path.join(outDir, `review-summary-${timestamp}.md`);
    
    fs.writeFileSync(summaryPathJson, JSON.stringify(reviewSummary, null, 2), 'utf8');
    filesCreated.push({ file: path.relative(bookRoot, summaryPathJson).replace(/\\/g, '/') });

    let sumMd = `# Review Summary: ${chapId}\n\n`;
    sumMd += `- **Phase**: \`review\`\n`;
    sumMd += `- **Chapter ID**: \`${chapId}\`\n`;
    sumMd += `- **Status**: **${summaryStatus.toUpperCase()}**\n`;
    sumMd += `- **Started At**: ${reviewSummary.startedAt}\n`;
    sumMd += `- **Finished At**: ${reviewSummary.finishedAt}\n`;
    sumMd += `- **Review Types Run**: ${reviewTypes.join(', ')}\n\n`;
    
    sumMd += `## Reports Generated\n`;
    reviewSummary.reports.forEach(r => {
      sumMd += `- [${r}](file:///${path.join(outDir, r).replace(/\\/g, '/')})\n`;
    });
    sumMd += `\n`;

    sumMd += `## Summary Statistics\n`;
    sumMd += `- **HTML Integrity Issues**: ${integrityIssues.length}\n`;
    sumMd += `- **Glossary Violations**: ${glossaryIssues.length}\n`;
    sumMd += `- **Semantic Rule Warnings**: ${semanticIssues.length}\n\n`;

    if (reviewSummary.issues.length > 0) {
      sumMd += `## Aggregated Issues\n\n`;
      sumMd += `| Type | File | Details | Message |\n|---|---|---|---|\n`;
      reviewSummary.issues.forEach(iss => {
        const details = iss.tag ? `Tag \`<${iss.tag}>\`` : (iss.id ? `Element \`<${iss.tagName} id="${iss.id}">\`` : '-');
        sumMd += `| \`${iss.reviewType}\` | \`${iss.file}\` | ${details} | ${iss.message} |\n`;
      });
      sumMd += `\n`;
    } else {
      sumMd += `✅ Clean run: 0 issues found in this chapter!\n`;
    }
    fs.writeFileSync(summaryPathMd, sumMd, 'utf8');
    filesCreated.push({ file: path.relative(bookRoot, summaryPathMd).replace(/\\/g, '/') });

    // Handle fixed summary overwrites (review-summary.json and review-summary.md)
    const fixedSummaryJson = path.join(outDir, 'review-summary.json');
    const fixedSummaryMd = path.join(outDir, 'review-summary.md');
    const fixedChapterReview = path.join(outDir, `${chapId}-review.md`);

    const writeFixed = force || (!fs.existsSync(fixedSummaryJson) && !fs.existsSync(fixedSummaryMd));
    
    if (writeFixed) {
      // If they exist and we force, create backup
      if (fs.existsSync(fixedSummaryJson) || fs.existsSync(fixedSummaryMd) || fs.existsSync(fixedChapterReview)) {
        const backupDir = path.join(bookRoot, 'backups', 'phase-8-review-runner', chapId, timestamp);
        fs.mkdirSync(backupDir, { recursive: true });
        
        if (fs.existsSync(fixedSummaryJson)) {
          fs.copyFileSync(fixedSummaryJson, path.join(backupDir, 'review-summary.json'));
        }
        if (fs.existsSync(fixedSummaryMd)) {
          fs.copyFileSync(fixedSummaryMd, path.join(backupDir, 'review-summary.md'));
        }
        if (fs.existsSync(fixedChapterReview)) {
          fs.copyFileSync(fixedChapterReview, path.join(backupDir, `${chapId}-review.md`));
        }
        warnings.push(`Backup of existing review summaries for ${chapId} created at: backups/phase-8-review-runner/${chapId}/${timestamp}/`);
      }

      fs.writeFileSync(fixedSummaryJson, JSON.stringify(reviewSummary, null, 2), 'utf8');
      fs.writeFileSync(fixedSummaryMd, sumMd, 'utf8');
      fs.writeFileSync(fixedChapterReview, sumMd, 'utf8'); // Also overwrite fixed chapter-review.md if it exists

      filesUpdated.push({ file: path.relative(bookRoot, fixedSummaryJson).replace(/\\/g, '/') });
      filesUpdated.push({ file: path.relative(bookRoot, fixedSummaryMd).replace(/\\/g, '/') });
    } else {
      filesSkipped.push({
        file: path.relative(bookRoot, fixedSummaryJson).replace(/\\/g, '/'),
        reason: 'summary_exists_no_force'
      });
      filesSkipped.push({
        file: path.relative(bookRoot, fixedSummaryMd).replace(/\\/g, '/'),
        reason: 'summary_exists_no_force'
      });
      warnings.push(`Fixed summary files for ${chapId} already exist. Used timestamped reports only. Use --force to update main summaries.`);
    }

    chapterSummaries.push(reviewSummary);
  }

  // 4. Run Quality Gate reviewCompleteness and regenerate state
  let qualityGateResult = { id: 'reviewCompleteness', status: 'unknown' };
  try {
    const qgRes = await runQualityGate(bookSlug, 'reviewCompleteness', { allowWrite: true });
    qualityGateResult.status = qgRes.status;
    generateWorkflowState(bookSlug);
  } catch (err) {
    warnings.push(`Validation of review completeness or state regeneration failed: ${err.message}`);
  }

  // 5. Determine overall phase run result status
  let overallStatus = 'passed';
  const hasErrors = errors.length > 0;
  const hasFailedChapters = chapterSummaries.some(s => s.status === 'failed');
  const hasHumanReviewChapters = chapterSummaries.some(s => s.status === 'needs_human_review');
  const hasWarnings = warnings.length > 0 || chapterSummaries.some(s => s.status === 'passed_with_warnings');

  if (hasErrors || hasFailedChapters || qualityGateResult.status === 'failed') {
    overallStatus = 'failed';
  } else if (hasHumanReviewChapters || qualityGateResult.status === 'needs_human_review') {
    overallStatus = 'needs_human_review';
  } else if (hasWarnings || qualityGateResult.status === 'passed_with_warnings') {
    overallStatus = 'passed_with_warnings';
  }

  const finishedAt = new Date().toISOString();
  
  const runResult = createPhaseRunResult({
    phase: 'review',
    bookSlug,
    scope: all ? 'book' : 'chapter',
    chapterId: all ? undefined : options.chapterId,
    status: overallStatus,
    startedAt,
    finishedAt,
    dryRun,
    force,
    inputs,
    outputs: filesCreated.concat(filesUpdated).map(f => f.file),
    filesCreated,
    filesUpdated,
    filesSkipped,
    warnings,
    errors,
    qualityGate: qualityGateResult
  });

  writePhaseReports(bookSlug, runResult, timestamp, all ? 'all' : options.chapterId);
  return runResult;
}

function writePhaseReports(bookSlug, result, timestamp, scopeId) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports', 'phase-runs');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const jsonPath = path.join(reportsDir, `review-${scopeId}-${timestamp}.json`);
  const mdPath = path.join(reportsDir, `review-${scopeId}-${timestamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  let md = `# Phase Run Report: review\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|---|---||\n`;
  md += `| **Book** | ${result.bookSlug} |\n`;
  md += `| **Scope** | ${result.scope} (${scopeId}) |\n`;
  md += `| **Status** | **${result.status.toUpperCase()}** |\n`;
  md += `| **Dry Run** | ${result.dryRun ? '✅ Yes' : '❌ No'} |\n`;
  md += `| **Force Overwrite** | ${result.force ? '✅ Yes' : '❌ No'} |\n`;
  md += `| **Started At** | ${result.startedAt} |\n`;
  md += `| **Finished At** | ${result.finishedAt} |\n`;
  md += `\n---\n\n`;

  md += `## Execution Statistics\n\n`;
  md += `- **Files Created**: ${result.filesCreated.length}\n`;
  md += `- **Files Overwritten**: ${result.filesUpdated.length}\n`;
  md += `- **Files Skipped**: ${result.filesSkipped.length}\n`;
  md += `- **Warnings**: ${result.warnings.length}\n`;
  md += `- **Errors**: ${result.errors.length}\n\n`;

  if (result.warnings.length > 0) {
    md += `### Warnings\n\n`;
    result.warnings.forEach(w => {
      md += `- ⚠️ ${w}\n`;
    });
    md += `\n`;
  }

  if (result.errors.length > 0) {
    md += `### Errors\n\n`;
    result.errors.forEach(e => {
      md += `- ❌ ${e}\n`;
    });
    md += `\n`;
  }

  md += `## Quality Gate Execution\n\n`;
  md += `- **Gate ID**: \`${result.qualityGate?.id || 'reviewCompleteness'}\`\n`;
  md += `- **Status**: **${(result.qualityGate?.status || 'unknown').toUpperCase()}**\n`;

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  runReviewPhase
};

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
  parseElements,
  getElementInnerContent
} = require('./review-runner-utils');
const {
  cleanText,
  extractSentences,
  findSentenceWithTerm,
  extractCapitalizedPhrases,
  extractFormalKeyTerms,
  checkHeadingHierarchy
} = require('./analyze-runner-utils');

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

// Helper: Count occurrences of a term as a whole word in text
function countTermFrequency(text, term) {
  if (!text || !term) return 0;
  try {
    const escaped = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  } catch (e) {
    // Fallback if regex fails on weird characters
    let count = 0;
    let pos = text.toLowerCase().indexOf(term.toLowerCase());
    while (pos !== -1) {
      count++;
      pos = text.toLowerCase().indexOf(term.toLowerCase(), pos + 1);
    }
    return count;
  }
}

async function runAnalyzePhase(bookSlug, options = {}) {
  const startedAt = new Date().toISOString();
  const timestamp = getTimestamp();
  const bookRoot = getBookRoot(bookSlug);
  
  const dryRun = !!options.dryRun;
  const force = !!options.force;
  const all = !!options.all;
  
  let analysisTypes = options.analysisTypes || ['structure', 'terminology', 'translationContext'];
  if (typeof analysisTypes === 'string') {
    analysisTypes = analysisTypes.split(',').map(t => t.trim()).filter(Boolean);
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
  
  // Book config
  const configPath = path.relative(bookRoot, path.join(bookRoot, 'book.config.json')).replace(/\\/g, '/');
  inputs.push(configPath);
  
  chaptersToProcess.forEach(chapId => {
    const chapDir = path.join(bookRoot, 'chapters', chapId);
    const cleanDir = path.join(chapDir, '02-clean');
    
    if (fs.existsSync(cleanDir)) {
      const files = fs.readdirSync(cleanDir).filter(f => f.endsWith('.html'));
      files.forEach(f => {
        inputs.push(`chapters/${chapId}/02-clean/${f}`);
      });
      
      outputs.push(`chapters/${chapId}/03-analyzed/analysis-summary-${timestamp}.json`);
      outputs.push(`chapters/${chapId}/03-analyzed/analysis-summary-${timestamp}.md`);
      
      analysisTypes.forEach(type => {
        outputs.push(`chapters/${chapId}/03-analyzed/${type}-analysis-${timestamp}.json`);
        outputs.push(`chapters/${chapId}/03-analyzed/${type}-analysis-${timestamp}.md`);
      });
    }
  });
  
  // 2. Dry-Run Check
  if (dryRun) {
    return createPhaseRunResult({
      phase: 'analyze',
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
      warnings: [`Dry-run: detected ${chaptersToProcess.length} chapters and ${inputs.length - 2} HTML files to analyze.`],
      qualityGate: { id: 'analysisCompleteness', status: 'unknown' }
    });
  }
  
  // 3. Execution
  const glossary = loadGlossary(bookSlug);
  const chapterSummaries = [];
  
  for (const chapId of chaptersToProcess) {
    const chapDir = path.join(bookRoot, 'chapters', chapId);
    const cleanDir = path.join(chapDir, '02-clean');
    const outDir = path.join(chapDir, '03-analyzed');
    
    if (!fs.existsSync(cleanDir)) {
      warnings.push(`Clean directory does not exist for ${chapId}: ${cleanDir}`);
      continue;
    }
    
    fs.mkdirSync(outDir, { recursive: true });
    
    const htmlFiles = fs.readdirSync(cleanDir).filter(f => f.endsWith('.html'));
    if (htmlFiles.length === 0) {
      warnings.push(`No HTML files found to analyze in ${chapId}`);
      continue;
    }
    
    const chapterAnalysis = {
      chapterId: chapId,
      inputFiles: htmlFiles,
      structure: null,
      terminology: null,
      translationContext: null,
      warnings: [],
      errors: [],
      status: 'passed'
    };
    
    // Concat full text & sentences for terminology
    const fileContents = htmlFiles.map(file => {
      const filePath = path.join(cleanDir, file);
      const html = fs.readFileSync(filePath, 'utf8');
      const text = stripHtml(html);
      return { file, html, text };
    });
    
    const fullText = fileContents.map(c => c.text).join('\n');
    const sentences = extractSentences(fullText);
    
    // A. Structure Analysis
    if (analysisTypes.includes('structure')) {
      const structResults = {
        files: {},
        totals: {
          filesCount: htmlFiles.length,
          headingsCount: 0,
          paragraphsCount: 0,
          listsCount: 0,
          listItemsCount: 0,
          tablesCount: 0,
          tableRowsCount: 0,
          tableHeadersCount: 0,
          tableDataCellsCount: 0,
          figuresCount: 0,
          imagesCount: 0,
          captionsCount: 0,
          linksCount: 0
        },
        warnings: [],
        errors: []
      };
      
      const tagsToCheck = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'table', 'tr', 'th', 'td', 'img', 'figure', 'figcaption', 'a'];
      
      fileContents.forEach(fc => {
        const elements = parseElements(fc.html);
        const tagCounts = {};
        tagsToCheck.forEach(t => tagCounts[t] = 0);
        
        const headings = [];
        const emptyElements = [];
        const linkDestinations = [];
        const imageRefs = [];
        const fileWarnings = [];
        
        elements.forEach(el => {
          if (tagsToCheck.includes(el.tagName)) {
            tagCounts[el.tagName]++;
          }
          if (el.tagName.startsWith('h')) {
            headings.push(el.tagName);
          }
          
          // Check empty element
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'th', 'td', 'figcaption'].includes(el.tagName)) {
            const inner = getElementInnerContent(fc.html, el);
            const text = stripHtml(inner).trim();
            if (!text) {
              emptyElements.push({
                tagName: el.tagName,
                id: el.id
              });
            }
          }
          
          // Links check
          if (el.tagName === 'a') {
            const hrefMatch = fc.html.substring(el.startIndex, el.startIndex + el.tagLength).match(/\bhref="([^"]*)"/i);
            if (hrefMatch) {
              linkDestinations.push(hrefMatch[1]);
            }
          }
          
          // Image check
          if (el.tagName === 'img') {
            const srcMatch = fc.html.substring(el.startIndex, el.startIndex + el.tagLength).match(/\bsrc="([^"]*)"/i);
            if (srcMatch) {
              imageRefs.push(srcMatch[1]);
            }
          }
        });
        
        // Heading hierarchy
        const hierarchyViolations = checkHeadingHierarchy(headings);
        hierarchyViolations.forEach(v => {
          fileWarnings.push(`Heading hierarchy violation: level jump from ${v.from} to ${v.to}`);
        });
        
        // Empty elements warnings
        emptyElements.forEach(ee => {
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'figcaption'].includes(ee.tagName)) {
            fileWarnings.push(`Empty structural element <${ee.tagName}> found (id: ${ee.id || 'N/A'})`);
          }
        });
        
        // Local path leak check
        const leakPatterns = [
          /file:\/\//gi,
          /c:\\users/gi,
          /f:\\/gi,
          /\/users\//gi,
          /\\entrepreneurship/gi
        ];
        leakPatterns.forEach(pat => {
          if (pat.test(fc.html)) {
            fileWarnings.push(`Absolute local path leak found matching pattern: ${pat.source}`);
          }
        });
        
        structResults.files[fc.file] = {
          tagCounts,
          headings,
          emptyElementsCount: emptyElements.length,
          linkDestinations,
          imageRefs,
          warnings: fileWarnings
        };
        
        // Sum totals
        structResults.totals.headingsCount += headings.length;
        structResults.totals.paragraphsCount += tagCounts.p;
        structResults.totals.listsCount += (tagCounts.ul + tagCounts.ol);
        structResults.totals.listItemsCount += tagCounts.li;
        structResults.totals.tablesCount += tagCounts.table;
        structResults.totals.tableRowsCount += tagCounts.tr;
        structResults.totals.tableHeadersCount += tagCounts.th;
        structResults.totals.tableDataCellsCount += tagCounts.td;
        structResults.totals.figuresCount += tagCounts.figure;
        structResults.totals.imagesCount += tagCounts.img;
        structResults.totals.captionsCount += tagCounts.figcaption;
        structResults.totals.linksCount += tagCounts.a;
        
        structResults.warnings.push(...fileWarnings.map(w => `${fc.file}: ${w}`));
      });
      
      chapterAnalysis.structure = structResults;
      
      // Write Structure Report
      const jsonPath = path.join(outDir, `structure-analysis-${timestamp}.json`);
      const mdPath = path.join(outDir, `structure-analysis-${timestamp}.md`);
      
      fs.writeFileSync(jsonPath, JSON.stringify(structResults, null, 2), 'utf8');
      filesCreated.push({ file: path.relative(bookRoot, jsonPath).replace(/\\/g, '/') });
      
      let md = `# HTML Structure Analysis Report: ${chapId}\n\n`;
      md += `- **Date**: ${new Date().toISOString()}\n`;
      md += `- **HTML Files**: ${structResults.totals.filesCount}\n\n`;
      
      md += `## Totals Statistics\n\n`;
      md += `| Tag | Count |\n|---|---|\n`;
      md += `| Headings | ${structResults.totals.headingsCount} |\n`;
      md += `| Paragraphs (p) | ${structResults.totals.paragraphsCount} |\n`;
      md += `| Lists (ul/ol) | ${structResults.totals.listsCount} |\n`;
      md += `| List Items (li) | ${structResults.totals.listItemsCount} |\n`;
      md += `| Tables | ${structResults.totals.tablesCount} |\n`;
      md += `| Table Rows (tr) | ${structResults.totals.tableRowsCount} |\n`;
      md += `| Table Headers (th) | ${structResults.totals.tableHeadersCount} |\n`;
      md += `| Table Cells (td) | ${structResults.totals.tableDataCellsCount} |\n`;
      md += `| Figures | ${structResults.totals.figuresCount} |\n`;
      md += `| Images (img) | ${structResults.totals.imagesCount} |\n`;
      md += `| Captions (figcaption) | ${structResults.totals.captionsCount} |\n`;
      md += `| Links (a) | ${structResults.totals.linksCount} |\n\n`;
      
      if (structResults.warnings.length > 0) {
        md += `## Structural Warnings\n\n`;
        structResults.warnings.forEach(w => {
          md += `- ⚠️ ${w}\n`;
        });
        md += `\n`;
      } else {
        md += `✅ No structural warnings detected.\n\n`;
      }
      
      md += `## File Details\n\n`;
      for (const file in structResults.files) {
        const info = structResults.files[file];
        md += `### ${file}\n\n`;
        md += `- Headings: ${info.headings.length} (${info.headings.join(', ') || 'none'})\n`;
        md += `- Paragraphs: ${info.tagCounts.p}\n`;
        md += `- Links: ${info.tagCounts.a}\n`;
        md += `- Warnings: ${info.warnings.length}\n`;
        if (info.warnings.length > 0) {
          info.warnings.forEach(w => {
            md += `  - ⚠️ ${w}\n`;
          });
        }
        md += `\n`;
      }
      
      fs.writeFileSync(mdPath, md, 'utf8');
      filesCreated.push({ file: path.relative(bookRoot, mdPath).replace(/\\/g, '/') });
    }
    
    // B. Terminology Analysis
    if (analysisTypes.includes('terminology')) {
      const termResults = {
        knownTerms: [],
        candidateTerms: [],
        missingGlossaryTerms: [],
        termFrequency: {},
        warnings: []
      };
      
      // Collect formal key terms from <dt> tags
      const dtTerms = [];
      fileContents.forEach(fc => {
        const dtExtracted = extractFormalKeyTerms(fc.html);
        dtExtracted.forEach(t => {
          if (!dtTerms.includes(t)) {
            dtTerms.push(t);
          }
        });
      });
      
      // 1. Process known glossary terms
      for (const key in glossary) {
        const termRaw = glossary[key].keyRaw;
        const freq = countTermFrequency(fullText, termRaw);
        if (freq > 0) {
          const context = findSentenceWithTerm(sentences, termRaw);
          termResults.knownTerms.push({
            term: termRaw,
            glossaryTranslation: glossary[key].translation,
            frequency: freq,
            context
          });
          termResults.termFrequency[termRaw] = freq;
        }
      }
      
      // 2. Process missing glossary terms (defined in <dt> but not in glossary)
      const missingTermsSet = new Set();
      dtTerms.forEach(dtTerm => {
        const key = dtTerm.toLowerCase();
        if (!glossary[key]) {
          missingTermsSet.add(dtTerm);
        }
      });
      
      missingTermsSet.forEach(term => {
        const freq = countTermFrequency(fullText, term);
        const context = findSentenceWithTerm(sentences, term);
        termResults.missingGlossaryTerms.push({
          term,
          frequency: freq > 0 ? freq : 1,
          context
        });
        termResults.termFrequency[term] = freq > 0 ? freq : 1;
      });
      
      // 3. Process candidate terms (capitalized phrases not in glossary or missing)
      const capPhrases = extractCapitalizedPhrases(fullText);
      const uniqueCandidates = new Set();
      
      capPhrases.forEach(phrase => {
        const key = phrase.toLowerCase();
        // Check if in glossary
        if (glossary[key]) return;
        // Check if in missing glossary terms
        if (Array.from(missingTermsSet).some(t => t.toLowerCase() === key)) return;
        
        uniqueCandidates.add(phrase);
      });
      
      uniqueCandidates.forEach(term => {
        const freq = countTermFrequency(fullText, term);
        if (freq >= 2) { // only include candidate terms that appear at least twice
          const context = findSentenceWithTerm(sentences, term);
          termResults.candidateTerms.push({
            term,
            frequency: freq,
            context
          });
          termResults.termFrequency[term] = freq;
        }
      });
      
      if (termResults.missingGlossaryTerms.length > 0) {
        termResults.warnings.push(`Found ${termResults.missingGlossaryTerms.length} key terms defined in <dt> tags that are missing from glossary.csv.`);
      }
      
      chapterAnalysis.terminology = termResults;
      
      // Write Terminology Report
      const jsonPath = path.join(outDir, `terminology-analysis-${timestamp}.json`);
      const mdPath = path.join(outDir, `terminology-analysis-${timestamp}.md`);
      
      fs.writeFileSync(jsonPath, JSON.stringify(termResults, null, 2), 'utf8');
      filesCreated.push({ file: path.relative(bookRoot, jsonPath).replace(/\\/g, '/') });
      
      let md = `# Terminology Analysis Report: ${chapId}\n\n`;
      md += `- **Date**: ${new Date().toISOString()}\n`;
      md += `- **Known Glossary Terms**: ${termResults.knownTerms.length}\n`;
      md += `- **Missing Glossary Key Terms**: ${termResults.missingGlossaryTerms.length}\n`;
      md += `- **Terminology Candidates**: ${termResults.candidateTerms.length}\n\n`;
      
      if (termResults.warnings.length > 0) {
        md += `## Terminology Warnings\n\n`;
        termResults.warnings.forEach(w => {
          md += `- ⚠️ ${w}\n`;
        });
        md += `\n`;
      }
      
      md += `## Missing Glossary Key Terms (Defined in <dt> tags)\n\n`;
      if (termResults.missingGlossaryTerms.length > 0) {
        md += `| Key Term | Frequency | Sample Context |\n|---|---|---|\n`;
        termResults.missingGlossaryTerms.forEach(t => {
          md += `| **${t.term}** | ${t.frequency} | "${t.context || 'N/A'}" |\n`;
        });
        md += `\n`;
      } else {
        md += `✅ All key terms defined in <dt> tags exist in glossary.csv.\n\n`;
      }
      
      md += `## Known Glossary Terms Found in Chapter\n\n`;
      if (termResults.knownTerms.length > 0) {
        md += `| Term | Glossary Translation | Frequency | Sample Context |\n|---|---|---|---|\n`;
        termResults.knownTerms.sort((a, b) => b.frequency - a.frequency).slice(0, 50).forEach(t => {
          md += `| ${t.term} | \`${t.glossaryTranslation}\` | ${t.frequency} | "${t.context || 'N/A'}" |\n`;
        });
        md += `\n*Showing top 50 terms by frequency.*\n\n`;
      } else {
        md += `No known glossary terms found.\n\n`;
      }
      
      md += `## Candidates for Glossary (Capitalized Phrases, Freq >= 2)\n\n`;
      if (termResults.candidateTerms.length > 0) {
        md += `| Candidate Term | Frequency | Sample Context |\n|---|---|---|\n`;
        termResults.candidateTerms.sort((a, b) => b.frequency - a.frequency).forEach(t => {
          md += `| ${t.term} | ${t.frequency} | "${t.context || 'N/A'}" |\n`;
        });
      } else {
        md += `No additional candidates found.\n`;
      }
      
      fs.writeFileSync(mdPath, md, 'utf8');
      filesCreated.push({ file: path.relative(bookRoot, mdPath).replace(/\\/g, '/') });
    }
    
    // C. Translation Context Analysis
    if (analysisTypes.includes('translationContext')) {
      const contextResults = {
        chapterTitle: "",
        sections: [],
        learningObjectives: [],
        keyConcepts: [],
        difficultTerms: [],
        tables: [],
        figures: [],
        relevantGlossaryTerms: [],
        translationNotes: [],
        warnings: []
      };
      
      // 1. Resolve chapter title & section titles
      fileContents.forEach(fc => {
        const elements = parseElements(fc.html);
        
        // Find document title
        const docTitleEl = elements.find(el => el.tagName === 'h2' && fc.html.substring(el.startIndex, el.startIndex + el.tagLength).includes('data-type="document-title"'));
        let titleText = "";
        if (docTitleEl) {
          titleText = stripHtml(getElementInnerContent(fc.html, docTitleEl)).trim();
        } else {
          // Fallback: first h1 or h2
          const hEl = elements.find(el => el.tagName === 'h1' || el.tagName === 'h2');
          if (hEl) {
            titleText = stripHtml(getElementInnerContent(fc.html, hEl)).trim();
          }
        }
        
        if (titleText) {
          if (fc.file.includes('introduction') || (!contextResults.chapterTitle && fc.file.match(/^\d-introduction/i))) {
            contextResults.chapterTitle = titleText;
          }
          contextResults.sections.push({
            file: fc.file,
            title: titleText
          });
        }
        
        // Learning objectives
        elements.forEach(el => {
          if (el.classes.includes('os-chapter-objective')) {
            const inner = getElementInnerContent(fc.html, el);
            const text = stripHtml(inner).trim();
            if (text && !contextResults.learningObjectives.includes(text)) {
              contextResults.learningObjectives.push(text);
            }
          }
        });
        
        // Tables
        elements.forEach(el => {
          if (el.tagName === 'table') {
            const summaryMatch = fc.html.substring(el.startIndex, el.startIndex + el.tagLength).match(/\bdata-summary="([^"]*)"/i);
            const idMatch = fc.html.substring(el.startIndex, el.startIndex + el.tagLength).match(/\bid="([^"]*)"/i);
            contextResults.tables.push({
              file: fc.file,
              id: idMatch ? idMatch[1] : 'N/A',
              summary: summaryMatch ? summaryMatch[1] : 'No Summary'
            });
          }
        });
        
        // Figures
        elements.forEach(el => {
          if (el.tagName === 'figure') {
            const idMatch = fc.html.substring(el.startIndex, el.startIndex + el.tagLength).match(/\bdata-id="([^"]*)"/i) || fc.html.substring(el.startIndex, el.startIndex + el.tagLength).match(/\bid="([^"]*)"/i);
            // Look for caption inside figure
            let caption = "No caption";
            const figcaptionEl = elements.find(o => o.tagName === 'figcaption' && o.startIndex > el.startIndex);
            if (figcaptionEl) {
              const inner = getElementInnerContent(fc.html, figcaptionEl);
              caption = stripHtml(inner).trim();
            }
            contextResults.figures.push({
              file: fc.file,
              id: idMatch ? idMatch[1] : 'N/A',
              caption
            });
          }
        });
      });
      
      // Fallback for chapterTitle if still empty
      if (!contextResults.chapterTitle && contextResults.sections.length > 0) {
        contextResults.chapterTitle = contextResults.sections[0].title;
      }
      
      // Key concepts from DT terms
      if (chapterAnalysis.terminology) {
        contextResults.keyConcepts = chapterAnalysis.terminology.missingGlossaryTerms.concat(chapterAnalysis.terminology.knownTerms).map(t => t.term);
        // Relevant glossary terms
        contextResults.relevantGlossaryTerms = chapterAnalysis.terminology.knownTerms.map(t => ({ term: t.term, translation: t.glossaryTranslation }));
        
        // Difficult terms: candidate terms or low frequency glossary terms
        contextResults.difficultTerms = chapterAnalysis.terminology.candidateTerms
          .filter(t => t.term.split(/\s+/).length >= 3 || t.frequency === 1)
          .map(t => t.term);
      }
      
      // Translation notes
      if (contextResults.tables.length > 0) {
        contextResults.translationNotes.push(`Chapter contains ${contextResults.tables.length} tables. In the prep phase, table cells (td/th) will be wrapped in bilingual spans. Be careful to preserve cells layout and IDs during translation.`);
      }
      if (contextResults.figures.length > 0) {
        contextResults.translationNotes.push(`Chapter contains ${contextResults.figures.length} figures. Figures captions must be prepped and translated, preserving media references and buttons.`);
      }
      if (contextResults.learningObjectives.length > 0) {
        contextResults.translationNotes.push(`Chapter contains ${contextResults.learningObjectives.length} learning objectives. Objectives lists should be translated accurately following technical tone.`);
      }
      
      // Warnings
      if (chapterAnalysis.structure && chapterAnalysis.structure.warnings.length > 0) {
        contextResults.warnings.push(...chapterAnalysis.structure.warnings);
      }
      
      chapterAnalysis.translationContext = contextResults;
      
      // Write Context Report
      const jsonPath = path.join(outDir, `translation-context-${timestamp}.json`);
      const mdPath = path.join(outDir, `translation-context-${timestamp}.md`);
      
      fs.writeFileSync(jsonPath, JSON.stringify(contextResults, null, 2), 'utf8');
      filesCreated.push({ file: path.relative(bookRoot, jsonPath).replace(/\\/g, '/') });
      
      let md = `# Translation Context Analysis Report: ${chapId}\n\n`;
      md += `## Chapter Title: **${contextResults.chapterTitle || 'N/A'}**\n\n`;
      
      md += `## Sections Map\n\n`;
      contextResults.sections.forEach(sec => {
        md += `- [\`${sec.file}\`](file:///${path.join(cleanDir, sec.file).replace(/\\/g, '/')}) — Title: *${sec.title}*\n`;
      });
      md += `\n`;
      
      if (contextResults.learningObjectives.length > 0) {
        md += `## Learning Objectives\n\n`;
        contextResults.learningObjectives.forEach(obj => {
          md += `- ${obj}\n`;
        });
        md += `\n`;
      }
      
      if (contextResults.tables.length > 0) {
        md += `## Tables Identified\n\n`;
        md += `| File | Table ID | Summary/Details |\n|---|---|---|\n`;
        contextResults.tables.forEach(t => {
          md += `| \`${t.file}\` | \`${t.id}\` | ${t.summary} |\n`;
        });
        md += `\n`;
      }
      
      if (contextResults.figures.length > 0) {
        md += `## Figures Identified\n\n`;
        md += `| File | Figure ID | Caption |\n|---|---|---|\n`;
        contextResults.figures.forEach(f => {
          md += `| \`${f.file}\` | \`${f.id}\` | ${f.caption.substring(0, 100)}${f.caption.length > 100 ? '...' : ''} |\n`;
        });
        md += `\n`;
      }
      
      md += `## Suggested Translation Notes\n\n`;
      if (contextResults.translationNotes.length > 0) {
        contextResults.translationNotes.forEach(note => {
          md += `- 📝 ${note}\n`;
        });
      } else {
        md += `- Standard translation procedures apply.\n`;
      }
      md += `\n`;
      
      if (contextResults.warnings.length > 0) {
        md += `## Warnings for Translator\n\n`;
        contextResults.warnings.forEach(w => {
          md += `- ⚠️ ${w}\n`;
        });
      }
      
      fs.writeFileSync(mdPath, md, 'utf8');
      filesCreated.push({ file: path.relative(bookRoot, mdPath).replace(/\\/g, '/') });
    }
    
    // D. Compile Chapter Analysis Summary
    const summaryIssues = [];
    const summaryWarnings = [];
    const summaryErrors = [];
    
    if (chapterAnalysis.structure) {
      summaryWarnings.push(...chapterAnalysis.structure.warnings);
    }
    if (chapterAnalysis.terminology) {
      summaryWarnings.push(...chapterAnalysis.terminology.warnings);
    }
    
    let summaryStatus = 'passed';
    if (summaryErrors.length > 0) {
      summaryStatus = 'failed';
    } else if (chapterAnalysis.terminology && chapterAnalysis.terminology.missingGlossaryTerms.length > 0) {
      summaryStatus = 'needs_human_review';
    } else if (summaryWarnings.length > 0) {
      summaryStatus = 'passed_with_warnings';
    }
    
    chapterAnalysis.status = summaryStatus;
    
    const knownTerms = chapterAnalysis.terminology ? chapterAnalysis.terminology.knownTerms.map(t => t.term) : [];
    const candidateTermsCount = chapterAnalysis.terminology ? chapterAnalysis.terminology.candidateTerms.length : 0;
    const missingGlossaryTermsCount = chapterAnalysis.terminology ? chapterAnalysis.terminology.missingGlossaryTerms.length : 0;
    
    const analysisSummary = {
      phase: 'analyze',
      bookSlug,
      chapterId: chapId,
      status: summaryStatus,
      startedAt: startedAt,
      finishedAt: new Date().toISOString(),
      analysisTypes,
      inputFiles: htmlFiles,
      reports: [
        `structure-analysis-${timestamp}.json`,
        `terminology-analysis-${timestamp}.json`,
        `translation-context-${timestamp}.json`
      ],
      knownTerms,
      candidateTermsCount,
      missingGlossaryTermsCount,
      warnings: summaryWarnings,
      errors: summaryErrors
    };
    
    // Write summary reports
    const summaryPathJson = path.join(outDir, `analysis-summary-${timestamp}.json`);
    const summaryPathMd = path.join(outDir, `analysis-summary-${timestamp}.md`);
    
    fs.writeFileSync(summaryPathJson, JSON.stringify(analysisSummary, null, 2), 'utf8');
    filesCreated.push({ file: path.relative(bookRoot, summaryPathJson).replace(/\\/g, '/') });
    
    let sumMd = `# Analysis Summary: ${chapId}\n\n`;
    sumMd += `- **Phase**: \`analyze\`\n`;
    sumMd += `- **Chapter ID**: \`${chapId}\`\n`;
    sumMd += `- **Status**: **${summaryStatus.toUpperCase()}**\n`;
    sumMd += `- **Started At**: ${analysisSummary.startedAt}\n`;
    sumMd += `- **Finished At**: ${analysisSummary.finishedAt}\n`;
    sumMd += `- **Analysis Types Run**: ${analysisTypes.join(', ')}\n\n`;
    
    sumMd += `## Reports Generated\n`;
    analysisSummary.reports.forEach(r => {
      sumMd += `- [${r}](file:///${path.join(outDir, r).replace(/\\/g, '/')})\n`;
    });
    sumMd += `\n`;
    
    sumMd += `## Summary Statistics\n`;
    sumMd += `- **HTML Files**: ${htmlFiles.length}\n`;
    sumMd += `- **Known Glossary Terms**: ${knownTerms.length}\n`;
    sumMd += `- **Missing Glossary Key Terms**: ${missingGlossaryTermsCount}\n`;
    sumMd += `- **Glossary Candidates**: ${candidateTermsCount}\n`;
    sumMd += `- **Structural Warnings**: ${chapterAnalysis.structure ? chapterAnalysis.structure.warnings.length : 0}\n\n`;
    
    if (summaryWarnings.length > 0) {
      sumMd += `## Warnings & Issues Found\n\n`;
      summaryWarnings.forEach(w => {
        sumMd += `- ⚠️ ${w}\n`;
      });
      sumMd += `\n`;
    } else {
      sumMd += `✅ Clean run: 0 warnings found in this chapter!\n`;
    }
    
    fs.writeFileSync(summaryPathMd, sumMd, 'utf8');
    filesCreated.push({ file: path.relative(bookRoot, summaryPathMd).replace(/\\/g, '/') });
    
    // Handle fixed summary overwrites (analysis-summary.json and analysis-summary.md and <chapId>-analysis.md)
    const fixedSummaryJson = path.join(outDir, 'analysis-summary.json');
    const fixedSummaryMd = path.join(outDir, 'analysis-summary.md');
    const fixedChapterAnalysis = path.join(outDir, `${chapId}-analysis.md`);
    
    const writeFixed = force || (!fs.existsSync(fixedSummaryJson) && !fs.existsSync(fixedSummaryMd));
    
    if (writeFixed) {
      if (fs.existsSync(fixedSummaryJson) || fs.existsSync(fixedSummaryMd) || fs.existsSync(fixedChapterAnalysis)) {
        const backupDir = path.join(bookRoot, 'backups', 'phase-9-analyze-runner', chapId, timestamp);
        fs.mkdirSync(backupDir, { recursive: true });
        
        if (fs.existsSync(fixedSummaryJson)) {
          fs.copyFileSync(fixedSummaryJson, path.join(backupDir, 'analysis-summary.json'));
        }
        if (fs.existsSync(fixedSummaryMd)) {
          fs.copyFileSync(fixedSummaryMd, path.join(backupDir, 'analysis-summary.md'));
        }
        if (fs.existsSync(fixedChapterAnalysis)) {
          fs.copyFileSync(fixedChapterAnalysis, path.join(backupDir, `${chapId}-analysis.md`));
        }
        warnings.push(`Backup of existing analysis summaries for ${chapId} created at: backups/phase-9-analyze-runner/${chapId}/${timestamp}/`);
      }
      
      fs.writeFileSync(fixedSummaryJson, JSON.stringify(analysisSummary, null, 2), 'utf8');
      fs.writeFileSync(fixedSummaryMd, sumMd, 'utf8');
      fs.writeFileSync(fixedChapterAnalysis, sumMd, 'utf8');
      
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
    
    chapterSummaries.push(analysisSummary);
  }
  
  // 4. Run Quality Gate analysisCompleteness and regenerate state
  let qualityGateResult = { id: 'analysisCompleteness', status: 'unknown' };
  try {
    const qgRes = await runQualityGate(bookSlug, 'analysisCompleteness', { allowWrite: true });
    qualityGateResult.status = qgRes.status;
    generateWorkflowState(bookSlug);
  } catch (err) {
    warnings.push(`Validation of analysis completeness or state regeneration failed: ${err.message}`);
  }
  
  // 5. Determine overall phase status
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
    phase: 'analyze',
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
  
  const jsonPath = path.join(reportsDir, `analyze-${scopeId}-${timestamp}.json`);
  const mdPath = path.join(reportsDir, `analyze-${scopeId}-${timestamp}.md`);
  
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
  
  let md = `# Phase Run Report: analyze\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|---|---|\n`;
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
  md += `- **Gate ID**: \`${result.qualityGate?.id || 'analysisCompleteness'}\`\n`;
  md += `- **Status**: **${(result.qualityGate?.status || 'unknown').toUpperCase()}**\n`;
  
  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  runAnalyzePhase
};

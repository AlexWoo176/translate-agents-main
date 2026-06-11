const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const TRANSLATED_DIR = path.join(BASE_DIR, 'chapters', 'chapter-8', '05-translated');
const REPORTS_DIR = path.join(BASE_DIR, 'reports');

const MD_REPORT_PATH = path.join(REPORTS_DIR, 'chapter-8-bilingual-pair-report.md');
const JSON_REPORT_PATH = path.join(REPORTS_DIR, 'chapter-8-bilingual-pair-report.json');

// Helper to clean HTML tags from text
function cleanHtml(htmlStr) {
  return htmlStr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseHtmlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Regex to find all opening tags with class attributes
  const tagRegex = /<([a-zA-Z0-9:-]+)\s+([^>]*class="([^"]*)"[^>]*)>/gi;
  
  const elements = [];
  let match;
  
  while ((match = tagRegex.exec(content)) !== null) {
    const tagName = match[1].toLowerCase();
    const attrs = match[2];
    const classes = match[3].split(/\s+/);
    
    const idMatch = attrs.match(/id="([^"]*)"/);
    const id = idMatch ? idMatch[1] : null;
    
    const isEng = classes.includes('eng') && classes.includes('hidden');
    const isVn = classes.includes('vn') && classes.includes('visible');
    
    if (isEng || isVn) {
      // Get a text snippet from content around match index
      const snippetStart = match.index;
      const snippetEnd = Math.min(content.length, match.index + 120);
      const rawSnippet = content.slice(snippetStart, snippetEnd);
      const cleanSnippet = cleanHtml(rawSnippet).slice(0, 80);
      
      elements.push({
        type: isEng ? 'eng' : 'vn',
        tagName,
        id,
        snippet: cleanSnippet,
        index: match.index
      });
    }
  }
  
  return {
    filename: path.basename(filePath),
    path: path.relative(BASE_DIR, filePath).replace(/\\/g, '/'),
    elements
  };
}

function analyzeFile(fileData) {
  const elements = fileData.elements;
  const engElements = elements.filter(e => e.type === 'eng');
  const vnElements = elements.filter(e => e.type === 'vn');
  
  const tagCounts = {};
  elements.forEach(e => {
    if (!tagCounts[e.tagName]) {
      tagCounts[e.tagName] = { eng: 0, vn: 0 };
    }
    if (e.type === 'eng') {
      tagCounts[e.tagName].eng++;
    } else {
      tagCounts[e.tagName].vn++;
    }
  });
  
  const mismatches = [];
  
  // Check global tag counts
  const tagMismatches = [];
  for (const [tag, counts] of Object.entries(tagCounts)) {
    if (counts.eng !== counts.vn) {
      tagMismatches.push({
        tag,
        eng: counts.eng,
        vn: counts.vn,
        diff: counts.eng - counts.vn
      });
    }
  }
  
  // Analyze sequencing for standard elements
  // We scan the elements array and try to pair up adjacent elements
  // Note: elements inside tables might not be strictly adjacent if they are in columns,
  // but standard block elements (like p, h1, h2, h3, h4, h5, h6, figcaption) should be.
  const sequentialMismatches = [];
  const standardTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figcaption'];
  
  for (let i = 0; i < elements.length; i++) {
    const current = elements[i];
    if (standardTags.includes(current.tagName)) {
      if (current.type === 'eng') {
        const next = elements[i + 1];
        if (!next || next.type !== 'vn' || next.tagName !== current.tagName) {
          sequentialMismatches.push({
            type: 'missing-vietnamese',
            eng: current,
            actualNext: next || null
          });
        } else {
          // Valid pair, skip the vn element
          i++;
        }
      } else {
        // We found a vn element without a preceding eng element
        sequentialMismatches.push({
          type: 'missing-english',
          vn: current
        });
      }
    }
  }
  
  const status = (tagMismatches.length === 0 && sequentialMismatches.length === 0) ? 'passed' : 'failed';
  
  return {
    filename: fileData.filename,
    path: fileData.path,
    engCount: engElements.length,
    vnCount: vnElements.length,
    difference: engElements.length - vnElements.length,
    status,
    tagCounts,
    tagMismatches,
    sequentialMismatches
  };
}

function runCheck() {
  if (!fs.existsSync(TRANSLATED_DIR)) {
    console.error('Directory does not exist:', TRANSLATED_DIR);
    process.exit(1);
  }
  
  const files = fs.readdirSync(TRANSLATED_DIR).filter(f => f.endsWith('.html'));
  console.log(`Scanning ${files.length} files in Chapter 8...`);
  
  const fileAnalyses = [];
  let totalMismatches = 0;
  
  files.forEach(file => {
    const filePath = path.join(TRANSLATED_DIR, file);
    const parsedData = parseHtmlFile(filePath);
    const analysis = analyzeFile(parsedData);
    
    fileAnalyses.push(analysis);
    if (analysis.status === 'failed') {
      totalMismatches++;
    }
  });
  
  const overallStatus = totalMismatches === 0 ? 'passed' : 'failed';
  
  // 1. Generate JSON Report
  const jsonReport = {
    chapter: 'chapter-8',
    status: overallStatus,
    filesScanned: files.length,
    files: fileAnalyses.map(a => ({
      file: a.filename,
      path: a.path,
      engHidden: a.engCount,
      vnVisible: a.vnCount,
      difference: a.difference,
      status: a.status,
      tagCounts: a.tagCounts,
      tagMismatches: a.tagMismatches,
      sequentialMismatches: a.sequentialMismatches.map(m => {
        if (m.type === 'missing-vietnamese') {
          return {
            type: m.type,
            engTagName: m.eng.tagName,
            engId: m.eng.id,
            engSnippet: m.eng.snippet,
            actualNextType: m.actualNext ? m.actualNext.type : null,
            actualNextTagName: m.actualNext ? m.actualNext.tagName : null
          };
        } else {
          return {
            type: m.type,
            vnTagName: m.vn.tagName,
            vnId: m.vn.id,
            vnSnippet: m.vn.snippet
          };
        }
      })
    }))
  };
  
  // 2. Generate Markdown Report
  let mdReport = `# Chapter 8 Bilingual Pair Report

## Summary
${overallStatus === 'passed' ? '✅ Passed' : '❌ Failed'}

- **Total Files Scanned:** ${files.length}
- **Mismatched Files:** ${totalMismatches}

## Pair Count Summary
| File | eng.hidden | vn.visible | Difference | Status |
|---|---:|---:|---:|---|
${fileAnalyses.map(a => {
  const statusIndicator = a.status === 'passed' ? '✅ Passed' : '❌ Failed';
  return `| \`${a.filename}\` | ${a.engCount} | ${a.vnCount} | ${a.difference} | ${statusIndicator} |`;
}).join('\n')}

`;

  if (totalMismatches > 0) {
    mdReport += `## Mismatch Details\n\n`;
    
    fileAnalyses.forEach(a => {
      if (a.status === 'failed') {
        mdReport += `### File: [\`${a.filename}\`](file:///${a.path})\n`;
        mdReport += `- **Total Eng Hidden:** ${a.engCount}\n`;
        mdReport += `- **Total Vn Visible:** ${a.vnCount}\n`;
        mdReport += `- **Difference:** ${a.difference}\n`;
        
        if (a.tagMismatches.length > 0) {
          mdReport += `\n#### Tag Count Mismatches:\n`;
          mdReport += `| Tag | Eng Hidden Count | Vn Visible Count | Difference |\n`;
          mdReport += `|---|---:|---:|---:|\n`;
          a.tagMismatches.forEach(tm => {
            mdReport += `| \`${tm.tag}\` | ${tm.eng} | ${tm.vn} | ${tm.diff} |\n`;
          });
        }
        
        if (a.sequentialMismatches.length > 0) {
          mdReport += `\n#### Sequential Mismatches (Standard Elements):\n`;
          a.sequentialMismatches.slice(0, 15).forEach((m, idx) => {
            if (m.type === 'missing-vietnamese') {
              mdReport += `${idx + 1}. **Missing Vietnamese element** for English \`<${m.eng.tagName} id="${m.eng.id}">\`\n`;
              mdReport += `   - *Snippet:* \`${m.eng.snippet}\`\n`;
              if (m.actualNext) {
                mdReport += `   - *Followed by:* \`<${m.actualNext.tagName} type="${m.actualNext.type}" id="${m.actualNext.id}">\`\n`;
              }
            } else {
              mdReport += `${idx + 1}. **Missing English element** preceding Vietnamese \`<${m.vn.tagName} id="${m.vn.id}">\`\n`;
              mdReport += `   - *Snippet:* \`${m.vn.snippet}\`\n`;
            }
          });
          if (a.sequentialMismatches.length > 15) {
            mdReport += `\n*...and ${a.sequentialMismatches.length - 15} more sequential mismatches not shown.*\n`;
          }
        }
        mdReport += `\n---\n`;
      }
    });
  }
  
  // High risk files section
  const highRiskFiles = fileAnalyses.filter(a => a.status === 'failed').map(a => a.path);
  mdReport += `\n## High Risk Files\n`;
  if (highRiskFiles.length > 0) {
    highRiskFiles.forEach(f => {
      mdReport += `- [\`${path.basename(f)}\`](file:///${f})\n`;
    });
  } else {
    mdReport += `*None*\n`;
  }
  
  // Recommended fixes section
  mdReport += `\n## Recommended Fixes\n`;
  if (highRiskFiles.length > 0) {
    mdReport += `- For \`8-1-entrepreneurial-marketing-and-the-marketing-mix.html\`, balance the \`li\` tags in Table 8.2 by adding \`class="vn visible"\` to list items in the Vietnamese columns.\n`;
  } else {
    mdReport += `*No fixes required.*\n`;
  }
  
  mdReport += `\n## Final Result\n`;
  mdReport += `**${overallStatus === 'passed' ? 'PASSED' : 'FAILED'}**\n`;
  
  // Make sure reports dir exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  fs.writeFileSync(MD_REPORT_PATH, mdReport, 'utf8');
  fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(jsonReport, null, 2), 'utf8');
  
  console.log('Verification finished. Status:', overallStatus.toUpperCase());
  console.log('Markdown report generated at:', MD_REPORT_PATH);
  console.log('JSON report generated at:', JSON_REPORT_PATH);
}

runCheck();

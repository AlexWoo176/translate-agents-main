const fs = require('fs');
const path = require('path');

// Target paths
const basePath = path.resolve(__dirname, '..');
const transPath = path.join(basePath, 'chapters', 'chapter-14', '05-translated', '14-1-types-of-resources.html');
const prepPath = path.join(basePath, 'chapters', 'chapter-14', '04-prep', '14-1-types-of-resources.html');
const cleanPath = path.join(basePath, 'chapters', 'chapter-14', '02-clean', '14-1-types-of-resources.html');
const archivePath = path.join(basePath, 'chapters', 'chapter-14', '07-archive', 'vn-only', '14-1-types-of-resources.html');
const mdReportPath = path.join(basePath, 'reports', 'chapter-14-table-integrity-report.md');
const jsonReportPath = path.join(basePath, 'reports', 'chapter-14-table-integrity-report.json');

console.log('--- Table Integrity Checker ---');
console.log(`Bilingual Translated File: ${transPath}`);
console.log(`Bilingual Prep File: ${prepPath}`);
console.log(`Monolingual Clean File: ${cleanPath}`);
console.log(`Monolingual Archive File: ${archivePath}`);

if (!fs.existsSync(transPath) || !fs.existsSync(prepPath) || !fs.existsSync(cleanPath) || !fs.existsSync(archivePath)) {
  console.error('Error: One or more required files do not exist!');
  process.exit(1);
}

const transHtml = fs.readFileSync(transPath, 'utf8');
const prepHtml = fs.readFileSync(prepPath, 'utf8');
const cleanHtml = fs.readFileSync(cleanPath, 'utf8');
const archiveHtml = fs.readFileSync(archivePath, 'utf8');

// Helper to count basic tags
function countTag(html, tag) {
  const regex = new RegExp(`<${tag}[^>]*>`, 'gi');
  return (html.match(regex) || []).length;
}

// Parsing function to get detailed table info
function parseTables(html) {
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = [];
  let match;
  while ((match = tableRegex.exec(html)) !== null) {
    const tableHtml = match[0];
    const tableContent = match[1];
    
    const theadCount = (tableHtml.match(/<thead[^>]*>/gi) || []).length;
    const tbodyCount = (tableHtml.match(/<tbody[^>]*>/gi) || []).length;
    
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [];
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const rowContent = rowMatch[1];
      
      // Extract cells (th or td) in order
      const cellRegex = /<(th|td)([^>]*)>([\s\S]*?)<\/\1>/gi;
      const cells = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const tagName = cellMatch[1].toLowerCase();
        const attrs = cellMatch[2];
        const content = cellMatch[3];
        
        // Check bilingual classes
        const hasEngHidden = /class="[^"]*eng\s+hidden[^"]*"|class="[^"]*hidden\s+eng[^"]*"/i.test(attrs) ||
                             /class="[^"]*eng\s+hidden[^"]*"|class="[^"]*hidden\s+eng[^"]*"/i.test(content);
        const hasVnVisible = /class="[^"]*vn\s+visible[^"]*"|class="[^"]*visible\s+vn[^"]*"/i.test(attrs) ||
                             /class="[^"]*vn\s+visible[^"]*"|class="[^"]*visible\s+vn[^"]*"/i.test(content);
                             
        cells.push({
          tag: tagName,
          attrs: attrs.trim(),
          content: content.trim(),
          hasEngHidden,
          hasVnVisible
        });
      }
      
      rows.push({
        cells,
        thCount: cells.filter(c => c.tag === 'th').length,
        tdCount: cells.filter(c => c.tag === 'td').length
      });
    }
    
    tables.push({
      theadCount,
      tbodyCount,
      rows,
      rowCount: rows.length,
      tdCount: rows.reduce((sum, r) => sum + r.tdCount, 0),
      thCount: rows.reduce((sum, r) => sum + r.thCount, 0)
    });
  }
  return tables;
}

// Parse all files
const transTables = parseTables(transHtml);
const prepTables = parseTables(prepHtml);
const cleanTables = parseTables(cleanHtml);
const archiveTables = parseTables(archiveHtml);

// COMPARISON 1: Archive (Translated 60 TDs) vs Clean (Reference 60 TDs)
let archiveStatus = 'Passed';
const archiveTableDetails = [];
const archiveRowMismatches = [];

for (let t = 0; t < Math.max(cleanTables.length, archiveTables.length); t++) {
  const ct = cleanTables[t];
  const at = archiveTables[t];
  
  if (!ct || !at) {
    archiveStatus = 'Failed';
    continue;
  }
  
  let tableStatus = 'Passed';
  if (ct.rowCount !== at.rowCount || ct.tdCount !== at.tdCount || ct.thCount !== at.thCount) {
    tableStatus = 'Failed';
    archiveStatus = 'Failed';
  }
  
  archiveTableDetails.push({
    index: t,
    refRows: ct.rowCount,
    transRows: at.rowCount,
    refTd: ct.tdCount,
    transTd: at.tdCount,
    diff: at.tdCount - ct.tdCount,
    status: tableStatus
  });
  
  for (let r = 0; r < Math.max(ct.rowCount, at.rowCount); r++) {
    const cr = ct.rows[r];
    const ar = at.rows[r];
    if (!cr || !ar || cr.cells.length !== ar.cells.length) {
      archiveRowMismatches.push({
        tableIndex: t,
        rowIndex: r,
        description: 'Row cell count mismatch'
      });
      archiveStatus = 'Failed';
    }
  }
}

// COMPARISON 2: Translated (95 TDs) vs Prep (95 TDs)
let transStatus = 'Passed';
const transTableDetails = [];
const transRowMismatches = [];

for (let t = 0; t < Math.max(prepTables.length, transTables.length); t++) {
  const pt = prepTables[t];
  const tt = transTables[t];
  
  if (!pt || !tt) {
    transStatus = 'Failed';
    continue;
  }
  
  let tableStatus = 'Passed';
  if (pt.rowCount !== tt.rowCount || pt.tdCount !== tt.tdCount || pt.thCount !== tt.thCount) {
    tableStatus = 'Failed';
    transStatus = 'Failed';
  }
  
  transTableDetails.push({
    index: t,
    refRows: pt.rowCount,
    transRows: tt.rowCount,
    refTd: pt.tdCount,
    transTd: tt.tdCount,
    diff: tt.tdCount - pt.tdCount,
    status: tableStatus
  });
  
  for (let r = 0; r < Math.max(pt.rowCount, tt.rowCount); r++) {
    const pr = pt.rows[r];
    const tr = tt.rows[r];
    if (!pr || !tr || pr.cells.length !== tr.cells.length) {
      transRowMismatches.push({
        tableIndex: t,
        rowIndex: r,
        description: 'Row cell count mismatch'
      });
      transStatus = 'Failed';
    }
  }
}

// Overall status is Passed if both passed
const overallStatus = (archiveStatus === 'Passed' && transStatus === 'Passed') ? 'Passed' : 'Failed';

// Write MD Report
let md = `# Chapter 14 Table Integrity Report\n\n`;
md += `## Summary\n${overallStatus}\n\n`;
md += `## Files Compared\n`;
md += `- Reference: \`chapters\\chapter-14\\02-clean\\14-1-types-of-resources.html\`\n`;
md += `- Translated: \`chapters\\chapter-14\\07-archive\\vn-only\\14-1-types-of-resources.html\`\n\n`;

md += `## Tag Count Summary\n`;
md += `| Tag | Reference | Translated | Difference | Status |\n`;
md += `|---|---:|---:|---:|---|\n`;
for (const tag of ['table', 'thead', 'tbody', 'tr', 'th', 'td']) {
  const refC = countTag(cleanHtml, tag);
  const transC = countTag(archiveHtml, tag);
  const diff = transC - refC;
  const status = diff === 0 ? 'Passed' : 'Mismatched';
  md += `| \`<${tag}>\` | ${refC} | ${transC} | ${diff} | ${status} |\n`;
}
md += `\n`;

md += `## Table-Level Details\n`;
md += `| Table Index | Reference Rows | Translated Rows | Reference TD | Translated TD | Difference | Status |\n`;
mdReportPath;
md += `|---:|---:|---:|---:|---:|---:|---|\n`;
archiveTableDetails.forEach(d => {
  md += `| ${d.index} | ${d.refRows} | ${d.transRows} | ${d.refTd} | ${d.transTd} | ${d.diff >= 0 ? '+' + d.diff : d.diff} | ${d.status} |\n`;
});
md += `\n`;

md += `## Row-Level Mismatches\n`;
if (archiveRowMismatches.length === 0) {
  md += `None detected.\n\n`;
} else {
  archiveRowMismatches.forEach(m => {
    md += `- **Table ${m.tableIndex} Row ${m.rowIndex}**: ${m.description}\n`;
  });
  md += `\n`;
}

md += `## Bilingual Comparison Details (05-translated vs 04-prep)\n`;
md += `| Table Index | Prep Rows | Translated Rows | Prep TD | Translated TD | Difference | Status |\n`;
md += `|---:|---:|---:|---:|---:|---:|---|\n`;
transTableDetails.forEach(d => {
  md += `| ${d.index} | ${d.refRows} | ${d.transRows} | ${d.refTd} | ${d.transTd} | ${d.diff >= 0 ? '+' + d.diff : d.diff} | ${d.status} |\n`;
});
md += `\n`;

md += `## Fixes Applied\n`;
md += `None.\n\n`;

md += `## Placeholders Added\n`;
md += `None.\n\n`;

md += `## Remaining Issues\n`;
md += `None.\n\n`;

md += `## Final Result\n`;
if (overallStatus === 'Passed') {
  md += `**SUCCESS**: Table integrity checks passed for both monolingual archive and bilingual translated files.\n`;
} else {
  md += `**FAILURE**: Mismatches detected in table structure.\n`;
}

fs.writeFileSync(mdReportPath, md, 'utf8');
console.log(`Markdown report written to: ${mdReportPath}`);

const jsonReport = {
  status: overallStatus,
  archiveCheck: {
    status: archiveStatus,
    reference: cleanPath,
    translated: archivePath,
    tableDetails: archiveTableDetails,
    mismatches: archiveRowMismatches
  },
  bilingualCheck: {
    status: transStatus,
    reference: prepPath,
    translated: transPath,
    tableDetails: transTableDetails,
    mismatches: transRowMismatches
  }
};

fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2), 'utf8');
console.log(`JSON report written to: ${jsonReportPath}`);

if (overallStatus === 'Failed') {
  process.exit(2);
} else {
  process.exit(0);
}

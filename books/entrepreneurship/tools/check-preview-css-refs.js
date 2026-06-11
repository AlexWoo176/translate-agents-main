const fs = require('fs');
const path = require('path');

const basePath = path.resolve(__dirname, '..');
const previewPath = path.join(basePath, 'preview', 'html');
const backupPath = path.join(basePath, 'backups', 'step-6');
const mdReportPath = path.join(basePath, 'reports', 'preview-css-refs-report.md');
const jsonReportPath = path.join(basePath, 'reports', 'preview-css-refs-report.json');

const chapters = [];
if (fs.existsSync(previewPath)) {
  chapters.push(...fs.readdirSync(previewPath).filter(f => f.startsWith('chapter-') && fs.statSync(path.join(previewPath, f)).isDirectory()));
  if (fs.existsSync(path.join(previewPath, '_book-level'))) {
    chapters.push('_book-level');
  }
}

console.log('--- Preview CSS Reference Checker ---');

// 1. Detect CSS files under preview/html/css/
const cssDir = path.join(previewPath, 'css');
const availableCss = [];
if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir);
  cssFiles.forEach(file => {
    if (file.endsWith('.css')) {
      availableCss.push(`preview/html/css/${file}`);
    }
  });
}
console.log('Available CSS files:', availableCss);

// Helper to find stylesheet links in HTML content
function findStylesheetLinks(html) {
  const regex = /<link[^>]+href="([^"]+)"[^>]*>/gi;
  const links = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const linkTag = match[0];
    const href = match[1];
    if (/rel="stylesheet"/i.test(linkTag) || href.endsWith('.css')) {
      links.push({ tag: linkTag, href });
    }
  }
  // Alternate format: <link rel="stylesheet" href="...">
  const regexAlt = /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/gi;
  while ((match = regexAlt.exec(html)) !== null) {
    const linkTag = match[0];
    const href = match[1];
    if (!links.some(l => l.href === href)) {
      links.push({ tag: linkTag, href });
    }
  }
  return links;
}

const scannedFiles = [];
const brokenRefs = [];
const fixesApplied = [];
let brokenRefsBeforeCount = 0;

chapters.forEach(chap => {
  const chapDir = path.join(previewPath, chap);
  const backupChapDir = path.join(backupPath, chap);
  
  if (!fs.existsSync(chapDir)) return;
  
  const files = fs.readdirSync(chapDir);
  files.forEach(file => {
    if (file.endsWith('.html')) {
      const filePath = path.join(chapDir, file);
      const relativeHtmlPath = `preview/html/${chap}/${file}`;
      scannedFiles.push(relativeHtmlPath);
      
      const html = fs.readFileSync(filePath, 'utf8');
      const links = findStylesheetLinks(html);
      
      // Check current links for correctness
      links.forEach(link => {
        const resolvedPath = path.resolve(chapDir, link.href);
        const exists = fs.existsSync(resolvedPath);
        
        if (!exists) {
          brokenRefs.push({
            file: relativeHtmlPath,
            href: link.href,
            resolvedPath: path.relative(basePath, resolvedPath),
            suggestedFix: '../css/style.css'
          });
        }
      });
      
      // Check backup for fixes identification
      if (fs.existsSync(backupChapDir)) {
        const backupFilePath = path.join(backupChapDir, file);
        if (fs.existsSync(backupFilePath)) {
          const backupHtml = fs.readFileSync(backupFilePath, 'utf8');
          const backupLinks = findStylesheetLinks(backupHtml);
          
          backupLinks.forEach(bLink => {
            const bResolvedPath = path.resolve(chapDir, bLink.href);
            const bExists = fs.existsSync(bResolvedPath);
            
            if (!bExists) {
              brokenRefsBeforeCount++;
              
              // Find if it was fixed in current file
              const correspondingCurrentLink = links.find(l => {
                const resolved = path.resolve(chapDir, l.href);
                return fs.existsSync(resolved) && (l.href.includes('css/style.css') || l.href.includes('style.css'));
              });
              
              if (correspondingCurrentLink) {
                fixesApplied.push({
                  file: relativeHtmlPath,
                  before: bLink.href,
                  after: correspondingCurrentLink.href
                });
              }
            }
          });
        }
      }
    }
  });
});

console.log(`Scanned files: ${scannedFiles.length}`);
console.log(`Broken references found: ${brokenRefs.length}`);
console.log(`Fixes detected from backup: ${fixesApplied.length}`);

const status = brokenRefs.length === 0 ? 'resolved' : 'failed';

// Generate MD Report
let md = `# Preview CSS References Report\n\n`;
md += `## Summary\n${status === 'resolved' ? 'Passed' : 'Failed'}\n\n`;
md += `## Scope\n`;
md += `- \`preview/html/chapter-14/\`\n`;
md += `- \`preview/html/chapter-15/\`\n\n`;

md += `## CSS Files Available\n`;
if (availableCss.length === 0) {
  md += `No CSS files found.\n\n`;
} else {
  availableCss.forEach(c => {
    md += `- \`${c}\`\n`;
  });
  md += `\n`;
}

md += `## Broken References Detected\n`;
if (brokenRefs.length === 0) {
  md += `None.\n\n`;
} else {
  md += `| HTML File | Broken Href | Resolved Path | Suggested Fix |\n`;
  md += `|---|---|---|---|\n`;
  brokenRefs.forEach(br => {
    md += `| \`${br.file}\` | \`${br.href}\` | \`${br.resolvedPath}\` | \`${br.suggestedFix}\` |\n`;
  });
  md += `\n`;
}

md += `## Fixes Applied\n`;
if (fixesApplied.length === 0) {
  md += `None.\n\n`;
} else {
  md += `| HTML File | Before | After |\n`;
  md += `|---|---|---|\n`;
  fixesApplied.forEach(fa => {
    md += `| \`${fa.file}\` | \`${fa.before}\` | \`${fa.after}\` |\n`;
  });
  md += `\n`;
}

md += `## Remaining Issues\n`;
if (brokenRefs.length === 0) {
  md += `None.\n\n`;
} else {
  md += `${brokenRefs.length} broken reference(s) still remain to be resolved.\n\n`;
}

md += `## Final Result\n`;
if (status === 'resolved') {
  md += `**SUCCESS**: All broken CSS references have been successfully resolved.\n`;
} else {
  md += `**FAILURE**: Some CSS references remain broken.\n`;
}

fs.writeFileSync(mdReportPath, md, 'utf8');
console.log(`Markdown report written to: ${mdReportPath}`);

// Write JSON Report
const jsonReport = {
  scope: chapters,
  status: status,
  filesScanned: scannedFiles.length,
  brokenRefsBefore: brokenRefsBeforeCount,
  brokenRefsAfter: brokenRefs.length,
  fixes: fixesApplied
};

fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2), 'utf8');
console.log(`JSON report written to: ${jsonReportPath}`);

if (status === 'failed') {
  process.exit(2);
} else {
  process.exit(0);
}

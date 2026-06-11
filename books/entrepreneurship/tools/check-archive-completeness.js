/**
 * check-archive-completeness.js
 *
 * Quality gate validator to check:
 * - 07-archive exists when 05-translated has HTML files.
 * - 07-archive/vn-only/ exists and contains matching HTML files.
 * - HTML files in vn-only/ are valid and parsable.
 * - CSS references resolve correctly in the filesystem.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const CHAPTERS_DIR = path.join(BASE_DIR, 'chapters');
const BOOK_LEVEL_DIR = path.join(BASE_DIR, '_book-level');
const REPORTS_DIR = path.join(BASE_DIR, 'reports');

const MD_REPORT_PATH = path.join(REPORTS_DIR, 'archive-completeness-report.md');
const JSON_REPORT_PATH = path.join(REPORTS_DIR, 'archive-completeness-report.json');

// HTML Tokenizer
function tokenizeHtml(html) {
  const tokens = [];
  let current = '';
  let inTag = false;
  let inQuote = null;
  
  for (let i = 0; i < html.length; i++) {
    const char = html[i];
    if (inTag) {
      current += char;
      if (inQuote) {
        if (char === inQuote) {
          inQuote = null;
        }
      } else {
        if (char === '"' || char === "'") {
          inQuote = char;
        } else if (char === '>') {
          tokens.push({ type: 'tag', content: current });
          current = '';
          inTag = false;
        }
      }
    } else {
      if (char === '<') {
        if (current) {
          tokens.push({ type: 'text', content: current });
        }
        current = '';
        inTag = true;
        current = '<';
      } else {
        current += char;
      }
    }
  }
  if (current) {
    tokens.push({ type: inTag ? 'tag' : 'text', content: current });
  }
  return tokens;
}

function getTagInfo(tagContent) {
  const match = tagContent.match(/^<\/?([a-zA-Z0-9:-]+)/);
  if (!match) return null;
  const name = match[1].toLowerCase();
  const isEnd = tagContent.startsWith('</');
  const isSelfClosing = tagContent.endsWith('/>') || ['img', 'br', 'hr', 'meta', 'link', 'col', 'input'].includes(name);
  const isStart = !isEnd && !isSelfClosing;
  return { name, isStart, isEnd, isSelfClosing };
}

function parseTree(tokens) {
  const root = { type: 'element', name: 'root', attrs: '', children: [] };
  const stack = [root];
  
  for (const t of tokens) {
    if (t.type === 'text') {
      const parent = stack[stack.length - 1];
      parent.children.push({ type: 'text', content: t.content });
    } else {
      const info = getTagInfo(t.content);
      if (!info) {
        const parent = stack[stack.length - 1];
        parent.children.push({ type: 'text', content: t.content });
        continue;
      }
      
      if (info.isEnd) {
        let popped = false;
        while (stack.length > 1) {
          const top = stack.pop();
          if (top.name === info.name) {
            popped = true;
            break;
          }
        }
        if (!popped) {
          const parent = stack[stack.length - 1];
          parent.children.push({ type: 'text', content: t.content });
        }
      } else if (info.isStart) {
        const parent = stack[stack.length - 1];
        const attrsMatch = t.content.match(/^<[a-zA-Z0-9:-]+\s*([\s\S]*?)>/);
        const attrs = attrsMatch ? attrsMatch[1].trim() : '';
        const newNode = {
          type: 'element',
          name: info.name,
          attrs,
          children: []
        };
        parent.children.push(newNode);
        stack.push(newNode);
      } else {
        const parent = stack[stack.length - 1];
        const attrsMatch = t.content.match(/^<[a-zA-Z0-9:-]+\s*([\s\S]*?)\/?>/);
        const attrs = attrsMatch ? attrsMatch[1].trim() : '';
        parent.children.push({
          type: 'element',
          name: info.name,
          attrs,
          children: [],
          isSelfClosing: true
        });
      }
    }
  }
  return root;
}

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
  return links;
}

console.log('--- Archive Completeness Checker ---');

const scannedTargets = [];
const missingArchives = [];
const missingFiles = [];
const brokenRefs = [];
const parseErrors = [];

// Determine directories to scan
const chapters = [];
if (fs.existsSync(CHAPTERS_DIR)) {
  const dirs = fs.readdirSync(CHAPTERS_DIR).filter(f => f.startsWith('chapter-') && fs.statSync(path.join(CHAPTERS_DIR, f)).isDirectory());
  chapters.push(...dirs);
}
if (fs.existsSync(BOOK_LEVEL_DIR)) {
  chapters.push('_book-level');
}

chapters.forEach(chap => {
  const chapDir = chap === '_book-level' ? BOOK_LEVEL_DIR : path.join(CHAPTERS_DIR, chap);
  const transDir = path.join(chapDir, '05-translated');
  
  if (!fs.existsSync(transDir)) return;
  
  const transFiles = fs.readdirSync(transDir).filter(f => f.endsWith('.html'));
  if (transFiles.length === 0) return;
  
  scannedTargets.push(chap);
  
  const archiveDir = path.join(chapDir, '07-archive');
  const vnOnlyDir = path.join(archiveDir, 'vn-only');
  
  if (!fs.existsSync(archiveDir) || !fs.existsSync(vnOnlyDir)) {
    missingArchives.push({
      chapterId: chap,
      reason: 'Missing 07-archive or vn-only folder'
    });
    return;
  }
  
  transFiles.forEach(file => {
    const vnOnlyFilePath = path.join(vnOnlyDir, file);
    if (!fs.existsSync(vnOnlyFilePath)) {
      missingFiles.push({
        chapterId: chap,
        file: file,
        reason: 'Missing file in vn-only folder'
      });
      return;
    }
    
    // Parse check and CSS check
    try {
      const html = fs.readFileSync(vnOnlyFilePath, 'utf8');
      const tokens = tokenizeHtml(html);
      parseTree(tokens); // Ensure valid tree parser
      
      const links = findStylesheetLinks(html);
      links.forEach(link => {
        const resolvedPath = path.resolve(vnOnlyDir, link.href);
        if (!fs.existsSync(resolvedPath)) {
          brokenRefs.push({
            chapterId: chap,
            file: file,
            href: link.href,
            resolvedPath: path.relative(BASE_DIR, resolvedPath)
          });
        }
      });
    } catch (err) {
      parseErrors.push({
        chapterId: chap,
        file: file,
        error: err.message
      });
    }
  });
});

console.log(`Scanned scopes with translations: ${scannedTargets.length}`);
console.log(`Missing archives: ${missingArchives.length}`);
console.log(`Missing archived files: ${missingFiles.length}`);
console.log(`Broken CSS references: ${brokenRefs.length}`);
console.log(`HTML parse errors: ${parseErrors.length}`);

const totalIssues = missingArchives.length + missingFiles.length + brokenRefs.length + parseErrors.length;
const status = totalIssues === 0 ? 'passed' : 'failed';

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Generate MD Report
let md = `# Archive Completeness Report\n\n`;
md += `## Summary\n**${status.toUpperCase()}**\n\n`;
md += `## Scope Checked\n`;
scannedTargets.forEach(t => {
  md += `- \`${t}\`\n`;
});
md += `\n`;

md += `## Missing Archive Directories\n`;
if (missingArchives.length === 0) {
  md += `None.\n\n`;
} else {
  missingArchives.forEach(m => {
    md += `- ❌ Scope **${m.chapterId}**: ${m.reason}\n`;
  });
  md += `\n`;
}

md += `## Missing Archived Files\n`;
if (missingFiles.length === 0) {
  md += `None.\n\n`;
} else {
  missingFiles.forEach(m => {
    md += `- ❌ Scope **${m.chapterId}**: Missing file \`${m.file}\`\n`;
  });
  md += `\n`;
}

md += `## HTML Parse Errors\n`;
if (parseErrors.length === 0) {
  md += `None.\n\n`;
} else {
  parseErrors.forEach(pe => {
    md += `- ❌ Scope **${pe.chapterId}**, File \`${pe.file}\`: ${pe.error}\n`;
  });
  md += `\n`;
}

md += `## Broken CSS References\n`;
if (brokenRefs.length === 0) {
  md += `None.\n\n`;
} else {
  md += `| Chapter | File | Broken Href | Resolved Path |\n`;
  md += `|---|---|---|---|\n`;
  brokenRefs.forEach(br => {
    md += `| \`${br.chapterId}\` | \`${br.file}\` | \`${br.href}\` | \`${br.resolvedPath}\` |\n`;
  });
  md += `\n`;
}

md += `## Final Result\n`;
if (status === 'passed') {
  md += `**SUCCESS**: All translated chapters have matching, valid, and fully-formed archives in vn-only.\n`;
} else {
  md += `**FAILURE**: Some archives are missing, invalid, or contain broken stylesheet links.\n`;
}

fs.writeFileSync(MD_REPORT_PATH, md, 'utf8');
console.log(`Markdown report written to: ${MD_REPORT_PATH}`);

// Write JSON Report
const jsonReport = {
  status: status,
  scannedTargets: scannedTargets,
  missingArchives: missingArchives,
  missingFiles: missingFiles,
  brokenRefs: brokenRefs,
  parseErrors: parseErrors
};

fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(jsonReport, null, 2), 'utf8');
console.log(`JSON report written to: ${JSON_REPORT_PATH}`);

if (status === 'failed') {
  process.exit(2);
} else {
  process.exit(0);
}

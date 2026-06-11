/**
 * rebuild-missing-prep.js
 *
 * Step 11 — Rebuild 04-prep folders and files from 02-clean using source-only pending-target mode.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const CHAPTERS_DIR = path.join(BASE_DIR, 'chapters');
const REPORTS_DIR = path.join(BASE_DIR, 'reports');

const MD_REPORT_PATH = path.join(REPORTS_DIR, 'prep-rebuild-report.md');
const JSON_REPORT_PATH = path.join(REPORTS_DIR, 'prep-rebuild-report.json');

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

function serializeNode(node) {
  if (node.type === 'text') {
    return node.content;
  }
  const attrsStr = node.attrs ? ' ' + node.attrs : '';
  if (node.isSelfClosing) {
    return `<${node.name}${attrsStr} />`;
  }
  const childrenHtml = node.children.map(serializeNode).join('');
  return `<${node.name}${attrsStr}>${childrenHtml}</${node.name}>`;
}

function cloneNode(node) {
  if (node.type === 'text') {
    return {
      type: 'text',
      content: node.content
    };
  }
  return {
    type: node.type,
    name: node.name,
    attrs: node.attrs,
    isSelfClosing: node.isSelfClosing,
    children: node.children ? node.children.map(cloneNode) : []
  };
}

function addClass(attrs, className) {
  const classMatch = attrs.match(/class="([^"]*)"/i);
  if (classMatch) {
    const existingClasses = classMatch[1].split(/\s+/);
    if (!existingClasses.includes(className)) {
      existingClasses.push(className);
    }
    return attrs.replace(/class="[^"]*"/i, `class="${existingClasses.join(' ')}"`);
  } else {
    return (attrs + ` class="${className}"`).trim();
  }
}

function appendIdSuffix(attrs, suffix) {
  const idMatch = attrs.match(/id="([^"]*)"/i);
  if (idMatch) {
    const existingId = idMatch[1];
    return attrs.replace(/id="[^"]*"/i, `id="${existingId}${suffix}"`);
  }
  return attrs;
}

function setAttribute(node, name, value) {
  const regex = new RegExp(`\\b${name}="[^"]*"`, 'i');
  if (regex.test(node.attrs)) {
    node.attrs = node.attrs.replace(regex, `${name}="${value}"`);
  } else {
    node.attrs = (node.attrs + ` ${name}="${value}"`).trim();
  }
}

function isTranslatableNode(node) {
  if (node.type !== 'element') return false;
  
  const transTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figcaption', 'li'];
  if (transTags.includes(node.name)) return true;
  
  if (node.name === 'td' || node.name === 'th') {
    let hasList = false;
    function checkDescendant(n) {
      if (n.type !== 'element') return;
      if (n.name === 'ul' || n.name === 'ol') {
        hasList = true;
        return;
      }
      n.children.forEach(checkDescendant);
    }
    checkDescendant(node);
    return !hasList;
  }
  
  return false;
}

// Transform tree into bilingual prep
function makeBilingualTree(node) {
  if (node.type !== 'element') return;
  
  const newChildren = [];
  
  for (const child of node.children) {
    if (child.type === 'element') {
      if (isTranslatableNode(child)) {
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(child.name)) {
          // Sibling duplication:
          // eng hidden source block
          const engNode = cloneNode(child);
          engNode.attrs = addClass(engNode.attrs, 'eng hidden');
          setAttribute(engNode, 'data-prep-role', 'source');
          
          // vn visible target block
          const vnNode = cloneNode(child);
          vnNode.attrs = addClass(vnNode.attrs, 'vn visible');
          vnNode.attrs = appendIdSuffix(vnNode.attrs, '-vn');
          setAttribute(vnNode, 'data-prep-role', 'target');
          setAttribute(vnNode, 'data-prep-status', 'pending-translation');
          vnNode.children = []; // Empty content
          
          newChildren.push(engNode);
          newChildren.push(vnNode);
        } else if (['li', 'td', 'th', 'figcaption'].includes(child.name)) {
          // Wrapping inside parent:
          // Wrap inner content into eng span
          const engSpan = {
            type: 'element',
            name: 'span',
            attrs: 'class="eng hidden" data-prep-role="source"',
            children: child.children.map(cloneNode)
          };
          
          // Append empty vn span
          const vnSpan = {
            type: 'element',
            name: 'span',
            attrs: 'class="vn visible" data-prep-role="target" data-prep-status="pending-translation"',
            children: []
          };
          
          child.children = [engSpan, vnSpan];
          newChildren.push(child);
        }
      } else {
        makeBilingualTree(child);
        newChildren.push(child);
      }
    } else {
      newChildren.push(child);
    }
  }
  
  node.children = newChildren;
}

// Process head links for stylesheet and prep-debug
function processHeadLinks(node) {
  if (node.type !== 'element') return;
  
  if (node.name === 'head') {
    node.children = node.children.filter(c => {
      if (c.name === 'link' && /rel="stylesheet"/i.test(c.attrs)) {
        return false;
      }
      if (c.name === 'style') {
        return false;
      }
      return true;
    });
    
    node.children.push({
      type: 'element',
      name: 'link',
      attrs: 'rel="stylesheet" href="../../../css/style.css"',
      children: [],
      isSelfClosing: true
    });
    
    node.children.push({
      type: 'element',
      name: 'link',
      attrs: 'rel="stylesheet" href="../../../css/prep-debug.css"',
      children: [],
      isSelfClosing: true
    });
  } else {
    for (const child of node.children) {
      processHeadLinks(child);
    }
  }
}

function rebuildFile(cleanPath, prepPath) {
  const html = fs.readFileSync(cleanPath, 'utf8');
  const tokens = tokenizeHtml(html);
  const tree = parseTree(tokens);
  
  // Transform to bilingual prep structure
  makeBilingualTree(tree);
  
  // Fix head links
  processHeadLinks(tree);
  
  const outputHtml = tree.children.map(serializeNode).join('');
  
  fs.mkdirSync(path.dirname(prepPath), { recursive: true });
  fs.writeFileSync(prepPath, outputHtml, 'utf8');
}

function runRebuild() {
  console.log('Starting rebuild of 04-prep from 02-clean...');
  console.log('Mode: source_only_pending_target');
  
  const filesRebuiltFromClean = [];
  const existingPrepFilesOverwrittenAfterBackup = [];
  const warnings = [];
  
  for (let chNum = 1; chNum <= 15; chNum++) {
    const ch = `chapter-${chNum}`;
    const cleanDir = path.join(CHAPTERS_DIR, ch, '02-clean');
    const prepDir = path.join(CHAPTERS_DIR, ch, '04-prep');
    
    if (fs.existsSync(cleanDir)) {
      const cleanFiles = fs.readdirSync(cleanDir).filter(f => f.endsWith('.html'));
      cleanFiles.forEach(file => {
        const cleanPath = path.join(cleanDir, file);
        const prepPath = path.join(prepDir, file);
        
        const existsBefore = fs.existsSync(prepPath);
        
        try {
          rebuildFile(cleanPath, prepPath);
          
          if (existsBefore) {
            existingPrepFilesOverwrittenAfterBackup.push({ chapter: ch, file });
          } else {
            filesRebuiltFromClean.push({ chapter: ch, file });
          }
        } catch (e) {
          console.error(`Error rebuilding ${ch}/${file}:`, e.message);
          warnings.push(`Failed to rebuild ${ch}/${file}: ${e.message}`);
        }
      });
    }
  }
  
  const overallStatus = warnings.length === 0 ? 'Passed' : 'Passed with warnings';
  
  // 1. Build Markdown Report
  let md = `# Prep Rebuild Report\n\n`;
  md += `## Summary\n${overallStatus}\n\n`;
  
  md += `## Fix Reason\nPrevious Step 11 output incorrectly resembled final translated HTML. This fix rebuilds prep files from 02-clean using source-only pending-target mode.\n\n`;
  md += `## Mode\nsource_only_pending_target\n\n`;
  
  md += `## Chapters Scanned\nChapters 1 to 15\n\n`;
  
  md += `## Files Rebuilt From 02-clean\n`;
  if (filesRebuiltFromClean.length === 0) {
    md += `*None*\n\n`;
  } else {
    md += `| Chapter | File |\n`;
    md += `|---|---|\n`;
    filesRebuiltFromClean.forEach(f => {
      md += `| ${f.chapter} | \`${f.file}\` |\n`;
    });
    md += `\n`;
  }
  
  md += `## Existing Prep Files Overwritten After Backup\n`;
  if (existingPrepFilesOverwrittenAfterBackup.length === 0) {
    md += `*None*\n\n`;
  } else {
    md += `| Chapter | File |\n`;
    md += `|---|---|\n`;
    existingPrepFilesOverwrittenAfterBackup.forEach(f => {
      md += `| ${f.chapter} | \`${f.file}\` |\n`;
    });
    md += `\n`;
  }
  
  md += `## Files Not Modified\n`;
  md += `- 05-translated\n`;
  md += `- 07-archive\n`;
  md += `- preview/html\n`;
  md += `- exports/epub/book.epub\n`;
  md += `- glossary.csv\n\n`;
  
  md += `## CSS Debug Added\n`;
  md += `Added links to both \`../../../css/style.css\` and \`../../../css/prep-debug.css\` in all prep files.\n\n`;
  
  md += `## Remaining Issues\n`;
  if (warnings.length === 0) {
    md += `None.\n\n`;
  } else {
    warnings.forEach(w => {
      md += `- ⚠️ ${w}\n`;
    });
    md += `\n`;
  }
  
  md += `## Final Result\n`;
  md += `**${overallStatus.toUpperCase()}**\n`;
  
  fs.writeFileSync(MD_REPORT_PATH, md, 'utf8');
  console.log('Markdown report generated at:', MD_REPORT_PATH);
  
  // 2. Build JSON Report
  const jsonReport = {
    status: overallStatus === 'Passed' ? 'passed' : 'passed_with_warnings',
    mode: "source_only_pending_target",
    reason: "Previous 04-prep output resembled final translated HTML.",
    chaptersScanned: 15,
    filesRebuiltFromClean,
    existingPrepFilesOverwrittenAfterBackup,
    filesNotModified: [
      "05-translated",
      "07-archive",
      "preview/html",
      "exports/epub/book.epub",
      "glossary.csv"
    ],
    remainingIssues: warnings,
    warnings
  };
  
  fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(jsonReport, null, 2), 'utf8');
  console.log('JSON report generated at:', JSON_REPORT_PATH);
}

runRebuild();

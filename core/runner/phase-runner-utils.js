'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

// Recursive directory copy helper
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Backup 04-prep folder
function backupPrepFolder(bookSlug, chapterId, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const prepDir = path.join(bookRoot, 'chapters', chapterId, '04-prep');
  if (!fs.existsSync(prepDir)) {
    return null; // Nothing to backup
  }
  
  const backupDest = path.join(bookRoot, 'backups', 'phase-5-prep-runner', chapterId, timestamp);
  try {
    copyDirRecursive(prepDir, backupDest);
    return backupDest;
  } catch (err) {
    throw new Error(`Backup failed for ${chapterId}: ${err.message}`);
  }
}

// Ensure prep-debug.css is created
function ensurePrepDebugCss(bookSlug) {
  const bookRoot = getBookRoot(bookSlug);
  const cssDir = path.join(bookRoot, 'css');
  const cssPath = path.join(cssDir, 'prep-debug.css');
  
  if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir, { recursive: true });
  }
  
  if (!fs.existsSync(cssPath)) {
    const content = `.eng.hidden[data-prep-role="source"] {
  display: block !important;
  color: #555;
  background: #f6f6f6;
  border-left: 4px solid #999;
  padding: 8px 12px;
  margin: 8px 0 4px;
}

.vn.visible[data-prep-role="target"] {
  display: block !important;
  min-height: 24px;
  background: #fff8e1;
  border-left: 4px solid #f0b400;
  padding: 8px 12px;
  margin: 4px 0 12px;
}

.vn.visible[data-prep-status="pending-translation"]::before {
  content: "[PENDING VI TRANSLATION]";
  display: block;
  font-size: 12px;
  color: #9a6a00;
  font-weight: 600;
  margin-bottom: 4px;
}`;
    fs.writeFileSync(cssPath, content, 'utf8');
  }
}

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
          const engSpan = {
            type: 'element',
            name: 'span',
            attrs: 'class="eng hidden" data-prep-role="source"',
            children: child.children.map(cloneNode)
          };
          
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

function transformToPrep(html) {
  const tokens = tokenizeHtml(html);
  const tree = parseTree(tokens);
  makeBilingualTree(tree);
  processHeadLinks(tree);
  return tree.children.map(serializeNode).join('');
}

module.exports = {
  copyDirRecursive,
  backupPrepFolder,
  ensurePrepDebugCss,
  transformToPrep,
  tokenizeHtml,
  parseTree,
  serializeNode
};

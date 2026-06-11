/**
 * archive-runner-utils.js
 *
 * Helper utilities for archiving files, transforming bilingual HTML to vn-only format.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');
const {
  copyDirRecursive,
  tokenizeHtml,
  parseTree,
  serializeNode
} = require('./phase-runner-utils');

// Helper to extract classes from node attrs string
function getClasses(attrs) {
  if (!attrs) return [];
  const match = attrs.match(/class="([^"]*)"/i);
  if (!match) return [];
  return match[1].trim().split(/\s+/);
}

// Helper to remove specified classes from node attrs string
function removeClasses(attrs, list) {
  if (!attrs) return '';
  const match = attrs.match(/class="([^"]*)"/i);
  if (!match) return attrs;
  const current = match[1].trim().split(/\s+/);
  const remaining = current.filter(c => !list.includes(c));
  if (remaining.length === 0) {
    return attrs.replace(/\s*class="[^"]*"/i, '').trim();
  }
  return attrs.replace(/class="[^"]*"/i, `class="${remaining.join(' ')}"`).trim();
}

// Helper to remove attributes
function removeAttributes(attrs, list) {
  if (!attrs) return '';
  let result = attrs;
  for (const attr of list) {
    const regex = new RegExp(`\\s*\\b${attr}="[^"]*"`, 'gi');
    result = result.replace(regex, '');
  }
  return result.trim();
}

// Transform bilingual HTML to vn-only HTML template
function transformToVnOnly(html, cssHref) {
  const tokens = tokenizeHtml(html);
  const tree = parseTree(tokens);
  
  function processNode(node) {
    if (node.type !== 'element') return node;
    
    const classes = getClasses(node.attrs);
    
    // Discard English source blocks
    if (classes.includes('eng') || classes.includes('hidden')) {
      return null;
    }
    
    // Keep Vietnamese target blocks, strip bilingual classes & prep attributes
    if (classes.includes('vn') || classes.includes('visible')) {
      node.attrs = removeClasses(node.attrs, ['eng', 'hidden', 'vn', 'visible']);
      node.attrs = removeAttributes(node.attrs, ['data-prep-role', 'data-prep-status']);
    }
    
    // Update head stylesheets
    if (node.name === 'head') {
      node.children = node.children.filter(c => {
        if (c.name === 'link' && /rel="stylesheet"/i.test(c.attrs)) return false;
        if (c.name === 'style') return false;
        return true;
      });
      node.children.push({
        type: 'element',
        name: 'link',
        attrs: `rel="stylesheet" href="${cssHref}"`,
        children: [],
        isSelfClosing: true
      });
    } else {
      // Process children recursively
      const newChildren = [];
      for (const child of node.children) {
        const processed = processNode(child);
        if (processed) {
          newChildren.push(processed);
        }
      }
      node.children = newChildren;
    }
    
    return node;
  }
  
  const newChildren = [];
  for (const child of tree.children) {
    const processed = processNode(child);
    if (processed) {
      newChildren.push(processed);
    }
  }
  tree.children = newChildren;
  
  return tree.children.map(serializeNode).join('');
}

// Backup 07-archive folder
function backupArchiveFolder(bookSlug, chapterId, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const folderName = chapterId === '_book-level' ? '_book-level' : path.join('chapters', chapterId);
  const archiveDir = path.join(bookRoot, folderName, '07-archive');
  
  if (!fs.existsSync(archiveDir)) {
    return null;
  }
  
  const backupDest = path.join(bookRoot, 'backups', 'phase-6-archive-runner', chapterId, timestamp);
  try {
    copyDirRecursive(archiveDir, backupDest);
    return backupDest;
  } catch (err) {
    throw new Error(`Backup failed for ${chapterId}: ${err.message}`);
  }
}

// Backup preview folder
function backupPreviewFolder(bookSlug, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const previewDir = path.join(bookRoot, 'preview', 'html');
  
  if (!fs.existsSync(previewDir)) {
    return null;
  }
  
  const backupDest = path.join(bookRoot, 'backups', 'phase-6-preview-runner', timestamp);
  try {
    copyDirRecursive(previewDir, backupDest);
    return backupDest;
  } catch (err) {
    throw new Error(`Backup failed for preview: ${err.message}`);
  }
}

module.exports = {
  transformToVnOnly,
  backupArchiveFolder,
  backupPreviewFolder
};

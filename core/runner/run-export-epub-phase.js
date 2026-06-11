/**
 * run-export-epub-phase.js
 *
 * Core execution logic for the export_epub phase.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { getBookRoot, getEpubPath } = require('../paths/path-resolver');
const { scanBook } = require('../scanner/scan-book');
const { runQualityGate } = require('../gates/run-quality-gate');
const { generateWorkflowState } = require('../state/generate-workflow-state');
const { createPhaseRunResult } = require('./phase-run-result');
const {
  loadBookPages,
  extractPageTitle,
  ensureXhtml,
  getMediaType
} = require('./epub-runner-utils');

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

async function runExportEpubPhase(bookSlug, options = {}) {
  const startedAt = new Date().toISOString();
  const timestamp = getTimestamp();
  const bookRoot = getBookRoot(bookSlug);
  const epubPath = getEpubPath(bookSlug);
  
  const dryRun = !!options.dryRun;
  const force = !!options.force;
  const validateOnly = !!options.validateOnly;
  
  const filesCreated = [];
  const filesUpdated = [];
  const filesSkipped = [];
  const warnings = [];
  const errors = [];
  const inputs = [];
  const outputs = [];

  const epubExists = fs.existsSync(epubPath);
  const pages = loadBookPages(bookSlug);

  // 1. Gather all inputs and assets for report details
  const scan = scanBook(bookSlug);
  
  // Register inputs
  if (pages.length > 0) {
    pages.forEach(p => {
      // Find source path
      const parts = p.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const folder = parts[0];
        const file = parts[1];
        if (folder === '_book-level') {
          inputs.push(`_book-level/07-archive/vn-only/${file}`);
        } else {
          inputs.push(`chapters/${folder}/07-archive/vn-only/${file}`);
        }
      }
    });
  }
  
  const cssSrcPath = path.join(bookRoot, 'css', 'style.css');
  if (fs.existsSync(cssSrcPath)) {
    inputs.push('css/style.css');
  }
  
  // 2. Validate Only mode
  if (validateOnly) {
    if (!epubExists) {
      errors.push(`Cannot run validate-only: EPUB file does not exist at ${epubPath}`);
      return createPhaseRunResult({
        phase: 'export_epub',
        bookSlug,
        scope: 'book',
        status: 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        dryRun,
        force,
        validateOnly,
        errors
      });
    }

    let qualityGateResult = { id: 'epubValidity', status: 'unknown' };
    try {
      const qgRes = await runQualityGate(bookSlug, 'epubValidity', { allowWrite: true });
      qualityGateResult.status = qgRes.status;
      generateWorkflowState(bookSlug);
    } catch (err) {
      warnings.push(`Quality gate or state regeneration failed: ${err.message}`);
    }

    const finishedAt = new Date().toISOString();
    const runResult = createPhaseRunResult({
      phase: 'export_epub',
      bookSlug,
      scope: 'book',
      status: qualityGateResult.status === 'failed' ? 'failed' : 'passed',
      startedAt,
      finishedAt,
      dryRun,
      force,
      validateOnly,
      inputs,
      outputs: [path.relative(bookRoot, epubPath).replace(/\\/g, '/')],
      warnings,
      errors,
      qualityGate: qualityGateResult
    });

    writePhaseReports(bookSlug, runResult, timestamp);
    return runResult;
  }

  // 3. Dry-Run mode
  if (dryRun) {
    const finishedAt = new Date().toISOString();
    const runResult = createPhaseRunResult({
      phase: 'export_epub',
      bookSlug,
      scope: 'book',
      status: 'passed',
      startedAt,
      finishedAt,
      dryRun,
      force,
      validateOnly,
      inputs,
      outputs: [path.relative(bookRoot, epubPath).replace(/\\/g, '/')],
      warnings,
      errors,
      qualityGate: { id: 'epubValidity', status: 'unknown' }
    });
    return runResult;
  }

  // 4. Overwrite check without force
  if (epubExists && !force) {
    filesSkipped.push({
      file: path.relative(bookRoot, epubPath).replace(/\\/g, '/'),
      reason: 'epub_exists_no_force'
    });
    warnings.push("EPUB export file already exists. Use --force to rebuild.");
    
    // Automatically validate the existing EPUB
    let qualityGateResult = { id: 'epubValidity', status: 'unknown' };
    try {
      const qgRes = await runQualityGate(bookSlug, 'epubValidity', { allowWrite: true });
      qualityGateResult.status = qgRes.status;
      generateWorkflowState(bookSlug);
    } catch (err) {
      warnings.push(`Validation of existing EPUB failed: ${err.message}`);
    }

    const finishedAt = new Date().toISOString();
    const runResult = createPhaseRunResult({
      phase: 'export_epub',
      bookSlug,
      scope: 'book',
      status: 'passed_with_warnings',
      startedAt,
      finishedAt,
      dryRun,
      force,
      validateOnly,
      inputs,
      outputs: [path.relative(bookRoot, epubPath).replace(/\\/g, '/')],
      filesSkipped,
      warnings,
      errors,
      qualityGate: qualityGateResult
    });

    writePhaseReports(bookSlug, runResult, timestamp);
    return runResult;
  }

  // 5. Force mode: backup first
  if (epubExists && force) {
    try {
      const backupDir = path.join(bookRoot, 'backups', 'phase-7-epub-runner', timestamp);
      fs.mkdirSync(backupDir, { recursive: true });
      fs.copyFileSync(epubPath, path.join(backupDir, 'book.epub'));
      warnings.push(`Backup of existing EPUB created at: backups/phase-7-epub-runner/${timestamp}/book.epub`);
    } catch (err) {
      errors.push(`Backup of existing EPUB failed: ${err.message}. Rebuild aborted.`);
      return createPhaseRunResult({
        phase: 'export_epub',
        bookSlug,
        scope: 'book',
        status: 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        dryRun,
        force,
        validateOnly,
        errors
      });
    }
  }

  // 6. Build EPUB using JSZip
  const zip = new JSZip();

  // A. Add mimetype (MUST be first and STORE/uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // B. Add META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);

  // C. Add OEBPS subfolder
  const oebps = zip.folder('OEBPS');

  // D. Copy CSS stylesheet
  let cssContent = '';
  if (fs.existsSync(cssSrcPath)) {
    cssContent = fs.readFileSync(cssSrcPath, 'utf8');
  }
  oebps.file('css/style.css', cssContent);

  // E. Process pages
  const manifestItems = [];
  const spineItems = [];
  const navLinks = [];

  const addedAssets = new Set();

  // Copy global assets
  const globalAssetsDir = path.join(bookRoot, 'assets');
  if (fs.existsSync(globalAssetsDir)) {
    const globalAssetFiles = fs.readdirSync(globalAssetsDir);
    for (const assetFile of globalAssetFiles) {
      const srcAssetPath = path.join(globalAssetsDir, assetFile);
      if (!fs.statSync(srcAssetPath).isFile()) continue;

      // Determine where this global asset belongs based on its filename
      // e.g. img-14-1-1.webp belongs to chapters/assets/ (chapter 14)
      const chapMatch = assetFile.match(/^img-(\d+)-/);
      const destAssetPaths = [];
      if (chapMatch) {
        const chapNum = chapMatch[1];
        const folderName = `chapter-${chapNum}`;
        destAssetPaths.push(`chapters/assets/${assetFile}`);
        destAssetPaths.push(`chapters/${folderName}/assets/${assetFile}`);
      } else {
        destAssetPaths.push(`assets/${assetFile}`);
        destAssetPaths.push(`_book-level/assets/${assetFile}`);
      }

      destAssetPaths.forEach(destAssetPath => {
        if (!addedAssets.has(destAssetPath)) {
          const assetBuffer = fs.readFileSync(srcAssetPath);
          oebps.file(destAssetPath, assetBuffer);
          addedAssets.add(destAssetPath);

          const cleanName = path.basename(assetFile, path.extname(assetFile)).replace(/[^a-zA-Z0-9-]/g, '_');
          const pathId = destAssetPath.replace(/[\/\.-]/g, '_');
          const assetId = `asset-global-${cleanName}-${pathId}`;
          manifestItems.push({
            id: assetId,
            href: destAssetPath,
            mediaType: getMediaType(assetFile)
          });
        }
      });
    }
  }

  for (const pageRef of pages) {
    const parts = pageRef.split('/').filter(Boolean);
    if (parts.length < 2) continue;

    const folder = parts[0]; // 'chapter-1' or '_book-level'
    const file = parts[1];   // '1-introduction.html' or 'preface.html'
    const isBookLevel = folder === '_book-level';

    const sourceFileDir = isBookLevel
      ? path.join(bookRoot, '_book-level', '07-archive', 'vn-only')
      : path.join(bookRoot, 'chapters', folder, '07-archive', 'vn-only');
    
    const sourceFilePath = path.join(sourceFileDir, file);

    if (!fs.existsSync(sourceFilePath)) {
      warnings.push(`Source page file missing: ${sourceFilePath}`);
      continue;
    }

    const htmlContent = fs.readFileSync(sourceFilePath, 'utf8');
    const xhtmlTitle = extractPageTitle(htmlContent, file);
    
    // Normalize CSS link refs & format XHTML
    // In EPUB, chapters are under 'OEBPS/chapters/{chapterId}/' -> CSS at '../../css/style.css'
    // Book level pages are under 'OEBPS/_book-level/' -> CSS at '../css/style.css'
    let xhtmlContent = htmlContent.replace(/(<link[^>]+href=")([^"]+)("[^>]*>)/gi, (match, prefix, href, suffix) => {
      if (/rel="stylesheet"/i.test(match) || href.endsWith('.css')) {
        return `${prefix}${isBookLevel ? '../css/style.css' : '../../css/style.css'}${suffix}`;
      }
      return match;
    });

    xhtmlContent = ensureXhtml(xhtmlContent);

    // Save page in Zip
    const xhtmlFilename = file.replace(/\.html$/, '.xhtml');
    const pageZipPath = isBookLevel
      ? `_book-level/${xhtmlFilename}`
      : `chapters/${folder}/${xhtmlFilename}`;
    
    oebps.file(pageZipPath, xhtmlContent);

    // Manifest and spine tracking
    const itemId = isBookLevel ? `book-level-${path.basename(file, '.html')}` : `${folder}-${path.basename(file, '.html')}`;
    manifestItems.push({
      id: itemId,
      href: pageZipPath,
      mediaType: 'application/xhtml+xml'
    });
    spineItems.push(itemId);

    // Navigation TOC link
    navLinks.push({
      title: xhtmlTitle,
      href: pageZipPath
    });

    // Copy assets for this page's scope
    // Fallback order: 07-archive/assets -> assets
    let assetsSrcDir = isBookLevel
      ? path.join(bookRoot, '_book-level', '07-archive', 'assets')
      : path.join(bookRoot, 'chapters', folder, '07-archive', 'assets');
      
    if (!fs.existsSync(assetsSrcDir)) {
      assetsSrcDir = isBookLevel
        ? path.join(bookRoot, '_book-level', 'assets')
        : path.join(bookRoot, 'chapters', folder, 'assets');
    }

    if (fs.existsSync(assetsSrcDir)) {
      const assetFiles = fs.readdirSync(assetsSrcDir);
      for (const assetFile of assetFiles) {
        const srcAssetPath = path.join(assetsSrcDir, assetFile);
        const destAssetPath1 = isBookLevel
          ? `assets/${assetFile}`
          : `chapters/assets/${assetFile}`;

        const destAssetPath2 = isBookLevel
          ? `_book-level/assets/${assetFile}`
          : `chapters/${folder}/assets/${assetFile}`;

        [destAssetPath1, destAssetPath2].forEach(destAssetPath => {
          if (!addedAssets.has(destAssetPath) && fs.existsSync(srcAssetPath)) {
            const assetBuffer = fs.readFileSync(srcAssetPath);
            oebps.file(destAssetPath, assetBuffer);
            addedAssets.add(destAssetPath);

            // Add to OPF manifest
            const cleanName = path.basename(assetFile, path.extname(assetFile)).replace(/[^a-zA-Z0-9-]/g, '_');
            const pathId = destAssetPath.replace(/[\/\.-]/g, '_');
            const assetId = `asset-${isBookLevel ? 'book' : folder}-${cleanName}-${pathId}`;
            manifestItems.push({
              id: assetId,
              href: destAssetPath,
              mediaType: getMediaType(assetFile)
            });
          }
        });
      }
    }
  }

  // F. Create Nav TOC (nav.xhtml)
  let navLinksHtml = '';
  navLinks.forEach(link => {
    navLinksHtml += `        <li><a href="${link.href}">${link.title}</a></li>\n`;
  });

  const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head>
    <title>Mục lục</title>
    <meta charset="utf-8" />
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>Mục lục</h1>
      <ol>
${navLinksHtml}      </ol>
    </nav>
  </body>
</html>`;
  oebps.file('nav.xhtml', navContent);

  // G. Create content.opf
  let manifestXml = '';
  manifestItems.forEach(item => {
    manifestXml += `    <item id="${item.id}" href="${item.href}" media-type="${item.mediaType}"/>\n`;
  });

  let spineXml = '';
  spineItems.forEach(idref => {
    spineXml += `    <itemref idref="${idref}"/>\n`;
  });

  const bookTitle = scan.bookSlug.charAt(0).toUpperCase() + scan.bookSlug.slice(1);
  const modifiedDate = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  
  const opfContent = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:8b3fa720-d4cf-4bf1-bf1a-${timestamp}</dc:identifier>
    <dc:title>${bookTitle}</dc:title>
    <dc:language>vi</dc:language>
    <dc:creator>OpenStax</dc:creator>
    <meta property="dcterms:modified">${modifiedDate}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="css/style.css" media-type="text/css"/>
${manifestXml}  </manifest>
  <spine>
${spineXml}  </spine>
</package>`;
  oebps.file('content.opf', opfContent);

  // H. Generate buffer and write file
  try {
    const epubDir = path.dirname(epubPath);
    if (!fs.existsSync(epubDir)) {
      fs.mkdirSync(epubDir, { recursive: true });
    }

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
    fs.writeFileSync(epubPath, buffer);
    
    if (epubExists) {
      filesUpdated.push({ file: path.relative(bookRoot, epubPath).replace(/\\/g, '/') });
    } else {
      filesCreated.push({ file: path.relative(bookRoot, epubPath).replace(/\\/g, '/') });
    }
  } catch (err) {
    errors.push(`EPUB zip creation failed: ${err.message}`);
    return createPhaseRunResult({
      phase: 'export_epub',
      bookSlug,
      scope: 'book',
      status: 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      dryRun,
      force,
      validateOnly,
      errors
    });
  }

  // 7. Validate and regenerate state
  let qualityGateResult = { id: 'epubValidity', status: 'unknown' };
  try {
    const qgRes = await runQualityGate(bookSlug, 'epubValidity', { allowWrite: true });
    qualityGateResult.status = qgRes.status;
    generateWorkflowState(bookSlug);
  } catch (err) {
    warnings.push(`Validation of newly compiled EPUB failed: ${err.message}`);
  }

  const finishedAt = new Date().toISOString();
  
  let status = 'passed';
  if (errors.length > 0 || qualityGateResult.status === 'failed') {
    status = 'failed';
  } else if (warnings.length > 0 || qualityGateResult.status === 'passed_with_warnings') {
    status = 'passed_with_warnings';
  }

  const runResult = createPhaseRunResult({
    phase: 'export_epub',
    bookSlug,
    scope: 'book',
    status,
    startedAt,
    finishedAt,
    dryRun,
    force,
    validateOnly,
    inputs,
    outputs: [path.relative(bookRoot, epubPath).replace(/\\/g, '/')],
    filesCreated,
    filesUpdated,
    filesSkipped,
    warnings,
    errors,
    qualityGate: qualityGateResult
  });

  writePhaseReports(bookSlug, runResult, timestamp);
  return runResult;
}

function writePhaseReports(bookSlug, result, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports', 'phase-runs');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const jsonPath = path.join(reportsDir, `export-epub-${timestamp}.json`);
  const mdPath = path.join(reportsDir, `export-epub-${timestamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  let md = `# Phase Run Report: export_epub\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|---|---||\n`;
  md += `| **Book** | ${result.bookSlug} |\n`;
  md += `| **Status** | **${result.status.toUpperCase()}** |\n`;
  md += `| **Dry Run** | ${result.dryRun ? '✅ Yes' : '❌ No'} |\n`;
  md += `| **Force Overwrite** | ${result.force ? '✅ Yes' : '❌ No'} |\n`;
  md += `| **Validate Only** | ${result.validateOnly ? '✅ Yes' : '❌ No'} |\n`;
  md += `| **Started At** | ${result.startedAt} |\n`;
  md += `| **Finished At** | ${result.finishedAt} |\n`;
  md += `\n---\n\n`;

  md += `## Execution Statistics\n\n`;
  md += `- **Files Created**: ${result.filesCreated.length}\n`;
  md += `- **Files Updated**: ${result.filesUpdated.length}\n`;
  md += `- **Files Skipped**: ${result.filesSkipped.length}\n`;
  md += `- **Warnings**: ${result.warnings.length}\n`;
  md += `- **Errors**: ${result.errors.length}\n\n`;

  if (result.filesCreated.length > 0) {
    md += `### Files Created\n\n`;
    result.filesCreated.forEach(f => {
      md += `- \`${f.file}\`\n`;
    });
    md += `\n`;
  }

  if (result.filesUpdated.length > 0) {
    md += `### Files Overwritten (Updated)\n\n`;
    result.filesUpdated.forEach(f => {
      md += `- \`${f.file}\`\n`;
    });
    md += `\n`;
  }

  if (result.filesSkipped.length > 0) {
    md += `### Files Skipped\n\n`;
    result.filesSkipped.forEach(f => {
      md += `- \`${f.file}\` (Reason: ${f.reason})\n`;
    });
    md += `\n`;
  }

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
  md += `- **Gate ID**: \`${result.qualityGate?.id || 'epubValidity'}\`\n`;
  md += `- **Status**: **${(result.qualityGate?.status || 'unknown').toUpperCase()}**\n`;

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  runExportEpubPhase
};

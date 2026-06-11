/**
 * epub-validity-gate.js
 *
 * Internal quality gate runner for 'epubValidity'.
 * Parses and validates the compiled EPUB package using JSZip.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { getBookRoot, getEpubPath } = require('../paths/path-resolver');

async function run(bookSlug, options = {}) {
  const epubPath = getEpubPath(bookSlug);
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports');
  
  const reportJsonPath = path.join(reportsDir, 'epub-validity-report.json');
  const reportMdPath = path.join(reportsDir, 'epub-validity-report.md');
  
  const result = {
    gateId: 'epubValidity',
    status: 'failed',
    success: false,
    epubPath: path.relative(bookRoot, epubPath).replace(/\\/g, '/'),
    fileSizeBytes: 0,
    checks: {
      zipReadable: 'failed',
      mimetype: 'failed',
      containerXml: 'failed',
      opf: 'failed',
      nav: 'failed',
      xhtmlChapters: 'failed',
      cssReferences: 'failed',
      assetReferences: 'failed',
      localPathLeaks: 'failed'
    },
    warnings: [],
    errors: []
  };

  try {
    if (!fs.existsSync(epubPath)) {
      result.errors.push(`EPUB file not found at: ${epubPath}`);
      writeReports(result, reportJsonPath, reportMdPath);
      return result;
    }

    const stat = fs.statSync(epubPath);
    result.fileSizeBytes = stat.size;

    // 1. ZIP readable check
    let zip;
    try {
      const buffer = fs.readFileSync(epubPath);
      zip = await JSZip.loadAsync(buffer);
      result.checks.zipReadable = 'passed';
    } catch (e) {
      result.errors.push(`Failed to parse file as ZIP: ${e.message}`);
      writeReports(result, reportJsonPath, reportMdPath);
      return result;
    }

    // 2. mimetype check
    const mimetypeFile = zip.file('mimetype');
    if (!mimetypeFile) {
      result.errors.push("Missing 'mimetype' file.");
    } else {
      const mimeContent = (await mimetypeFile.async('text')).trim();
      if (mimeContent !== 'application/epub+zip') {
        result.errors.push(`Invalid mimetype content: "${mimeContent}". Expected "application/epub+zip".`);
      } else {
        result.checks.mimetype = 'passed';
      }
    }

    // 3. container.xml check
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) {
      result.errors.push("Missing 'META-INF/container.xml' file.");
    } else {
      const containerContent = await containerFile.async('text');
      if (!containerContent.includes('full-path=') || !containerContent.includes('media-type=')) {
        result.errors.push("Invalid META-INF/container.xml format.");
      } else {
        result.checks.containerXml = 'passed';
      }
    }

    // 4. OPF file check
    let opfPath = null;
    if (result.checks.containerXml === 'passed') {
      const containerContent = await containerFile.async('text');
      const opfMatch = containerContent.match(/full-path="([^"]+)"/);
      if (opfMatch) {
        opfPath = opfMatch[1];
      }
    }
    
    if (!opfPath) {
      // Fallback
      const opfFiles = Object.keys(zip.files).filter(name => name.endsWith('.opf'));
      if (opfFiles.length > 0) {
        opfPath = opfFiles[0];
      }
    }

    let opfContent = null;
    let manifestItems = [];
    let spineItems = [];

    if (!opfPath || !zip.file(opfPath)) {
      result.errors.push("Missing OPF content package file.");
    } else {
      opfContent = await zip.file(opfPath).async('text');
      result.checks.opf = 'passed';
      
      // Parse manifest items
      const manifestRegex = /<item\s+[^>]*id="([^"]+)"\s+href="([^"]+)"\s+media-type="([^"]+)"[^>]*\/?>/g;
      let match;
      while ((match = manifestRegex.exec(opfContent)) !== null) {
        manifestItems.push({
          id: match[1],
          href: match[2],
          mediaType: match[3]
        });
      }
      
      // Parse spine items
      const spineRegex = /<itemref\s+[^>]*idref="([^"]+)"[^>]*\/?>/g;
      while ((match = spineRegex.exec(opfContent)) !== null) {
        spineItems.push(match[1]);
      }
    }

    // 5. NAV check
    let navHref = null;
    if (opfContent) {
      const navMatch = opfContent.match(/<item\s+[^>]*href="([^"]+)"\s+[^>]*properties="nav"[^>]*\/?>/) ||
                       opfContent.match(/<item\s+[^>]*properties="nav"\s+href="([^"]+)"[^>]*\/?>/);
      if (navMatch) {
        navHref = navMatch[1];
      }
    }
    if (!navHref) {
      const navFiles = Object.keys(zip.files).filter(name => name.includes('nav.xhtml') || name.includes('toc.xhtml'));
      if (navFiles.length > 0) {
        navHref = navFiles[0];
      }
    }

    if (navHref) {
      const opfDir = path.dirname(opfPath);
      const navPathInZip = path.posix.join(opfDir, navHref);
      if (!zip.file(navPathInZip)) {
        result.errors.push(`Navigation file referenced in OPF not found: ${navPathInZip}`);
      } else {
        result.checks.nav = 'passed';
      }
    } else {
      result.errors.push("Missing Navigation / TOC file.");
    }

    // 6. XHTML chapters check
    const xhtmlFiles = Object.keys(zip.files).filter(name => name.endsWith('.xhtml') || name.endsWith('.html'));
    const chapterPages = xhtmlFiles.filter(name => {
      const lower = name.toLowerCase();
      return !lower.includes('nav.xhtml') && !lower.includes('toc.xhtml') && !lower.includes('cover.xhtml');
    });
    
    if (chapterPages.length === 0) {
      result.errors.push("No XHTML chapters or book-level files found in EPUB.");
    } else {
      result.checks.xhtmlChapters = 'passed';
    }

    // 7. Local Path Leaks & CSS/Asset checks
    let pathLeakFound = false;
    let brokenCss = false;
    let brokenAsset = false;
    
    const localPathPatterns = [
      /file:\/\//i,
      /[a-z]:\\users/i,
      /\/users\//i,
      /\\entrepreneurship/i
    ];

    // Check all files for local path leaks
    for (const name in zip.files) {
      const file = zip.files[name];
      if (file.dir) continue;
      
      if (name.endsWith('.xhtml') || name.endsWith('.html') || name.endsWith('.opf') || name.endsWith('.xml') || name.endsWith('.css')) {
        const text = await file.async('text');
        
        // Local path check
        for (const pattern of localPathPatterns) {
          if (pattern.test(text)) {
            result.errors.push(`Absolute local path leak found in ${name}`);
            pathLeakFound = true;
            break;
          }
        }
        
        // CSS/Asset checks in XHTML files
        if (name.endsWith('.xhtml') || name.endsWith('.html')) {
          const fileDir = path.dirname(name);
          
          // CSS refs check
          const cssRegex = /<link[^>]+href="([^"]+)"/gi;
          let cssMatch;
          while ((cssMatch = cssRegex.exec(text)) !== null) {
            const cssHref = cssMatch[1];
            if (!cssHref.startsWith('http') && !cssHref.startsWith('data:')) {
              const resolvedCssPath = path.posix.join(fileDir, cssHref);
              if (!zip.file(resolvedCssPath)) {
                result.warnings.push(`Broken CSS reference in ${name}: ${cssHref}`);
                brokenCss = true;
              }
            }
          }

          // Image refs check
          const imgRegex = /<img[^>]+src="([^"]+)"/gi;
          let imgMatch;
          while ((imgMatch = imgRegex.exec(text)) !== null) {
            const imgHref = imgMatch[1];
            if (!imgHref.startsWith('http') && !imgHref.startsWith('data:')) {
              const resolvedImgPath = path.posix.join(fileDir, imgHref);
              if (!zip.file(resolvedImgPath)) {
                result.warnings.push(`Broken Image reference in ${name}: ${imgHref}`);
                brokenAsset = true;
              }
            }
          }
        }
      }
    }

    if (!pathLeakFound) result.checks.localPathLeaks = 'passed';
    if (!brokenCss) result.checks.cssReferences = 'passed';
    
    if (brokenAsset) {
      result.checks.assetReferences = 'passed_with_warnings';
    } else {
      result.checks.assetReferences = 'passed';
    }

    // Determine overall status
    const criticalChecks = [
      result.checks.zipReadable,
      result.checks.mimetype,
      result.checks.containerXml,
      result.checks.opf,
      result.checks.nav,
      result.checks.xhtmlChapters,
      result.checks.localPathLeaks
    ];
    
    if (criticalChecks.includes('failed')) {
      result.status = 'failed';
      result.success = false;
    } else if (result.warnings.length > 0 || result.checks.assetReferences === 'passed_with_warnings') {
      result.status = 'passed_with_warnings';
      result.success = true;
    } else {
      result.status = 'passed';
      result.success = true;
    }

  } catch (err) {
    result.errors.push(`Validation exception: ${err.message}`);
    result.status = 'failed';
    result.success = false;
  }

  writeReports(result, reportJsonPath, reportMdPath);
  return result;
}

function writeReports(result, jsonPath, mdPath) {
  const dir = path.dirname(jsonPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  let md = `# EPUB Validity Report\n\n`;
  md += `## Summary\n`;
  md += `**${result.status.toUpperCase()}**\n\n`;
  md += `## EPUB Path\n`;
  md += `\`${result.epubPath}\`\n\n`;
  md += `## File Size\n`;
  md += `${(result.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB (${result.fileSizeBytes} bytes)\n\n`;
  
  md += `## Structure Checks\n\n`;
  md += `| Check | Status | Notes |\n`;
  md += `|---|---|---|\n`;
  md += `| ZIP readable | ${result.checks.zipReadable === 'passed' ? '✅ Passed' : '❌ Failed'} | |\n`;
  md += `| mimetype | ${result.checks.mimetype === 'passed' ? '✅ Passed' : '❌ Failed'} | |\n`;
  md += `| container.xml | ${result.checks.containerXml === 'passed' ? '✅ Passed' : '❌ Failed'} | |\n`;
  md += `| OPF | ${result.checks.opf === 'passed' ? '✅ Passed' : '❌ Failed'} | |\n`;
  md += `| NAV/TOC | ${result.checks.nav === 'passed' ? '✅ Passed' : '❌ Failed'} | |\n`;
  md += `| XHTML chapters | ${result.checks.xhtmlChapters === 'passed' ? '✅ Passed' : '❌ Failed'} | |\n`;
  md += `| CSS references | ${result.checks.cssReferences === 'passed' ? '✅ Passed' : '❌ Failed'} | |\n`;
  md += `| Asset references | ${result.checks.assetReferences === 'passed' ? '✅ Passed' : '⚠️ Passed with warnings'} | |\n`;
  md += `| Local path leaks | ${result.checks.localPathLeaks === 'passed' ? '✅ Passed' : '❌ Failed'} | |\n\n`;

  md += `## Warnings\n\n`;
  if (result.warnings.length > 0) {
    result.warnings.forEach(w => {
      md += `- ⚠️ ${w}\n`;
    });
  } else {
    md += `None\n`;
  }
  md += `\n`;

  md += `## Errors\n\n`;
  if (result.errors.length > 0) {
    result.errors.forEach(e => {
      md += `- ❌ ${e}\n`;
    });
  } else {
    md += `None\n`;
  }
  md += `\n`;

  md += `## Final Result\n`;
  if (result.status === 'passed') {
    md += `**SUCCESS**: EPUB package is fully compliant and valid.\n`;
  } else if (result.status === 'passed_with_warnings') {
    md += `**WARNING**: EPUB is structurally valid but has minor non-blocking issues.\n`;
  } else {
    md += `**FAILURE**: EPUB package validation failed.\n`;
  }

  fs.writeFileSync(mdPath, md, 'utf8');
}

module.exports = {
  run
};

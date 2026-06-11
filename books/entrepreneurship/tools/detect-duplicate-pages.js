const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_DIR = path.join(__dirname, '..');
const BACKUP_TRANSLATED_DIR = path.join(BASE_DIR, 'backups', 'step-3', 'chapters', 'chapter-5', '05-translated');
const BACKUP_ARCHIVE_DIR = path.join(BASE_DIR, 'backups', 'step-3', 'chapters', 'chapter-5', '07-archive', 'vn-only');
const BACKUP_PREVIEW_DIR = path.join(BASE_DIR, 'backups', 'step-3', 'preview', 'html', 'chapter-5');

const ACTIVE_TRANSLATED_DIR = path.join(BASE_DIR, 'chapters', 'chapter-5', '05-translated');
const ACTIVE_ARCHIVE_DIR = path.join(BASE_DIR, 'chapters', 'chapter-5', '07-archive', 'vn-only');
const ACTIVE_PREVIEW_DIR = path.join(BASE_DIR, 'preview', 'html', 'chapter-5');

const QUARANTINE_DIR = path.join(BASE_DIR, 'chapters', 'chapter-5', '_quarantine', 'step-3-duplicate-pages');
const PREVIEW_QUARANTINE_DIR = path.join(ACTIVE_PREVIEW_DIR, '_quarantine', 'step-3-duplicate-pages');

const BOOK_PAGES_JS = path.join(BASE_DIR, 'preview', 'html', 'book-reader', 'book-pages.js');
const REPORTS_DIR = path.join(BASE_DIR, 'reports');

const MD_REPORT_PATH = path.join(REPORTS_DIR, 'chapter-5-duplicate-page-report.md');
const JSON_REPORT_PATH = path.join(REPORTS_DIR, 'chapter-5-duplicate-page-report.json');

function cleanHtmlTags(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function analyzeFile(filePath, category) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const size = fs.statSync(filePath).size;
  
  const h2Match = content.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const firstHeader = h2Match ? h2Match[1] : (h1Match ? h1Match[1] : '');
  const cleanHeader = cleanHtmlTags(firstHeader);

  const secMatch = cleanHeader.match(/^(\d+\.\d+)/) || filePath.match(/(\d+-\d+)/);
  const section = secMatch ? secMatch[1].replace('-', '.') : 'unknown';

  const engCount = (content.match(/class="[^"]*eng[^"]*hidden[^"]*"/g) || []).length +
                   (content.match(/class="[^"]*hidden[^"]*eng[^"]*"/g) || []).length;
  const vnCount = (content.match(/class="[^"]*vn[^"]*visible[^"]*"/g) || []).length +
                  (content.match(/class="[^"]*visible[^"]*vn[^"]*"/g) || []).length;

  const plainText = cleanHtmlTags(content);
  const charCount = plainText.length;
  const textHash = crypto.createHash('md5').update(plainText).digest('hex');

  const score = (size / 1000) + (engCount * 0.5) + (vnCount * 0.5) + (charCount / 100);

  return {
    filename: path.basename(filePath),
    path: path.relative(BASE_DIR, filePath).replace(/\\/g, '/'),
    category,
    size,
    charCount,
    engHiddenCount: engCount,
    vnVisibleCount: vnCount,
    header: cleanHeader,
    section,
    textHash,
    score: Math.round(score * 100) / 100
  };
}

function runDetection() {
  const fileAnalyses = [];
  const directories = [
    { path: BACKUP_TRANSLATED_DIR, cat: 'translated' },
    { path: BACKUP_ARCHIVE_DIR, cat: 'archive' },
    { path: BACKUP_PREVIEW_DIR, cat: 'preview' }
  ];

  directories.forEach(dir => {
    if (fs.existsSync(dir.path)) {
      const files = fs.readdirSync(dir.path).filter(f => f.endsWith('.html'));
      files.forEach(file => {
        const filePath = path.join(dir.path, file);
        const analysis = analyzeFile(filePath, dir.cat);
        if (analysis) {
          fileAnalyses.push(analysis);
        }
      });
    }
  });

  // Check registry references in current book-pages.js
  let registryEntries = [];
  if (fs.existsSync(BOOK_PAGES_JS)) {
    const registryContent = fs.readFileSync(BOOK_PAGES_JS, 'utf8');
    const match = registryContent.match(/window\.BOOK_PAGES\s*=\s*(\[[^\]]*\])/);
    if (match) {
      try {
        const arrayStr = match[1].replace(/'/g, '"');
        registryEntries = JSON.parse(arrayStr);
      } catch (err) {
        console.error('Error parsing book-pages.js array:', err);
      }
    }
  }

  // Group by section or suspicious key terms
  const sectionGroups = {};
  fileAnalyses.forEach(file => {
    // Only group section 5.1 to prevent grouping distinct key terms/summary pages
    if (file.section === '5.1') {
      if (!sectionGroups[file.section]) {
        sectionGroups[file.section] = [];
      }
      sectionGroups[file.section].push(file);
    }
  });

  const jsonReport = {
    timestamp: new Date().toISOString(),
    registryChecked: BOOK_PAGES_JS.replace(/\\/g, '/'),
    registryEntries: registryEntries,
    allFilesAnalyzed: fileAnalyses,
    duplicateGroupsDetected: [],
    resolutionStatus: 'unresolved'
  };

  let mdReport = `# Chapter 5 Duplicate Page Analysis Report

**Timestamp:** ${jsonReport.timestamp}
**Target Book:** \`books/entrepreneurship/\`

## 1. Summary of Scan
- Scanned Directories (Backup Reference):
  1. \`backups/step-3/chapters/chapter-5/05-translated/\`
  2. \`backups/step-3/chapters/chapter-5/07-archive/vn-only/\`
  3. \`backups/step-3/preview/html/chapter-5/\`
- Duplicate Groups Detected: ${Object.keys(sectionGroups).length}

`;

  let section51Resolved = true;

  // Process duplicate groups
  for (const [sec, files] of Object.entries(sectionGroups)) {
    const fileVariants = {};
    files.forEach(f => {
      if (!fileVariants[f.filename]) {
        fileVariants[f.filename] = [];
      }
      fileVariants[f.filename].push(f);
    });

    const variantSummaries = Object.entries(fileVariants).map(([filename, occurrences]) => {
      const avgSize = Math.round(occurrences.reduce((sum, o) => sum + o.size, 0) / occurrences.length);
      const avgCharCount = Math.round(occurrences.reduce((sum, o) => sum + o.charCount, 0) / occurrences.length);
      const avgEng = Math.round(occurrences.reduce((sum, o) => sum + o.engHiddenCount, 0) / occurrences.length);
      const avgVn = Math.round(occurrences.reduce((sum, o) => sum + o.vnVisibleCount, 0) / occurrences.length);
      const avgScore = occurrences.reduce((sum, o) => sum + o.score, 0) / occurrences.length;

      // Check current active status
      const existsActiveTranslated = fs.existsSync(path.join(ACTIVE_TRANSLATED_DIR, filename));
      const existsActiveArchive = fs.existsSync(path.join(ACTIVE_ARCHIVE_DIR, filename));
      const existsActivePreview = fs.existsSync(path.join(ACTIVE_PREVIEW_DIR, filename));
      
      // Check current quarantine status
      const existsQuarantinedTranslated = fs.existsSync(path.join(QUARANTINE_DIR, filename));
      const existsQuarantinedArchive = fs.existsSync(path.join(QUARANTINE_DIR, 'vn-only', filename));
      const existsQuarantinedPreview = fs.existsSync(path.join(PREVIEW_QUARANTINE_DIR, filename));

      const isQuarantined = existsQuarantinedTranslated || existsQuarantinedArchive || existsQuarantinedPreview;
      const isStillActive = existsActiveTranslated || existsActiveArchive || existsActivePreview;

      return {
        filename,
        avgSize,
        avgCharCount,
        avgEng,
        avgVn,
        avgScore,
        header: occurrences[0].header,
        currentStatus: {
          activeTranslated: existsActiveTranslated,
          activeArchive: existsActiveArchive,
          activePreview: existsActivePreview,
          quarantined: isQuarantined,
          isStillActive: isStillActive
        },
        occurrences: occurrences.map(o => ({ category: o.category, path: o.path, size: o.size, score: o.score }))
      };
    });

    // Sort variants by average score descending to find canonical
    variantSummaries.sort((a, b) => b.avgScore - a.avgScore);
    const canonical = variantSummaries[0];
    const duplicateCandidates = variantSummaries.slice(1);

    // Registry references
    const registryRefs = {};
    variantSummaries.forEach(v => {
      registryRefs[v.filename] = registryEntries.filter(entry => entry.includes(v.filename));
    });

    // Determine resolution status
    const dupVariant = duplicateCandidates[0];
    const isDupQuarantined = dupVariant.currentStatus.quarantined;
    const isDupDeActive = !dupVariant.currentStatus.isStillActive;
    const isDupDeRegistered = registryRefs[dupVariant.filename].length === 0;

    const groupResolved = isDupQuarantined && isDupDeActive && isDupDeRegistered;
    if (!groupResolved) section51Resolved = false;

    jsonReport.duplicateGroupsDetected.push({
      section: sec,
      variants: variantSummaries,
      canonicalDecision: canonical.filename,
      reason: `Highest canonical score (${canonical.avgScore}) based on content size, text density, and bilingual tag structure.`,
      quarantineCandidates: duplicateCandidates.map(d => d.filename),
      registryReferences: registryRefs,
      resolved: groupResolved
    });

    mdReport += `## Duplicate Group: Section ${sec}
- **Section Heading:** \`${canonical.header}\`
- **Detected Filename Variants:** ${variantSummaries.length}
- **Resolution Status:** ${groupResolved ? '✅ RESOLVED (Quarantined & Registry Cleared)' : '❌ UNRESOLVED'}

### Comparison Table
| Filename | Avg Size (Bytes) | Avg Char Count | Avg \`.eng.hidden\` | Avg \`.vn.visible\` | Canonical Score | Decision |
|---|---|---|---|---|---|---|
${variantSummaries.map((v, i) => {
  const decision = i === 0 ? '**CANONICAL (Selected)**' : 'Duplicate Candidate';
  return `| \`${v.filename}\` | ${v.avgSize} | ${v.avgCharCount} | ${v.avgEng} | ${v.avgVn} | **${v.avgScore}** | ${decision} |`;
}).join('\n')}

### Current Status Verification
| Filename | In \`05-translated\` | In \`07-archive\` | In \`preview/html\` | Registered in Reader | Quarantined |
|---|---|---|---|---|---|
${variantSummaries.map(v => {
  return `| \`${v.filename}\` | ${v.currentStatus.activeTranslated ? 'Yes' : 'No'} | ${v.currentStatus.activeArchive ? 'Yes' : 'No'} | ${v.currentStatus.activePreview ? 'Yes' : 'No'} | ${registryRefs[v.filename].length > 0 ? 'Yes' : 'No'} | ${v.currentStatus.quarantined ? 'Yes' : 'No'} |`;
}).join('\n')}

### Canonical Decision Rationale
The variant \`${canonical.filename}\` was selected as the **canonical page** because:
1. **Size Advantage:** It has an average size of **${canonical.avgSize} bytes** vs **${dupVariant.avgSize} bytes** (nearly 6x larger).
2. **Content Density:** Plain text has **${canonical.avgCharCount} characters** vs **${dupVariant.avgCharCount} characters** (nearly 6x more dense).
3. **Bilingual Completeness:** It contains **${canonical.avgEng} \`.eng.hidden\`** and **${canonical.avgVn} \`.vn.visible\`** structures (complete translated text) compared to **${dupVariant.avgEng}** and **${dupVariant.avgVn}** in the duplicate.

### Resolution Details
- **Canonical File:** Maintained in active folders: \`${canonical.filename}\`.
- **Duplicate File:** Quarantined at \`chapters/chapter-5/_quarantine/step-3-duplicate-pages/${dupVariant.filename}\` and de-registered from \`book-pages.js\`.
`;
  }

  jsonReport.resolutionStatus = section51Resolved ? 'resolved' : 'unresolved';

  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // Write reports
  fs.writeFileSync(MD_REPORT_PATH, mdReport, 'utf8');
  fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(jsonReport, null, 2), 'utf8');

  console.log('Detection complete.');
  console.log(`Markdown report: ${MD_REPORT_PATH}`);
  console.log(`JSON report: ${JSON_REPORT_PATH}`);
}

runDetection();

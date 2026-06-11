'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot, getChapterRoot } = require('../paths/path-resolver');
const { listChapters } = require('../scanner/scan-book');
const { backupGlossary } = require('./glossary-version-manager');

function backupFile(filePath, timestamp) {
  if (!fs.existsSync(filePath)) return;
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}`);
  fs.copyFileSync(filePath, backupPath);
}

function applyGlossaryToHTMLContent(html, termChange) {
  // Safe replacement within Vietnamese translation tags.
  // The structure uses class="vn visible" or tag <vn>
  // e.g. <span class="vn visible">Bản dịch tiếng Việt...</span>
  // We want to find the termChange.oldTranslation and replace it with termChange.newTranslation
  // but only inside the translation portions.
  
  const oldTrans = termChange.oldTranslation.trim();
  const newTrans = termChange.newTranslation.trim();
  
  if (!oldTrans || !newTrans) return html;

  // Let's use a regex to locate class="vn visible" blocks and run replacement only inside them
  const vnBlockRegex = /(class="vn visible"[^>]*>)(.*?)(<\/span>)/gi;
  
  return html.replace(vnBlockRegex, (match, prefix, content, suffix) => {
    // Escape old translation for regex search
    const escapedOld = oldTrans.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Simple word boundary or literal replace inside the VN content
    const wordRegex = new RegExp(escapedOld, 'gi');
    const updatedContent = content.replace(wordRegex, (m) => {
      // Preserve original capitalization as much as possible
      if (m === m.toUpperCase()) return newTrans.toUpperCase();
      if (m[0] === m[0].toUpperCase()) return newTrans[0].toUpperCase() + newTrans.slice(1);
      return newTrans;
    });
    return `${prefix}${updatedContent}${suffix}`;
  });
}

function applyGlossaryChanges(bookSlug, targetType = 'draft', options = {}) {
  const bookRoot = getBookRoot(bookSlug);
  const reportsDir = path.join(bookRoot, 'reports');
  const impactReportPath = path.join(reportsDir, 'glossary-impact-report.json');

  if (!fs.existsSync(impactReportPath)) {
    return {
      status: 'no_impact_report',
      message: 'No glossary-impact-report.json found. Run impact analysis first.'
    };
  }

  const impact = JSON.parse(fs.readFileSync(impactReportPath, 'utf8'));
  const affectedChapters = impact.affectedChapters || [];

  if (affectedChapters.length === 0) {
    return {
      status: 'no_affected_chapters',
      message: 'No chapters are affected by current glossary changes.'
    };
  }

  const filesUpdated = [];
  const warnings = [];
  const errors = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Strict check for final
  if (targetType === 'final') {
    if (!options.confirmFinal) {
      throw new Error('This action affects final translation. Please confirm explicitly by passing --confirm-final.');
    }
  }

  const isDryRun = options.dryRun !== false; // Default is dry-run!

  affectedChapters.forEach(ac => {
    const chId = ac.chapterId;
    const chRoot = getChapterRoot(bookSlug, chId);
    
    const phaseFolder = targetType === 'final' ? '05-translated' : '05-translated-draft';
    const targetDir = path.join(chRoot, phaseFolder);

    if (!fs.existsSync(targetDir)) {
      warnings.push(`Chapter ${chId}: translation folder ${phaseFolder} does not exist.`);
      return;
    }

    let files = [];
    try {
      files = fs.readdirSync(targetDir).filter(f => f.endsWith('.html') && !f.includes('.backup-'));
    } catch (e) {
      errors.push(`Failed to read folder ${targetDir}: ${e.message}`);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(targetDir, file);
      let html = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      const initialHtml = html;

      ac.affectedTerms.forEach(termChange => {
        if (termChange.type === 'translation_changed') {
          const updatedHtml = applyGlossaryToHTMLContent(html, termChange);
          if (updatedHtml !== html) {
            html = updatedHtml;
            modified = true;
          }
        }
      });

      if (modified) {
        if (isDryRun) {
          filesUpdated.push({
            chapterId: chId,
            file,
            path: path.relative(bookRoot, filePath).replace(/\\/g, '/'),
            status: 'would_update'
          });
        } else {
          // Backup first
          backupFile(filePath, timestamp);
          fs.writeFileSync(filePath, html, 'utf8');
          filesUpdated.push({
            chapterId: chId,
            file,
            path: path.relative(bookRoot, filePath).replace(/\\/g, '/'),
            status: 'updated'
          });
        }
      }
    });
  });

  return {
    status: isDryRun ? 'dry_run_passed' : 'success',
    filesUpdated,
    warnings,
    errors,
    message: isDryRun 
      ? `Dry-run completed. Would update ${filesUpdated.length} files.`
      : `Successfully applied glossary changes to ${filesUpdated.length} files.`
  };
}

module.exports = {
  applyGlossaryChanges
};

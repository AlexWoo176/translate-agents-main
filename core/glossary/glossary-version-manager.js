'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

function formatTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyymmdd = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
  const hhmmss = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
  return `${yyyymmdd}-${hhmmss}`;
}

function backupGlossary(bookSlug, reason = 'unknown') {
  const bookRoot = getBookRoot(bookSlug);
  const glossaryPath = path.join(bookRoot, 'glossary.csv');
  
  if (!fs.existsSync(glossaryPath)) {
    return null;
  }

  const versionsDir = path.join(bookRoot, 'glossary', 'versions');
  if (!fs.existsSync(versionsDir)) {
    fs.mkdirSync(versionsDir, { recursive: true });
  }

  const timestamp = formatTimestamp();
  const backupCsvPath = path.join(versionsDir, `glossary-${timestamp}.csv`);
  
  // Read and copy CSV
  const csvContent = fs.readFileSync(glossaryPath, 'utf8');
  fs.writeFileSync(backupCsvPath, csvContent, 'utf8');

  // Convert to JSON and save
  const { parseCSV } = require('../translation/glossary-context-builder');
  const { parseCSVRow } = require('./glossary-normalizer');
  const rows = parseCSV(csvContent);
  const headers = rows[0];
  const terms = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length > 0 && (rows[i].length > 1 || rows[i][0] !== '')) {
      terms.push(parseCSVRow(rows[i], headers));
    }
  }

  const backupJsonPath = path.join(versionsDir, `glossary-${timestamp}.json`);
  fs.writeFileSync(backupJsonPath, JSON.stringify(terms, null, 2), 'utf8');

  return {
    timestamp,
    backupCsv: `glossary/versions/glossary-${timestamp}.csv`,
    backupJson: `glossary/versions/glossary-${timestamp}.json`,
    terms
  };
}

function writeChangeLog(bookSlug, changeRecord) {
  const bookRoot = getBookRoot(bookSlug);
  const glossaryDir = path.join(bookRoot, 'glossary');
  if (!fs.existsSync(glossaryDir)) {
    fs.mkdirSync(glossaryDir, { recursive: true });
  }

  const jsonLogPath = path.join(glossaryDir, 'glossary-change-log.json');
  const mdLogPath = path.join(glossaryDir, 'glossary-change-log.md');

  // Read existing logs
  let logs = [];
  if (fs.existsSync(jsonLogPath)) {
    try {
      logs = JSON.parse(fs.readFileSync(jsonLogPath, 'utf8'));
    } catch (e) {
      logs = [];
    }
  }

  // Prepend new change record
  logs.unshift(changeRecord);
  fs.writeFileSync(jsonLogPath, JSON.stringify(logs, null, 2), 'utf8');

  // Generate MD log
  let md = `# Glossary Change Log\n\n`;
  logs.forEach(log => {
    md += `## Change ID: ${log.changeId}\n\n`;
    md += `- **Date**: ${log.changedAt}\n`;
    md += `- **Author**: ${log.changedBy}\n`;
    md += `- **Reason**: ${log.reason}\n`;
    md += `- **Backup**: [CSV](${log.backup})\n`;
    md += `- **Terms Added**: ${log.termsAdded.length}\n`;
    md += `- **Terms Updated**: ${log.termsUpdated.length}\n`;
    md += `- **Terms Deprecated**: ${log.termsDeprecated.length}\n`;
    md += `- **Terms Locked**: ${log.termsLocked.length}\n\n`;
    
    if (log.termsAdded.length > 0) {
      md += `### Added Terms\n\n`;
      log.termsAdded.slice(0, 10).forEach(t => {
        md += `- **${t}**\n`;
      });
      if (log.termsAdded.length > 10) md += `- *and ${log.termsAdded.length - 10} more...*\n`;
      md += `\n`;
    }
    if (log.termsUpdated.length > 0) {
      md += `### Updated Terms\n\n`;
      log.termsUpdated.slice(0, 10).forEach(t => {
        md += `- **${t.term}**: ${t.oldTranslation} → ${t.newTranslation}\n`;
      });
      if (log.termsUpdated.length > 10) md += `- *and ${log.termsUpdated.length - 10} more...*\n`;
      md += `\n`;
    }
    md += `---\n\n`;
  });

  fs.writeFileSync(mdLogPath, md, 'utf8');
}

module.exports = {
  backupGlossary,
  writeChangeLog
};

'use strict';

const fs = require('fs');
const path = require('path');

function writeMarkdownReport(filePath, title, headers, rows) {
  let md = `# ${title}\n\n`;
  md += `| ${headers.join(' | ')} |\n`;
  md += `| ${headers.map(() => '---').join(' | ')} |\n`;
  
  rows.forEach(row => {
    md += `| ${row.map(cell => String(cell || '')).join(' | ')} |\n`;
  });

  fs.writeFileSync(filePath, md, 'utf8');
}

function writeJsonReport(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  writeMarkdownReport,
  writeJsonReport
};

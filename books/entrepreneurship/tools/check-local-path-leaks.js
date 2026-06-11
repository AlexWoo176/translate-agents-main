const fs = require('fs');
const path = require('path');

const basePath = path.resolve(__dirname, '..');
const backupPath = path.join(basePath, 'backups', 'step-7');
const mdReportPath = path.join(basePath, 'reports', 'local-path-leaks-report.md');
const jsonReportPath = path.join(basePath, 'reports', 'local-path-leaks-report.json');

const patterns = [
  { name: 'file_url_triple_slash', regex: /file:\/\/\//i },
  { name: 'file_url_double_slash', regex: /file:\/\/[^\/]/i }, // matches file:// followed by path
  { name: 'mac_users_path', regex: /\/Users\//i },
  { name: 'mac_home_desktop', regex: /~\/Desktop\//i },
  { name: 'generic_desktop_path', regex: /Desktop\/[a-zA-Z0-9_-]/i },
  { name: 'windows_users_path', regex: /C:\\Users\\/i },
  { name: 'windows_users_path_double_escaped', regex: /C:\\\\Users\\\\/i },
  { name: 'linux_home_path', regex: /\/home\//i },
  { name: 'network_users_path', regex: /\\\\Users\\\\/i }
];

console.log('--- Local Path Leaks Checker ---');

// 1. Locate all tasks.md files recursively
function findTasksFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    // Skip node_modules, backups, reports, tools, preview, exports
    if (['node_modules', 'backups', 'reports', 'tools', 'preview', 'exports', '_quarantine', '.git'].includes(item)) {
      return;
    }
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findTasksFiles(fullPath, fileList);
    } else if (item === 'tasks.md') {
      fileList.push(fullPath);
    }
  });
  return fileList;
}

const activeFiles = findTasksFiles(basePath);
console.log('Files found to scan:', activeFiles.map(f => path.relative(basePath, f)));

const leaksDetected = [];
const fixesApplied = [];
let leaksBeforeCount = 0;

// Scan each active file
activeFiles.forEach(filePath => {
  const relativePath = path.relative(basePath, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  
  // Scan for current leaks
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    patterns.forEach(pat => {
      if (pat.regex.test(line)) {
        // Exclude openstax URLs or regular web urls
        if (line.includes('https://') || line.includes('http://')) {
          // unless they contain file://
          if (!pat.regex.test(line.replace(/https?:\/\/[^\s]+/g, ''))) {
            return;
          }
        }
        
        // Find match string
        const match = line.match(pat.regex);
        
        // Suggest replacement
        let suggestion = '[LOCAL_PATH_REMOVED_STEP_7]';
        // check if we can make it relative
        if (line.includes('chapter-3/')) {
          suggestion = 'chapters/chapter-3/...';
        }
        
        leaksDetected.push({
          file: relativePath,
          line: lineNum,
          pattern: pat.name,
          matchedText: line.trim().slice(0, 150),
          replacement: suggestion
        });
      }
    });
  });
  
  // Compare with backup to find fixes
  // Resolve path inside backup
  const relativeBackupPath = path.relative(basePath, filePath);
  const backupFilePath = path.join(backupPath, relativeBackupPath);
  
  if (fs.existsSync(backupFilePath)) {
    const backupContent = fs.readFileSync(backupFilePath, 'utf8');
    const backupLines = backupContent.split(/\r?\n/);
    
    backupLines.forEach((bLine, index) => {
      const lineNum = index + 1;
      let lineHadLeak = false;
      let matchedPatternName = '';
      
      patterns.forEach(pat => {
        if (pat.regex.test(bLine)) {
          if (bLine.includes('https://') || bLine.includes('http://')) {
            if (!pat.regex.test(bLine.replace(/https?:\/\/[^\s]+/g, ''))) {
              return;
            }
          }
          lineHadLeak = true;
          matchedPatternName = pat.name;
        }
      });
      
      if (lineHadLeak) {
        leaksBeforeCount++;
        
        // Check if the current line still has a leak
        const currentLine = lines[index];
        let currentLineHasLeak = false;
        if (currentLine) {
          patterns.forEach(pat => {
            if (pat.regex.test(currentLine)) {
              if (currentLine.includes('https://') || currentLine.includes('http://')) {
                if (!pat.regex.test(currentLine.replace(/https?:\/\/[^\s]+/g, ''))) {
                  return;
                }
              }
              currentLineHasLeak = true;
            }
          });
        }
        
        if (!currentLineHasLeak && currentLine) {
          fixesApplied.push({
            file: relativePath,
            line: lineNum,
            before: bLine.trim().slice(0, 150),
            after: currentLine.trim().slice(0, 150)
          });
        }
      }
    });
  }
});

const leaksAfterCount = leaksDetected.length;
const status = leaksAfterCount === 0 ? 'resolved' : 'failed';

console.log(`Leaks before: ${leaksBeforeCount}`);
console.log(`Leaks after: ${leaksAfterCount}`);
console.log(`Fixes applied: ${fixesApplied.length}`);

// Generate MD Report
let md = `# Local Path Leaks Report\n\n`;
md += `## Summary\n${status === 'resolved' ? 'Passed' : 'Failed'}\n\n`;

md += `## Scope\n`;
activeFiles.forEach(f => {
  md += `- \`${path.relative(basePath, f).replace(/\\/g, '/')}\`\n`;
});
md += `\n`;

md += `## Patterns Checked\n`;
patterns.forEach(pat => {
  md += `- \`${pat.name}\`: \`${pat.regex.toString()}\`\n`;
});
md += `\n`;

md += `## Leaks Detected\n`;
if (leaksDetected.length === 0) {
  md += `None.\n\n`;
} else {
  md += `| File | Line | Pattern | Matched Text | Replacement |\n`;
  md += `|---|---:|---|---|---|\n`;
  leaksDetected.forEach(ld => {
    md += `| \`${ld.file}\` | ${ld.line} | \`${ld.pattern}\` | \`${ld.matchedText}\` | \`${ld.replacement}\` |\n`;
  });
  md += `\n`;
}

md += `## Fixes Applied\n`;
if (fixesApplied.length === 0) {
  md += `None.\n\n`;
} else {
  md += `| File | Line | Before | After |\n`;
  md += `|---|---:|---|---|\n`;
  fixesApplied.forEach(fa => {
    md += `| \`${fa.file}\` | ${fa.line} | \`${fa.before}\` | \`${fa.after}\` |\n`;
  });
  md += `\n`;
}

md += `## Remaining Issues\n`;
if (leaksDetected.length === 0) {
  md += `None.\n\n`;
} else {
  md += `${leaksDetected.length} local path leak(s) still remain to be resolved.\n\n`;
}

md += `## Final Result\n`;
if (status === 'resolved') {
  md += `**SUCCESS**: All local path leaks have been successfully detected and resolved.\n`;
} else {
  md += `**FAILURE**: Some local path leaks still exist in the tasks.md files.\n`;
}

fs.writeFileSync(mdReportPath, md, 'utf8');
console.log(`Markdown report written to: ${mdReportPath}`);

// Write JSON Report
const jsonReport = {
  status: status,
  filesScanned: activeFiles.length,
  leaksBefore: leaksBeforeCount,
  leaksAfter: leaksAfterCount,
  fixes: fixesApplied
};

fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2), 'utf8');
console.log(`JSON report written to: ${jsonReportPath}`);

if (status === 'failed') {
  process.exit(2);
} else {
  process.exit(0);
}

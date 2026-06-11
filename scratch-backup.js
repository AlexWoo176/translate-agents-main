const fs = require('fs');
const path = require('path');

const bookRoot = 'books/entrepreneurship';
const backupDir = path.join(bookRoot, 'backups', 'phase-4-1-table-integrity');

const filesToBackup = [
  'chapters/chapter-14/05-translated/14-1-types-of-resources.html',
  'reports/chapter-14-table-integrity-report.md',
  'reports/chapter-14-table-integrity-report.json',
  'reports/final-validation-report.md',
  'reports/final-validation-report.json',
  'workflow-state.json'
];

try {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Created backup directory: ${backupDir}`);

  filesToBackup.forEach(file => {
    const src = path.join(bookRoot, file);
    const dest = path.join(backupDir, path.basename(file));
    
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Backed up: ${src} -> ${dest}`);
    } else {
      console.warn(`File not found, skipped: ${src}`);
    }
  });

  console.log('Backup completed successfully.');
} catch (e) {
  console.error('Backup failed:', e.message);
  process.exit(1);
}

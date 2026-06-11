const fs = require('fs');
const path = require('path');

const GLOSSARY_PATH = path.join(__dirname, '..', 'glossary.csv');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const MD_REPORT_PATH = path.join(REPORTS_DIR, 'glossary-validation-report.md');
const JSON_REPORT_PATH = path.join(REPORTS_DIR, 'glossary-validation-report.json');

const VALID_STATUSES = ['draft', 'pending_review', 'approved', 'needs_context', 'deprecated'];
const EXPECTED_HEADERS = ['key', 'translation', 'options', 'desc_en', 'desc_vi', 'chapter', 'status', 'notes'];

// RFC 4180 compliant CSV parser
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          field += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\r' || c === '\n') {
        row.push(field);
        field = '';
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
          rows.push(row);
        }
        row = [];
        if (c === '\r' && next === '\n') {
          i++;
        }
      } else {
        field += c;
      }
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function runValidation() {
  if (!fs.existsSync(GLOSSARY_PATH)) {
    console.error(`Error: File not found at ${GLOSSARY_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(GLOSSARY_PATH, 'utf-8');
  const allRows = parseCSV(content);

  if (allRows.length === 0) {
    console.error('Error: CSV file is empty');
    process.exit(1);
  }

  const headers = allRows[0].map(h => h.trim());
  const dataRows = allRows.slice(1);

  const errors = [];
  const warnings = [];
  const duplicateKeys = new Map();
  const statusNormalizations = [];
  let malformedCount = 0;

  // 1. Verify headers
  const headerMatch = headers.length === EXPECTED_HEADERS.length && 
                      headers.every((h, idx) => h === EXPECTED_HEADERS[idx]);

  if (!headerMatch) {
    errors.push({
      type: 'header_mismatch',
      message: `Expected headers: [${EXPECTED_HEADERS.join(',')}], but found: [${headers.join(',')}]`
    });
  }

  // 2. Validate rows
  dataRows.forEach((row, index) => {
    const rowNum = index + 2; // 1-based, plus header row
    const rowKey = row[0] ? row[0].trim() : '';
    const rowTranslation = row[1] ? row[1].trim() : '';
    const rowChapter = row[5] ? row[5].trim() : '';
    const rowStatus = row[6] ? row[6].trim() : '';

    // Check number of fields
    if (row.length !== EXPECTED_HEADERS.length) {
      malformedCount++;
      errors.push({
        type: 'malformed_row',
        row: rowNum,
        key: rowKey || '(empty)',
        message: `Row has ${row.length} columns instead of ${EXPECTED_HEADERS.length}. Raw content: ${JSON.stringify(row)}`
      });
      return; // Skip further checks for this malformed row
    }

    // Check empty key
    if (!rowKey) {
      errors.push({
        type: 'empty_key',
        row: rowNum,
        message: `Key is empty on row ${rowNum}`
      });
    } else {
      // Check duplicate key
      const lowerKey = rowKey.toLowerCase();
      if (duplicateKeys.has(lowerKey)) {
        duplicateKeys.get(lowerKey).push(rowNum);
      } else {
        duplicateKeys.set(lowerKey, [rowNum]);
      }
    }

    // Check empty translation
    if (!rowTranslation) {
      errors.push({
        type: 'empty_translation',
        row: rowNum,
        key: rowKey,
        message: `Translation is empty on row ${rowNum} for key "${rowKey}"`
      });
    }

    // Check status enum
    if (!rowStatus) {
      errors.push({
        type: 'empty_status',
        row: rowNum,
        key: rowKey,
        message: `Status is empty on row ${rowNum} for key "${rowKey}"`
      });
    } else if (!VALID_STATUSES.includes(rowStatus)) {
      errors.push({
        type: 'invalid_status',
        row: rowNum,
        key: rowKey,
        value: rowStatus,
        message: `Status "${rowStatus}" on row ${rowNum} is not in allowed enum: [${VALID_STATUSES.join(', ')}]`
      });
    }
  });

  // Process duplicates
  for (const [key, rows] of duplicateKeys.entries()) {
    if (rows.length > 1) {
      warnings.push({
        type: 'duplicate_key',
        key: key,
        rows: rows,
        message: `Duplicate key "${key}" found on rows: ${rows.join(', ')}`
      });
    }
  }

  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const success = errors.length === 0;

  // 3. Generate JSON report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    success: success,
    stats: {
      totalRows: dataRows.length,
      malformedRows: malformedCount,
      errorsCount: errors.length,
      warningsCount: warnings.length
    },
    errors: errors,
    warnings: warnings
  };

  fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(jsonReport, null, 2), 'utf-8');

  // 4. Generate Markdown report
  const mdReport = `# Glossary Validation Report

**Timestamp:** ${jsonReport.timestamp}
**Status:** ${success ? '✅ PASSED' : '❌ FAILED'}

## Summary
- **Total Rows Reviewed:** ${jsonReport.stats.totalRows}
- **Malformed Rows:** ${jsonReport.stats.malformedRows}
- **Total Errors:** ${jsonReport.stats.errorsCount}
- **Total Warnings:** ${jsonReport.stats.warningsCount}

${success ? '### ✅ No validation errors found.' : '### ❌ Validation errors found. Please correct them.'}

${errors.length > 0 ? `## Errors
| Type | Row | Key | Message |
|---|---|---|---|
${errors.map(e => `| \`${e.type}\` | ${e.row || '-'} | ${e.key ? `\`${e.key}\`` : '-'} | ${e.message} |`).join('\n')}` : ''}

${warnings.length > 0 ? `## Warnings
| Type | Details | Message |
|---|---|---|
${warnings.map(w => `| \`${w.type}\` | ${w.key ? `\`${w.key}\`` : '-'} | ${w.message} |`).join('\n')}` : ''}

## Validation Schema Reference
The glossary columns are validated against the following schema requirements:
- \`key\`: string, required, non-empty
- \`translation\`: string, required, non-empty
- \`options\`: string, optional
- \`desc_en\`: string, optional
- \`desc_vi\`: string, optional
- \`chapter\`: string, optional
- \`status\`: enum (draft, pending_review, approved, needs_context, deprecated), required
- \`notes\`: string, optional
`;

  fs.writeFileSync(MD_REPORT_PATH, mdReport, 'utf-8');

  console.log(`Validation finished. Status: ${success ? 'PASSED' : 'FAILED'}`);
  console.log(`Errors: ${errors.length}, Warnings: ${warnings.length}`);
  console.log(`Reports generated in: ${REPORTS_DIR}`);

  if (!success) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runValidation();

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const prepPath = 'books/entrepreneurship/chapters/chapter-14/04-prep/14-1-types-of-resources.html';
const transPath = 'books/entrepreneurship/chapters/chapter-14/05-translated/14-1-types-of-resources.html';

const $prep = cheerio.load(fs.readFileSync(prepPath, 'utf8'));
const $trans = cheerio.load(fs.readFileSync(transPath, 'utf8'));

// Helper to normalize keys
function clean(text) {
  return text.trim().replace(/\s+/g, ' ');
}

$prep('table').each((tIdx, prepTable) => {
  const transTable = $trans('table').eq(tIdx);
  
  const prepRows = $prep(prepTable).find('tr');
  const transRows = transTable.find('tr');
  
  prepRows.each((rIdx, prepRow) => {
    const transRow = transRows.eq(rIdx);
    
    const prepCells = $prep(prepRow).find('th, td');
    const transCells = transRow.find('th, td');
    
    let j = 0; // pointer for transCells
    
    prepCells.each((cIdx, prepCell) => {
      const $prepCell = $prep(prepCell);
      const hasList = $prepCell.find('ul, ol').length > 0;
      
      const engSpan = $prepCell.find('span.eng.hidden');
      const vnSpan = $prepCell.find('span.vn.visible');
      
      if (!hasList) {
        // Simple cell - should map to two cells in trans
        const engCell = transCells.eq(j);
        const vnCell = transCells.eq(j + 1);
        
        const engText = clean(engCell.text());
        const vnText = clean(vnCell.text());
        
        if (vnText && vnText !== engText) {
          // Valid translation exists
          vnSpan.text(vnCell.text().trim());
          vnSpan.removeAttr('data-prep-status');
        } else {
          // Missing translation or matches English
          vnSpan.html('\n    <!-- TODO_PHASE_4_1_MISSING_TABLE_CELL_TRANSLATION: Vietnamese translation needed. -->\n  ');
          vnSpan.attr('data-phase-4-1-status', 'missing-translation');
          vnSpan.removeAttr('data-prep-status');
        }
        
        j += 2;
      } else {
        // List cell - should map to one cell in trans containing duplicated lis
        const transCell = transCells.eq(j);
        
        const prepLis = $prepCell.find('li');
        const transLis = transCell.find('li');
        
        let m = 0; // pointer for transLis
        prepLis.each((lIdx, prepLi) => {
          const $prepLi = $prep(prepLi);
          const liEngSpan = $prepLi.find('span.eng.hidden');
          const liVnSpan = $prepLi.find('span.vn.visible');
          
          const engLi = transLis.eq(m);
          const vnLi = transLis.eq(m + 1);
          
          const engText = clean(engLi.text());
          const vnText = clean(vnLi.text());
          
          if (vnText && vnText !== engText) {
            // Valid translation exists
            liVnSpan.text(vnLi.text().trim());
            liVnSpan.removeAttr('data-prep-status');
          } else {
            // Missing translation or matches English
            liVnSpan.html('\n    <!-- TODO_PHASE_4_1_MISSING_TABLE_CELL_TRANSLATION: Vietnamese translation needed. -->\n  ');
            liVnSpan.attr('data-phase-4-1-status', 'missing-translation');
            liVnSpan.removeAttr('data-prep-status');
          }
          
          m += 2;
        });
        
        j += 1;
      }
    });
  });
  
  // Replace the table in translated HTML with this prep table
  const prepTableHtml = $prep(prepTable).parent().html() || $prep(prepTable).html();
  // cheerio eq(tIdx) replacement
  $trans('table').eq(tIdx).replaceWith(prepTable);
});

// Write modified translated HTML back
fs.writeFileSync(transPath, $trans.html(), 'utf8');
console.log(`Successfully merged translations and updated: ${transPath}`);

const fs = require('fs');
const cheerio = require('cheerio');

const prepPath = 'books/entrepreneurship/chapters/chapter-14/04-prep/14-1-types-of-resources.html';
const transPath = 'books/entrepreneurship/chapters/chapter-14/05-translated/14-1-types-of-resources.html';

const $prep = cheerio.load(fs.readFileSync(prepPath, 'utf8'));
const $trans = cheerio.load(fs.readFileSync(transPath, 'utf8'));

$prep('table').each((tIdx, prepTable) => {
  console.log(`\n=== Table ${tIdx} ===`);
  const transTable = $trans('table').eq(tIdx);
  
  const prepRows = $prep(prepTable).find('tr');
  const transRows = transTable.find('tr');
  
  prepRows.each((rIdx, prepRow) => {
    console.log(`  Row ${rIdx}:`);
    const transRow = transRows.eq(rIdx);
    
    const prepCells = $prep(prepRow).find('th, td');
    const transCells = transRow.find('th, td');
    
    let j = 0; // pointer for transCells
    
    prepCells.each((cIdx, prepCell) => {
      const $prepCell = $prep(prepCell);
      const hasList = $prepCell.find('ul, ol').length > 0;
      
      if (!hasList) {
        // Simple cell - should map to two cells in trans
        const engCell = transCells.eq(j);
        const vnCell = transCells.eq(j + 1);
        console.log(`    Cell ${cIdx} (Simple): [${engCell.text().trim()}] -> [${vnCell.text().trim()}]`);
        j += 2;
      } else {
        // List cell - should map to one cell in trans containing duplicated lis
        const transCell = transCells.eq(j);
        console.log(`    Cell ${cIdx} (List):`);
        
        const prepLis = $prepCell.find('li');
        const transLis = transCell.find('li');
        
        let m = 0; // pointer for transLis
        prepLis.each((lIdx, prepLi) => {
          const engLi = transLis.eq(m);
          const vnLi = transLis.eq(m + 1);
          console.log(`      LI ${lIdx}: [${engLi.text().trim()}] -> [${vnLi.text().trim()}]`);
          m += 2;
        });
        
        j += 1;
      }
    });
  });
});

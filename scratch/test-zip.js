const JSZip = require('jszip');
const fs = require('fs');

async function test() {
  const zip = new JSZip();
  // mimetype MUST be STORE
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('content.txt', 'compressed content '.repeat(100)); // default
  
  // Generate with DEFLATE as the default/fallback compression
  const buffer = await zip.generateAsync({ 
    type: 'nodebuffer',
    compression: 'DEFLATE'
  });
  
  const compressionMethod = buffer.readUInt16LE(8);
  console.log('First entry compression method (with global DEFLATE):', compressionMethod);
  
  // Let's inspect the files in JSZip
  const readZip = await JSZip.loadAsync(buffer);
  for (const name in readZip.files) {
    const file = readZip.files[name];
    console.log(`File: ${name}`);
    console.log(`  options.compression:`, file.options.compression);
    console.log(`  magic bytes:`, JSON.stringify(file._data?.compression?.magic));
  }
}

test().catch(console.error);

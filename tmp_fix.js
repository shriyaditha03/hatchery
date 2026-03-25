const fs = require('fs');
const path = 'c:/Users/shriy/OneDrive/Desktop/aquanexus/src/pages/RecordActivity.tsx';
const content = fs.readFileSync(path, 'utf8').split('\n');
// Line 1479 is index 1478. Line 1504 is index 1503.
// We want to keep 0..1477 (Lines 1..1478) and 1504..end (Lines 1505..end)
const newContent = content.slice(0, 1478).concat(content.slice(1504));
fs.writeFileSync(path, newContent.join('\n'));
console.log('File cleaned successfully');

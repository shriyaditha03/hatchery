const fs = require('fs');
const path = 'C:\\Users\\shriy\\OneDrive\\Desktop\\aquanexus\\src\\pages\\RecordActivity.tsx';
const content = fs.readFileSync(path, 'utf8').split('\n');
const startIndex = 1478; // Line 1479
const endIndex = 1504;   // Line 1505 (exclusive slice)
const newContent = content.slice(0, startIndex).concat(content.slice(endIndex));
fs.writeFileSync(path, newContent.join('\n'));
console.log('Cleanup successful');

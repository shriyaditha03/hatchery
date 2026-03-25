const fs = require('fs');
const path = require('path');
const target = 'C:/Users/shriy/OneDrive/Desktop/aquanexus/src/pages/RecordActivity.tsx';
try {
    const data = fs.readFileSync(target, 'utf8');
    const lines = data.split('\n');
    console.log('Original lines:', lines.length);
    // Remove lines 1479 to 1504 (indices 1478 to 1503 inclusive)
    const newLines = lines.filter((_, index) => index < 1478 || index > 1503);
    console.log('New lines:', newLines.length);
    fs.writeFileSync(target, newLines.join('\n'));
    console.log('Cleanup successful');
} catch (e) {
    console.error(e);
}

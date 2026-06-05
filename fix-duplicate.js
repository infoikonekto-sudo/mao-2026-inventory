// Script to remove duplicate uploadInvoiceFile function
const fs = require('fs');
const path = require('path');

const filePath = 'src/services/supabaseClient.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Remove lines 169-206 (0-indexed: 168-205)
const newLines = [
    ...lines.slice(0, 168),
    ...lines.slice(206)
];

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('✅ Duplicate function removed successfully!');

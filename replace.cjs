const fs = require('fs');
const path = require('path');

const directory = __dirname;
const searchStrings = [/PR-SCL/g, /PR SCL/g, /PR_SCL/g, /pr-scl/g];
const replacements = ['PR-SGS', 'PR SGS', 'PR_SGS', 'pr-sgs'];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === 'dist') return;
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

let modifiedCount = 0;

walkDir(directory, (filePath) => {
  if (filePath === __filename) return; // Skip this script
  if (filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.json') || filePath.endsWith('.md')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace while preserving case mostly
    content = content.replace(/PR-SCL/g, 'PR-SGS');
    content = content.replace(/PR SCL/g, 'PR SGS');
    // For package.json, we might want lowercase.
    if (filePath.endsWith('package.json') || filePath.endsWith('package-lock.json') || filePath.endsWith('index.html')) {
        content = content.replace(/pr-scl/g, 'pr-sgs');
    }
    
    if (original !== content) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Modified: ${filePath}`);
      modifiedCount++;
    }
  }
});

console.log(`Total files modified: ${modifiedCount}`);

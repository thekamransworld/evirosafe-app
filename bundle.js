import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputFile = 'full_project_code.txt';
// Extensions to include
const includedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.sql', '.json'];
// Folders to ignore
const excludedDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.vscode'];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!excludedDirs.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (includedExtensions.includes(path.extname(file))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  return arrayOfFiles;
}

const allFiles = getAllFiles(__dirname);
let outputContent = '';

console.log(`Bundling ${allFiles.length} files...`);

allFiles.forEach(filePath => {
  const relativePath = path.relative(__dirname, filePath);
  if (relativePath === 'bundle.js' || relativePath === outputFile) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    outputContent += `\n\n--- START OF FILE ${relativePath} ---\n\n`;
    outputContent += content;
  } catch (err) {
    console.error(`Error reading ${relativePath}`);
  }
});

fs.writeFileSync(outputFile, outputContent);
console.log(`Done! Please upload '${outputFile}' to the chat.`);
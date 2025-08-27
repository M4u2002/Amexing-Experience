#!/usr/bin/env node

/**
 * Documentation Coverage Checker
 * Analyzes JavaScript files for JSDoc coverage
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Recursively find all JavaScript files in a directory
 * @param {string} dir - Directory to search
 * @param {Array<string>} fileList - Accumulator for file paths
 * @returns {Array<string>} Array of JavaScript file paths
 */
function findJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findJsFiles(filePath, fileList);
    } else if (file.endsWith('.js') && !file.endsWith('.test.js') && !file.endsWith('.spec.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Check if a function/class has JSDoc documentation
 * @param {string} content - File content
 * @returns {Object} Documentation statistics
 */
function analyzeDocumentation(content) {
  // Regex patterns for functions, classes, and JSDoc comments
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(\w+)\s*:\s*(?:async\s+)?function|class\s+(\w+)/g;
  const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
  
  const functions = [];
  const classes = [];
  let match;
  
  // Find all functions and classes
  while ((match = functionRegex.exec(content)) !== null) {
    const name = match[1] || match[2] || match[3];
    const type = match[3] ? 'class' : 'function';
    const line = content.substring(0, match.index).split('\n').length;
    
    if (type === 'class') {
      classes.push({ name, line, type });
    } else {
      functions.push({ name, line, type });
    }
  }
  
  // Find all JSDoc comments
  const jsdocs = [];
  while ((match = jsdocRegex.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    jsdocs.push({ line, content: match[0] });
  }
  
  // Check which functions/classes have documentation
  const documented = [];
  const undocumented = [];
  
  [...functions, ...classes].forEach((item) => {
    // Look for JSDoc within 3 lines before the function/class
    const hasDoc = jsdocs.some((doc) => doc.line >= item.line - 3 && doc.line < item.line);
    
    if (hasDoc) {
      documented.push(item);
    } else {
      undocumented.push(item);
    }
  });
  
  return {
    total: functions.length + classes.length,
    documented: documented.length,
    undocumented: undocumented.length,
    undocumentedItems: undocumented,
    coverage: functions.length + classes.length > 0 
      ? Math.round((documented.length / (functions.length + classes.length)) * 100) 
      : 100,
  };
}

/**
 * Main function to analyze documentation coverage
 */
function main() {
  console.log('📚 Analyzing JSDoc Documentation Coverage...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  const jsFiles = findJsFiles(srcDir);
  
  let totalFunctions = 0;
  let totalDocumented = 0;
  const fileResults = [];
  
  jsFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = analyzeDocumentation(content);
    const relativePath = path.relative(process.cwd(), filePath);
    
    totalFunctions += stats.total;
    totalDocumented += stats.documented;
    
    fileResults.push({
      file: relativePath,
      ...stats,
    });
  });
  
  // Sort by coverage (lowest first)
  fileResults.sort((a, b) => a.coverage - b.coverage);
  
  console.log('📋 Documentation Coverage Report:\n');
  
  fileResults.forEach((result) => {
    const status = result.coverage >= 80 ? '✅' : result.coverage >= 60 ? '⚠️' : '❌';
    console.log(`${status} ${result.file}: ${result.coverage}% (${result.documented}/${result.total})`);
    
    if (result.undocumented > 0 && result.coverage < 80) {
      result.undocumentedItems.forEach((item) => {
        console.log(`   - Missing: ${item.type} ${item.name} (line ${item.line})`);
      });
    }
  });
  
  const overallCoverage = totalFunctions > 0 
    ? Math.round((totalDocumented / totalFunctions) * 100) 
    : 100;
  
  console.log('\n📊 Overall Statistics:');
  console.log(`Total Functions/Classes: ${totalFunctions}`);
  console.log(`Documented: ${totalDocumented}`);
  console.log(`Undocumented: ${totalFunctions - totalDocumented}`);
  console.log(`Overall Coverage: ${overallCoverage}%\n`);
  
  // Set minimum coverage threshold
  const minCoverage = 80;
  
  if (overallCoverage >= minCoverage) {
    console.log(`✅ Documentation coverage meets minimum threshold (${minCoverage}%)`);
    process.exit(0);
  } else {
    console.log(`❌ Documentation coverage below minimum threshold (${minCoverage}%)`);
    console.log(`   Need to document ${Math.ceil(((minCoverage / 100) * totalFunctions) - totalDocumented)} more items`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeDocumentation, findJsFiles };
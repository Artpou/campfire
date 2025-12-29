#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get JSON file parameter from command line
const jsonFile = process.argv[2];

if (!jsonFile) {
  console.error('Error: Please provide a JSON file path');
  console.error('Usage: node apply-translations.js <json-file>');
  console.error('Example: node apply-translations.js empty-translations-fr.json');
  process.exit(1);
}

// Check if JSON file exists
if (!fs.existsSync(jsonFile)) {
  console.error(`Error: File not found at ${jsonFile}`);
  process.exit(1);
}

// Read and parse the JSON file
let data;
try {
  const jsonContent = fs.readFileSync(jsonFile, 'utf-8');
  data = JSON.parse(jsonContent);
} catch (error) {
  console.error(`Error: Failed to parse JSON file: ${error.message}`);
  process.exit(1);
}

// Validate JSON structure
if (!data.lang || !data.path || !Array.isArray(data.missing)) {
  console.error('Error: Invalid JSON structure. Expected { lang, path, missing: [] }');
  process.exit(1);
}

const { lang, path: poFilePath, missing } = data;



// Check if .po file exists
if (!fs.existsSync(poFilePath)) {
  console.error(`Error: .po file not found at ${poFilePath}`);
  process.exit(1);
}

// Filter out translations that have actual content (not empty)
const translationsToApply = missing.filter(item => item.translation && item.translation.trim() !== '');

if (translationsToApply.length === 0) {
  console.log('⚠️  No translations to apply (all translation fields are empty)');
  process.exit(0);
}

console.log(`✅ Found ${translationsToApply.length} non-empty translations to apply`);

// Read the .po file
const poContent = fs.readFileSync(poFilePath, 'utf-8');
const lines = poContent.split('\n');

// Create a map of line numbers to translations
const translationMap = new Map();
translationsToApply.forEach(item => {
  translationMap.set(item.line, item.translation);
});

// Apply translations
let appliedCount = 0;
console.log('\n📝 Applying translations:\n');

const updatedLines = lines.map((line, index) => {
  const lineNumber = index + 1;
  
  // Check if this line has a translation to apply
  if (translationMap.has(lineNumber)) {
    const translation = translationMap.get(lineNumber);
    
    // Check if this is a msgstr line with empty translation
    if (line.match(/^msgstr ""\s*$/)) {
      appliedCount++;
      
      // Find the corresponding original text for logging
      const translationItem = translationsToApply.find(item => item.line === lineNumber);
      if (translationItem) {
        console.log(`  ✓ Line ${lineNumber}: "${translationItem.original}" → "${translation}"`);
      }
      
      // Replace empty msgstr with the translation
      return `msgstr "${translation}"`;
    }
  }
  
  return line;
});

// Write back to the .po file
const updatedContent = updatedLines.join('\n');
fs.writeFileSync(poFilePath, updatedContent, 'utf-8');

console.log(`\n🎉 Successfully applied ${appliedCount} translations to ${poFilePath}`);

if (appliedCount < translationsToApply.length) {
  console.log(`⚠️  Warning: Expected to apply ${translationsToApply.length} translations but only applied ${appliedCount}`);
  console.log('   Some translations might not have matched the expected format');
}


#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get language parameter from command line
const lang = process.argv[2];

if (!lang) {
  console.error('Error: Please provide a language parameter (fr or en)');
  console.error('Usage: node extract-empty-translations.js <lang>');
  console.error('Example: node extract-empty-translations.js fr');
  process.exit(1);
}

if (lang !== 'fr' && lang !== 'en') {
  console.error('Error: Language must be either "fr" or "en"');
  process.exit(1);
}

// Construct path to the messages.po file (go up one level from scripts folder)
const projectRoot = path.join(__dirname, '..');
const poFilePath = path.join(projectRoot, 'apps', 'web', 'src', 'locales', lang, 'messages.po');

// Check if file exists
if (!fs.existsSync(poFilePath)) {
  console.error(`Error: File not found at ${poFilePath}`);
  process.exit(1);
}

// Read the file
const content = fs.readFileSync(poFilePath, 'utf-8');
const lines = content.split('\n');

const emptyTranslations = [];
let currentMsgid = null;
let currentMsgidLine = null;
let inMsgid = false;
let inMsgstr = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNumber = i + 1;

  // Detect msgid start
  if (line.startsWith('msgid ')) {
    inMsgid = true;
    inMsgstr = false;
    currentMsgidLine = lineNumber;
    
    // Extract the msgid content
    const match = line.match(/^msgid "(.*)"/);
    if (match) {
      currentMsgid = match[1];
    }
  }
  // Continue multiline msgid
  else if (inMsgid && line.startsWith('"') && !line.startsWith('msgstr')) {
    const match = line.match(/^"(.*)"/);
    if (match && currentMsgid !== null) {
      currentMsgid += match[1];
    }
  }
  // Detect msgstr start
  else if (line.startsWith('msgstr ')) {
    inMsgid = false;
    inMsgstr = true;
    
    // Extract the msgstr content
    const match = line.match(/^msgstr "(.*)"/);
    if (match) {
      const msgstr = match[1];
      
      // Check if msgstr is empty and msgid is not empty
      // Skip the header entry (first msgid "" msgstr "")
      if (msgstr === '' && currentMsgid !== null && currentMsgid !== '') {
        emptyTranslations.push({
          line: lineNumber,
          original: currentMsgid,
          translation: ''
        });
      }
      
      // Reset for next entry
      currentMsgid = null;
      currentMsgidLine = null;
    }
  }
  // Continue multiline msgstr
  else if (inMsgstr && line.startsWith('"')) {
    // If we find content in msgstr continuation, we need to remove the last added entry
    // because it's not actually empty
    const match = line.match(/^"(.*)"/);
    if (match && match[1] !== '') {
      // Remove the last entry if it was just added
      if (emptyTranslations.length > 0) {
        const lastEntry = emptyTranslations[emptyTranslations.length - 1];
        if (lastEntry.line === lineNumber - 1 || lastEntry.line === lineNumber) {
          emptyTranslations.pop();
        }
      }
    }
  }
  // Reset when we hit a comment or empty line
  else if (line.startsWith('#') || line.trim() === '') {
    inMsgid = false;
    inMsgstr = false;
  }
}

// Prepare output object
const output = {
  lang: lang,
  path: poFilePath,
  missing: emptyTranslations
};

// Output JSON file (save to project root)
const outputFileName = `empty-translations-${lang}.json`;
const outputPath = path.join(projectRoot, outputFileName);

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`✅ Found ${emptyTranslations.length} empty translations in ${lang}`);
console.log(`📄 Output saved to: ${outputFileName}`);


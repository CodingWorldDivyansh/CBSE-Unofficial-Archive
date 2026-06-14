const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'papers.json'), 'utf-8'));

let errors = 0;
let warnings = 0;
const ids = new Set();

// Check metadata
if (!data.metadata) { console.error('❌ Missing metadata'); errors++; }
if (!data.papers || !Array.isArray(data.papers)) { console.error('❌ Missing or invalid papers array'); errors++; process.exit(1); }

console.log(`\nValidating ${data.papers.length} papers...\n`);

for (const paper of data.papers) {
  // Check required fields
  const required = ['id', 'subject', 'subjectCode', 'year', 'examType', 'region', 'type', 'sourceUrl', 'directDownload', 'available', 'filename'];
  for (const field of required) {
    if (paper[field] === undefined) {
      console.error(`❌ Paper ${paper.id || 'UNKNOWN'}: Missing field "${field}"`);
      errors++;
    }
  }

  // Check for duplicate IDs
  if (ids.has(paper.id)) {
    console.error(`❌ Duplicate ID: ${paper.id}`);
    errors++;
  }
  ids.add(paper.id);

  // Validate subject
  if (!['Accountancy', 'Business Studies', 'Economics'].includes(paper.subject)) {
    console.error(`❌ ${paper.id}: Invalid subject "${paper.subject}"`);
    errors++;
  }

  // Validate year
  if (paper.year < 2015 || paper.year > 2026) {
    console.error(`❌ ${paper.id}: Year ${paper.year} out of range (2015-2026)`);
    errors++;
  }

  // Validate exam type
  if (!['Main', 'Compartment', 'Sample'].includes(paper.examType)) {
    console.error(`❌ ${paper.id}: Invalid examType "${paper.examType}"`);
    errors++;
  }

  // Validate type
  if (!['Question Paper', 'Marking Scheme'].includes(paper.type)) {
    console.error(`❌ ${paper.id}: Invalid type "${paper.type}"`);
    errors++;
  }

  // Check URL format
  if (paper.available && paper.sourceUrl) {
    try {
      new URL(paper.sourceUrl);
    } catch {
      console.error(`❌ ${paper.id}: Invalid URL "${paper.sourceUrl}"`);
      errors++;
    }
  }

  // Warn about unavailable papers
  if (!paper.available) {
    console.warn(`⚠️  ${paper.id}: Paper marked as unavailable`);
    warnings++;
  }

  // Warn about non-direct downloads
  if (paper.available && !paper.directDownload) {
    console.warn(`⚠️  ${paper.id}: Not a direct download link`);
    warnings++;
  }
}

// Summary statistics
const subjects = {};
const years = {};
const examTypes = {};
for (const p of data.papers) {
  subjects[p.subject] = (subjects[p.subject] || 0) + 1;
  years[p.year] = (years[p.year] || 0) + 1;
  examTypes[p.examType] = (examTypes[p.examType] || 0) + 1;
}

console.log('\n📊 Summary:');
console.log(`   Total papers: ${data.papers.length}`);
console.log(`   Available: ${data.papers.filter(p => p.available).length}`);
console.log(`   Direct download: ${data.papers.filter(p => p.available && p.directDownload).length}`);
console.log('\n   By Subject:');
Object.entries(subjects).sort().forEach(([k, v]) => console.log(`     ${k}: ${v}`));
console.log('\n   By Year:');
Object.entries(years).sort((a, b) => b[0] - a[0]).forEach(([k, v]) => console.log(`     ${k}: ${v}`));
console.log('\n   By Exam Type:');
Object.entries(examTypes).sort().forEach(([k, v]) => console.log(`     ${k}: ${v}`));

console.log(`\n${errors === 0 ? '✅' : '❌'} ${errors} errors, ${warnings} warnings\n`);
process.exit(errors > 0 ? 1 : 0);

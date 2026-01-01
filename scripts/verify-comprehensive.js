const axios = require('axios');
const fs = require('fs');
const path = require('path');

const papers = require('../data/papers.json');

async function verifyPdf(url, timeout = 20000) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            timeout: timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Range': 'bytes=0-10'
            },
            responseType: 'arraybuffer',
            maxRedirects: 5
        });
        
        const buffer = Buffer.from(response.data);
        // Check for PDF magic bytes: %PDF
        const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
        
        return {
            valid: isPdf,
            firstBytes: buffer.toString('utf8', 0, 4)
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

async function main() {
    console.log('Comprehensive PDF Verification\n');
    console.log(`Total papers: ${papers.length}\n`);
    
    // Test specific years as requested
    const testYears = [2015, 2018, 2022, 2025];
    const subjects = ['Accountancy', 'Business Studies', 'Economics', 'English', 'Mathematics'];
    
    const results = {
        passed: 0,
        failed: 0,
        errors: []
    };
    
    console.log('=== Testing Specific Years (2015, 2018, 2022, 2025) ===\n');
    
    for (const year of testYears) {
        console.log(`Year ${year}:`);
        
        for (const subject of subjects) {
            // Get question paper
            const qp = papers.find(p => 
                p.year === year && 
                p.subject === subject && 
                p.type === 'Question Paper'
            );
            
            // Get marking scheme
            const ms = papers.find(p => 
                p.year === year && 
                p.subject === subject && 
                p.type === 'Marking Scheme'
            );
            
            if (qp) {
                const result = await verifyPdf(qp.url);
                if (result.valid) {
                    console.log(`  ✓ ${subject} QP`);
                    results.passed++;
                } else {
                    console.log(`  ✗ ${subject} QP: ${result.error || result.firstBytes}`);
                    results.failed++;
                    results.errors.push({ paper: qp, error: result.error || 'Invalid PDF' });
                }
            }
            
            if (ms) {
                const result = await verifyPdf(ms.url);
                if (result.valid) {
                    console.log(`  ✓ ${subject} MS`);
                    results.passed++;
                } else {
                    console.log(`  ✗ ${subject} MS: ${result.error || result.firstBytes}`);
                    results.failed++;
                    results.errors.push({ paper: ms, error: result.error || 'Invalid PDF' });
                }
            }
        }
        console.log();
    }
    
    // Random sample verification
    console.log('=== Random Sample Verification (200 papers) ===\n');
    
    const shuffled = [...papers].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, 200);
    
    let samplePassed = 0;
    let sampleFailed = 0;
    
    for (let i = 0; i < sample.length; i++) {
        const paper = sample[i];
        process.stdout.write(`\rProgress: ${i + 1}/${sample.length}`);
        
        const result = await verifyPdf(paper.url);
        
        if (result.valid) {
            samplePassed++;
        } else {
            sampleFailed++;
            if (sampleFailed <= 10) {
                results.errors.push({ paper, error: result.error || 'Invalid PDF' });
            }
        }
    }
    
    console.log(`\r\nSample Results: ${samplePassed}/${sample.length} valid (${Math.round(samplePassed/sample.length*100)}%)\n`);
    
    // Summary
    console.log('=== SUMMARY ===');
    console.log(`Specific Year Tests: ${results.passed} passed, ${results.failed} failed`);
    console.log(`Random Sample: ${samplePassed}/${sample.length} valid`);
    console.log(`Estimated Total Valid: ~${Math.round(samplePassed/sample.length * papers.length)} papers`);
    
    if (results.errors.length > 0) {
        console.log('\nFailed URLs (first 10):');
        results.errors.slice(0, 10).forEach(e => {
            console.log(`  - ${e.paper.title}`);
            console.log(`    URL: ${e.paper.url}`);
            console.log(`    Error: ${e.error}`);
        });
    }
}

main().catch(console.error);

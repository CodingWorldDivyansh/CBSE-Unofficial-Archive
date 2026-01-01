const axios = require('axios');
const fs = require('fs');
const path = require('path');

const papers = require('../data/papers.json');

async function verifyUrl(url, timeout = 10000) {
    try {
        const response = await axios({
            method: 'HEAD',
            url: url,
            timeout: timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            maxRedirects: 5,
            validateStatus: (status) => status < 500
        });
        
        const contentType = response.headers['content-type'] || '';
        const contentLength = response.headers['content-length'];
        
        return {
            valid: response.status === 200 && (contentType.includes('pdf') || contentType.includes('octet-stream')),
            status: response.status,
            contentType,
            size: contentLength ? parseInt(contentLength) : null
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

async function verifyPdfContent(url, timeout = 15000) {
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

async function testSampleUrls() {
    console.log('Testing sample URLs from each year and subject...\n');
    
    const testYears = [2015, 2018, 2022, 2025];
    const subjects = ['Accountancy', 'Business Studies', 'Economics', 'English', 'Mathematics'];
    
    const results = {
        passed: 0,
        failed: 0,
        errors: []
    };
    
    for (const year of testYears) {
        console.log(`\n=== Testing Year ${year} ===`);
        
        for (const subject of subjects) {
            const paper = papers.find(p => 
                p.year === year && 
                p.subject === subject && 
                p.type === 'Question Paper'
            );
            
            if (!paper) {
                console.log(`  ${subject}: No paper found`);
                continue;
            }
            
            process.stdout.write(`  ${subject}: `);
            
            const headResult = await verifyUrl(paper.url);
            
            if (headResult.valid) {
                const contentResult = await verifyPdfContent(paper.url);
                if (contentResult.valid) {
                    console.log(`✓ Valid PDF (${headResult.size ? Math.round(headResult.size/1024) + 'KB' : 'unknown size'})`);
                    results.passed++;
                } else {
                    console.log(`✗ Invalid content: ${contentResult.firstBytes || contentResult.error}`);
                    results.failed++;
                    results.errors.push({ paper, error: 'Invalid PDF content' });
                }
            } else {
                console.log(`✗ ${headResult.status || headResult.error}`);
                results.failed++;
                results.errors.push({ paper, error: headResult.error || `Status ${headResult.status}` });
            }
        }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
        console.log('\nFailed URLs:');
        results.errors.forEach(e => {
            console.log(`  - ${e.paper.title}: ${e.error}`);
            console.log(`    URL: ${e.paper.url}`);
        });
    }
    
    return results;
}

async function verifyAllUrls(sampleSize = 50) {
    console.log(`\nVerifying random sample of ${sampleSize} URLs...\n`);
    
    // Shuffle and take sample
    const shuffled = [...papers].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, sampleSize);
    
    let valid = 0;
    let invalid = 0;
    const invalidUrls = [];
    
    for (let i = 0; i < sample.length; i++) {
        const paper = sample[i];
        process.stdout.write(`\r[${i + 1}/${sampleSize}] Checking...`);
        
        const result = await verifyUrl(paper.url);
        
        if (result.valid) {
            valid++;
        } else {
            invalid++;
            invalidUrls.push({
                title: paper.title,
                url: paper.url,
                error: result.error || `Status ${result.status}`
            });
        }
    }
    
    console.log(`\r[${sampleSize}/${sampleSize}] Done!     `);
    console.log(`\nValid: ${valid}/${sampleSize} (${Math.round(valid/sampleSize*100)}%)`);
    console.log(`Invalid: ${invalid}/${sampleSize}`);
    
    if (invalidUrls.length > 0 && invalidUrls.length <= 20) {
        console.log('\nInvalid URLs:');
        invalidUrls.forEach(u => console.log(`  - ${u.title}: ${u.error}`));
    }
    
    return { valid, invalid, invalidUrls };
}

async function main() {
    console.log('CBSE Papers URL Verification\n');
    console.log(`Total papers in database: ${papers.length}\n`);
    
    // Test specific years
    await testSampleUrls();
    
    // Verify random sample
    await verifyAllUrls(100);
}

main().catch(console.error);

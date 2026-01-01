const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const SUBJECTS = {
    'Accountancy': { folder: 'Accountancy', years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025] },
    'Business Studies': { folder: 'Business-Studies', years: [2015, 2016, 2017, 2018, 2019, 2022, 2023, 2024, 2025] },
    'Economics': { folder: 'Economics', years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025] },
    'English': { folder: 'English-Core', years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025] },
    'Mathematics': { folder: 'Maths', years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025] }
};

const papers = [];
let idCounter = 1;

function generateId() {
    return `paper_${String(idCounter++).padStart(4, '0')}`;
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Extract paper links from year page
function extractPaperLinks(html, baseUrl) {
    const links = [];
    // Match links like: href="https://supercop.in/cbse-board-papers/class12/Accountancy-2015/Accountancy-Paper-2015(All-India)/0"
    const regex = /href="(https:\/\/supercop\.in\/cbse-board-papers\/class12\/[^"]+\/\d+)"\s+class="list-group-item[^"]*"[^>]*>([^<]+)/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        links.push({
            url: match[1],
            title: match[2].trim().replace(/<[^>]+>/g, '').trim()
        });
    }
    return links;
}

// Extract pName from paper page
function extractPName(html) {
    const match = html.match(/pName="([^"]+)"/);
    return match ? match[1] : null;
}

// Parse paper info from title
function parsePaperInfo(title, subject, year) {
    const info = {
        type: 'Question Paper',
        region: null,
        set: null,
        code: null
    };
    
    // Determine type
    if (title.toLowerCase().includes('solution') || title.toLowerCase().includes('marking')) {
        info.type = 'Marking Scheme';
    }
    
    // Extract code for newer papers (e.g., 67-1-1)
    const codeMatch = title.match(/\((\d+-\d+-\d+)\)/);
    if (codeMatch) {
        info.code = codeMatch[1];
        const parts = info.code.split('-');
        const regionCode = parseInt(parts[1]);
        if (regionCode === 1) info.region = 'Delhi';
        else if (regionCode === 2) info.region = 'Outside Delhi';
        else if (regionCode === 3) info.region = 'Compartment';
        else info.region = 'Foreign';
        info.set = parts[2];
    }
    
    // Extract region for older papers
    if (!info.region) {
        if (title.includes('All India') || title.includes('All-India')) {
            info.region = 'All India';
        } else if (title.includes('Delhi') && !title.includes('Outside')) {
            info.region = 'Delhi';
        } else if (title.includes('Foreign')) {
            info.region = 'Foreign';
        } else if (title.includes('Outside Delhi')) {
            info.region = 'Outside Delhi';
        }
    }
    
    return info;
}

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });
            return response.data;
        } catch (error) {
            if (i === retries - 1) throw error;
            await delay(1000 * (i + 1));
        }
    }
}

async function scrapeYearPage(subject, year) {
    const config = SUBJECTS[subject];
    const url = `https://supercop.in/cbse-board-papers/class12/${config.folder}-${year}/`;
    
    console.log(`Scraping ${subject} ${year}...`);
    
    try {
        const html = await fetchWithRetry(url);
        const paperLinks = extractPaperLinks(html, url);
        console.log(`  Found ${paperLinks.length} papers`);
        
        const yearPapers = [];
        
        for (let i = 0; i < paperLinks.length; i++) {
            const link = paperLinks[i];
            
            try {
                await delay(200); // Rate limiting
                
                const paperHtml = await fetchWithRetry(link.url);
                const pName = extractPName(paperHtml);
                
                if (pName) {
                    const info = parsePaperInfo(link.title, subject, year);
                    
                    yearPapers.push({
                        id: generateId(),
                        title: link.title.replace(/\s+/g, ' ').trim(),
                        subject: subject,
                        year: year,
                        type: info.type,
                        region: info.region,
                        set: info.set,
                        code: info.code,
                        url: `https://files.supercop.in/cbse-board-papers/class12/${pName}.pdf`
                    });
                    
                    process.stdout.write(`\r  Progress: ${i + 1}/${paperLinks.length}`);
                }
            } catch (error) {
                console.error(`\n  Error scraping ${link.url}: ${error.message}`);
            }
        }
        
        console.log(`\r  Scraped ${yearPapers.length} papers successfully`);
        papers.push(...yearPapers);
        
    } catch (error) {
        console.error(`Error scraping ${url}: ${error.message}`);
    }
}

async function addSamplePapers() {
    console.log('\nAdding sample papers from CBSE Academic...');
    
    const sampleYears = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
    const subjectCodes = {
        'Accountancy': 'Accountancy',
        'Business Studies': 'BusinessStudies',
        'Economics': 'Economics',
        'English': 'EnglishCore',
        'Mathematics': 'Mathematics'
    };
    
    for (const [subject, code] of Object.entries(subjectCodes)) {
        for (const year of sampleYears) {
            papers.push({
                id: generateId(),
                title: `${subject} ${year}-${year + 1} Sample Question Paper`,
                subject: subject,
                year: year,
                type: 'Sample Paper',
                region: null,
                set: null,
                code: null,
                url: `https://cbseacademic.nic.in/web_material/SQP/ClassXII_${year}_${String(year + 1).slice(2)}/${code}-SQP.pdf`
            });
            
            papers.push({
                id: generateId(),
                title: `${subject} ${year}-${year + 1} Sample Marking Scheme`,
                subject: subject,
                year: year,
                type: 'Sample Marking Scheme',
                region: null,
                set: null,
                code: null,
                url: `https://cbseacademic.nic.in/web_material/SQP/ClassXII_${year}_${String(year + 1).slice(2)}/${code}-MS.pdf`
            });
        }
    }
    
    console.log(`Added ${sampleYears.length * Object.keys(subjectCodes).length * 2} sample papers`);
}

async function main() {
    console.log('Starting CBSE Papers Scraper...\n');
    console.log('This will scrape all papers from supercop.in\n');
    
    for (const [subject, config] of Object.entries(SUBJECTS)) {
        for (const year of config.years) {
            await scrapeYearPage(subject, year);
            await delay(500); // Rate limiting between years
        }
    }
    
    await addSamplePapers();
    
    console.log(`\n=== SCRAPING COMPLETE ===`);
    console.log(`Total papers scraped: ${papers.length}`);
    
    // Save to file
    const outputPath = path.join(__dirname, '..', 'data', 'papers.json');
    fs.writeFileSync(outputPath, JSON.stringify(papers, null, 2));
    console.log(`Saved to ${outputPath}`);
    
    // Print statistics
    const stats = {
        bySubject: {},
        byYear: {},
        byType: {}
    };
    
    papers.forEach(p => {
        stats.bySubject[p.subject] = (stats.bySubject[p.subject] || 0) + 1;
        stats.byYear[p.year] = (stats.byYear[p.year] || 0) + 1;
        stats.byType[p.type] = (stats.byType[p.type] || 0) + 1;
    });
    
    console.log('\nStatistics:');
    console.log('By Subject:', stats.bySubject);
    console.log('By Year:', stats.byYear);
    console.log('By Type:', stats.byType);
}

main().catch(console.error);

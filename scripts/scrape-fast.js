const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration - all subjects and years
const SUBJECTS = {
    'Accountancy': { folder: 'Accountancy', years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025] },
    'Business Studies': { folder: 'Business-Studies', years: [2015, 2016, 2017, 2018, 2019, 2022, 2023, 2024, 2025] },
    'Economics': { folder: 'Economics', years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025] },
    'English': { folder: 'English-Core', years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025] },
    'Mathematics': { folder: 'Maths', years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025] }
};

const papers = [];
let idCounter = 1;
const outputPath = path.join(__dirname, '..', 'data', 'papers.json');

function generateId() {
    return `paper_${String(idCounter++).padStart(4, '0')}`;
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Extract paper links from year page HTML
function extractPaperLinks(html) {
    const links = [];
    const regex = /href="(https:\/\/supercop\.in\/cbse-board-papers\/class12\/[^"]+\/\d+)"\s+class="list-group-item[^"]*"[^>]*>\d+\.\s*([^<]+)/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        links.push({
            url: match[1],
            title: match[2].trim()
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
    
    if (title.toLowerCase().includes('solution')) {
        info.type = 'Marking Scheme';
    }
    
    // Extract code for newer papers
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
        }
    }
    
    return info;
}

async function fetchPage(url, timeout = 15000) {
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: timeout
    });
    return response.data;
}

// Scrape all papers for a subject-year combination
async function scrapeYearPage(subject, year) {
    const config = SUBJECTS[subject];
    const url = `https://supercop.in/cbse-board-papers/class12/${config.folder}-${year}/`;
    
    try {
        const html = await fetchPage(url);
        const paperLinks = extractPaperLinks(html);
        
        console.log(`${subject} ${year}: Found ${paperLinks.length} papers`);
        
        // Process papers in parallel batches of 5
        const batchSize = 5;
        for (let i = 0; i < paperLinks.length; i += batchSize) {
            const batch = paperLinks.slice(i, i + batchSize);
            
            const results = await Promise.all(batch.map(async (link) => {
                try {
                    const paperHtml = await fetchPage(link.url);
                    const pName = extractPName(paperHtml);
                    
                    if (pName) {
                        const info = parsePaperInfo(link.title, subject, year);
                        return {
                            id: generateId(),
                            title: link.title.replace(/\s+/g, ' ').trim(),
                            subject: subject,
                            year: year,
                            type: info.type,
                            region: info.region,
                            set: info.set,
                            code: info.code,
                            url: `https://files.supercop.in/cbse-board-papers/class12/${pName}.pdf`
                        };
                    }
                } catch (error) {
                    // Skip failed papers
                    return null;
                }
            }));
            
            papers.push(...results.filter(r => r !== null));
            await delay(100);
        }
        
    } catch (error) {
        console.error(`Error scraping ${subject} ${year}: ${error.message}`);
    }
}

// Add sample papers from CBSE Academic
function addSamplePapers() {
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
}

// Add Data Science papers (limited availability)
function addDataSciencePapers() {
    const years = [2022, 2023, 2024, 2025];
    
    for (const year of years) {
        // Sample papers
        papers.push({
            id: generateId(),
            title: `Data Science ${year}-${year + 1} Sample Question Paper`,
            subject: 'Data Science',
            year: year,
            type: 'Sample Paper',
            region: null,
            set: null,
            code: null,
            url: `https://cbseacademic.nic.in/web_material/SQP/ClassXII_${year}_${String(year + 1).slice(2)}/DataScience-SQP.pdf`
        });
        
        papers.push({
            id: generateId(),
            title: `Data Science ${year}-${year + 1} Sample Marking Scheme`,
            subject: 'Data Science',
            year: year,
            type: 'Sample Marking Scheme',
            region: null,
            set: null,
            code: null,
            url: `https://cbseacademic.nic.in/web_material/SQP/ClassXII_${year}_${String(year + 1).slice(2)}/DataScience-MS.pdf`
        });
    }
}

async function main() {
    console.log('Starting Fast CBSE Papers Scraper...\n');
    
    // Scrape all subjects and years
    for (const [subject, config] of Object.entries(SUBJECTS)) {
        for (const year of config.years) {
            await scrapeYearPage(subject, year);
        }
    }
    
    // Add sample papers
    console.log('\nAdding sample papers...');
    addSamplePapers();
    addDataSciencePapers();
    
    // Save results
    fs.writeFileSync(outputPath, JSON.stringify(papers, null, 2));
    
    console.log(`\n=== COMPLETE ===`);
    console.log(`Total papers: ${papers.length}`);
    console.log(`Saved to: ${outputPath}`);
    
    // Statistics
    const stats = { bySubject: {}, byYear: {}, byType: {} };
    papers.forEach(p => {
        stats.bySubject[p.subject] = (stats.bySubject[p.subject] || 0) + 1;
        stats.byYear[p.year] = (stats.byYear[p.year] || 0) + 1;
        stats.byType[p.type] = (stats.byType[p.type] || 0) + 1;
    });
    
    console.log('\nBy Subject:', stats.bySubject);
    console.log('By Year:', stats.byYear);
    console.log('By Type:', stats.byType);
}

main().catch(console.error);

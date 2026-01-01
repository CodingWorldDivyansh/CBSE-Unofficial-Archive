const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const SUBJECTS = {
    'Accountancy': { folder: 'Accountancy', years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025] },
    'Business Studies': { folder: 'Business-Studies', years: [2015, 2016, 2017, 2018, 2019, 2022, 2023, 2024, 2025] },
    'Economics': { folder: 'Economics', years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025] },
    'English': { folder: 'English-Core', years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025] },
    'Mathematics': { folder: 'Maths', years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025] },
    'Data Science': { folder: 'Data-Science', years: [2022, 2023, 2024, 2025] }
};

const papers = [];
let idCounter = 1;

function generateId() {
    return `paper_${String(idCounter++).padStart(4, '0')}`;
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Extract pName from page HTML
function extractPName(html) {
    const match = html.match(/pName="([^"]+)"/);
    return match ? match[1] : null;
}

// Extract paper list from year page
function extractPaperLinks(html) {
    const links = [];
    const regex = /href="(https:\/\/supercop\.in\/cbse-board-papers\/class12\/[^"]+\/\d+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        links.push(match[1]);
    }
    return links;
}

// Parse paper info from URL and title
function parsePaperInfo(url, title, subject, year) {
    const info = {
        title: title,
        subject: subject,
        year: year,
        type: 'Question Paper',
        region: null,
        set: null,
        code: null
    };
    
    // Determine type
    if (title.toLowerCase().includes('solution') || title.toLowerCase().includes('marking')) {
        info.type = 'Marking Scheme';
    }
    
    // Extract code for newer papers
    const codeMatch = title.match(/\((\d+-\d+-\d+)\)/);
    if (codeMatch) {
        info.code = codeMatch[1];
        const parts = info.code.split('-');
        const regionCode = parts[1];
        if (regionCode === '1') info.region = 'Delhi';
        else if (regionCode === '2') info.region = 'Outside Delhi';
        else if (regionCode === '3') info.region = 'Compartment';
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

async function scrapePaperPage(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });
        
        const pName = extractPName(response.data);
        const titleMatch = response.data.match(/<title>([^|]+)/);
        const title = titleMatch ? titleMatch[1].trim() : '';
        
        return { pName, title };
    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
        return null;
    }
}

async function scrapeYearPage(subject, year) {
    const config = SUBJECTS[subject];
    const url = `https://supercop.in/cbse-board-papers/class12/${config.folder}-${year}/`;
    
    console.log(`Scraping ${subject} ${year}...`);
    
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });
        
        const paperLinks = extractPaperLinks(response.data);
        console.log(`  Found ${paperLinks.length} papers`);
        
        for (const link of paperLinks) {
            await delay(100); // Rate limiting
            
            const paperData = await scrapePaperPage(link);
            if (paperData && paperData.pName) {
                const info = parsePaperInfo(link, paperData.title, subject, year);
                
                papers.push({
                    id: generateId(),
                    title: paperData.title,
                    subject: subject,
                    year: year,
                    type: info.type,
                    region: info.region,
                    set: info.set,
                    code: info.code,
                    url: `https://files.supercop.in/cbse-board-papers/class12/${paperData.pName}.pdf`
                });
            }
        }
        
    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
    }
}

async function addSamplePapers() {
    console.log('Adding sample papers from CBSE Academic...');
    
    const sampleYears = [2020, 2021, 2022, 2023, 2024, 2025];
    const subjectCodes = {
        'Accountancy': 'Accountancy',
        'Business Studies': 'BusinessStudies',
        'Economics': 'Economics',
        'English': 'EnglishCore',
        'Mathematics': 'Mathematics',
        'Data Science': 'DataScience'
    };
    
    for (const [subject, code] of Object.entries(subjectCodes)) {
        for (const year of sampleYears) {
            if (subject === 'Data Science' && year < 2022) continue;
            
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

async function main() {
    console.log('Starting CBSE Papers Scraper...\n');
    
    for (const [subject, config] of Object.entries(SUBJECTS)) {
        for (const year of config.years) {
            await scrapeYearPage(subject, year);
            await delay(500); // Rate limiting between years
        }
    }
    
    await addSamplePapers();
    
    console.log(`\nTotal papers scraped: ${papers.length}`);
    
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

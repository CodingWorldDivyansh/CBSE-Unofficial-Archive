const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration for subjects
const SUBJECTS_CONFIG = {
    'Accountancy': {
        supercopFolder: 'Accountancy',
        pdfFolder: 'accoutancy',
        code: '67',
        years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025]
    },
    'Business Studies': {
        supercopFolder: 'Business-Studies',
        pdfFolder: 'business-studies',
        code: '66',
        years: [2015, 2016, 2017, 2018, 2019, 2022, 2023, 2024, 2025]
    },
    'Economics': {
        supercopFolder: 'Economics',
        pdfFolder: 'economics',
        code: '58',
        years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025]
    },
    'English': {
        supercopFolder: 'English-Core',
        pdfFolder: 'english-core',
        code: '301',
        years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025]
    },
    'Mathematics': {
        supercopFolder: 'Maths',
        pdfFolder: 'maths',
        code: '65',
        years: [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025]
    },
    'Data Science': {
        supercopFolder: 'Data-Science',
        pdfFolder: 'data-science',
        code: '844',
        years: [2022, 2023, 2024, 2025]
    }
};

const papers = [];
let idCounter = 1;

function generateId() {
    return `paper_${String(idCounter++).padStart(4, '0')}`;
}

// Parse paper info from supercop page title
function parsePaperInfo(title, subject, year) {
    const info = {
        title: title,
        subject: subject,
        year: year,
        type: 'Question Paper',
        region: null,
        set: null,
        code: null
    };
    
    // Check if it's a solution/marking scheme
    if (title.toLowerCase().includes('solution') || title.toLowerCase().includes('marking')) {
        info.type = 'Marking Scheme';
    }
    
    // Extract code for newer papers (e.g., 65-1-1)
    const codeMatch = title.match(/\((\d+-\d+-\d+)\)/);
    if (codeMatch) {
        info.code = codeMatch[1];
        const parts = info.code.split('-');
        // First digit after subject code is region: 1=Delhi, 2=Outside Delhi, 4/5=Foreign
        const regionCode = parts[1];
        if (regionCode === '1') info.region = 'Delhi';
        else if (regionCode === '2') info.region = 'Outside Delhi';
        else if (regionCode === '3') info.region = 'Compartment';
        else if (regionCode === '4' || regionCode === '5' || regionCode === '6' || regionCode === '7') info.region = 'Foreign';
        info.set = parts[2];
    }
    
    // Extract region for older papers
    if (title.includes('All India') || title.includes('All-India')) {
        info.region = 'All India';
    } else if (title.includes('Delhi') && !title.includes('Outside')) {
        info.region = 'Delhi';
    } else if (title.includes('Foreign')) {
        info.region = 'Foreign';
    } else if (title.includes('Outside Delhi')) {
        info.region = 'Outside Delhi';
    }
    
    return info;
}

// Generate PDF URL based on supercop pattern
function generatePdfUrl(subject, year, paperPath) {
    const config = SUBJECTS_CONFIG[subject];
    const baseUrl = 'https://files.supercop.in/cbse-board-papers/class12';
    
    // Convert paper path to PDF path
    // e.g., "Accountancy-Paper-2015(All-India)" -> "a_2015/Accountancy Paper 2015(All India)"
    let pdfPath = paperPath
        .replace(/-/g, ' ')
        .replace(/\(/g, '(')
        .replace(/\)/g, ')');
    
    // Construct the URL based on the loader.js pattern
    // website + "/" + header + "/" + CName + "/" + pName + ".pdf"
    // header = "cbse-board-papers"
    // CName = "class12"
    // pName = subject folder + "/" + paper name
    
    return `${baseUrl}/${config.pdfFolder}/${pdfPath}.pdf`;
}

// Generate papers for a subject and year based on known patterns
function generatePapersForSubjectYear(subject, year) {
    const config = SUBJECTS_CONFIG[subject];
    const subjectName = subject === 'English' ? 'English Core' : subject;
    
    if (year >= 2022) {
        // New format with codes
        // Regions: 1=Delhi, 2=Outside Delhi, 4/5/6/7=Foreign sets
        const regionSets = [
            { region: 'Delhi', codes: ['1-1', '1-2', '1-3'] },
            { region: 'Outside Delhi', codes: ['2-1', '2-2', '2-3'] },
            { region: 'Foreign', codes: ['4-1', '4-2', '4-3', '5-1', '5-2', '5-3'] }
        ];
        
        for (const rs of regionSets) {
            for (const code of rs.codes) {
                const fullCode = `${config.code}-${code}`;
                const setNum = code.split('-')[1];
                
                // Question Paper
                papers.push({
                    id: generateId(),
                    title: `${subjectName} ${year} Question Paper Code (${fullCode})`,
                    subject: subject,
                    year: year,
                    type: 'Question Paper',
                    region: rs.region,
                    set: setNum,
                    code: fullCode,
                    url: `https://files.supercop.in/cbse-board-papers/class12/${config.pdfFolder}/${subjectName} Question Paper ${year} Code (${fullCode}).pdf`
                });
                
                // Marking Scheme
                papers.push({
                    id: generateId(),
                    title: `${subjectName} ${year} Solution Code (${fullCode})`,
                    subject: subject,
                    year: year,
                    type: 'Marking Scheme',
                    region: rs.region,
                    set: setNum,
                    code: fullCode,
                    url: `https://files.supercop.in/cbse-board-papers/class12/${config.pdfFolder}/${subjectName} Solution ${year} Code (${fullCode}).pdf`
                });
            }
        }
    } else {
        // Old format with regions
        const regions = ['All India', 'Delhi', 'Foreign'];
        
        for (const region of regions) {
            const regionPath = region.replace(/ /g, '-');
            
            // Question Paper
            papers.push({
                id: generateId(),
                title: `${subjectName} ${year} Question Paper (${region})`,
                subject: subject,
                year: year,
                type: 'Question Paper',
                region: region,
                set: null,
                code: null,
                url: `https://files.supercop.in/cbse-board-papers/class12/${config.pdfFolder}/${subjectName} Paper ${year}(${region}).pdf`
            });
            
            // Marking Scheme
            papers.push({
                id: generateId(),
                title: `${subjectName} ${year} Solution (${region})`,
                subject: subject,
                year: year,
                type: 'Marking Scheme',
                region: region,
                set: null,
                code: null,
                url: `https://files.supercop.in/cbse-board-papers/class12/${config.pdfFolder}/${subjectName} Solution ${year}(${region}).pdf`
            });
        }
    }
}

// Add sample papers from CBSE Academic
function addSamplePapers() {
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
            
            // Sample Question Paper
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
            
            // Sample Marking Scheme
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

// Add compartment papers
function addCompartmentPapers() {
    const compartmentYears = [2017, 2018, 2019, 2022, 2023, 2024];
    
    for (const subject of Object.keys(SUBJECTS_CONFIG)) {
        if (subject === 'Data Science') continue;
        
        const config = SUBJECTS_CONFIG[subject];
        const subjectName = subject === 'English' ? 'English Core' : subject;
        
        for (const year of compartmentYears) {
            papers.push({
                id: generateId(),
                title: `${subjectName} ${year} Compartment Paper`,
                subject: subject,
                year: year,
                type: 'Compartment',
                region: null,
                set: null,
                code: null,
                url: `https://files.supercop.in/cbse-board-papers/class12/${config.pdfFolder}/${subjectName} Compartment ${year}.pdf`
            });
        }
    }
}

// Main function to generate all papers
async function generateDatabase() {
    console.log('Generating CBSE Papers Database...\n');
    
    // Generate papers for each subject and year
    for (const [subject, config] of Object.entries(SUBJECTS_CONFIG)) {
        console.log(`Processing ${subject}...`);
        for (const year of config.years) {
            generatePapersForSubjectYear(subject, year);
        }
    }
    
    // Add sample papers
    console.log('Adding sample papers...');
    addSamplePapers();
    
    // Add compartment papers
    console.log('Adding compartment papers...');
    addCompartmentPapers();
    
    console.log(`\nTotal papers generated: ${papers.length}`);
    
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

generateDatabase().catch(console.error);

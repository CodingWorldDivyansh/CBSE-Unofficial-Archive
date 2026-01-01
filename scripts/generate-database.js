const fs = require('fs');
const path = require('path');

// Based on actual supercop URL patterns discovered
const SUBJECTS_CONFIG = {
    'Accountancy': {
        pdfFolder: 'accoutancy',
        code: '67',
        shortCode: 'a',
        years: {
            // Old format years (region-based)
            2015: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2016: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2017: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2018: { format: 'old', regions: ['All India'] },
            // New format years (code-based)
            2019: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2020: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2022: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2023: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2024: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2025: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3], [6,1], [6,2], [6,3], [7,1], [7,2], [7,3]] }
        }
    },
    'Business Studies': {
        pdfFolder: 'business-studies',
        code: '66',
        shortCode: 'bs',
        years: {
            2015: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2016: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2017: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2018: { format: 'old', regions: ['All India'] },
            2019: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2022: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2023: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2024: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2025: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3], [6,1], [6,2], [6,3], [7,1], [7,2], [7,3]] }
        }
    },
    'Economics': {
        pdfFolder: 'economics',
        code: '58',
        shortCode: 'eco',
        years: {
            2015: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2016: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2017: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2018: { format: 'old', regions: ['All India'] },
            2019: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2020: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2022: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2023: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2024: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2025: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3], [6,1], [6,2], [6,3], [7,1], [7,2], [7,3]] }
        }
    },
    'English': {
        pdfFolder: 'english-core',
        code: '301',
        shortCode: 'eng',
        displayName: 'English Core',
        years: {
            2015: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2016: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2017: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2018: { format: 'old', regions: ['All India'] },
            2019: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2020: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2022: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2023: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2024: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2025: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3], [6,1], [6,2], [6,3], [7,1], [7,2], [7,3]] }
        }
    },
    'Mathematics': {
        pdfFolder: 'maths',
        code: '65',
        shortCode: 'm',
        displayName: 'Maths',
        years: {
            2015: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2016: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2017: { format: 'old', regions: ['All India', 'Delhi', 'Foreign'] },
            2018: { format: 'old', regions: ['All India'] },
            2019: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2020: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2022: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2023: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2024: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [3,1], [3,2], [3,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3]] },
            2025: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3], [4,1], [4,2], [4,3], [5,1], [5,2], [5,3], [6,1], [6,2], [6,3], [7,1], [7,2], [7,3]] }
        }
    },
    'Data Science': {
        pdfFolder: 'data-science',
        code: '844',
        shortCode: 'ds',
        years: {
            2022: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3]] },
            2023: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3]] },
            2024: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3]] },
            2025: { format: 'new', sets: [[1,1], [1,2], [1,3], [2,1], [2,2], [2,3]] }
        }
    }
};

const papers = [];
let idCounter = 1;

function generateId() {
    return `paper_${String(idCounter++).padStart(4, '0')}`;
}

function getRegionFromCode(regionCode) {
    switch(regionCode) {
        case 1: return 'Delhi';
        case 2: return 'Outside Delhi';
        case 3: return 'Compartment';
        case 4:
        case 5:
        case 6:
        case 7: return 'Foreign';
        default: return 'Other';
    }
}

function generateOldFormatPapers(subject, year, config, yearConfig) {
    const displayName = config.displayName || subject;
    const shortCode = config.shortCode;
    
    for (const region of yearConfig.regions) {
        const regionCode = region === 'All India' ? '' : 
                          region === 'Delhi' ? '_d' : 
                          region === 'Foreign' ? '_f' : '';
        
        // Question Paper
        papers.push({
            id: generateId(),
            title: `${displayName} ${year} Question Paper (${region})`,
            subject: subject,
            year: year,
            type: 'Question Paper',
            region: region,
            set: null,
            code: null,
            url: `https://files.supercop.in/cbse-board-papers/class12/${config.pdfFolder}/${shortCode}_${year}${regionCode}.pdf`
        });
        
        // Solution/Marking Scheme
        papers.push({
            id: generateId(),
            title: `${displayName} ${year} Solution (${region})`,
            subject: subject,
            year: year,
            type: 'Marking Scheme',
            region: region,
            set: null,
            code: null,
            url: `https://files.supercop.in/cbse-board-papers/class12/${config.pdfFolder}/${shortCode}_${year}${regionCode}_sol.pdf`
        });
    }
}

function generateNewFormatPapers(subject, year, config, yearConfig) {
    const displayName = config.displayName || subject;
    const code = config.code;
    
    for (const [regionCode, setNum] of yearConfig.sets) {
        const fullCode = `${code}-${regionCode}-${setNum}`;
        const region = getRegionFromCode(regionCode);
        
        // Question Paper
        papers.push({
            id: generateId(),
            title: `${displayName} ${year} Question Paper Code (${fullCode})`,
            subject: subject,
            year: year,
            type: 'Question Paper',
            region: region,
            set: String(setNum),
            code: fullCode,
            url: `https://files.supercop.in/cbse-board-papers/class12/${config.pdfFolder}/${code}_${year}_${regionCode}_${setNum}.pdf`
        });
        
        // Solution/Marking Scheme
        papers.push({
            id: generateId(),
            title: `${displayName} ${year} Solution Code (${fullCode})`,
            subject: subject,
            year: year,
            type: 'Marking Scheme',
            region: region,
            set: String(setNum),
            code: fullCode,
            url: `https://files.supercop.in/cbse-board-papers/class12/${config.pdfFolder}/${code}_${year}_${regionCode}_${setNum}_sol.pdf`
        });
    }
}

function addSamplePapers() {
    console.log('Adding sample papers from CBSE Academic...');
    
    const sampleYears = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
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

function addCompartmentPapers() {
    console.log('Adding compartment papers...');
    
    const compartmentYears = [2017, 2018, 2019, 2022, 2023, 2024];
    
    for (const [subject, config] of Object.entries(SUBJECTS_CONFIG)) {
        if (subject === 'Data Science') continue;
        
        const displayName = config.displayName || subject;
        
        for (const year of compartmentYears) {
            papers.push({
                id: generateId(),
                title: `${displayName} ${year} Compartment Paper`,
                subject: subject,
                year: year,
                type: 'Compartment',
                region: 'Compartment',
                set: null,
                code: null,
                url: `https://files.supercop.in/cbse-board-papers/class12/${config.pdfFolder}/${config.shortCode}_${year}_comp.pdf`
            });
        }
    }
}

// Add papers from alternative sources (selfstudys, vedantu, etc.)
function addAlternativeSources() {
    console.log('Adding papers from alternative sources...');
    
    // SelfStudys patterns
    const selfstudysSubjects = {
        'Accountancy': 'accountancy',
        'Business Studies': 'business-studies',
        'Economics': 'economics',
        'English': 'english-core',
        'Mathematics': 'mathematics'
    };
    
    for (const [subject, urlSubject] of Object.entries(selfstudysSubjects)) {
        for (let year = 2015; year <= 2025; year++) {
            if (year === 2021) continue; // COVID year
            
            // Add alternative source papers
            papers.push({
                id: generateId(),
                title: `${subject} ${year} Question Paper (SelfStudys)`,
                subject: subject,
                year: year,
                type: 'Question Paper',
                region: 'All India',
                set: null,
                code: null,
                url: `https://www.selfstudys.com/uploads/cbse-prev-paper/class-12/${urlSubject}/${year}/question-paper.pdf`
            });
        }
    }
}

function generateDatabase() {
    console.log('Generating CBSE Papers Database...\n');
    
    // Generate papers for each subject and year
    for (const [subject, config] of Object.entries(SUBJECTS_CONFIG)) {
        console.log(`Processing ${subject}...`);
        
        for (const [yearStr, yearConfig] of Object.entries(config.years)) {
            const year = parseInt(yearStr);
            
            if (yearConfig.format === 'old') {
                generateOldFormatPapers(subject, year, config, yearConfig);
            } else {
                generateNewFormatPapers(subject, year, config, yearConfig);
            }
        }
    }
    
    // Add sample papers
    addSamplePapers();
    
    // Add compartment papers
    addCompartmentPapers();
    
    // Add alternative sources
    addAlternativeSources();
    
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

generateDatabase();

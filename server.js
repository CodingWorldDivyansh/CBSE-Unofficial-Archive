const express = require('express');
const cors = require('cors');
const axios = require('axios');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 12000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load papers database
let papersDB = [];
try {
    papersDB = require('./data/papers.json');
} catch (e) {
    console.log('Papers database not found, will be created');
}

// PDF signature check (first bytes should be %PDF)
const isPDF = (buffer) => {
    if (buffer.length < 4) return false;
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
};

// --------------------
// NCERT / Class 12 resources (hardcoded)
// --------------------

const googleDriveDirectDownload = (fileId) => `https://drive.google.com/uc?export=download&id=${fileId}`;

const makeNcertChapters = ({ baseCode, count, subject, bookTitle, idPrefix }) => {
    const chapters = [];
    for (let i = 1; i <= count; i++) {
        const two = String(i).padStart(2, '0');
        const id = `${idPrefix}_ch${two}`;
        chapters.push({
            id,
            title: `Chapter ${i}`,
            url: `https://ncert.nic.in/textbook/pdf/${baseCode}${two}.pdf`,
            filename: `${subject}_${bookTitle.replace(/\s+/g, '_')}_Chapter_${two}.pdf`
        });
    }
    return chapters;
};

const NCERT_DB = {
    "English": {
        subject: "English",
        books: [
            {
                id: "english_flamingo",
                title: "Flamingo (Core)",
                whole: {
                    id: "english_flamingo_whole",
                    url: "https://ncert.nic.in/textbook/pdf/lefl1ps.pdf",
                    filename: "English_Flamingo_Full.pdf"
                },
                chapters: makeNcertChapters({ baseCode: 'lefl1', count: 14, subject: 'English', bookTitle: 'Flamingo', idPrefix: 'english_flamingo' })
            },
            {
                id: "english_vistas",
                title: "Vistas (Supplementary Reader)",
                whole: {
                    id: "english_vistas_whole",
                    url: "https://ncert.nic.in/textbook/pdf/levt1ps.pdf",
                    filename: "English_Vistas_Full.pdf"
                },
                chapters: makeNcertChapters({ baseCode: 'levt1', count: 8, subject: 'English', bookTitle: 'Vistas', idPrefix: 'english_vistas' })
            }
        ]
    },

    "Mathematics": {
        subject: "Mathematics",
        books: [
            {
                id: "maths_part1",
                title: "Mathematics Part I",
                whole: {
                    id: "maths_part1_whole",
                    url: "https://ncert.nic.in/textbook/pdf/lemh1ps.pdf",
                    filename: "Mathematics_Part_I_Full.pdf"
                },
                chapters: makeNcertChapters({ baseCode: 'lemh1', count: 6, subject: 'Mathematics', bookTitle: 'Maths_Part_I', idPrefix: 'maths_part1' })
            },
            {
                id: "maths_part2",
                title: "Mathematics Part II",
                whole: {
                    id: "maths_part2_whole",
                    url: "https://ncert.nic.in/textbook/pdf/lemh2ps.pdf",
                    filename: "Mathematics_Part_II_Full.pdf"
                },
                chapters: makeNcertChapters({ baseCode: 'lemh2', count: 7, subject: 'Mathematics', bookTitle: 'Maths_Part_II', idPrefix: 'maths_part2' })
            }
        ]
    },

    "Accountancy": {
        subject: "Accountancy",
        books: [
            {
                id: "acc_part1",
                title: "Accountancy Part I",
                whole: {
                    id: "acc_part1_whole",
                    url: "https://ncert.nic.in/textbook/pdf/leac1ps.pdf",
                    filename: "Accountancy_Part_I_Full.pdf"
                },
                chapters: makeNcertChapters({ baseCode: 'leac1', count: 5, subject: 'Accountancy', bookTitle: 'Accountancy_Part_I', idPrefix: 'acc_part1' })
            },
            {
                id: "acc_part2",
                title: "Accountancy Part II",
                whole: {
                    id: "acc_part2_whole",
                    url: "https://ncert.nic.in/textbook/pdf/leac2ps.pdf",
                    filename: "Accountancy_Part_II_Full.pdf"
                },
                chapters: makeNcertChapters({ baseCode: 'leac2', count: 6, subject: 'Accountancy', bookTitle: 'Accountancy_Part_II', idPrefix: 'acc_part2' })
            }
        ]
    },

    "Economics": {
        subject: "Economics",
        books: [
            {
                id: "eco_ied",
                title: "Indian Economic Development",
                whole: {
                    id: "eco_ied_whole",
                    url: "https://ncert.nic.in/textbook/pdf/keec1ps.pdf",
                    filename: "Economics_Indian_Economic_Development_Full.pdf"
                },
                chapters: makeNcertChapters({ baseCode: 'keec1', count: 8, subject: 'Economics', bookTitle: 'Indian_Economic_Development', idPrefix: 'eco_ied' })
            },
            {
                id: "eco_macro",
                title: "Introductory Macroeconomics",
                whole: {
                    id: "eco_macro_whole",
                    url: "https://ncert.nic.in/textbook/pdf/leec1ps.pdf",
                    filename: "Economics_Introductory_Macroeconomics_Full.pdf"
                },
                chapters: makeNcertChapters({ baseCode: 'leec1', count: 6, subject: 'Economics', bookTitle: 'Introductory_Macroeconomics', idPrefix: 'eco_macro' })
            }
        ]
    },

    "Business Studies": {
        subject: "Business Studies",
        books: [
            {
                id: "bst_part1",
                title: "Business Studies Part I",
                whole: {
                    id: "bst_part1_whole",
                    url: "https://ncert.nic.in/textbook/pdf/lebs1ps.pdf",
                    filename: "Business_Studies_Part_I_Full.pdf"
                },
                chapters: makeNcertChapters({ baseCode: 'lebs1', count: 8, subject: 'Business Studies', bookTitle: 'Business_Studies_Part_I', idPrefix: 'bst_part1' })
            },
            {
                id: "bst_part2",
                title: "Business Studies Part II",
                whole: {
                    id: "bst_part2_whole",
                    url: "https://ncert.nic.in/textbook/pdf/lebs2ps.pdf",
                    filename: "Business_Studies_Part_II_Full.pdf"
                },
                chapters: makeNcertChapters({ baseCode: 'lebs2', count: 4, subject: 'Business Studies', bookTitle: 'Business_Studies_Part_II', idPrefix: 'bst_part2' })
            }
        ]
    },

    "Data Science": {
        subject: "Data Science",
        books: [
            {
                id: "ds_microsoft_student_handbook",
                title: "Data Science (Microsoft / CBSE) Student Handbook",
                whole: {
                    id: "ds_microsoft_student_handbook_whole",
                    url: "https://cbseacademic.nic.in/web_material/codeingDS/classXII_DS_Student_Handbook.pdf",
                    filename: "Data_Science_Microsoft_Student_Handbook.pdf"
                },
                chapters: []
            },
            {
                id: "ds_microsoft_teacher_handbook",
                title: "Data Science (Microsoft / CBSE) Teacher Handbook",
                whole: {
                    id: "ds_microsoft_teacher_handbook_whole",
                    url: "https://cbseacademic.nic.in/web_material/codeingDS/classXII_DS_Teacher_Handbook.pdf",
                    filename: "Data_Science_Microsoft_Teacher_Handbook.pdf"
                },
                chapters: []
            },
            {
                id: "ds_google_drive_book",
                title: "Data Science (Provided PDF)",
                whole: {
                    id: "ds_google_drive_book_whole",
                    url: googleDriveDirectDownload('1auNmPmWRHfhCYTtZ3nTk33YF99p1AFB9'),
                    filename: "Data_Science_Provided.pdf"
                },
                chapters: []
            },
            {
                id: "ds_employability_skills",
                title: "Employability Skills (Class XII)",
                whole: {
                    id: "ds_employability_skills_whole",
                    url: "https://cbseacademic.nic.in/web_material/Curriculum21/publication/srsec/Employability_Skills_XII.pdf",
                    filename: "Employability_Skills_Class_XII.pdf"
                },
                chapters: []
            }
        ]
    }
};

const NCERT_INDEX = (() => {
    const index = {};
    Object.values(NCERT_DB).forEach(subject => {
        subject.books.forEach(book => {
            if (book.whole?.id) {
                index[book.whole.id] = {
                    url: book.whole.url,
                    filename: book.whole.filename || `${book.title.replace(/\s+/g, '_')}.pdf`
                };
            }
            (book.chapters || []).forEach(ch => {
                index[ch.id] = {
                    url: ch.url,
                    filename: ch.filename || `${book.title.replace(/\s+/g, '_')}_${ch.title.replace(/\s+/g, '_')}.pdf`
                };
            });
        });
    });
    return index;
})();

// API: List NCERT resources
app.get('/api/ncert', (req, res) => {
    const { subject } = req.query;

    if (!subject) {
        return res.json({
            subjects: Object.keys(NCERT_DB).sort()
        });
    }

    const entry = NCERT_DB[subject];
    if (!entry) {
        return res.status(404).json({ error: 'Subject not found' });
    }

    return res.json(entry);
});

// API: Download NCERT item (proxied)
app.get('/api/ncert/download/:id', async (req, res) => {
    const item = NCERT_INDEX[req.params.id];

    if (!item) {
        return res.status(404).json({ error: 'NCERT item not found' });
    }

    try {
        const response = await axios({
            method: 'GET',
            url: item.url,
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/pdf,*/*',
                'Referer': new URL(item.url).origin
            },
            maxRedirects: 5
        });

        const buffer = Buffer.from(response.data);

        if (!isPDF(buffer)) {
            return res.status(400).json({ error: 'Invalid PDF file received from source' });
        }

        const filename = item.filename || 'ncert.pdf';

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);

    } catch (error) {
        console.error(`NCERT download error for ${req.params.id}:`, error.message);
        res.status(500).json({ error: 'Failed to download PDF', details: error.message });
    }
});

// API: Get all papers with optional filters
app.get('/api/papers', (req, res) => {
    let filtered = [...papersDB];
    
    const { year, subject, region, set, type, search } = req.query;
    
    if (year) filtered = filtered.filter(p => p.year === parseInt(year));
    if (subject) filtered = filtered.filter(p => p.subject.toLowerCase() === subject.toLowerCase());
    if (region) filtered = filtered.filter(p => p.region.toLowerCase() === region.toLowerCase());
    if (set) filtered = filtered.filter(p => p.set === set);
    if (type) filtered = filtered.filter(p => p.type.toLowerCase() === type.toLowerCase());
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(searchLower) ||
            p.subject.toLowerCase().includes(searchLower) ||
            p.year.toString().includes(searchLower)
        );
    }
    
    res.json({
        total: filtered.length,
        papers: filtered
    });
});

// API: Get filter options
app.get('/api/filters', (req, res) => {
    const years = [...new Set(papersDB.map(p => p.year))].sort((a, b) => b - a);
    const subjects = [...new Set(papersDB.map(p => p.subject))].sort();
    const regions = [...new Set(papersDB.map(p => p.region))].sort();
    const sets = [...new Set(papersDB.map(p => p.set))].filter(s => s).sort();
    const types = [...new Set(papersDB.map(p => p.type))].sort();
    
    res.json({ years, subjects, regions, sets, types });
});

// API: Download single PDF (proxied)
app.get('/api/download/:id', async (req, res) => {
    const paper = papersDB.find(p => p.id === req.params.id);
    
    if (!paper) {
        return res.status(404).json({ error: 'Paper not found' });
    }
    
    try {
        const response = await axios({
            method: 'GET',
            url: paper.url,
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/pdf,*/*',
                'Referer': new URL(paper.url).origin
            },
            maxRedirects: 5
        });
        
        const buffer = Buffer.from(response.data);
        
        // Verify it's a valid PDF
        if (!isPDF(buffer)) {
            return res.status(400).json({ error: 'Invalid PDF file received from source' });
        }
        
        const filename = `${paper.subject}_${paper.year}_${paper.type}${paper.set ? '_Set' + paper.set : ''}${paper.region ? '_' + paper.region : ''}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
        
    } catch (error) {
        console.error(`Download error for ${paper.id}:`, error.message);
        res.status(500).json({ error: 'Failed to download PDF', details: error.message });
    }
});

// API: Download multiple PDFs as ZIP
app.post('/api/download-zip', async (req, res) => {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No paper IDs provided' });
    }
    
    const papers = papersDB.filter(p => ids.includes(p.id));
    
    if (papers.length === 0) {
        return res.status(404).json({ error: 'No papers found for provided IDs' });
    }
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="CBSE_Papers.zip"');
    
    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);
    
    for (const paper of papers) {
        try {
            const response = await axios({
                method: 'GET',
                url: paper.url,
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/pdf,*/*',
                    'Referer': new URL(paper.url).origin
                },
                maxRedirects: 5
            });
            
            const buffer = Buffer.from(response.data);
            
            if (isPDF(buffer)) {
                const filename = `${paper.subject}/${paper.year}_${paper.type}${paper.set ? '_Set' + paper.set : ''}${paper.region ? '_' + paper.region : ''}.pdf`;
                archive.append(buffer, { name: filename });
            }
        } catch (error) {
            console.error(`Failed to add ${paper.id} to ZIP:`, error.message);
        }
    }
    
    archive.finalize();
});

// API: Verify a paper URL
app.get('/api/verify/:id', async (req, res) => {
    const paper = papersDB.find(p => p.id === req.params.id);
    
    if (!paper) {
        return res.status(404).json({ error: 'Paper not found' });
    }
    
    try {
        const response = await axios({
            method: 'HEAD',
            url: paper.url,
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            maxRedirects: 5
        });
        
        const contentType = response.headers['content-type'] || '';
        const contentLength = response.headers['content-length'];
        
        res.json({
            id: paper.id,
            valid: contentType.includes('pdf') || contentType.includes('octet-stream'),
            contentType,
            size: contentLength ? parseInt(contentLength) : null
        });
    } catch (error) {
        res.json({
            id: paper.id,
            valid: false,
            error: error.message
        });
    }
});

// API: Get stats
app.get('/api/stats', (req, res) => {
    const stats = {
        totalPapers: papersDB.length,
        bySubject: {},
        byYear: {},
        byType: {}
    };
    
    papersDB.forEach(p => {
        stats.bySubject[p.subject] = (stats.bySubject[p.subject] || 0) + 1;
        stats.byYear[p.year] = (stats.byYear[p.year] || 0) + 1;
        stats.byType[p.type] = (stats.byType[p.type] || 0) + 1;
    });
    
    res.json(stats);
});

// Serve frontend (Express 5 compatible)
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`CBSE Papers Server running on port ${PORT}`);
    console.log(`Total papers in database: ${papersDB.length}`);
});

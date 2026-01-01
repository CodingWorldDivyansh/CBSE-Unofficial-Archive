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

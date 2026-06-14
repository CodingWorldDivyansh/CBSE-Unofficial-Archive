const express = require('express');
const app = express();
const path = require('path');
const archiver = require('archiver');

app.use(express.json({ limit: '10mb' })); // Increased limit to support larger arrays of files

// Cache control and static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour for data
    }
  }
}));

// Helper to fetch with retry and exponential backoff
async function fetchWithRetry(url, options = {}, retries = 2, delay = 500) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      if (response.status === 404) {
        return response; // Don't retry 404 Not Found
      }
      throw new Error(`HTTP status ${response.status}`);
    } catch (err) {
      if (i === retries) {
        throw err;
      }
      console.warn(`[Retry] Fetch failed for ${url} (attempt ${i + 1}/${retries + 1}). Retrying in ${delay}ms... Error: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

// Helper to run tasks with concurrency limit
async function runWithConcurrencyLimit(tasks, limit) {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

// ZIP Download API Endpoint
app.post('/api/download-zip', async (req, res) => {
  const { files } = req.body;
  // files = [{ url: "https://...", filename: "Paper_Name.pdf" }, ...]

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  if (files.length > 2000) {
    return res.status(400).json({ error: 'Maximum 2000 files per download' });
  }

  // Validate all URLs are PDFs from allowed domains
  const allowedDomains = [
    'cbse.gov.in', 'cbseacademic.nic.in', 'educart.co',
    'selfstudys.com', 'mycbseguide.com', 'vedantu.com',
    'jagranjosh.com', 'careers360.com', 'drive.google.com',
    'docs.google.com', 'scribd.com'
  ];

  for (const file of files) {
    try {
      const url = new URL(file.url);
      const isAllowed = allowedDomains.some(d => url.hostname.endsWith(d));
      if (!isAllowed) {
        return res.status(400).json({ error: `Domain not allowed: ${url.hostname}` });
      }
    } catch {
      return res.status(400).json({ error: `Invalid URL: ${file.url}` });
    }
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="CBSE_Papers.zip"');

  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.pipe(res);

  archive.on('error', (err) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create ZIP' });
    }
  });

  // Create task functions for each file to fetch
  const fetchTasks = files.map((file) => async () => {
    try {
      const response = await fetchWithRetry(file.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/pdf'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(30000) // 30 second timeout per file
      }, 2, 500); // 2 retries, initial delay 500ms

      if (!response.ok) {
        console.warn(`Failed to fetch ${file.url}: ${response.status}`);
        archive.append(`Failed to download: ${file.url}\nHTTP Status: ${response.status}`, {
          name: file.filename.replace('.pdf', '_DOWNLOAD_FAILED.txt')
        });
        return;
      }

      const buffer = await response.arrayBuffer();
      archive.append(Buffer.from(buffer), { name: file.filename });
    } catch (err) {
      console.warn(`Error fetching ${file.url}:`, err.message);
      archive.append(`Failed to download: ${file.url}\nError: ${err.message}`, {
        name: file.filename.replace('.pdf', '_DOWNLOAD_FAILED.txt')
      });
    }
  });

  // Execute downloads in parallel with a concurrency limit of 5
  await runWithConcurrencyLimit(fetchTasks, 5);
  archive.finalize();
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback — serve index.html for all non-API, non-static routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CBSE Archive server running on port ${PORT}`);
});

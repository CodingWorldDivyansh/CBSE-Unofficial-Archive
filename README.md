# CBSE Unofficial Archive

A premium, production-ready unofficial archive hosting CBSE Class 12 question papers, marking schemes, sample papers, and compartment papers for the **Commerce stream** (Business Studies, Accountancy, Economics) from **2015 to 2026** (inclusive).

## 🚀 Features

- **Massive Database:** Contains **1,740+** individual sets and regions papers.
- **Zero-Storage ZIP downloads:** Select multiple papers via custom checkboxes and download them packaged as a single ZIP folder generated on-the-fly. No cloud file storage needed.
- **Direct PDF downloads:** Clicking a single paper download opens the PDF file directly from the official CBSE Academic servers.
- **Premium Dark Mode UI:** Built with Vanilla CSS utilizing glassmorphism (frosted glass elements), animated gradient hero section, card lift micro-animations, and custom checkboxes.
- **Bookmarkable Filters:** URLs automatically sync with active filters, allowing users to share filtered links directly.
- **Fully Accessible:** Outfitted with keyboard focus rings, ARIA labels, semantic markup, and staggered entrance animations.

## 📁 Directory Structure

```
CBSE-Unofficial-Archive/
├── server.js                     # Express Node.js server (serves site + ZIP API)
├── package.json                  # Dependencies (Express, Archiver)
├── render.yaml                   # Render.com deployment setup
├── .gitignore                    # Git ignore lists
├── README.md                     # Project documentation
│
├── public/                       # Static files
│   ├── index.html                # Main single-page application (SPA) layout
│   ├── css/
│   │   └── styles.css            # Custom glassmorphic CSS styling
│   ├── js/
│   │   ├── app.js                # App coordinator and stats generator
│   │   ├── filters.js            # Subject, year, region, type filtering + hash sync
│   │   ├── renderer.js           # Animated paper card DOM rendering
│   │   ├── selection.js          # Multi-select, Shift+Click, and download bar state
│   │   └── download.js           # ZIP API post, direct downloads, and Toast notifications
│   ├── data/
│   │   └── papers.json           # Catalog of all CBSE papers
│   └── assets/
│       └── favicon.svg           # Custom SVG favicon
│
└── scripts/
    └── verify-catalog.js         # Integrity verification script
```

## 🛠️ Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start Development Server (with watch mode):**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

3. **Verify Catalog Integrity:**
   Runs verification scripts against the JSON catalog:
   ```bash
   npm run verify
   ```

## ☁️ Deployment on Render.com

This project is configured to deploy directly to [Render.com](https://render.com) using the included `render.yaml` specification:

1. Connect your GitHub repository to Render.
2. Render will automatically parse the `render.yaml` file, spin up a Node web service, run `npm install` followed by `npm start`, and set up long-term assets cache control headers.

## 📈 Scaling to More Subjects/Years

To expand this archive to include Science, Humanities, or additional years:

1. **Find Source URLs:** Collect PDF links for sample papers (from `cbseacademic.nic.in` under `web_material/SQP/`) or board exam papers.
2. **Add Entries:** Add the new objects to `public/data/papers.json` using the schema:
   ```json
   {
     "id": "subject-year-examType-region-setN-qp",
     "subject": "Subject Name",
     "subjectCode": "XXX",
     "year": YYYY,
     "examType": "Main|Compartment|Sample",
     "term": null,
     "paperCode": "XX/X/X",
     "region": "Delhi|All India|Foreign",
     "set": 1,
     "type": "Question Paper|Marking Scheme",
     "sourceUrl": "https://...",
     "directDownload": true,
     "available": true,
     "filename": "Subject_Year_ExamType_Region_SetName_QP.pdf",
     "notes": null
   }
   ```
3. **Verify:** Run `npm run verify` to validate formatting and check for ID duplicates before committing changes.

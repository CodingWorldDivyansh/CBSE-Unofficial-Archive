# CBSE Class 12 Past Papers Archive (2015-2025)

A comprehensive web application for downloading CBSE Class 12 past papers, marking schemes, and sample papers for personal educational use.

## Features

- **1108+ Verified PDFs** across 6 subjects and 11 years
- **Direct PDF Downloads** - No redirects, actual PDF files
- **Bulk Download as ZIP** - Select multiple papers and download as a single ZIP file
- **Advanced Filtering** - Filter by year, subject, region, paper type, and set
- **Search Functionality** - Search papers by title
- **Dark/Light Mode** - Toggle between themes
- **Mobile Responsive** - Works on all devices
- **PDF Verification** - All PDFs are verified to be valid

## Subjects Covered

- Accountancy
- Business Studies
- Data Science
- Economics
- English (Core)
- Mathematics

## Years Covered

2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025

## Paper Types

- Question Papers
- Marking Schemes
- Sample Papers
- Sample Marking Schemes

## Regions

- All India
- Delhi
- Outside Delhi
- Foreign
- Compartment

## Tech Stack

- **Backend**: Node.js, Express 5
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **PDF Handling**: Axios for proxying, Archiver for ZIP creation
- **Data Source**: Supercop.in (mirror of CBSE papers)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cbse-papers-website.git
cd cbse-papers-website

# Install dependencies
npm install

# Start the server
npm start
```

## Environment Variables

- `PORT` - Server port (default: 12000)

## Deployment

### Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the following:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

### Other Platforms

The app can be deployed on any Node.js hosting platform like:
- Heroku
- Railway
- Vercel (with serverless functions)
- DigitalOcean App Platform

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/papers` | GET | Get papers with optional filters |
| `/api/filters` | GET | Get available filter options |
| `/api/download/:id` | GET | Download a single PDF |
| `/api/download-zip` | POST | Download multiple PDFs as ZIP |
| `/api/verify/:id` | GET | Verify a PDF is valid |
| `/api/stats` | GET | Get database statistics |

### Query Parameters for `/api/papers`

- `year` - Filter by year (e.g., 2022)
- `subject` - Filter by subject (e.g., Mathematics)
- `region` - Filter by region (e.g., Delhi)
- `type` - Filter by paper type (e.g., Question Paper)
- `set` - Filter by set number (e.g., 1)
- `search` - Search in paper titles
- `page` - Page number (default: 1)
- `limit` - Papers per page (default: 20)

## License

This project is for personal educational use only. All papers are sourced from publicly available resources and belong to CBSE.

## Disclaimer

This website is not affiliated with CBSE. All papers are provided for educational purposes only. If you are a copyright holder and want any content removed, please contact us.

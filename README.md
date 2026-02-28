# Peraturan Perpajakan Indonesia

Aplikasi web pencarian peraturan perpajakan Indonesia berbasis teks yang sepenuhnya dapat dicari (searchable).

## Fitur

- 🔍 Pencarian full-text (judul + isi dokumen)
- 🏷️ Filter berdasarkan bahasa, kategori, jenis peraturan, topik, dan tahun
- 📱 Responsive design
- ⚡ Client-side search dengan Fuse.js
- 🎨 UI profesional dengan Tailwind CSS + shadcn/ui

## Data Source

Data diambil dari: https://perpajakan.ddtc.co.id/sumber-hukum/peraturan/pencarian?jenis=70&topic=4&kategori=pusat&bahasa=id

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Search:** Fuse.js
- **Deployment:** Vercel

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Scraping Data

```bash
# Run scraper
npm run scrape

# Run scraper in background
npm run scrape:bg
```

## License

Private - For educational purposes only.

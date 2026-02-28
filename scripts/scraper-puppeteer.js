const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'https://perpajakan.ddtc.co.id';
const SEARCH_URL = `${BASE_URL}/sumber-hukum/peraturan/pencarian`;
const DATA_DIR = path.join(__dirname, '..', 'data');
const CONTENT_DIR = path.join(DATA_DIR, 'content');

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(CONTENT_DIR, { recursive: true });
    console.log('✓ Directories created');
  } catch (error) {
    console.error('Error creating directories:', error.message);
  }
}

// Scrape list of regulations using Puppeteer
async function scrapeRegulationList() {
  const regulations = [];
  
  console.log('Starting to scrape regulation list with Puppeteer...');
  console.log('URL:', `${SEARCH_URL}?jenis=70&topic=4&kategori=pusat&bahasa=id`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to the page
    const url = `${SEARCH_URL}?jenis=70&topic=4&kategori=pusat&bahasa=id`;
    console.log(`Navigating to: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for content to load
    console.log('Waiting for content to load...');
    await delay(5000);
    
    // Extract regulation data
    const data = await page.evaluate(() => {
      const items = [];
      
      // Try to find regulation cards
      const cards = document.querySelectorAll('a[href*="/sumber-hukum/peraturan/"]');
      
      cards.forEach(card => {
        const href = card.getAttribute('href') || '';
        
        // Skip if not a detail page
        if (!href.includes('/id/') || href.includes('/pencarian')) return;
        
        // Extract ID from URL
        const idMatch = href.match(/\/peraturan\/([a-zA-Z0-9-]+)/);
        const id = idMatch ? idMatch[1] : '';
        
        if (!id) return;
        
        // Find title
        let judul = '';
        const titleEl = card.querySelector('h3, h4, .title, [class*="title"]');
        if (titleEl) {
          judul = titleEl.textContent.trim();
        } else {
          // Try to get from parent
          const parent = card.closest('[class*="card"], [class*="item"]');
          if (parent) {
            const parentTitle = parent.querySelector('h3, h4, .title');
            if (parentTitle) judul = parentTitle.textContent.trim();
          }
        }
        
        // Find description
        let deskripsi = '';
        const parent = card.closest('[class*="card"], [class*="item"]');
        if (parent) {
          const descEl = parent.querySelector('.description, p, [class*="desc"]');
          if (descEl) deskripsi = descEl.textContent.trim();
        }
        
        if (judul) {
          items.push({
            id,
            judul,
            deskripsi,
            href
          });
        }
      });
      
      return items;
    });
    
    console.log(`Found ${data.length} regulations`);
    
    // Process the data
    data.forEach(item => {
      const fullUrl = item.href.startsWith('http') ? item.href : `${BASE_URL}${item.href}`;
      regulations.push({
        id: item.id,
        judul: item.judul,
        deskripsi: item.deskripsi,
        url: fullUrl,
        scrapedAt: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('Error scraping with Puppeteer:', error.message);
  } finally {
    await browser.close();
  }
  
  return regulations;
}

// Scrape detail page for a single regulation
async function scrapeRegulationDetail(regulation) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    console.log(`\nScraping detail: ${regulation.judul || regulation.id}`);
    console.log(`URL: ${regulation.url}`);
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(regulation.url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for content
    await delay(3000);
    
    // Extract data
    const data = await page.evaluate(() => {
      const metadata = {};
      
      // Try to find metadata
      document.querySelectorAll('dt, .metadata-item, .detail-item').forEach(el => {
        const label = el.textContent?.trim().toLowerCase() || '';
        const valueEl = el.nextElementSibling || el.querySelector('.value, + dd');
        const value = valueEl?.textContent?.trim() || '';
        
        if (label.includes('jenis')) metadata.jenis = value;
        if (label.includes('kategori')) metadata.kategori = value;
        if (label.includes('topik')) metadata.topik = value;
        if (label.includes('bahasa')) metadata.bahasa = value;
        if (label.includes('status')) metadata.status = value;
        if (label.includes('tanggal') || label.includes('berlaku')) metadata.tanggalBerlaku = value;
      });
      
      // Extract content
      let content = '';
      const contentSelectors = [
        '.document-content', '.regulation-content', '.content-body',
        'article', '.detail-content', '[class*="content"]'
      ];
      
      for (const selector of contentSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          content = el.textContent.trim();
          if (content.length > 200) break;
        }
      }
      
      // If still no content, get from main
      if (!content) {
        const main = document.querySelector('main, .main-content, #content');
        if (main) content = main.textContent.trim();
      }
      
      return { metadata, content };
    });
    
    // Clean content
    let content = data.content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .substring(0, 50000)
      .trim();
    
    // Save to file
    const contentFileName = `regulation_${regulation.id}.md`;
    const contentFilePath = path.join(CONTENT_DIR, contentFileName);
    
    const markdownContent = `# ${regulation.judul}\n\n` +
      `## Metadata\n\n` +
      `- **Jenis**: ${data.metadata.jenis || '-'}\n` +
      `- **Kategori**: ${data.metadata.kategori || '-'}\n` +
      `- **Topik**: ${data.metadata.topik || '-'}\n` +
      `- **Bahasa**: ${data.metadata.bahasa || '-'}\n` +
      `- **Status**: ${data.metadata.status || '-'}\n` +
      `- **Tanggal Berlaku**: ${data.metadata.tanggalBerlaku || '-'}\n\n` +
      `## URL\n${regulation.url}\n\n` +
      `## Konten\n\n${content}`;
    
    await fs.writeFile(contentFilePath, markdownContent, 'utf-8');
    
    console.log(`✓ Saved content: ${contentFileName} (${content.length} chars)`);
    
    return {
      ...regulation,
      ...data.metadata,
      contentFile: contentFileName,
      contentLength: content.length
    };
    
  } catch (error) {
    console.error(`Error scraping detail for ${regulation.id}:`, error.message);
    return {
      ...regulation,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

// Main scraping function
async function main() {
  console.log('='.repeat(60));
  console.log('DDTC Tax Regulation Scraper (Puppeteer)');
  console.log('='.repeat(60));
  console.log(`Start time: ${new Date().toISOString()}`);
  
  await ensureDirectories();
  
  // Step 1: Scrape list
  console.log('\n--- Phase 1: Scraping Regulation List ---');
  const regulations = await scrapeRegulationList();
  
  // Save initial list
  await fs.writeFile(
    path.join(DATA_DIR, 'regulations_list.json'),
    JSON.stringify(regulations, null, 2),
    'utf-8'
  );
  console.log(`✓ Saved list: ${regulations.length} regulations`);
  
  if (regulations.length === 0) {
    console.log('\n⚠ No regulations found.');
    return [];
  }
  
  // Step 2: Scrape details with 40 second delay
  console.log('\n--- Phase 2: Scraping Regulation Details ---');
  console.log(`Delay between requests: 40 seconds`);
  console.log(`Estimated time: ${Math.ceil((regulations.length * 40) / 60)} minutes`);
  
  const detailedRegulations = [];
  
  for (let i = 0; i < regulations.length; i++) {
    const reg = regulations[i];
    console.log(`\n[${i + 1}/${regulations.length}] Processing: ${reg.judul || reg.id}`);
    
    const detail = await scrapeRegulationDetail(reg);
    detailedRegulations.push(detail);
    
    // Save progress every 5 items
    if ((i + 1) % 5 === 0) {
      await fs.writeFile(
        path.join(DATA_DIR, 'regulations_progress.json'),
        JSON.stringify(detailedRegulations, null, 2),
        'utf-8'
      );
      console.log(`✓ Progress saved: ${i + 1}/${regulations.length}`);
    }
    
    // 40 second delay before next request
    if (i < regulations.length - 1) {
      console.log(`Waiting 40 seconds...`);
      await delay(40000);
    }
  }
  
  // Step 3: Save final data
  console.log('\n--- Phase 3: Saving Final Data ---');
  
  await fs.writeFile(
    path.join(DATA_DIR, 'regulations.json'),
    JSON.stringify(detailedRegulations, null, 2),
    'utf-8'
  );
  
  // Create index for search
  const searchIndex = detailedRegulations.map(r => ({
    id: r.id,
    judul: r.judul,
    deskripsi: r.deskripsi,
    jenis: r.jenis || '',
    kategori: r.kategori || '',
    topik: r.topik || '',
    bahasa: r.bahasa || '',
    status: r.status || '',
    tanggalBerlaku: r.tanggalBerlaku || '',
    contentFile: r.contentFile,
    url: r.url
  }));
  
  await fs.writeFile(
    path.join(DATA_DIR, 'search_index.json'),
    JSON.stringify(searchIndex, null, 2),
    'utf-8'
  );
  
  console.log(`\n✓ Scraping complete!`);
  console.log(`  - Total regulations: ${detailedRegulations.length}`);
  console.log(`  - Content files: ${detailedRegulations.filter(r => r.contentFile).length}`);
  console.log(`  - Errors: ${detailedRegulations.filter(r => r.error).length}`);
  console.log(`End time: ${new Date().toISOString()}`);
  
  return detailedRegulations;
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, scrapeRegulationList, scrapeRegulationDetail };

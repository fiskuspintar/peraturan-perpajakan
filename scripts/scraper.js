const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'https://perpajakan.ddtc.co.id';
const SEARCH_URL = `${BASE_URL}/sumber-hukum/peraturan/pencarian`;
const DATA_DIR = path.join(__dirname, '..', 'data');
const CONTENT_DIR = path.join(DATA_DIR, 'content');

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Axios instance with proper headers
const http = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  },
  timeout: 30000
});

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

// Scrape list of regulations from search page
async function scrapeRegulationList() {
  const regulations = [];
  let page = 1;
  let hasMore = true;
  
  console.log('Starting to scrape regulation list...');
  
  while (hasMore && page <= 100) { // Safety limit
    try {
      const url = `${SEARCH_URL}?jenis=70&topic=4&kategori=pusat&bahasa=id&page=${page}`;
      console.log(`Fetching page ${page}: ${url}`);
      
      const response = await http.get(url);
      const $ = cheerio.load(response.data);
      
      // Find regulation cards
      const cards = $('.card, .regulation-card, [class*="card"], .search-result-item');
      
      if (cards.length === 0) {
        // Try alternative selectors
        const items = $('a[href*="/sumber-hukum/peraturan/"]').filter((i, el) => {
          const href = $(el).attr('href') || '';
          return href.includes('/peraturan/') && !href.includes('/pencarian');
        });
        
        if (items.length === 0) {
          console.log(`No more items found on page ${page}`);
          hasMore = false;
          break;
        }
        
        items.each((i, el) => {
          const $el = $(el);
          const href = $el.attr('href') || '';
          const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          
          // Extract ID from URL
          const idMatch = href.match(/\/peraturan\/(\d+)/);
          const id = idMatch ? idMatch[1] : `unknown-${Date.now()}-${i}`;
          
          // Try to find title in parent or sibling elements
          const titleEl = $el.find('h3, h4, .title, [class*="title"]').first();
          const judul = titleEl.text().trim() || $el.text().trim();
          
          regulations.push({
            id,
            judul,
            url: fullUrl,
            scrapedAt: new Date().toISOString()
          });
        });
      } else {
        cards.each((i, el) => {
          const $card = $(el);
          const link = $card.find('a[href*="/peraturan/"]').first();
          const href = link.attr('href') || '';
          const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          
          const idMatch = href.match(/\/peraturan\/(\d+)/);
          const id = idMatch ? idMatch[1] : `unknown-${Date.now()}-${i}`;
          
          const judul = $card.find('h3, h4, .title').text().trim();
          const deskripsi = $card.find('.description, p').text().trim();
          
          regulations.push({
            id,
            judul,
            deskripsi,
            url: fullUrl,
            scrapedAt: new Date().toISOString()
          });
        });
      }
      
      // Check for next page
      const nextPage = $(`a[href*="page=${page + 1}"], .pagination .next, [class*="next"]`);
      if (nextPage.length === 0 || cards.length === 0) {
        hasMore = false;
      } else {
        page++;
        await delay(5000); // 5 second delay between pages
      }
      
    } catch (error) {
      console.error(`Error on page ${page}:`, error.message);
      hasMore = false;
    }
  }
  
  console.log(`Total regulations found: ${regulations.length}`);
  return regulations;
}

// Scrape detail page for a single regulation
async function scrapeRegulationDetail(regulation) {
  try {
    console.log(`Scraping detail: ${regulation.judul}`);
    
    const response = await http.get(regulation.url);
    const $ = cheerio.load(response.data);
    
    // Extract metadata
    const metadata = {};
    
    // Try different selectors for metadata
    $('.metadata-item, .detail-item, dl dt, .info-row').each((i, el) => {
      const $el = $(el);
      const label = $el.find('dt, .label, strong').text().trim().toLowerCase();
      const value = $el.find('dd, .value, span').text().trim();
      
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
      '.document-content',
      '.regulation-content', 
      '.content-body',
      'article',
      '.detail-content',
      '[class*="content"]'
    ];
    
    for (const selector of contentSelectors) {
      const $content = $(selector).first();
      if ($content.length > 0) {
        content = $content.text().trim();
        if (content.length > 100) break;
      }
    }
    
    // If no content found, get all text from main area
    if (!content) {
      content = $('main, .main-content, #content').text().trim();
    }
    
    // Clean up content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    // Save content to file
    const contentFileName = `regulation_${regulation.id}.md`;
    const contentFilePath = path.join(CONTENT_DIR, contentFileName);
    
    const contentData = {
      ...regulation,
      ...metadata,
      content,
      scrapedAt: new Date().toISOString()
    };
    
    await fs.writeFile(
      contentFilePath,
      `# ${regulation.judul}\n\n## Metadata\n\n` +
      Object.entries(metadata).map(([k, v]) => `- **${k}**: ${v}`).join('\n') +
      `\n\n## URL\n${regulation.url}\n\n` +
      `## Content\n\n${content}`,
      'utf-8'
    );
    
    console.log(`✓ Saved content: ${contentFileName}`);
    
    return {
      ...regulation,
      ...metadata,
      contentFile: contentFileName
    };
    
  } catch (error) {
    console.error(`Error scraping detail for ${regulation.id}:`, error.message);
    return {
      ...regulation,
      error: error.message
    };
  }
}

// Main scraping function
async function main() {
  console.log('='.repeat(60));
  console.log('DDTC Tax Regulation Scraper');
  console.log('='.repeat(60));
  
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
  
  // Step 2: Scrape details with 40 second delay
  console.log('\n--- Phase 2: Scraping Regulation Details ---');
  console.log(`Delay between requests: 40 seconds`);
  
  const detailedRegulations = [];
  
  for (let i = 0; i < regulations.length; i++) {
    const reg = regulations[i];
    console.log(`\n[${i + 1}/${regulations.length}] Processing: ${reg.judul}`);
    
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
  
  return detailedRegulations;
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, scrapeRegulationList, scrapeRegulationDetail };

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

// Extract JSON data from Next.js script tags
function extractNextData(html) {
  const $ = cheerio.load(html);
  let nextData = null;
  
  // Look for __NEXT_DATA__ script
  $('script').each((i, el) => {
    const content = $(el).html() || '';
    if (content.includes('__NEXT_DATA__')) {
      const match = content.match(/window\.__NEXT_DATA__\s*=\s*({.+?});?$/s);
      if (match) {
        try {
          nextData = JSON.parse(match[1]);
        } catch (e) {
          console.log('Failed to parse __NEXT_DATA__');
        }
      }
    }
  });
  
  return nextData;
}

// Scrape list of regulations from search page
async function scrapeRegulationList() {
  const regulations = [];
  
  console.log('Starting to scrape regulation list...');
  console.log('URL:', `${SEARCH_URL}?jenis=70&topic=4&kategori=pusat&bahasa=id`);
  
  try {
    const url = `${SEARCH_URL}?jenis=70&topic=4&kategori=pusat&bahasa=id`;
    console.log(`Fetching: ${url}`);
    
    const response = await http.get(url);
    const html = response.data;
    
    // Save HTML for debugging
    await fs.writeFile(path.join(DATA_DIR, 'debug_page.html'), html, 'utf-8');
    
    const $ = cheerio.load(html);
    
    // Try to find regulation cards with various selectors
    const selectors = [
      'a[href*="/sumber-hukum/peraturan/"][href*="/id/"]',
      'a[href*="/peraturan/"]',
      '[class*="card"] a',
      '.search-result a',
      'article a'
    ];
    
    for (const selector of selectors) {
      const links = $(selector).filter((i, el) => {
        const href = $(el).attr('href') || '';
        return href.includes('/peraturan/') && !href.includes('/pencarian');
      });
      
      console.log(`Selector "${selector}": ${links.length} links found`);
      
      links.each((i, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        
        // Extract ID from URL
        const idMatch = href.match(/\/peraturan\/([a-zA-Z0-9-]+)/);
        const id = idMatch ? idMatch[1] : `unknown-${Date.now()}-${i}`;
        
        // Try to find title in various places
        let judul = '';
        const titleSelectors = ['h3', 'h4', '.title', '[class*="title"]', 'span'];
        for (const ts of titleSelectors) {
          const titleEl = $el.find(ts).first();
          if (titleEl.length && titleEl.text().trim()) {
            judul = titleEl.text().trim();
            break;
          }
        }
        
        // If no title found in children, use the link text
        if (!judul) {
          judul = $el.text().trim();
        }
        
        // Get description
        let deskripsi = '';
        const descSelectors = ['.description', 'p', '[class*="desc"]'];
        for (const ds of descSelectors) {
          const descEl = $el.closest('[class*="card"], [class*="item"]').find(ds).first();
          if (descEl.length && descEl.text().trim()) {
            deskripsi = descEl.text().trim();
            break;
          }
        }
        
        if (judul && judul.length > 5) {
          regulations.push({
            id,
            judul,
            deskripsi,
            url: fullUrl,
            scrapedAt: new Date().toISOString()
          });
        }
      });
      
      if (regulations.length > 0) break;
    }
    
    // Also try to extract from JSON embedded in script tags
    const nextData = extractNextData(html);
    if (nextData && nextData.props?.pageProps?.data) {
      console.log('Found Next.js data');
      const pageData = nextData.props.pageProps.data;
      if (Array.isArray(pageData)) {
        pageData.forEach((item, i) => {
          if (item.judul || item.title || item.nama) {
            regulations.push({
              id: item.id || `data-${Date.now()}-${i}`,
              judul: item.judul || item.title || item.nama,
              deskripsi: item.deskripsi || item.description || '',
              url: item.url || `${BASE_URL}/sumber-hukum/peraturan/${item.id}`,
              scrapedAt: new Date().toISOString()
            });
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error fetching regulation list:', error.message);
  }
  
  console.log(`Total regulations found: ${regulations.length}`);
  return regulations;
}

// Scrape detail page for a single regulation
async function scrapeRegulationDetail(regulation) {
  try {
    console.log(`\nScraping detail: ${regulation.judul || regulation.id}`);
    console.log(`URL: ${regulation.url}`);
    
    const response = await http.get(regulation.url);
    const $ = cheerio.load(response.data);
    
    // Extract metadata from various possible selectors
    const metadata = {};
    
    // Try to find metadata in definition lists, tables, or specific classes
    const metadataSelectors = [
      '.metadata-item', '.detail-item', 'dl dt', '.info-row',
      '[class*="meta"]', '[class*="detail"] dt', 'table tr'
    ];
    
    for (const selector of metadataSelectors) {
      $(selector).each((i, el) => {
        const $el = $(el);
        let label = '';
        let value = '';
        
        if (el.tagName === 'dt') {
          label = $el.text().trim().toLowerCase();
          value = $el.next('dd').text().trim();
        } else if (el.tagName === 'tr') {
          label = $el.find('td, th').first().text().trim().toLowerCase();
          value = $el.find('td, th').eq(1).text().trim();
        } else {
          label = $el.find('.label, strong, [class*="label"]').text().trim().toLowerCase();
          value = $el.find('.value, span, [class*="value"]').text().trim();
        }
        
        if (label && value) {
          if (label.includes('jenis')) metadata.jenis = value;
          if (label.includes('kategori')) metadata.kategori = value;
          if (label.includes('topik')) metadata.topik = value;
          if (label.includes('bahasa')) metadata.bahasa = value;
          if (label.includes('status')) metadata.status = value;
          if (label.includes('tanggal') || label.includes('berlaku')) metadata.tanggalBerlaku = value;
        }
      });
    }
    
    // Extract content from various possible content areas
    let content = '';
    const contentSelectors = [
      '.document-content', '.regulation-content', '.content-body',
      'article', '.detail-content', '[class*="content"]', 
      '.main-content', '#content', '[role="main"]'
    ];
    
    for (const selector of contentSelectors) {
      const $content = $(selector).first();
      if ($content.length > 0) {
        const text = $content.text().trim();
        if (text.length > 200) {
          content = text;
          break;
        }
      }
    }
    
    // If still no content, get body text excluding scripts
    if (!content) {
      $('script, style, nav, header, footer').remove();
      content = $('body').text().trim();
    }
    
    // Clean up content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .substring(0, 50000) // Limit content size
      .trim();
    
    // Save content to markdown file
    const contentFileName = `regulation_${regulation.id}.md`;
    const contentFilePath = path.join(CONTENT_DIR, contentFileName);
    
    const markdownContent = `# ${regulation.judul}\n\n` +
      `## Metadata\n\n` +
      `- **Jenis**: ${metadata.jenis || '-'}\n` +
      `- **Kategori**: ${metadata.kategori || '-'}\n` +
      `- **Topik**: ${metadata.topik || '-'}\n` +
      `- **Bahasa**: ${metadata.bahasa || '-'}\n` +
      `- **Status**: ${metadata.status || '-'}\n` +
      `- **Tanggal Berlaku**: ${metadata.tanggalBerlaku || '-'}\n\n` +
      `## URL\n${regulation.url}\n\n` +
      `## Konten\n\n${content}`;
    
    await fs.writeFile(contentFilePath, markdownContent, 'utf-8');
    
    console.log(`✓ Saved content: ${contentFileName} (${content.length} chars)`);
    
    return {
      ...regulation,
      ...metadata,
      contentFile: contentFileName,
      contentLength: content.length
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
    console.log('\n⚠ No regulations found. The website may require JavaScript rendering.');
    console.log('Saved HTML to debug_page.html for inspection.');
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

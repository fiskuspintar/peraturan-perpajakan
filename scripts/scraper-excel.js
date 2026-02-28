const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONTENT_DIR = path.join(DATA_DIR, 'content');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const peraturanList = [
  { id: "uu-2-2025", judul: "Undang-Undang Nomor: 2 Tahun 2025", perihal: "PERUBAHAN KEEMPAT ATAS UNDANG-UNDANG NOMOR 4 TAHUN 2009 TENTANG PERTAMBANGAN MINERAL DAN BATUBARA", url: "https://perpajakan.ddtc.co.id/id/sumber-hukum/peraturan/uu-2-2025/undang-undang-nomor-2-tahun-2025" },
  { id: "uu-42-1999", judul: "Undang-Undang Nomor: 42 Tahun 1999", perihal: "JAMINAN FIDUSIA", url: "https://perpajakan.ddtc.co.id/sumber-hukum/peraturan-pusat/undang-undang-42-tahun-1999" },
  { id: "uu-24-1999", judul: "Undang-Undang Nomor: 24 Tahun 1999", perihal: "LALU LINTAS DEVISA DAN SISTEM NILAI TUKAR", url: "https://perpajakan.ddtc.co.id/sumber-hukum/peraturan-pusat/undang-undang-24-tahun-1999" },
  { id: "uu-20-1999", judul: "Undang-Undang Nomor: 20 Tahun 1999", perihal: "PENGESAHAN ILO CONVENTION NO. 138", url: "https://perpajakan.ddtc.co.id/sumber-hukum/peraturan-pusat/undang-undang-20-tahun-1999" },
  { id: "uu-12-1994", judul: "Undang-Undang Nomor: 12 Tahun 1994", perihal: "PERUBAHAN ATAS UNDANG-UNDANG NOMOR 12 TAHUN 1985 TENTANG PAJAK BUMI DAN BANGUNAN", url: "https://perpajakan.ddtc.co.id/sumber-hukum/peraturan-pusat/undang-undang-12-tahun-1994" },
  { id: "uu-12-1985", judul: "Undang-Undang Nomor: 12 Tahun 1985", perihal: "PAJAK BUMI DAN BANGUNAN", url: "https://perpajakan.ddtc.co.id/sumber-hukum/peraturan-pusat/undang-undang-12-tahun-1985" },
  { id: "uu-14-1947", judul: "Undang-Undang Nomor: 14 Tahun 1947", perihal: "PEMUNGUTAN PAJAK PEMBANGUNAN DI RUMAH MAKAN", url: "https://perpajakan.ddtc.co.id/sumber-hukum/peraturan-pusat/undang-undang-14-tahun-1947" }
];

async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(CONTENT_DIR, { recursive: true });
}

async function scrapeDetail(browser, peraturan, index, total) {
  console.log(`\n[${index + 1}/${total}] ${peraturan.judul}`);
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(peraturan.url, { waitUntil: 'networkidle2', timeout: 60000 });
    await delay(5000);
    
    const data = await page.evaluate(() => {
      const metadata = {};
      document.querySelectorAll('dt, .metadata-item').forEach(el => {
        const label = el.textContent?.trim().toLowerCase() || '';
        const valueEl = el.nextElementSibling;
        const value = valueEl?.textContent?.trim() || '';
        if (label.includes('jenis')) metadata.jenis = value;
        if (label.includes('kategori')) metadata.kategori = value;
        if (label.includes('topik')) metadata.topik = value;
        if (label.includes('bahasa')) metadata.bahasa = value;
        if (label.includes('status')) metadata.status = value;
        if (label.includes('tanggal')) metadata.tanggalBerlaku = value;
      });
      
      let content = '';
      const selectors = ['.document-content', '.content-body', 'article', '.main-content'];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 200) {
          content = el.textContent.trim();
          break;
        }
      }
      return { metadata, content };
    });
    
    let content = data.content.replace(/\s+/g, ' ').substring(0, 100000).trim();
    
    const fileName = `regulation_${peraturan.id}.md`;
    const markdown = `# ${peraturan.judul}\n\n## Perihal\n${peraturan.perihal}\n\n## Metadata\n- Jenis: ${data.metadata.jenis || 'UU'}\n- Kategori: ${data.metadata.kategori || 'Pusat'}\n- Topik: ${data.metadata.topik || 'PBB'}\n- Status: ${data.metadata.status || 'Berlaku'}\n- Tanggal: ${data.metadata.tanggalBerlaku || '-'}\n\n## URL\n${peraturan.url}\n\n## Konten\n\n${content}`;
    
    await fs.writeFile(path.join(CONTENT_DIR, fileName), markdown, 'utf-8');
    console.log(`✓ Saved: ${fileName} (${content.length} chars)`);
    
    await page.close();
    return { ...peraturan, ...data.metadata, contentLength: content.length };
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    await page.close();
    return { ...peraturan, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Scraper 7 Peraturan dari Excel');
  console.log('='.repeat(60));
  
  await ensureDirectories();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const results = [];
  
  for (let i = 0; i < peraturanList.length; i++) {
    const result = await scrapeDetail(browser, peraturanList[i], i, peraturanList.length);
    results.push(result);
    if (i < peraturanList.length - 1) {
      console.log('Waiting 40 seconds...');
      await delay(40000);
    }
  }
  
  await browser.close();
  await fs.writeFile(path.join(DATA_DIR, 'regulations_7.json'), JSON.stringify(results, null, 2), 'utf-8');
  
  console.log('\n' + '='.repeat(60));
  console.log('Done!');
  console.log(`Total: ${results.length} peraturan`);
  console.log(`Success: ${results.filter(r => !r.error).length}`);
  console.log(`Failed: ${results.filter(r => r.error).length}`);
}

main().catch(console.error);

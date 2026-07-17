import { ALL_SOURCES, type SourceConfig } from './sources';
import { discoverFromHTML } from './parser-html';
import { discoverFromRSS, extractRSSDate } from './parser-rss';
import { extractArticleData } from './article-extractor';
import { extractPublishDate } from './date-handler';
import { generateArticleId } from './dedup';
import { classifyArticle } from './classifier';
import { upsertArticle, getExistingIds, getBlockedPhrases, type ArticleRow } from './db';
import { SEVEN_DAYS_MS, DELAY_BETWEEN_REQUESTS_MS } from './config';
import { matchesAnyToken } from './token-match';
import { isNoiseArticle } from './noise-filter';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const BIHAR_GEO_DICTIONARY = [
  // State & Leaders
  'Bihar', 'Nitish', 'Tejashwi', 'Lalu', 'Chirag Paswan', 'बिहार', 'नीतीश', 'तेजस्वी',
  'Lalu Prasad', 'Nitish Kumar', 'Samrat Choudhary', 'Nand Kishore Yadav',
  'Rabri Devi', 'Misa Bharti',

  // Political Parties & Bodies
  'JDU', 'JD(U)', 'RJD', 'BJP Bihar', 'Jitan Ram Manjhi', 'HAM',
  'Vidhan Sabha', 'Vidhan Parishad', 'Biscomaun', 'Bihar Board', 'BSEB', 'BPSC',
  'BPSSC', 'Bihar Police', 'Patna High Court',

  // Divisions & Regions
  'Tirhut', 'Saran', 'Kosi', 'Darbhanga', 'Purnia', 'Patna', 'Munger', 'Magadh', 'Bhagalpur', 'Mithilanchal', 'Seemanchal', 'Bhojpuri', 'Maithili', 'Magahi', 'Angika', 'तिरहुत', 'सारण', 'कोसी', 'मगध', 'मिथिला', 'सीमांचल',

  // All 38 Districts & Major Headquarters
  'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhojpur', 'Arrah', 'Buxar', 'East Champaran', 'Motihari', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Bhabua', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Muzaffarpur', 'Nalanda', 'Bihar Sharif', 'Nawada', 'Rohtas', 'Sasaram', 'Saharsa', 'Samastipur', 'Chhapra', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'Hajipur', 'West Champaran', 'Bettiah',

  // Patna localities & constituencies
  'Bankipur', 'Rajendra Nagar', 'Kankarbagh', 'Bailey Road',
  'Gandhi Maidan', 'Patna Sahib', 'Danapur', 'Phulwari Sharif',
  'Patliputra', 'Masaurhi', 'Paliganj', 'Mokama', 'Barh', 'Bakhtiyarpur',
  'Fatuha', 'Khusrupur',

  // Key institutions
  'Patna University', 'Magadh University', 'Nalanda University', 'Bihar University',
  'AIIMS Patna', 'PMCH', 'NMCH', 'IGIMS', 'SKMCH',
  'NIT Patna', 'IIT Patna', 'BIT Mesra',

  // Cultural & Geographic
  'Ganga', 'Son River', 'Gandak', 'Budhi Gandak', 'Bagmati',
  'Chhath', 'Thekua', 'Litti Chokha',
  'Vaishali', 'Bodh Gaya', 'Rajgir', 'Pawapuri',
  'Kumhrar', 'Patna Museum', 'Golghar',

  // Hindi District & City Names
  'अररिया', 'अरवल', 'औरंगाबाद', 'बांका', 'बेगूसराय', 'भोजपुर', 'आरा', 'बक्सर', 'पूर्वी चंपारण', 'मोतिहारी', 'गया', 'गोपालगंज', 'जमुई', 'जहानाबाद', 'कैमूर', 'भभुआ', 'कटिहार', 'खगड़िया', 'किशनगंज', 'लखीसराय', 'मधेपुरा', 'मधुबनी', 'मुंगेर', 'मुजफ्फरपुर', 'नालंदा', 'बिहार शरीफ', 'नवादा', 'रोहतास', 'सासाराम', 'सहरसा', 'समस्तीपुर', 'छपरा', 'शेखपुरा', 'शिवहर', 'सीतामढ़ी', 'सिवान', 'सुपौल', 'वैशाली', 'हाजीपुर', 'पश्चिम चंपारण', 'बेतिया',
  'बैंकिपुर', 'राजेंद्र नगर', 'कंकड़बाग', 'बेली रोड',
  'गांधी मैदान', 'पटना साहिब', 'दानापुर', 'फुलवारी शरीफ', 'पाटलिपुत्र',
  'मसौढ़ी', 'पालीगंज', 'मोकामा', 'बाढ़', 'बख्तियारपुर',
  'छठ', 'लिट्टी चोखा', 'बोधगया', 'राजगीर', 'पावापुरी',
];

function isBiharRelevant(headline: string, synopsis: string): boolean {
  const text = `${headline} ${synopsis}`;
  return matchesAnyToken(text, BIHAR_GEO_DICTIONARY);
}

async function scrapeSource(source: SourceConfig): Promise<number> {
  console.log(`\n▶ Scraping: ${source.name} (${source.language})`);

  let discovered = await discoverFromSource(source);
  console.log(`  Found ${discovered.length} article links`);

  if (discovered.length === 0) return 0;

  // Batch dedup: collect all IDs and check which already exist
  const allIds = discovered.map((a) => generateArticleId(a.url));
  const existingIds = await getExistingIds(allIds);
  const newArticles = discovered.filter((_, i) => !existingIds.has(allIds[i]));
  console.log(`  ${newArticles.length} new, ${discovered.length - newArticles.length} already in DB`);

  let stored = 0;

  for (const article of discovered) {
    try {
      const id = generateArticleId(article.url);

      // Skip if already in DB
      if (existingIds.has(id)) continue;

      // Fetch article page to extract headline, synopsis, date
      const data = await extractArticleData(article.url, article.headline);
      if (!data) {
        console.log(`  ✗ No data extracted: ${article.url}`);
        continue;
      }

      // Date validation
      if (!data.published_timestamp) {
        console.log(`  ✗ No date found: ${data.headline.slice(0, 60)}`);
        continue;
      }

      // Drop future dates (timezone leak guard)
      if (data.published_timestamp > Date.now() + 3_600_000) {
        console.log(`  ✗ Future date: ${data.headline.slice(0, 60)}`);
        continue;
      }

      // Drop articles older than 7 days
      if (Date.now() - data.published_timestamp > SEVEN_DAYS_MS) {
        console.log(`  ✗ Too old: ${data.headline.slice(0, 60)}`);
        continue;
      }

      // Bihar relevance gate — token-bounded matching
      if (!isBiharRelevant(data.headline, data.synopsis)) {
        console.log(`  ✗ Not Bihar-relevant: ${data.headline.slice(0, 60)}`);
        continue;
      }

      // Actor vs. Action filter — drop pure political/crime noise
      if (isNoiseArticle(data.headline, data.synopsis)) {
        console.log(`  ✗ Political/crime noise: ${data.headline.slice(0, 60)}`);
        continue;
      }

      // Classify (token-bounded keyword matching)
      const category = classifyArticle(data.headline, data.synopsis, source);

      // Exclude articles that don't fit any development category
      if (category === 'exclude') {
        console.log(`  ✗ Non-development: ${data.headline.slice(0, 60)}`);
        continue;
      }

      const row: ArticleRow = {
        id,
        url: article.url,
        headline: data.headline,
        synopsis: data.synopsis,
        source: source.name,
        language: source.language,
        category,
        published_timestamp: data.published_timestamp,
        ingested_at: Date.now(),
      };

      await upsertArticle(row);
      stored++;
      console.log(`  ✓ [${category}] ${data.headline.slice(0, 70)}`);
    } catch (err) {
      console.error(`  ✗ Error: ${(err as Error).message}`);
    }

    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`  → Stored ${stored} articles from ${source.name}`);
  return stored;
}

async function discoverFromSource(
  source: SourceConfig
): Promise<{ url: string; headline?: string }[]> {
  // Try RSS first if available
  if (source.rssUrl) {
    const rssArticles = await discoverFromRSS(source);
    if (rssArticles.length > 0) return rssArticles;
    console.log(`  RSS failed, falling back to HTML scraping`);
  }

  // Fetch listing page HTML
  try {
    const res = await fetch(source.listingUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    });

    if (!res.ok) {
      console.error(`  HTTP ${res.status} for ${source.listingUrl}`);
      return [];
    }

    const html = await res.text();
    return discoverFromHTML(html, source, source.listingUrl);
  } catch (err) {
    console.error(`  Listing page failed: ${(err as Error).message}`);
    return [];
  }
}

// ── Main entry point ──
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log(`Bihar News Scraper — ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════');

  let totalStored = 0;

  for (const source of ALL_SOURCES) {
    try {
      const count = await scrapeSource(source);
      totalStored += count;
    } catch (err) {
      console.error(`\n✗ FAILED: ${source.name} — ${(err as Error).message}`);
    }
    // Delay between sources to be polite
    await sleep(500);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`Done! Total new articles stored: ${totalStored}`);
  console.log('═══════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

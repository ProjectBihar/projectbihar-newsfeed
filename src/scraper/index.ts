import { ALL_SOURCES, type SourceConfig } from './sources';
import { discoverFromHTML } from './parser-html';
import { discoverFromRSS, extractRSSDate } from './parser-rss';
import { extractArticleData } from './article-extractor';
import { extractPublishDate } from './date-handler';
import { generateArticleId } from './dedup';
import { classifyArticle, setLearnedKeywords } from './classifier';
import { upsertArticle, getExistingIds, getBlockedPhrases, getLearnedKeywords, type ArticleRow } from './db';
import { SEVEN_DAYS_MS, DELAY_BETWEEN_REQUESTS_MS, FETCH_TIMEOUT_MS, USER_AGENT } from './config';
import { matchesAnyToken, matchesToken } from './token-match';
import { isNoiseArticle } from './noise-filter';

// Blocked phrases loaded from DB at startup
let blockedPhrases: string[] = [];
import { isBlockedArticle } from '@/lib/block-filter';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Overall script timeout — kill after 15 minutes no matter what
const SCRIPT_TIMEOUT_MS = 15 * 60 * 1000;
const scriptTimer = setTimeout(() => {
  console.error(`\n⏱ FATAL: Script exceeded ${SCRIPT_TIMEOUT_MS / 60_000} minute timeout. Forcing exit.`);
  process.exit(1);
}, SCRIPT_TIMEOUT_MS);
scriptTimer.unref(); // don't keep the process alive just for this timer

// Per-source timeout — kill any single source after 2 minutes
const SOURCE_TIMEOUT_MS = 2 * 60 * 1000;

// Concurrency limit for parallel source processing
const SOURCE_CONCURRENCY = 5;

// Non-Bihar states/cities — if these appear, the article is NOT about Bihar
const NON_BIHAR_STATES = [
  // Major states
  'Gujarat', 'Maharashtra', 'Rajasthan', 'Madhya Pradesh', 'Uttar Pradesh',
  'West Bengal', 'Odisha', 'Jharkhand', 'Chhattisgarh', 'Punjab', 'Haryana',
  'Uttarakhand', 'Himachal Pradesh', 'Jammu', 'Kashmir', 'Assam',
  'Kerala', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana',
  'Goa', 'Sikkim', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland',
  'Tripura', 'Arunachal Pradesh',
  // Hindi state names
  'गुजरात', 'महाराष्ट्र', 'राजस्थान', 'मध्य प्रदेश', 'उत्तर प्रदेश',
  'पश्चिम बंगाल', 'ओडिशा', 'झारखंड', 'छत्तीसगढ़', 'पंजाब', 'हरियाणा',
  'उत्तराखंड', 'हिमाचल प्रदेश', 'जम्मू', 'कश्मीर', 'असम',
  'केरल', 'तमिलनाडु', 'कर्नाटक', 'आंध्र प्रदेश', 'तेलंगाना',
  'गोवा', 'सिक्किम', 'मेघालय', 'मणिपुर', 'मिजोरम', 'नागालैंड',
  'त्रिपुरा', 'अरुणाचल प्रदेश',
  // Uttar Pradesh cities (major + district HQs)
  'Gorakhpur', 'Prayagraj', 'Allahabad', 'Noida', 'Ghaziabad', 'Meerut',
  'Aligarh', 'Bareilly', 'Moradabad', 'Jhansi', 'Firozabad', 'Mathura',
  'Ayodhya', 'Faizabad', 'Basti', 'Sitapur', 'Hardoi', 'Unnao',
  'Rae Bareli', 'Amethi', 'Sultanpur', 'Azamgarh', 'Ballia', 'Mau',
  'Deoria', 'Basti', 'Maharajganj', 'Kushinagar', 'Gonda', 'Bahraich',
  'Shravasti', 'Balrampur', 'Pilibhit', 'Shahjahanpur', 'Budaun',
  'Bijnor', 'Rampur', 'Sambhal', 'Amroha', 'Bulandshahr', 'Hapur',
  'Etah', 'Kasganj', 'Mainpuri', 'Farrukhabad', 'Kannauj', 'Etawah',
  'Auraiya', 'Kanpur', 'Hamirpur', 'Mahoba', 'Lalitpur', 'Orai',
  'Chitrakoot', 'Pratapgarh', 'Mirzapur', 'Sonbhadra', 'Robertsganj',
  'Chandauli', 'Varanasi', 'Gazipur', 'Jaunpur', 'Ghazipur',
  'Agra', 'Aligarh', 'Firozabad', 'Hathras', 'Mathura',
  // UP cities in Hindi
  'गोरखपुर', 'प्रयागराज', 'इलाहाबाद', 'नोएडा', 'गाजियाबाद', 'मेरठ',
  'अलीगढ़', 'बरेली', 'मुरादाबाद', 'झांसी', 'फिरोजाबाद', 'मथुरा',
  'अयोध्या', 'फैजाबाद', 'बस्ती', 'सीतापुर', 'हरदोई', 'उन्नाव',
  'रायबरेली', 'अमेठी', 'सुल्तानपुर', 'आजमगढ़', 'बलिया', 'मऊ',
  'देवरिया', 'महारागंज', 'कुशीनगर', 'गोंडा', 'बहराइच',
  'श्रावस्ती', 'बलरामपुर', 'पीलीभीत', 'शाहजहांपुर', 'बदायूं',
  'बिजनौर', 'रामपुर', 'संभल', 'अमरोहा', 'बुलंदशहर', 'हापुड़',
  'एटा', 'कासगंज', 'मैनपुरी', 'फर्रुखाबाद', 'कन्नौज', 'इटावा',
  'औरैया', 'कानपुर', 'हमीरपुर', 'महोबा', 'ललितपुर', 'ओरई',
  'चित्रकूट', 'प्रतापगढ़', 'मिर्जापुर', 'सोनभद्र', 'रॉबर्ट्सगंज',
  'चंदौली', 'वाराणसी', 'गाजीपुर', 'जौनपुर', 'घाजीपुर',
  'आगरा', 'हाथरस', 'मथुरा',
  // Other major non-Bihar cities
  'Ahmedabad', 'Surat', 'Rajkot', 'Vadodara', 'Mumbai', 'Pune',
  'Nagpur', 'Jaipur', 'Lucknow', 'Kanpur', 'Agra', 'Varanasi',
  'Kolkata', 'Howrah', 'Bhopal', 'Indore', 'Raipur', 'Bilaspur',
  'Chandigarh', 'Ludhiana', 'Amritsar', 'Dehradun', 'Shimla',
  'Bengaluru', 'Chennai', 'Hyderabad', 'Visakhapatnam', 'Thiruvananthapuram',
  'Bhubaneswar', 'Cuttack', 'Ranchi', 'Jamshedpur', 'Guwahati',
  'Panaji', 'Gangtok', 'Shillong', 'Imphal', 'Aizawl', 'Kohima',
  'Agartala', 'Itanagar',
  // Other major cities in Hindi
  'अहमदाबाद', 'सूरत', 'राजकोट', 'वडोदरा', 'मुंबई', 'पुणे',
  'नागपुर', 'जयपुर', 'लखनऊ', 'कानपुर', 'आगरा', 'वाराणसी',
  'कोलकाता', 'हावड़ा', 'भोपाल', 'इंदौर', 'रायपुर', 'बिलासपुर',
  'चंडीगढ़', 'लुधियाना', 'अमृतसर', 'देहरादून', 'शिमला',
  'बेंगलुरु', 'चेन्नई', 'हैदराबाद', 'विशाखापत्तनम', 'त्रिवेंद्रम',
  'भुवनेश्वर', 'कटक', 'रांची', 'जमशेदपुर', 'गुवाहाटी',
  'पणजी', 'गंगटोक', 'शिलांग', 'इंफाल', 'आइजोल', 'कोहिमा',
  'अगरतला', 'ईटानगर',
];

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

// Strong Bihar signals — state name must appear for a positive match
const BIHAR_STATE_NAMES = [
  'Bihar', 'बिहार', 'बिहारी',
];

// Bihar district/city names — strong positive signal when combined with state context
const BIHAR_DISTRICTS = [
  'Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia',
  'Munger', 'Begusarai', 'Nalanda', 'Vaishali', 'Saran', 'Chhapra',
  'Siwan', 'Gopalganj', 'West Champaran', 'East Champaran', 'Motihari',
  'Sitamarhi', 'Sheohar', 'Madhubani', 'Supaul', 'Araria', 'Kishanganj',
  'Katihar', 'Khagaria', 'Samastipur', 'Lakhisarai', 'Sheikhpura',
  'Nawada', 'Jamui', 'Aurangabad', 'Rohtas', 'Sasaram', 'Kaimur',
  'Bhabua', 'Bhojpur', 'Arrah', 'Buxar', 'Banka', 'Madhepura',
  'Saharsa', 'Arwal', 'Jehanabad', 'Bihar Sharif', 'Hajipur',
  // Hindi district names
  'पटना', 'गया', 'मुजफ्फरपुर', 'भागलपुर', 'दरभंगा', 'पूर्णिया',
  'मुंगेर', 'बेगूसराय', 'नालंदा', 'वैशाली', 'सारण', 'छपरा',
  'सिवान', 'गोपालगंज', 'पश्चिम चंपारण', 'पूर्वी चंपारण', 'मोतिहारी',
  'सीतामढ़ी', 'शिवहर', 'मधुबनी', 'सुपौल', 'अररिया', 'किशनगंज',
  'कटिहार', 'खगड़िया', 'समस्तीपुर', 'लखीसराय', 'शेखपुरा',
  'नवादा', 'जमुई', 'औरंगाबाद', 'रोहतास', 'सासाराम', 'कैमूर',
  'भभुआ', 'भोजपुर', 'आरा', 'बक्सर', 'बांका', 'मधेपुरा',
  'सहरसा', 'अरवल', 'जहानाबाद', 'बिहार शरीफ', 'हाजीपुर',
];

// Non-Bihar cities that appear in Bihar-dedicated source feeds (false positives)
// These override the Bihar keyword match — if ANY of these is the primary subject, reject
const NON_BIHAR_FALSE_POSITIVE_CITIES = [
  'Gorakhpur', 'Prayagraj', 'Allahabad', 'Lucknow', 'Varanasi', 'Kanpur',
  'Agra', 'Noida', 'Ghaziabad', 'Meerut', 'Bareilly', 'Aligarh',
  'Jhansi', 'Mathura', 'Ayodhya', 'Faizabad', 'Deoria', 'Basti',
  'Azamgarh', 'Ballia', 'Mau', 'Mirzapur', 'Sonbhadra', 'Chandauli',
  'Jaunpur', 'Ghazipur', 'Gazipur', 'Maharajganj', 'Kushinagar',
  'Gonda', 'Bahraich', 'Shravasti', 'Balrampur', 'Pilibhit',
  'Shahjahanpur', 'Budaun', 'Bijnor', 'Rampur', 'Sambhal', 'Amroha',
  'Bulandshahr', 'Hapur', 'Etah', 'Kasganj', 'Mainpuri', 'Farrukhabad',
  'Kannauj', 'Etawah', 'Auraiya', 'Hamirpur', 'Mahoba', 'Lalitpur',
  'Chitrakoot', 'Pratapgarh', 'Rae Bareli', 'Amethi', 'Sitapur',
  'Hardoi', 'Unnao', 'Firozabad',
  // Hindi
  'गोरखपुर', 'प्रयागराज', 'इलाहाबाद', 'लखनऊ', 'वाराणसी', 'कानपुर',
  'आगरा', 'नोएडा', 'गाजियाबाद', 'मेरठ', 'बरेली', 'अलीगढ़',
  'झांसी', 'मथुरा', 'अयोध्या', 'फैजाबाद', 'देवरिया', 'बस्ती',
  'आजमगढ़', 'बलिया', 'मऊ', 'मिर्जापुर', 'सोनभद्र', 'चंदौली',
  'जौनपुर', 'घाजीपुर', 'गाजीपुर', 'महारागंज', 'कुशीनगर',
  'गोंडा', 'बहराइच', 'श्रावस्ती', 'बलरामपुर', 'पीलीभीत',
  'शाहजहांपुर', 'बदायूं', 'बिजनौर', 'रामपुर', 'संभल', 'अमरोहा',
  'बुलंदशहर', 'हापुड़', 'एटा', 'कासगंज', 'मैनपुरी', 'फर्रुखाबाद',
  'कन्नौज', 'इटावा', 'औरैया', 'हमीरपुर', 'महोबा', 'ललितपुर',
  'ओरई', 'चित्रकूट', 'प्रतापगढ़', 'रॉबर्ट्सगंज',
];

function isBiharRelevant(headline: string, synopsis: string): boolean {
  const text = `${headline} ${synopsis}`;

  // Strong Bihar signals — state name or district
  const hasStateName = matchesAnyToken(text, BIHAR_STATE_NAMES);
  const hasDistrict = matchesAnyToken(text, BIHAR_DISTRICTS);

  // If strong Bihar signal is present, allow even if non-Bihar state is mentioned
  // (e.g. "Bihar CM meets UP CM in Lucknow" is still Bihar-relevant)
  if (hasStateName || hasDistrict) {
    return true;
  }

  // Hard block: non-Bihar state/city mentioned and NO Bihar signal → reject
  if (matchesAnyToken(text, NON_BIHAR_STATES)) {
    return false;
  }

  // Hard block: known false-positive cities → reject
  if (matchesAnyToken(text, NON_BIHAR_FALSE_POSITIVE_CITIES)) {
    return false;
  }

  return false;
}

async function scrapeSource(source: SourceConfig): Promise<number> {
  const startTime = Date.now();
  console.log(`\n▶ [START] ${source.name} (${source.language})`);

  let discovered = await discoverFromSource(source);
  console.log(`  [DISCOVER] ${source.name}: found ${discovered.length} article links`);

  if (discovered.length === 0) return 0;

  // Pre-filter: drop articles with RSS dates older than 7 days (avoids fetching pages)
  const now = Date.now();
  const beforeFilter = discovered.length;
  discovered = discovered.filter((a) => {
    if (a.pubDate && (now - a.pubDate > SEVEN_DAYS_MS || a.pubDate > now + 3_600_000)) {
      return false;
    }
    return true;
  });
  if (discovered.length < beforeFilter) {
    console.log(`  ${beforeFilter - discovered.length} articles dropped by RSS date filter`);
  }

  // Batch dedup: collect all IDs and check which already exist
  const allIds = discovered.map((a) => generateArticleId(a.url));
  const existingIds = await getExistingIds(allIds);
  const newCount = discovered.filter((_, i) => !existingIds.has(allIds[i])).length;
  console.log(`  [DEDUP] ${source.name}: ${newCount} new, ${discovered.length - newCount} already in DB`);

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

      // Date validation — prefer RSS date if available, fall back to page-extracted date
      const published_timestamp = article.pubDate || data.published_timestamp;
      if (!published_timestamp) {
        console.log(`  ✗ No date found: ${data.headline.slice(0, 60)}`);
        continue;
      }

      // Drop future dates (timezone leak guard)
      if (published_timestamp > now + 3_600_000) {
        console.log(`  ✗ Future date: ${data.headline.slice(0, 60)}`);
        continue;
      }

      // Drop articles older than 7 days
      if (now - published_timestamp > SEVEN_DAYS_MS) {
        console.log(`  ✗ Too old: ${data.headline.slice(0, 60)}`);
        continue;
      }

      // Bihar relevance gate — token-bounded matching
      if (!isBiharRelevant(data.headline, data.synopsis)) {
        console.log(`  ✗ Not Bihar-relevant: ${data.headline.slice(0, 60)}`);
        continue;
      }

      // Blocked phrase filter
      if (blockedPhrases.length > 0 && isBlockedArticle(data.headline, data.synopsis, blockedPhrases)) {
        console.log(`  ✗ Blocked phrase match: ${data.headline.slice(0, 60)}`);
        continue;
      }

      // Determine noise status — store but flag
      const isNoise = isNoiseArticle(data.headline, data.synopsis);

      // Classify (token-bounded keyword matching)
      const rawCategory = classifyArticle(data.headline, data.synopsis, source);

      // Determine final category and noise flag
      let category: string | null;
      let isNoiseFlag: boolean;

      if (isNoise || rawCategory === 'exclude') {
        // Noise or non-development: store with is_noise = true, category = null
        category = null;
        isNoiseFlag = true;
        console.log(`  ~ [noise] ${data.headline.slice(0, 70)}`);
      } else {
        // Normal development article
        category = rawCategory;
        isNoiseFlag = false;
        console.log(`  ✓ [${category}] ${data.headline.slice(0, 70)}`);
      }

      const row: ArticleRow = {
        id,
        url: article.url,
        headline: data.headline,
        synopsis: data.synopsis,
        source: source.name,
        language: source.language,
        category,
        is_noise: isNoiseFlag,
        published_timestamp,
        ingested_at: Date.now(),
      };

      await upsertArticle(row);
      stored++;
    } catch (err) {
      console.error(`  ✗ Error: ${(err as Error).message}`);
    }

    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  → [DONE] ${source.name}: ${stored} articles stored (${elapsed}s)`);
  return stored;
}

async function discoverFromSource(
  source: SourceConfig
): Promise<{ url: string; headline?: string; pubDate?: number }[]> {
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
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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

/**
 * Run a function with a timeout. Rejects if it takes too long.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

/**
 * Process items in parallel with a concurrency limit.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Main entry point ──
async function main() {
  const startTime = Date.now();
  console.log('═══════════════════════════════════════════');
  console.log(`Bihar News Scraper — ${new Date().toISOString()}`);
  console.log(`Sources: ${ALL_SOURCES.length} | Concurrency: ${SOURCE_CONCURRENCY}`);
  console.log(`Timeouts: script=${SCRIPT_TIMEOUT_MS / 60_000}min, source=${SOURCE_TIMEOUT_MS / 60_000}min`);
  console.log('═══════════════════════════════════════════');

  // Load learned keywords and blocked phrases from DB
  try {
    const [learned, blocked] = await Promise.all([
      getLearnedKeywords(),
      getBlockedPhrases(),
    ]);
    setLearnedKeywords(learned);
    blockedPhrases = blocked;
    console.log(`Loaded ${learned.length} learned keywords, ${blocked.length} blocked phrases`);
  } catch (err) {
    console.error(`Failed to load DB data: ${(err as Error).message} — continuing with defaults`);
  }

  const results = await mapWithConcurrency(ALL_SOURCES, SOURCE_CONCURRENCY, (source) =>
    withTimeout(
      scrapeSource(source).catch((err) => {
        console.error(`\n✗ [FAIL] ${source.name}: ${(err as Error).message}`);
        return 0;
      }),
      SOURCE_TIMEOUT_MS,
      `source: ${source.name}`
    ).catch((err) => {
      console.error(`\n✗ [TIMEOUT] ${source.name}: ${(err as Error).message}`);
      return 0;
    })
  );

  const totalStored = results.reduce((sum, n) => sum + n, 0);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n═══════════════════════════════════════════');
  console.log(`Done! Total new articles stored: ${totalStored}`);
  console.log(`Elapsed: ${elapsed}s`);
  console.log('═══════════════════════════════════════════');

  clearTimeout(scriptTimer);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  clearTimeout(scriptTimer);
  process.exit(1);
});

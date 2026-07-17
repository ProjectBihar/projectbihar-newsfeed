/**
 * Scored Bihar filter — replaces the three-gate system (geo-fence → noise → classify).
 *
 * Architecture:
 *   geo_score()   → does the article mention Bihar at all? (0 = drop, 1+ = keep)
 *   classify()    → which development category? (or "Discard" if noise dominates)
 *   Combined:     → geo_score <= 0 → drop
 *                  geo_score > 0 AND classify() = "Discard" → drop
 *                  geo_score > 0 AND classify() = category → store with category
 */

import { matchesToken } from '../scraper/token-match';

// ── Bihar geo dictionary ──
const BIHAR_GEO_DICTIONARY: string[] = [
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

// ── Disambiguation: terms that appear in other states ──
const DISAMBIGUATION_CONFLICTS: Record<string, string[]> = {
  'Aurangabad': ['Maharashtra', 'Eknath Shinde', 'Sambhajinagar'],
  'Ganga': ['Haridwar', 'Varanasi', 'Kolkata', 'Rishikesh', 'Uttarakhand'],
  'Son River': ['Rewa', 'Satna', 'Mirzapur', 'Madhya Pradesh'],
};

// ── Category keywords ──
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  economy: [
    'gsdp', 'fiscal', 'dbt', 'budget', 'gdp', 'tax', 'revenue',
    'da hike', 'pension', 'per capita', 'inflation', 'deficit',
    'expenditure', 'treasury', 'rupee', 'income', 'poverty',
    'funding', 'financing', 'excise', 'finance minister',
    'economic growth', 'economic survey', 'gst', 'disbursement',
    'subsidy', 'cash transfer', 'holding tax', 'property tax',
    'revenue collection', 'अर्थव्यवस्था', 'राजस्व', 'बजट', 'अनुदान',
    'पेंशन', 'राजकोष', 'वित्तीय', 'आर्थिक',
  ],
  infrastructure: [
    'bridge', 'expressway', 'metro', 'railway', 'highway',
    'flyover', 'dam', 'canal', 'power grid', 'electricity',
    'water supply', 'sewage', 'smart city', 'construction',
    'transmission', 'nhai', 'national highway', 'railway station',
    'airport', 'port', 'overbridge', 'urban development', 'capex',
    'शिलान्यास', 'निर्माण', 'बांध', 'नहर', 'विद्युत', 'रेलवे', 'हवाई अड्डा',
  ],
  industry: [
    'factory', 'manufacturing', 'plant', 'industrial', 'corporate',
    'mining', 'cement', 'steel', 'sugar', 'textile', 'assembly',
    'special economic', 'sez', 'industrial park', 'industrial area',
    'ethanol', 'semiconductor', 'biada', 'startup', 'msme', 'it hub',
    'warehouse', 'supply chain', 'logistics',
    'उद्योग', 'कारखाना', 'उद्योगिक',
  ],
  agriculture: [
    'farming', 'crop', 'harvest', 'irrigation', 'farmer', 'paddy',
    'wheat', 'maize', 'lentil', 'fisheries', 'livestock', 'fertilizer',
    'mandi', 'fpo', 'agri', 'cultivation', 'soil', 'rabi', 'kharif',
    'makhana', 'litchi', 'banana', 'mango', 'food grain', 'crop loss',
    'minimum support price', 'msp', 'animal husbandry', 'dairy', 'poultry',
    'jeevika', 'crop insurance', 'किसान', 'कृषि', 'फसल', 'सिंचाई', 'मवेशी',
  ],
  education: [
    'school', 'college', 'university', 'exam', 'student', 'teacher',
    'curriculum', 'scholarship', 'literacy', 'admission', 'result',
    'board', 'cbse', 'bseb', 'syllabus', 'degree', 'enrollment',
    'academic', 'lecture', 'professor', 'training', 'nta', 'ugc',
    'patna university', 'magadh university', 'vidya', 'bpsc', 'upsc',
    'kyp', 'recruitment', 'शिक्षा', 'शिक्षक', 'भर्ती', 'परीक्षा', 'परिणाम',
  ],
  healthcare: [
    'hospital', 'doctor', 'disease', 'vaccination', 'nutrition',
    'ambulance', 'phc', 'chc', 'medical', 'mental health', 'dengue',
    'encephalitis', 'healthcare', 'clinic', 'medicine', 'patient',
    'outbreak', 'epidemic', 'mortality', 'maternal', 'infant',
    'aiims', 'pmch', 'nmch', 'igims', 'infection', 'vaccine drive',
    'vaccination drive', 'unconscious', 'intoxication', 'overdose',
    'poisoning', 'accident', 'injured', 'victim', 'treatment',
    'अस्पताल', 'स्वास्थ्य', 'टीकाकरण', 'दवा', 'मरीज',
    'बेहोश', 'नशा', 'शिकार', 'घायल', 'इलाज',
  ],
  environment: [
    'pollution', 'climate', 'flood', 'floods', 'drought', 'forest',
    'wildlife', 'river', 'ganga', 'conservation', 'emission', 'waste',
    'renewable', 'solar', 'green', 'biodiversity', 'air quality', 'aqi',
    'deforestation', 'wetland', 'afforestation', 'sand mining', 'poaching',
    'flood warning', 'flood relief', 'embankment', 'waterlogging',
    'clean energy', 'siltation', 'solar plant', 'solar panel', 'solar power',
    'बाढ़', 'सूखा', 'जल-जीवन-हरियाली', 'प्रदूषण', 'वन', 'नदी', 'सौर', 'जलवायु',
  ],
};

// ── Noise keywords (political/crime) — only strong indicators ──
const NOISE_KEYWORDS = new Set([
  // English political (strong signals only)
  'slams', 'accuses', 'takes a dig', 'hits out', 'joins party',
  'switches party', 'seat-sharing', 'ticket distribution',
  'election rally', 'files nomination', 'withdraws candidature',
  'floor test', 'trust vote', 'party feud',
  // English crime (strong signals only)
  'arrested', 'shot dead', 'shot and killed',
  'contract killing', 'personal dispute', 'family feud',
  'honour killing', 'domestic violence', 'assault case',
  'firing incident', 'open fire', 'gun battle', 'encounter',
  'fugitive', 'shooter', 'custody', 'bail', 'convicted',
  'liquor', 'drugs', 'smuggled', 'confiscated',
  // Hindi political (strong signals only)
  'आरोप', 'हमला', 'निशाना', 'टिकट', 'गठबंधन', 'चुनावी', 'रैली',
  'नामांकन', 'प्रत्याशी', 'चुनाव प्रचार', 'इस्तीफा', 'उम्मीदवार',
  // Hindi crime (strong signals only)
  'हत्या', 'गिरफ्तार', 'गोलीबारी', 'लूट', 'डकैती', 'फायरिंग',
  'मुठभेड़', 'अपहरण', 'रंगदारी', 'शूटर', 'फरार', 'शराब',
  'नशा', 'चोरी', 'जब्त', 'हिरासत', 'सजा', 'दोषी',
  'आपराधिक', 'अपराध', 'मामला', 'मौत', 'मृत्यु', 'वारदात', 'लाश',
  'शराबबंदी', 'शराब तस्करी', 'नशीला', 'खुरानी', 'बेहोश', 'लूटपाट',
  'हत्यारा', 'गिरफ्तारी', 'हथियार', 'बंदूक', 'तस्कर', 'तस्करी', 'पकड़ा',
]);

// ── Developmental signals (override noise if present) ──
const DEVELOPMENTAL_SIGNALS = new Set([
  'cabinet approves', 'cabinet cleared', 'inaugurates', 'inaugurated',
  'foundation stone', 'ground breaking', 'signs mou', 'signed mou',
  'fund allocation', 'allocated', 'budget', 'policy', 'scheme launched',
  'scheme announced', 'recruitment', 'exam result', 'exam results',
  'results declared', 'vaccine drive', 'vaccination drive', 'flood warning',
  'solar plant', 'solar panel', 'solar power', 'inauguration ceremony',
  'commissioned', 'operationalized', 'approves project', 'sanctioned',
  'released funds', 'flag off', 'flagged off', 'dedicated to nation',
  'capex', 'expenditure', 'disbursement', 'pension scheme',
  'insurance scheme', 'welfare scheme', 'recruitment drive', 'job fair',
  'skill development', 'construction begins', 'work begins', 'completion',
  'कैबिनेट', 'उद्घाटन', 'शिलान्यास', 'बजट', 'योजना', 'भर्ती',
  'परीक्षा', 'परिणाम', 'टीकाकरण', 'बाढ़ चेतावनी', 'सौर', 'पेंशन',
  'बीमा', 'कल्याण', 'निर्माण', 'कार्य', 'रिहाई', 'स्वीकृत', 'जारी', 'समर्पित',
]);

// ══════════════════════════════════════════
// STEP 2 — Scoring functions
// ══════════════════════════════════════════

/**
 * Score how strongly the article is about Bihar.
 * Returns 0 = not Bihar, 1+ = Bihar signal strength.
 * Dedicated sources (Bihar pages) get automatic score of 3.
 */
export function geo_score(headline: string, synopsis: string, isDedicatedSource: boolean): number {
  if (isDedicatedSource) return 3;

  const text = `${headline} ${synopsis}`;
  let score = 0;

  for (const term of BIHAR_GEO_DICTIONARY) {
    if (!matchesToken(text, term)) continue;

    // Check disambiguation: if conflict terms are present, this term is vetoed
    if (DISAMBIGUATION_CONFLICTS[term]) {
      if (DISAMBIGUATION_CONFLICTS[term].some((c) => matchesToken(text, c))) {
        continue; // vetoed — probably not Bihar
      }
      score += 1; // ambiguous but not vetoed — weak signal
    } else {
      score += 2; // unambiguous Bihar term — strong signal
    }
  }

  return score;
}

/**
 * Classify into a development category, or "Discard" if noise dominates.
 * Returns the category label or "Discard".
 */
export function classify(headline: string, synopsis: string): string {
  const text = `${headline} ${synopsis}`;
  const categoryScores: Record<string, number> = {};
  for (const cat of Object.keys(CATEGORY_KEYWORDS)) {
    categoryScores[cat] = 0;
  }

  // Tokenize: split on non-alphanumeric, non-Devanagari
  const tokens = text.toLowerCase().split(/[^a-z\u0900-\u097F]+/).filter((t) => t.length >= 2);

  let noiseScore = 0;

  for (const token of tokens) {
    // Check category keywords
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.includes(token)) {
        categoryScores[cat] += 2;
      }
    }

    // Check noise keywords
    if (NOISE_KEYWORDS.has(token)) {
      noiseScore += 1;
    }
  }

  // Check multi-word phrases and partial/prefix matches via matchesToken
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (categoryScores[cat] >= 4) break; // already strong signal
      if (kw.includes(' ') && matchesToken(text, kw)) {
        categoryScores[cat] += 2;
      } else if (matchesToken(text, kw)) {
        categoryScores[cat] += 2;
      } else if (tokens.some((t) => t.startsWith(kw) || kw.startsWith(t))) {
        // Prefix match: "tax" matches "taxes", "pension" matches "pensions"
        categoryScores[cat] += 1;
      }
    }
  }

  // Check developmental signals (override noise)
  let hasDevelopmentalSignal = false;
  for (const signal of DEVELOPMENTAL_SIGNALS) {
    if (matchesToken(text, signal)) {
      hasDevelopmentalSignal = true;
      break;
    }
  }

  // If noise dominates and no developmental signal → Discard
  if (noiseScore > 0 && !hasDevelopmentalSignal) {
    const topCat = Object.keys(categoryScores).reduce((a, b) =>
      categoryScores[a] > categoryScores[b] ? a : b
    );
    if (categoryScores[topCat] <= noiseScore) {
      return 'Discard';
    }
  }

  // Find highest scoring category
  const sorted = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === 0) return 'Discard'; // no category match

  return sorted[0][0];
}

// ══════════════════════════════════════════
// STEP 3 — Combined decision
// ════════════════════════════════════════

/**
 * The new master filter. Returns { keep: boolean, category?: string }.
 * Replace the old geo-fence + noise + classify gates with this.
 */
export function filterArticle(
  headline: string,
  synopsis: string,
  isDedicatedSource: boolean
): { keep: boolean; category?: string } {
  const g = geo_score(headline, synopsis, isDedicatedSource);

  if (g <= 0) {
    return { keep: false }; // no Bihar signal
  }

  const category = classify(headline, synopsis);

  if (category === 'Discard') {
    return { keep: false }; // noise outweighed developmental signal
  }

  return { keep: true, category };
}

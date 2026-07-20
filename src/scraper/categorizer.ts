// ── THE PRAGMATIC 92% HEURISTIC ENGINE ──
// v2: Weighted keywords, phrase matching, headline prioritization, dedup, stop-words.
// Maintains the same analyzeArticle(headline, synopsis) interface. Zero downstream changes.

// ══════════════════════════════════════════════════════════════════════════════
// 1. BILINGUAL STOP-WORDS (NEW — applied during tokenization)
// Prevents filler words from polluting scoring. Replaces the old length-based filter.
// ══════════════════════════════════════════════════════════════════════════════
const STOP_WORDS = new Set<string>([
  // English
  'the', 'and', 'with', 'from', 'this', 'that', 'have', 'has', 'been', 'will',
  'would', 'could', 'should', 'about', 'into', 'also', 'more', 'than', 'very',
  'some', 'each', 'much', 'such', 'what', 'when', 'which', 'who', 'how', 'its',
  'for', 'not', 'are', 'was', 'were', 'but', 'can', 'may', 'our', 'his', 'her',
  'him', 'she', 'they', 'them', 'you', 'your', 'all', 'any', 'had', 'did',
  // Hindi
  'है', 'की', 'में', 'का', 'के', 'को', 'से', 'पर', 'ने', 'और',
  'यह', 'वह', 'एक', 'भी', 'तो', 'अब', 'जो', 'हो', 'था', 'थे',
  'थी', 'इस', 'उस', 'उन', 'आज', 'कल', 'वे', 'ये', 'इन', 'उन',
  'किया', 'कर', 'हुआ', 'हुई', 'हुए', 'रहा', 'रही', 'रहे', 'गया', 'गई',
  'दिया', 'दी', 'लिए', 'पर', 'सभी', 'बाद', 'पहले', 'कहा', 'बीच', 'ओर',
]);

// ══════════════════════════════════════════════════════════════════════════════
// 2. ABSOLUTE KILL-SWITCHES (Immediate banishment to Noise)
// ══════════════════════════════════════════════════════════════════════════════
const STRICT_NOISE_PHRASES = [
  // Sexual/crime content
  'हनी ट्रैप', 'गैंगरेप', 'रेप', 'सेक्स', 'अश्लील', 'प्रेमी', 'प्रेमिका', 'सुहागरात', 'पोर्न', 'जिस्म',
  'honey trap', 'sex racket', 'porn', 'rape', 'lover', 'extramarital',
  // Non-Bihar national news
  'wangchuk', 'delhi hc', 'supreme court', 'सुप्रीम कोर्ट', 'दिल्ली हाईकोर्ट',
  'sensex', 'nifty', 'सेंसेक्स', 'निफ्टी',
  // Entertainment / sports
  'bollywood', 'bigg boss', 'cricket', 'ipl', 't20', 'world cup', 'विश्व कप',
  'formula 1', 'f1 race', 'oscars', 'ग्रैमी',

];

// ══════════════════════════════════════════════════════════════════════════════
// 3. GLOBAL CRIME & SCAM PENALTIES (Stems — flat +50, UNCHANGED from v1)
// ══════════════════════════════════════════════════════════════════════════════
const GLOBAL_CRIME_STEMS = [
  'हत्या', 'मर्डर', 'गोली', 'गिरफ्तार', 'लूट', 'वसूली', 'अपहरण', 'फिरौती', 'तस्करी',
  'शव', 'लाश', 'एनकाउंटर', 'अपराध', 'माफिया', 'फायरिंग', 'घोटाला', 'फर्जी', 'रिश्वत',
  'घूस', 'धोखाधड़ी', 'सीबीआई', 'लाठीचार्ज', 'रंगदारी', 'चोरी', 'डकैती', 'बदमाश', 'दबंग',
  'smuggling', 'arrested', 'murder', 'extortion', 'kidnap', 'ransom', 'fir', 'police',
  'scam', 'fraud', 'fake', 'bribery', 'theft', 'robber', 'criminal', 'raid',
];

// ══════════════════════════════════════════════════════════════════════════════
// 4. PHRASE DICTIONARY (NEW — checked before token-based scoring)
// [phrase, category, weight] — scored as one-time bonus per matched phrase.
// ══════════════════════════════════════════════════════════════════════════════
const PHRASE_MATRIX: [string, string, number][] = [
  // Healthcare phrases
  ['medical college', 'healthcare', 50],
  ['मेडिकल कॉलेज', 'healthcare', 50],
  ['food testing laboratory', 'healthcare', 50],
  ['खाद्य परीक्षण प्रयोगशाला', 'healthcare', 50],
  ['medical store', 'healthcare', 35],
  ['मेडिकल स्टोर', 'healthcare', 35],
  ['medical device', 'healthcare', 40],
  ['फूड सेफ्टी', 'healthcare', 40],
  ['food safety', 'healthcare', 40],
  ['food adulteration', 'healthcare', 45],
  ['खाद्य मिलावट', 'healthcare', 45],
  // Agriculture phrases
  ['cold storage', 'agriculture', 40],
  ['ठंडा भंडारण', 'agriculture', 40],
  ['seed distribution', 'agriculture', 40],
  ['बीज वितरण', 'agriculture', 40],
  ['micro irrigation', 'agriculture', 45],
  ['माइक्रो इरिगेशन', 'agriculture', 45],
  ['कृषि मंडी', 'agriculture', 40],
  ['agricultural market', 'agriculture', 40],
  ['सिंचाई परियोजना', 'agriculture', 40],
  ['irrigation project', 'agriculture', 40],
  ['cold chain', 'agriculture', 35],
  ['कोल्ड चेन', 'agriculture', 35],
  // Environment phrases
  ['solar power project', 'environment', 40],
  ['सौर ऊर्जा परियोजना', 'environment', 40],
  ['solar plant', 'environment', 35],
  ['सोलर प्लांट', 'environment', 35],
  // Infrastructure phrases
  ['river linking', 'infrastructure', 40],
  ['नदी जोड़ने', 'infrastructure', 40],
  ['smart meter', 'infrastructure', 35],
  ['स्मार्ट मीटर', 'infrastructure', 35],
  ['smart city', 'infrastructure', 40],
  ['स्मार्ट सिटी', 'infrastructure', 40],
  // Industry phrases
  ['industrial park', 'industry', 40],
  ['औद्योगिक पार्क', 'industry', 40],
  ['industrial corridor', 'industry', 45],
  ['इंडस्ट्रियल कॉरिडोर', 'industry', 45],
  ['food processing', 'industry', 40],
  ['फूड प्रोसेसिंग', 'industry', 40],
];

// ══════════════════════════════════════════════════════════════════════════════
// 5. WEIGHTED CATEGORY MATRIX (v2 — 3-tier weights)
//
// stems:  [keyword, weight] — prefix match (token.startsWith)
// exact:  [keyword, weight] — exact token match (token ===)
// negStems: string[] — flat -100 penalty (unchanged from v1)
//
// Weight tiers:
//   Strong (40): Domain-specific, rarely appears outside its category
//   Standard (25): Clearly related but context-dependent
//   Weak (10): High-frequency generic terms across categories
// ══════════════════════════════════════════════════════════════════════════════
const CATEGORY_MATRIX: Record<string, { stems: [string, number][], exact: [string, number][], negStems: string[] }> = {
  economy: {
    stems: [
      ['कारोबार', 25], ['निवेश', 25], ['अर्थव्यवस्थ', 40], ['व्यापार', 25],
      ['स्टार्टअप', 25], ['राजस्व', 25], ['investment', 25], ['economy', 40],
      ['startup', 25], ['business', 25], ['market', 10],
    ],
    exact: [
      ['बजट', 40], ['जीडीपी', 40], ['gdp', 40], ['मिल', 15],
    ],
    negStems: ['हादसा', 'दुर्घटना', 'आग', 'बाढ़'],
  },
  infrastructure: {
    stems: [
      ['सड़क', 25], ['हाइवे', 25], ['निर्माण', 25], ['एक्सप्रेसवे', 40],
      ['रेलवे', 25], ['एयरपोर्ट', 40], ['प्रोजेक्ट', 10], ['मेट्रो', 40],
      ['फोरलेन', 40], ['फ्लाइओवर', 40], ['infrastructure', 40], ['highway', 25],
      ['construction', 25], ['airport', 40], ['railway', 25], ['expressway', 40],
    ],
    exact: [
      ['पुल', 40], ['पुलों', 40], ['पुलिया', 40], ['bridge', 40],
    ],
    negStems: ['हादसा', 'टक्कर', 'दुर्घटना', 'क्रैश'],
  },
  agriculture: {
    stems: [
      ['किसान', 25], ['खेती', 40], ['फसल', 40], ['सिंचाई', 40],
      ['मानसून', 25], ['कृषि', 40], ['उर्वरक', 40], ['मंडी', 25],
      ['agriculture', 40], ['farmer', 25], ['crop', 40], ['irrigation', 40],
      ['monsoon', 25], ['fertilizer', 40], ['cultivation', 40],
    ],
    exact: [
      ['खाद', 40], ['धान', 40], ['गेहूं', 40], ['गन्ना', 40],
    ],
    negStems: ['सुसाइड', 'आत्महत्या', 'हादसा', 'दुर्घटना'],
  },
  education: {
    stems: [
      ['स्कूल', 25], ['विश्वविद्यालय', 40], ['कॉलेज', 25], ['छात्र', 25],
      ['परीक्षा', 40], ['शिक्षक', 25], ['शिक्षा', 40], ['यूनिवर्सिटी', 40],
      ['रिजल्ट', 25], ['नामांकन', 40], ['कुलपति', 40],
      ['education', 40], ['school', 25], ['university', 40], ['student', 25],
      ['exam', 40], ['teacher', 25], ['college', 25], ['admission', 40],
    ],
    exact: [
      ['मेधावी', 40],
    ],
    negStems: ['मारपीट', 'बवाल', 'भिड़ंत'],
  },
  healthcare: {
    stems: [
      ['अस्पताल', 25], ['डॉक्टर', 25], ['मेडिकल', 25], ['मरीज', 40],
      ['बीमारी', 40], ['स्वास्थ्य', 40], ['नर्सिंग', 40], ['हॉस्पिटल', 25],
      ['हॉस्पीटल', 25], ['क्लीनिक', 25], ['वैक्सीन', 40], ['ऑपरेशन', 40],
      ['healthcare', 40], ['hospital', 25], ['medical', 25], ['doctor', 25],
      ['disease', 40], ['patient', 40], ['clinic', 25], ['surgery', 40],
      ['health', 25],
    ],
    exact: [],
    negStems: ['पोस्टमार्टम', 'शव', 'लाश', 'कत्ल', 'रेड', 'छापेमारी'],
  },
  governance: {
    stems: [
      ['नीतीश', 40], ['तेजस्वी', 40], ['चिराग', 40], ['सरकार', 10],
      ['कैबिनेट', 40], ['योजना', 25], ['नीति', 25], ['प्रशासन', 25],
      ['विधायक', 40], ['सांसद', 40], ['कलेक्टर', 40], ['सचिवालय', 40],
      ['घोषणा', 10], ['governance', 40], ['policy', 25], ['cabinet', 40],
      ['government', 10], ['administration', 25], ['municipality', 40],
      // Legislation-specific keywords
      ['विधेयक', 40], ['विधानसभा', 40], ['bills', 40], ['assembly', 40],
      ['legislation', 40], ['पारित', 25], ['passed', 10],
    ],
    exact: [
      ['सीएम', 40], ['डीएम', 40], ['नगर निगम', 40],
      ['mla', 40], ['mp', 40], ['dm', 40], ['cm', 40],
    ],
    negStems: ['चुनाव प्रचार', 'रैली', 'वोटबैंक'],
  },
  industry: {
    stems: [
      ['उद्योग', 25], ['फैक्ट्री', 25], ['कारखाना', 25], ['मैन्युफैक्चरिंग', 40],
      ['इंडस्ट्री', 25], ['इन्वेस्टर्स', 25], ['उद्यमी', 25],
      ['industry', 25], ['manufacturing', 40], ['factory', 25], ['plant', 25],
      ['production', 25], ['investor', 25],
    ],
    exact: [
      ['प्लांट', 25], ['मिल', 15],
    ],
    negStems: ['हादसा', 'आग', 'accident', 'fire'],
  },
  environment: {
    stems: [
      ['पर्यावरण', 40], ['प्रदूषण', 40], ['मौसम', 25], ['बाढ़', 40],
      ['बारिश', 25], ['जलवायु', 40], ['तापमान', 25], ['जलजमाव', 40],
      ['एक्यूआई', 40], ['प्रदूषित', 40],
      ['environment', 40], ['weather', 25], ['climate', 40], ['pollution', 40],
      ['flood', 40], ['rain', 25], ['forest', 40], ['aqi', 40], ['temperature', 25],
    ],
    exact: [
      ['वन', 40], ['पेड़', 40], ['नदी', 25], ['हवा', 25],
      ['नदियों', 25], ['नदियां', 25],
    ],
    negStems: ['चुनाव', 'मर्डर', 'हादसा', 'दुर्घटना'],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// 6. TOKENIZER (v2 — stop-word filtering)
// ══════════════════════════════════════════════════════════════════════════════
function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"|?]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0 && !STOP_WORDS.has(word));
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. MAIN CLASSIFIER
// ══════════════════════════════════════════════════════════════════════════════
export function analyzeArticle(headline: string, synopsis: string): { category: string | null, is_noise: boolean } {
  // Truncate synopsis to 800 chars to prevent footer navigation contamination.
  const safeSynopsis = synopsis.substring(0, 800);

  // ── TEXT PREPARATION ──
  // Padded raw text for kill-switches and phrase matching (full combined text).
  const combinedRaw = (headline + ' ' + safeSynopsis).toLowerCase();
  const paddedRaw = ` ${combinedRaw.replace(/[.,/#!$%^&*;:{}=\-_`~()'"|?]/g, ' ').replace(/\s+/g, ' ')} `;

  // Tokenize headline and synopsis SEPARATELY for headline prioritization.
  const headlineTokens = tokenizeText(headline.toLowerCase());
  const synopsisTokens = tokenizeText(safeSynopsis.toLowerCase());

  // ── STAGE 1: STRICT KILL-SWITCHES ──
  // Scan full padded text — headline and synopsis both checked equally.
  for (const phrase of STRICT_NOISE_PHRASES) {
    if (paddedRaw.includes(` ${phrase.toLowerCase()} `)) {
      return { category: null, is_noise: true };
    }
  }

  // ── STAGE 2: GLOBAL CRIME SCORE (flat +50 per stem, UNCHANGED from v1) ──
  let globalCrimeScore = 0;
  for (const token of [...headlineTokens, ...synopsisTokens]) {
    for (const crimeStem of GLOBAL_CRIME_STEMS) {
      if (token.startsWith(crimeStem.toLowerCase())) {
        globalCrimeScore += 50;
        break;
      }
    }
  }

  if (globalCrimeScore >= 50) {
    return { category: null, is_noise: true };
  }

  // ── STAGE 2.5: PHRASE PRE-MATCHING (NEW) ──
  // One-time bonus per matched phrase. Checked against full padded text.
  const phraseBonus: Record<string, number> = {};
  for (const [phrase, category, weight] of PHRASE_MATRIX) {
    if (paddedRaw.includes(` ${phrase.toLowerCase()} `)) {
      phraseBonus[category] = (phraseBonus[category] || 0) + weight;
    }
  }

  // ── STAGE 3: WEIGHTED CATEGORY SCORING WITH HEADLINE MULTIPLIER + DEDUP ──
  let bestCategory: string | null = null;
  let highestScore = 0;

  for (const [cat, rules] of Object.entries(CATEGORY_MATRIX)) {
    let currentScore = phraseBonus[cat] || 0;

    // Track matched stems per category to prevent duplicate scoring.
    const matchedStems = new Set<string>();
    const matchedExact = new Set<string>();

    // Headline tokens: 3x multiplier
    for (const token of headlineTokens) {
      for (const [stem, weight] of rules.stems) {
        const stemLower = stem.toLowerCase();
        if (token.startsWith(stemLower) && !matchedStems.has(stemLower)) {
          matchedStems.add(stemLower);
          currentScore += weight * 3;
        }
      }
      for (const [exact, weight] of rules.exact) {
        const exactLower = exact.toLowerCase();
        if (token === exactLower && !matchedExact.has(exactLower)) {
          matchedExact.add(exactLower);
          currentScore += weight * 3;
        }
      }
      for (const negStem of rules.negStems) {
        if (token.startsWith(negStem.toLowerCase())) currentScore -= 100;
      }
    }

    // Synopsis tokens: 1x multiplier
    for (const token of synopsisTokens) {
      for (const [stem, weight] of rules.stems) {
        const stemLower = stem.toLowerCase();
        if (token.startsWith(stemLower) && !matchedStems.has(stemLower)) {
          matchedStems.add(stemLower);
          currentScore += weight;
        }
      }
      for (const [exact, weight] of rules.exact) {
        const exactLower = exact.toLowerCase();
        if (token === exactLower && !matchedExact.has(exactLower)) {
          matchedExact.add(exactLower);
          currentScore += weight;
        }
      }
      for (const negStem of rules.negStems) {
        if (token.startsWith(negStem.toLowerCase())) currentScore -= 100;
      }
    }

    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestCategory = cat;
    }
  }

  // Threshold: 10 = minimum meaningful score (one weak keyword).
  if (highestScore < 10) {
    return { category: null, is_noise: false };
  }

  return { category: bestCategory, is_noise: false };
}

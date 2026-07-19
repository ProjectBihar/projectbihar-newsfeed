// ── THE PRAGMATIC 85% HEURISTIC ENGINE ──
// Prioritizes maintainability and speed. Relies on UI for the remaining 15% edge cases.

// 1. ABSOLUTE KILL-SWITCHES (Immediate banishment to Noise)
const STRICT_NOISE_PHRASES = [
  'हनी ट्रैप', 'गैंगरेप', 'रेप', 'सेक्स', 'अश्लील', 'प्रेमी', 'प्रेमिका', 'सुहागरात', 'पोर्न', 'जिस्म',
  'honey trap', 'sex racket', 'porn', 'rape', 'lover', 'extramarital',
  'wangchuk', 'delhi hc', 'supreme court', 'सुप्रीम कोर्ट', 'दिल्ली हाईकोर्ट', 'sensex', 'nifty',
  'सेंसेक्स', 'निफ्टी', 'bollywood', 'bigg boss', 'cricket', 'ipl', 't20'
];

// 2. GLOBAL CRIME & SCAM PENALTIES (Stems)
const GLOBAL_CRIME_STEMS = [
  'हत्या', 'मर्डर', 'गोली', 'गिरफ्तार', 'लूट', 'वसूली', 'अपहरण', 'फिरौती', 'तस्करी',
  'शव', 'लाश', 'एनकाउंटर', 'अपराध', 'माफिया', 'फायरिंग', 'घोटाला', 'फर्जी', 'रिश्वत',
  'घूस', 'धोखाधड़ी', 'सीबीआई', 'लाठीचार्ज', 'रंगदारी', 'चोरी', 'डकैती', 'बदमाश', 'दबंग',
  'smuggling', 'arrested', 'murder', 'extortion', 'kidnap', 'ransom', 'fir', 'police',
  'scam', 'fraud', 'fake', 'bribery', 'theft', 'robber', 'criminal', 'raid'
];

// 3. CATEGORY MATRIX (Separated into Stems and Exact matches to prevent prefix collisions)
const CATEGORY_MATRIX: Record<string, { stems: string[], exact: string[], negStems: string[] }> = {
  economy: {
    stems: ['कारोबार', 'निवेश', 'उद्योग', 'अर्थव्यवस्थ', 'व्यापार', 'स्टार्टअप', 'राजस्व', 'फैक्ट्र', 'investment', 'economy', 'startup', 'business', 'factory', 'market'],
    exact: ['बजट', 'जीडीपी', 'मिल', 'gdp'],
    negStems: ['हादसा', 'दुर्घटना']
  },
  infrastructure: {
    stems: ['सड़क', 'हाइवे', 'निर्माण', 'एक्सप्रेसवे', 'रेलवे', 'एयरपोर्ट', 'प्रोजेक्ट', 'मेट्रो', 'फोरलेन', 'फ्लाइओवर', 'infrastructure', 'highway', 'construction', 'airport', 'railway', 'expressway'],
    exact: ['पुल', 'पुलों', 'पुलिया', 'bridge'],
    negStems: ['हादसा', 'टक्कर', 'दुर्घटना', 'क्रैश']
  },
  agriculture: {
    stems: ['किसान', 'खेती', 'फसल', 'सिंचाई', 'मानसून', 'कृषि', 'उर्वरक', 'मंडी', 'agriculture', 'farmer', 'crop', 'irrigation', 'monsoon', 'fertilizer', 'cultivation'],
    exact: ['खाद', 'धान', 'गेहूं', 'गन्ना'],
    negStems: ['सुसाइड', 'आत्महत्या']
  },
  education: {
    stems: ['स्कूल', 'विश्वविद्यालय', 'कॉलेज', 'छात्र', 'परीक्षा', 'शिक्षक', 'शिक्षा', 'यूनिवर्सिटी', 'रिजल्ट', 'नामांकन', 'कुलपति', 'education', 'school', 'university', 'student', 'exam', 'teacher', 'college', 'admission'],
    exact: ['मेधावी'],
    negStems: ['मारपीट', 'बवाल', 'भिड़ंत']
  },
  healthcare: {
    stems: ['अस्पताल', 'डॉक्टर', 'मेडिकल', 'मरीज', 'बीमारी', 'स्वास्थ्य', 'नर्सिंग', 'हॉस्पिटल', 'हॉस्पीटल', 'क्लीनिक', 'वैक्सीन', 'ऑपरेशन', 'healthcare', 'hospital', 'medical', 'doctor', 'disease', 'patient', 'clinic', 'surgery', 'health'],
    exact: [],
    negStems: ['पोस्टमार्टम', 'शव', 'लाश', 'कत्ल', 'रेड', 'छापेमारी']
  },
  governance: {
    stems: ['नीतीश', 'तेजस्वी', 'चिराग', 'सरकार', 'कैबिनेट', 'योजना', 'नीति', 'प्रशासन', 'विधायक', 'सांसद', 'कलेक्टर', 'सचिवालय', 'घोषणा', 'governance', 'policy', 'cabinet', 'government', 'administration', 'municipality'],
    exact: ['सीएम', 'डीएम', 'नगर निगम', 'mla', 'mp', 'dm', 'cm'],
    negStems: ['चुनाव प्रचार', 'रैली', 'वोटबैंक']
  },
  industry: {
    stems: [
      'उद्योग', 'फैक्ट्री', 'कारखाना', 'मैन्युफैक्चरिंग', 'इंडस्ट्री', 'इन्वेस्टर्स', 'उद्यमी',
      'industry', 'manufacturing', 'factory', 'plant', 'production', 'investor'
    ],
    exact: ['प्लांट', 'मिल'],
    negStems: ['हादसा', 'आग', 'accident', 'fire']
  },
  environment: {
    stems: [
      'पर्यावरण', 'प्रदूषण', 'मौसम', 'बाढ़', 'बारिश', 'जलवायु', 'तापमान', 'जलजमाव', 'एक्यूआई', 'प्रदूषित',
      'environment', 'weather', 'climate', 'pollution', 'flood', 'rain', 'forest', 'aqi', 'temperature'
    ],
    exact: ['वन', 'पेड़', 'नदी', 'हवा', 'नदियों', 'नदियां'],
    negStems: ['चुनाव', 'मर्डर']
  }
};

/**
 * Tokenizes text, converting it to lowercase and removing punctuation.
 */
function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"|?]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

export function analyzeArticle(headline: string, synopsis: string): { category: string | null, is_noise: boolean } {
  // THE EARLY BODY RULE (Categorizer Edition)
  // Truncate the synopsis to 800 characters to prevent footer navigation menus
  // (e.g., "Cricket | Bollywood | Crime") from artificially triggering noise kill-switches.
  const safeSynopsis = synopsis.substring(0, 800);
  const combinedRaw = (headline + ' ' + safeSynopsis).toLowerCase();

  // THE SUBSTRING SHIELD
  // Strip punctuation and collapse all spaces into single spaces, then pad the ends.
  // This ensures ' रेप ' (Rape) exactly matches the word, and does not match ' प्रेप ' (Prep).
  const paddedRaw = ` ${combinedRaw.replace(/[.,/#!$%^&*;:{}=\-_`~()'"|?]/g, ' ').replace(/\s+/g, ' ')} `;
  const tokens = tokenizeText(combinedRaw);

  // ── 1. STRICT KILL-SWITCHES ──
  for (const phrase of STRICT_NOISE_PHRASES) {
    // We now check against paddedRaw with spaces to enforce exact word boundaries
    if (paddedRaw.includes(` ${phrase.toLowerCase()} `)) {
      return { category: null, is_noise: true };
    }
  }

  // ── 2. GLOBAL CRIME SCORE ──
  let globalCrimeScore = 0;
  for (const token of tokens) {
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

  // ── 3. PRAGMATIC CATEGORY SCORING ──
  let bestCategory: string | null = null;
  let highestScore = 0;

  for (const [cat, rules] of Object.entries(CATEGORY_MATRIX)) {
    let currentScore = 0;

    for (const token of tokens) {
      for (const posStem of rules.stems) {
        if (token.startsWith(posStem.toLowerCase())) currentScore += 25;
      }
      for (const exactMatch of rules.exact) {
        if (token === exactMatch.toLowerCase()) currentScore += 25;
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

  if (highestScore < 25) {
    return { category: null, is_noise: false };
  }

  return { category: bestCategory, is_noise: false };
}

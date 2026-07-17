import type { Category } from './config';
import type { SourceConfig } from './sources';
import { matchesToken } from './token-match';

/**
 * Refined keyword lists for 7 development categories.
 * All matching is token-bounded — "gst" inside "Gangster" does NOT match.
 *
 * Generic/ambiguous words removed: पुल, सड़क, कर, निवेश
 * These appear in too many contexts and cause false matches.
 */
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  economy: [
    'gsdp', 'fiscal', 'dbt', 'budget', 'gdp', 'tax', 'revenue',
    'da hike', 'pension', 'per capita', 'inflation', 'deficit',
    'fiscal deficit', 'expenditure', 'treasury', 'rupee',
    'income', 'poverty', 'funding', 'financing', 'excise',
    'finance minister', 'economic growth', 'economic survey',
    'gst', 'disbursement', 'subsidy', 'cash transfer',
    'holding tax', 'property tax', 'revenue collection',
    'अर्थव्यवस्था', 'राजस्व', 'बजट', 'अनुदान',
    'पेंशन', 'राजकोष', 'वित्तीय', 'आर्थिक',
  ],
  infrastructure: [
    'bridge', 'expressway', 'metro', 'railway', 'highway',
    'flyover', 'dam', 'canal', 'power grid',
    'electricity', 'water supply', 'sewage', 'smart city',
    'construction', 'transmission', 'nhai', 'national highway',
    'railway station', 'airport', 'port', 'overbridge',
    'urban development', 'capex', 'track', 'signal',
    'शिलान्यास', 'निर्माण', 'बांध',
    'नहर', 'विद्युत', 'रेलवे', 'हवाई अड्डा',
  ],
  industry: [
    'factory', 'manufacturing', 'plant', 'industrial',
    'corporate', 'mining', 'cement', 'steel',
    'sugar', 'textile', 'assembly', 'special economic',
    'sez', 'industrial park', 'industrial area', 'ethanol',
    'semiconductor', 'biada', 'startup', 'msme', 'it hub',
    'warehouse', 'supply chain', 'logistics',
    'उद्योग', 'कारखाना', 'उद्योगिक',
  ],
  agriculture: [
    'farming', 'crop', 'harvest', 'irrigation', 'farmer',
    'paddy', 'wheat', 'maize', 'lentil', 'fisheries',
    'livestock', 'fertilizer', 'mandi', 'fpo', 'agri',
    'cultivation', 'soil', 'rabi', 'kharif', 'makhana',
    'litchi', 'banana', 'mango', 'food grain', 'crop loss',
    'minimum support price', 'msp', 'animal husbandry',
    'dairy', 'poultry', 'jeevika', 'crop insurance',
    'किसान', 'कृषि', 'फसल', 'सिंचाई', 'मवेशी',
  ],
  education: [
    'school', 'college', 'university', 'exam', 'student',
    'teacher', 'curriculum', 'scholarship', 'literacy',
    'admission', 'result', 'board', 'cbse', 'bseb',
    'syllabus', 'degree', 'enrollment', 'academic',
    'lecture', 'professor', 'training', 'nta', 'ugc',
    'patna university', 'magadh university', 'vidya',
    'bpsc', 'upsc', 'kyp', 'recruitment',
    'शिक्षा', 'शिक्षक', 'भर्ती', 'परीक्षा', 'परिणाम',
  ],
  healthcare: [
    'hospital', 'doctor', 'disease', 'vaccination', 'nutrition',
    'ambulance', 'phc', 'chc', 'medical', 'mental health',
    'dengue', 'encephalitis', 'healthcare', 'clinic',
    'medicine', 'patient', 'outbreak', 'epidemic', 'mortality',
    'maternal', 'infant', 'aiims', 'pmch', 'nmch', 'igims',
    'infection', 'vaccine drive', 'vaccination drive',
    'unconscious', 'intoxication', 'overdose', 'poisoning',
    'accident', 'injured', 'victim', 'treatment', 'ambulance',
    'अस्पताल', 'स्वास्थ्य', 'टीकाकरण', 'दवा', 'मरीज',
    'बेहोश', 'नशा', 'शिकार', 'घायल', 'इलाज',
  ],
  environment: [
    'pollution', 'climate', 'flood', 'floods', 'drought',
    'forest', 'wildlife', 'river', 'ganga', 'conservation',
    'emission', 'waste', 'renewable', 'solar', 'green',
    'biodiversity', 'air quality', 'aqi', 'deforestation',
    'wetland', 'afforestation', 'sand mining', 'poaching',
    'flood warning', 'flood relief', 'embankment',
    'waterlogging', 'clean energy', 'siltation',
    'solar plant', 'solar panel', 'solar power',
    'बाढ़', 'सूखा', 'जल-जीवन-हरियाली', 'प्रदूषण',
    'वन', 'नदी', 'सौर', 'जलवायु',
  ],
  exclude: [],
};

// Learned keywords from user corrections (loaded from DB at startup)
let learnedKeywords: { keyword: string; category: string; weight: number }[] = [];

export function setLearnedKeywords(keywords: { keyword: string; category: string; weight: number }[]) {
  learnedKeywords = keywords;
}

/**
 * Token-bounded category classifier with learned keyword support.
 * Checks headline + synopsis against hardcoded + learned keywords.
 * Falls back to 'exclude' if no keywords match.
 */
export function classifyArticle(
  headline: string,
  synopsis: string,
  source: SourceConfig
): Category {
  const text = `${headline} ${synopsis}`;
  const scores: Record<string, number> = {};

  // Score against hardcoded keywords
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    if (cat === 'exclude') continue;
    if (!source.allowedCategories.includes(cat)) continue;
    let hits = 0;
    for (const kw of keywords) {
      if (matchesToken(text, kw)) hits++;
    }
    if (hits > 0) scores[cat] = hits;
  }

  // Score against learned keywords (from user corrections)
  for (const lk of learnedKeywords) {
    const cat = lk.category as Category;
    if (cat === 'exclude') continue;
    if (!source.allowedCategories.includes(cat)) continue;
    if (matchesToken(text, lk.keyword)) {
      scores[cat] = (scores[cat] || 0) + lk.weight;
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) return sorted[0][0] as Category;

  return 'exclude';
}

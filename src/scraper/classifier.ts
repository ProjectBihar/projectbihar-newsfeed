import { SupabaseClient } from '@supabase/supabase-js';

// ==========================================
// 1. THE BILINGUAL BASE MATRIX (English + Hindi)
// ==========================================
const BASE_CATEGORY_MATRIX: Record<string, string[]> = {
  economy: ['economy', 'budget', 'gdp', 'inflation', 'rbi', 'bank', 'finance', 'revenue', 'tax', 'वित्तीय', 'बजट', 'अर्थव्यवस्था', 'कर्ज', 'बैंक', 'राजस्व'],
  infrastructure: ['bridge', 'road', 'highway', 'construction', 'railway', 'airport', 'nhai', 'flyover', 'rcbd', 'पुल', 'सड़क', 'निर्माण', 'शिलान्यास', 'हाईवे', 'रेलवे'],
  industry: ['factory', 'plant', 'investment', 'mou', 'startup', 'industry', 'investor', 'manufacturing', 'उद्योग', 'कारखाना', 'निवेश', 'कंपनी', 'फैक्ट्री', 'स्टार्टअप'],
  agriculture: ['farmer', 'crop', 'irrigation', 'agriculture', 'msp', 'harvest', 'tractor', 'fertilizer', 'किसान', 'कृषि', 'फसल', 'सिंचाई', 'खाद', 'खेती'],
  education: ['school', 'university', 'college', 'exam', 'student', 'teacher', 'bpsc', 'bseb', 'education', 'शिक्षा', 'स्कूल', 'छात्र', 'परीक्षा', 'शिक्षक', 'रिजल्ट'],
  healthcare: ['hospital', 'doctor', 'medical', 'disease', 'health', 'pmch', 'aiims', 'medicine', 'अस्पताल', 'स्वास्थ्य', 'डॉक्टर', 'मरीज', 'इलाज', 'दवा'],
  environment: ['weather', 'pollution', 'rain', 'flood', 'river', 'aqi', 'climate', 'monsoon', 'mausam', 'मौसम', 'प्रदूषण', 'बाढ़', 'पर्यावरण', 'बारिश', 'नदी'],
  governance: ['cabinet', 'cm', 'minister', 'policy', 'scheme', 'yojana', 'nitish', 'samrat', 'government', 'dgp', 'सरकार', 'नीतीश', 'कैबिनेट', 'योजना', 'नीति', 'मंत्री']
};

// ==========================================
// 2. THE NOISE GATEKEEPER
// ==========================================
const NOISE_KEYWORDS = ['murder', 'rape', 'arrest', 'killed', 'suicide', 'robbery', 'scam', 'fir', 'criminal', 'shootout', 'हत्या', 'गिरफ्तार', 'रेप', 'मर्डर', 'लूट', 'अपराध', 'गोली', 'सुसाइड'];
const DEVELOPMENTAL_OVERRIDES = ['cabinet', 'inaugurate', 'fund', 'policy', 'scheme', 'shilanyas', 'approval', 'शिलान्यास', 'मंजूरी', 'उद्घाटन', 'कैबिनेट', 'पास'];

export function evaluateNoise(headline: string, synopsis: string): boolean {
  const text = `${headline} ${synopsis}`.toLowerCase();
  
  // 1. Check for developmental overrides first (Immunity)
  const hasOverride = DEVELOPMENTAL_OVERRIDES.some(word => text.includes(word));
  if (hasOverride) return false;

  // 2. If no immunity, check for crime/political noise
  const isNoise = NOISE_KEYWORDS.some(word => text.includes(word));
  return isNoise;
}

// ==========================================
// 3. THE MACHINE LEARNING FEEDBACK LOOP
// ==========================================
/**
 * Fetches manual category corrections from the DB and extracts high-frequency 
 * words to make the classifier smarter on every run.
 */
export async function compileLearnedKeywords(supabase: SupabaseClient): Promise<Record<string, string[]>> {
  const learnedMatrix: Record<string, string[]> = {
    economy: [], infrastructure: [], industry: [], agriculture: [], 
    education: [], healthcare: [], environment: [], governance: []
  };

  try {
    // Fetch user corrections joined with the original headlines
    const { data, error } = await supabase
      .from('category_corrections')
      .select('new_category, articles(headline)');

    if (error || !data) return learnedMatrix;

    // A simple term-frequency map per category
    const tfMap: Record<string, Record<string, number>> = {};

    data.forEach(row => {
      const category = row.new_category;
      // @ts-ignore - Supabase join typing
      const headline = row.articles?.headline;
      if (!headline || !learnedMatrix[category]) return;

      if (!tfMap[category]) tfMap[category] = {};
      
      // Tokenize words longer than 3 chars
      const words = headline.toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, '').split(/\s+/);
      words.forEach((word: string) => {
        if (word.length > 3) {
          tfMap[category][word] = (tfMap[category][word] || 0) + 1;
        }
      });
    });

    // Extract the top 5 most frequently manually-corrected words per category
    Object.keys(tfMap).forEach(category => {
      const sortedWords = Object.entries(tfMap[category])
        .sort((a, b) => b[1] - a[1]) // Sort by frequency desc
        .slice(0, 5) // Take top 5
        .map(entry => entry[0]);
      
      learnedMatrix[category] = sortedWords;
    });

    return learnedMatrix;
  } catch (e) {
    console.error("Failed to compile learned keywords:", e);
    return learnedMatrix;
  }
}

// ==========================================
// 4. THE SCORING ENGINE
// ==========================================
/**
 * Scores the text against the base matrix + the learned matrix.
 * Returns the highest scoring category.
 */
export function determineCategory(
  headline: string, 
  synopsis: string, 
  learnedMatrix: Record<string, string[]>
): string {
  const text = `${headline} ${synopsis}`.toLowerCase();
  
  const scores: Record<string, number> = {
    economy: 0, infrastructure: 0, industry: 0, agriculture: 0, 
    education: 0, healthcare: 0, environment: 0, governance: 0
  };

  // Iterate through all 8 categories
  Object.keys(scores).forEach(category => {
    // 1. Score Base Keywords (Weight: 1 point each)
    BASE_CATEGORY_MATRIX[category].forEach(keyword => {
      if (text.includes(keyword)) scores[category] += 1;
    });

    // 2. Score Learned Keywords from users (Weight: 2 points each - users know best!)
    if (learnedMatrix[category]) {
      learnedMatrix[category].forEach(keyword => {
        if (text.includes(keyword)) scores[category] += 2;
      });
    }
  });

  // Find the highest score
  let highestCategory = 'governance'; // Default fallback
  let highestScore = 0;

  Object.entries(scores).forEach(([category, score]) => {
    if (score > highestScore) {
      highestScore = score;
      highestCategory = category;
    }
  });

  // If the article scored 0 everywhere, default to 'governance' as a catch-all 
  // for state-level news, ensuring we never violate the database schema.
  return highestCategory;
}
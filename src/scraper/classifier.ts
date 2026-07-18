/**
 * Matrix Classifier
 *
 * Assigns articles to one of 8 strict development categories using a
 * deterministic keyword-scoring matrix. Zero AI, zero external APIs.
 *
 * Scoring:
 *   - Title match: +3 points per keyword hit
 *   - Body match:  +1 point per occurrence
 *
 * Default category: "governance" (when no keywords match at all).
 */

// ═══════════════════════════════════════════════════════════════════
// Noise Keywords — crime, politics, sensationalism
// ═══════════════════════════════════════════════════════════════════

const NOISE_KEYWORDS = [
  // English crime/politics
  'murder', 'arrested', 'scam', 'protest', 'riot', 'killed', 'shot dead',
  'fraud', 'corruption', 'bribery', 'extortion', 'ransom', 'kidnapping',
  'assault', 'robbery', 'theft', 'stolen', 'firing', 'attack',
  // Hindi crime/politics
  'मर्डर', 'हत्या', 'गिरफ्तार', 'रैली', 'प्रदर्शन', 'दंगा', 'लूट',
  'भ्रष्टाचार', 'घूस', 'अपहरण', 'फायरिंग', 'हमला', 'चोरी', 'धोखाधड़ी',
  'शराब', 'नशा', 'तस्करी', 'अपराध', 'आरोप', 'विवाद',
];

// ═══════════════════════════════════════════════════════════════════
// Developmental Overrides — these trump noise flags
// ═══════════════════════════════════════════════════════════════════

const DEVELOPMENTAL_OVERRIDES = [
  // English
  'cabinet approves', 'inaugurated', 'fund allocation', 'foundation stone',
  'budget allocated', 'scheme launched', 'policy approved', 'recruitment drive',
  'sanctioned', 'commissioned', 'flagged off', 'dedicated to nation',
  // Hindi
  'शिलान्यास', 'उद्घाटन', 'मंजूरी', 'बजट', 'योजना', 'भर्ती',
  'स्वीकृत', 'जारी', 'समर्पित', 'कैबिनेट',
];

// ═══════════════════════════════════════════════════════════════════
// Category Matrix — English + Hindi keywords per category
// ═══════════════════════════════════════════════════════════════════

export const CATEGORY_MATRIX: Record<string, string[]> = {
  governance: [
    'cabinet', 'policy', 'police', 'court', 'high court',
    'cm', 'minister', 'bpsc', 'सरकार', 'नीतीश', 'पुलिस',
  ],
  infrastructure: [
    'bridge', 'highway', 'expressway', 'construction', 'road',
    'railway', 'airport', 'पुल', 'सड़क', 'निर्माण',
  ],
  economy: [
    'budget', 'gst', 'tax', 'finance', 'gdp', 'economy',
    'investment', 'बजट', 'टैक्स',
  ],
  agriculture: [
    'farming', 'kisan', 'crop', 'irrigation', 'monsoon',
    'makhana', 'flood', 'किसान', 'फसल', 'बाढ़',
  ],
  education: [
    'school', 'university', 'bseb', 'teacher', 'students',
    'exam', 'result', 'शिक्षा', 'शिक्षक', 'परीक्षा',
  ],
  healthcare: [
    'hospital', 'pmch', 'aiims', 'doctor', 'disease',
    'medical', 'स्वास्थ्य', 'अस्पताल', 'मरीज',
  ],
  industry: [
    'factory', 'plant', 'manufacturing', 'startup', 'business',
    'उद्योग', 'कारखाना',
  ],
  environment: [
    'pollution', 'weather', 'aqi', 'climate', 'forest',
    'rain', 'मौसम', 'प्रदूषण',
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Content Quality Evaluator (Noise Detection)
// ═══════════════════════════════════════════════════════════════════

/**
 * Evaluate whether an article is noise (crime, politics, sensationalism).
 *
 * Returns true (is noise) if crime/politics keywords dominate.
 * Returns false (not noise) if developmental overrides are present.
 *
 * @returns true if the article is noise, false if it's quality content
 */
export function evaluateContentQuality(headline: string, bodyText: string): boolean {
  const text = `${headline} ${bodyText}`.toLowerCase();

  // Check for developmental overrides first — these trump noise
  for (const override of DEVELOPMENTAL_OVERRIDES) {
    if (text.includes(override)) {
      return false;
    }
  }

  // Count noise keyword occurrences
  let noiseCount = 0;
  for (const keyword of NOISE_KEYWORDS) {
    let startPos = 0;
    while (true) {
      const idx = text.indexOf(keyword, startPos);
      if (idx === -1) break;
      noiseCount++;
      startPos = idx + keyword.length;
    }
  }

  // If 2+ noise keywords found, classify as noise
  return noiseCount >= 2;
}

// ═══════════════════════════════════════════════════════════════════
// Core Classification Function
// ═══════════════════════════════════════════════════════════════════

/**
 * Classify an article into one of 8 development categories.
 *
 * Scoring rules:
 *   - Title match: +3 points per keyword found in title
 *   - Body match:  +1 point per occurrence in body
 *
 * @returns Category string (all lowercase)
 */
export function classifyArticle(title: string, body: string): string {
  const titleLower = title.toLowerCase();
  const bodyLower = body.toLowerCase();

  const scores: Record<string, number> = {};

  for (const category of Object.keys(CATEGORY_MATRIX)) {
    scores[category] = 0;
  }

  for (const [category, keywords] of Object.entries(CATEGORY_MATRIX)) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        scores[category] += 3;
      }

      let startPos = 0;
      while (true) {
        const idx = bodyLower.indexOf(keyword, startPos);
        if (idx === -1) break;
        scores[category] += 1;
        startPos = idx + keyword.length;
      }
    }
  }

  let maxScore = 0;
  let winner = 'governance';

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      winner = category;
    }
  }

  if (maxScore === 0) {
    return 'governance';
  }

  return winner;
}

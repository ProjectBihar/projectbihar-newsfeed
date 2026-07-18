/**
 * Strict Geo-Fencing Engine
 *
 * Token-scoring rule to drop national news that simply happens to be hosted
 * on an Indian news site. Zero false positives guaranteed by deterministic
 * keyword matching — no AI, no external APIs.
 */

// ═══════════════════════════════════════════════════════════════════
// Bihar Dictionary — all lowercase for case-insensitive matching
// ═══════════════════════════════════════════════════════════════════

export const BIHAR_DICTIONARY = {
  districts: [
    'araria',
    'arwal',
    'aurangabad',
    'banka',
    'begusarai',
    'bhagalpur',
    'bhojpur',
    'buxar',
    'darbhanga',
    'east champaran',
    'gaya',
    'gopalganj',
    'jamui',
    'jehanabad',
    'kaimur',
    'katihar',
    'khagaria',
    'kishanganj',
    'lakhisarai',
    'madhepura',
    'madhubani',
    'munger',
    'muzaffarpur',
    'nalanda',
    'nawada',
    'patna',
    'purnia',
    'rohtas',
    'saharsa',
    'samastipur',
    'saran',
    'sheikhpura',
    'sheohar',
    'sitamarhi',
    'siwan',
    'supaul',
    'vaishali',
    'west champaran',
  ],

  keywords: [
    'bihar',
    'nitish kumar',
    'samrat choudhary',
    'tejashwi',
    'bpsc',
    'bseb',
    'patna high court',
    'bihar police',
  ],
};

// Pre-build a combined set for fast body counting
const ALL_BIHAR_TERMS = [
  ...BIHAR_DICTIONARY.districts,
  ...BIHAR_DICTIONARY.keywords,
];

// ═══════════════════════════════════════════════════════════════════
// Core Geo-Fencing Function
// ═══════════════════════════════════════════════════════════════════

/**
 * Determine if an article is centred on Bihar.
 *
 * Rules:
 * 1. Instant Pass: If "bihar" or any of the 38 districts appear in the title → true
 * 2. Body Threshold: Count occurrences of any district/keyword in the body.
 *    If total combined count >= 2 → true. Otherwise → false (drop).
 *
 * @param title - Article headline (case-insensitive)
 * @param body - Full article body text (case-insensitive)
 * @returns true if the article is Bihar-centric
 */
export function isBiharCentric(title: string, body: string): boolean {
  const titleLower = title.toLowerCase();
  const bodyLower = body.toLowerCase();

  // ── Rule 1: Instant Pass ──
  // If "bihar" or any district appears in the title, accept immediately
  for (const term of ALL_BIHAR_TERMS) {
    if (titleLower.includes(term)) {
      return true;
    }
  }

  // ── Rule 2: Body Threshold ──
  // Count occurrences of any Bihar term in the body
  let bodyHitCount = 0;

  for (const term of ALL_BIHAR_TERMS) {
    // Count all occurrences of this term in the body
    let startPos = 0;
    while (true) {
      const idx = bodyLower.indexOf(term, startPos);
      if (idx === -1) break;
      bodyHitCount++;
      startPos = idx + term.length;
    }

    // Early exit if threshold already met
    if (bodyHitCount >= 2) {
      return true;
    }
  }

  return false;
}

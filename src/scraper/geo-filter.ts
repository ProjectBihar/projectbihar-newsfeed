/**
 * Scoring-Based Geo-Fencing Engine
 *
 * Replaces the old binary pass/drop with a weighted scoring system.
 * Key principle: if Bihar is mentioned anywhere, the article passes
 * regardless of non-Bihar locations. Non-Bihar penalties only apply
 * when ZERO Bihar signals are detected.
 */

import { matchesToken } from './token-match';
import {
  ALL_BIHAR_TERMS,
  BIHAR_DISTRICT_NAMES,
  BIHAR_DISTRICT_HINDI,
  BIHAR_KEYWORDS,
  BIHAR_INFRA_KEYWORDS,
  BIHAR_CITIES,
  BIHAR_RAILWAYS,
  BIHAR_UNIVERSITIES,
  BIHAR_HOSPITALS,
  BIHAR_TOURISM,
  BIHAR_AGENCIES,
  BIHAR_INDUSTRIAL,
  BIHAR_AGRICULTURE,
  BIHAR_ENVIRONMENT,
  BIHAR_UTILITIES,
  ALL_NON_BIHAR_GEO_TERMS,
  NON_BIHAR_DISTRICT_NAMES,
  NON_BIHAR_DISTRICT_HINDI,
  NON_BIHAR_STATE_NAMES,
} from './geo-data';

// ═══════════════════════════════════════════════════════════════════
// Bihar Keyword Expansion — additional political/institutional terms
// ═══════════════════════════════════════════════════════════════════

const EXTRA_BIHAR_KEYWORDS: string[] = [
  'chirag paswan',
  'jitan ram manjhi',
  'upendra kushwaha',
  'vidhan sabha',
  'बिहार विधानसभा',
  'बिहार सरकार',
  'बिहार पुलिस',
  'बिहार लोक सेवा आयोग',
  'बिहार शरीफ',
  'पाटलिपुत्र',
  'nitish',
  'tejashwi',
  'samrat',
  'chirag',
  'manjhi',
  'kushwaha',
  // Hindi equivalents for political figures
  'नीतीश',
  'तेजस्वी',
  'सम्राट',
  'चिराग',
  'मांझी',
  'कुशवाहा',
];

// Merge all Bihar terms (from geo-data + extras)
const ALL_BIHAR_TERMS_FULL: string[] = [
  ...ALL_BIHAR_TERMS,
  ...EXTRA_BIHAR_KEYWORDS.filter(k => !ALL_BIHAR_TERMS.includes(k)),
];

// ═══════════════════════════════════════════════════════════════════
// Dateline Extraction — structural location signal
// ═══════════════════════════════════════════════════════════════════

/**
 * Extract dateline from article body's first paragraph.
 * Returns the location name if found, null otherwise.
 */
function extractDateline(body: string): string | null {
  if (!body) return null;

  // Get first paragraph (first 500 chars is enough)
  const firstSection = body.substring(0, 500);

  // English dateline: "PATNA:" or "PATNA (PTI):"
  const enMatch = firstSection.match(/^([A-Z][A-Za-z\s]{2,30})(?:\s*\([A-Z]+\))?\s*[:|]/);
  if (enMatch?.[1]) return enMatch[1].trim().toLowerCase();

  // Hindi dateline: "पटना," or "पटना।"
  const hiMatch = firstSection.match(/^([ऀ-ॿ\s]{2,30})[,।]/);
  if (hiMatch?.[1]) return hiMatch[1].trim();

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// Token Counting — count occurrences with word-boundary matching
// ═══════════════════════════════════════════════════════════════════

/**
 * Count how many times any term from the list appears in text
 * using token-boundary matching (no partial matches).
 */
function countTokenHits(text: string, terms: string[]): number {
  let count = 0;
  for (const term of terms) {
    if (matchesToken(text, term)) {
      count++;
    }
  }
  return count;
}

/**
 * Check if any term from the list appears in text
 * using token-boundary matching.
 */
function hasAnyToken(text: string, terms: string[]): boolean {
  return terms.some(term => matchesToken(text, term));
}

// ═══════════════════════════════════════════════════════════════════
// Core Scoring Function
// ═══════════════════════════════════════════════════════════════════

export interface GeoResult {
  pass: boolean;
  score: number;
  details: string[];
  hasBiharSignal: boolean;
}

/**
 * Determine if an article is centred on Bihar using a scoring system.
 *
 * Rules:
 * 1. Calculate Bihar signals (positive points)
 * 2. If ANY Bihar signal found → ignore non-Bihar penalties
 * 3. If NO Bihar signal found → apply non-Bihar penalties
 * 4. Threshold: score >= 3 → pass
 *
 * @param title - Article headline (case-insensitive)
 * @param body - Full article body text (case-insensitive)
 * @returns GeoResult with pass/fail, score, and diagnostic details
 */
export function isBiharCentric(title: string, body: string): GeoResult {
  const titleLower = (title || '').toLowerCase();
  const bodyLower = (body || '').toLowerCase();
  const combined = titleLower + ' ' + bodyLower;

  let score = 0;
  const details: string[] = [];
  let hasBiharSignal = false;

  // ── Phase 1: Detect Bihar Signals ──

  // 1a. "bihar" in title (strongest signal) — English or Hindi
  if (matchesToken(titleLower, 'bihar') || titleLower.includes('बिहार')) {
    score += 5;
    hasBiharSignal = true;
    details.push('bihar in title (+5)');
  }

  // 1b. Bihar district in title — English or Hindi
  for (const district of BIHAR_DISTRICT_NAMES) {
    if (matchesToken(titleLower, district)) {
      score += 4;
      hasBiharSignal = true;
      details.push(`district "${district}" in title (+4)`);
      break; // one district in title is enough
    }
  }
  // Hindi district names in title
  if (!hasBiharSignal) {
    for (const hindiName of BIHAR_DISTRICT_HINDI) {
      if (titleLower.includes(hindiName)) {
        score += 4;
        hasBiharSignal = true;
        details.push(`hindi district "${hindiName}" in title (+4)`);
        break;
      }
    }
  }

  // 1c. Bihar keyword in title — English or Hindi
  for (const keyword of BIHAR_KEYWORDS) {
    if (matchesToken(titleLower, keyword) || titleLower.includes(keyword)) {
      score += 3;
      hasBiharSignal = true;
      details.push(`keyword "${keyword}" in title (+3)`);
      break;
    }
  }

  // 1d. "bihar" in body — English or Hindi
  if (matchesToken(bodyLower, 'bihar') || bodyLower.includes('बिहार')) {
    score += 3;
    hasBiharSignal = true;
    details.push('bihar in body (+3)');
  }

  // 1e. Bihar districts in body (count unique districts, max +6)
  let bodyDistrictHits = 0;
  for (const district of BIHAR_DISTRICT_NAMES) {
    if (matchesToken(bodyLower, district)) {
      bodyDistrictHits++;
      if (bodyDistrictHits <= 3) {
        score += 2;
        details.push(`district "${district}" in body (+2)`);
      }
    }
  }
  // Hindi district names in body
  for (const hindiName of BIHAR_DISTRICT_HINDI) {
    if (bodyLower.includes(hindiName) && bodyDistrictHits < 3) {
      bodyDistrictHits++;
      score += 2;
      details.push(`hindi district "${hindiName}" in body (+2)`);
    }
  }
  if (bodyDistrictHits > 0) {
    hasBiharSignal = true;
  }

  // 1f. Bihar keywords in body (count unique keywords, max +3)
  let bodyKeywordHits = 0;
  for (const keyword of BIHAR_KEYWORDS) {
    if (matchesToken(bodyLower, keyword) || bodyLower.includes(keyword)) {
      bodyKeywordHits++;
      if (bodyKeywordHits <= 3) {
        score += 1;
        details.push(`keyword "${keyword}" in body (+1)`);
      }
    }
  }
  if (bodyKeywordHits > 0) {
    hasBiharSignal = true;
  }

  // 1g. Bihar infrastructure (airports, stadiums)
  for (const infra of BIHAR_INFRA_KEYWORDS) {
    if (matchesToken(combined, infra)) {
      score += 2;
      hasBiharSignal = true;
      details.push(`infra "${infra}" (+2)`);
      break; // one infra match is enough
    }
  }

  // 1g2. Bihar cities (major towns in Bihar) — use token matching
  for (const city of BIHAR_CITIES) {
    if (matchesToken(combined, city)) {
      score += 2;
      hasBiharSignal = true;
      details.push(`city "${city}" (+2)`);
      break; // one city match is enough
    }
  }

  // 1g3. Bihar railways, universities, hospitals, tourism, agencies — use token matching
  const entityArrays = [
    { arr: BIHAR_RAILWAYS, name: 'railway' },
    { arr: BIHAR_UNIVERSITIES, name: 'university' },
    { arr: BIHAR_HOSPITALS, name: 'hospital' },
    { arr: BIHAR_TOURISM, name: 'tourism' },
    { arr: BIHAR_AGENCIES, name: 'agency' },
    { arr: BIHAR_INDUSTRIAL, name: 'industrial' },
    { arr: BIHAR_AGRICULTURE, name: 'agriculture' },
    { arr: BIHAR_ENVIRONMENT, name: 'environment' },
    { arr: BIHAR_UTILITIES, name: 'utility' },
  ];
  for (const { arr, name } of entityArrays) {
    for (const entity of arr) {
      if (matchesToken(combined, entity)) {
        score += 2;
        hasBiharSignal = true;
        details.push(`${name} "${entity}" (+2)`);
        break; // one match per category is enough
      }
    }
  }

  // 1h. Bihar dateline
  const dateline = extractDateline(bodyLower);
  if (dateline) {
    // Check if dateline matches a Bihar district
    const isBiharDateline = BIHAR_DISTRICT_NAMES.some(d => dateline.includes(d)) ||
                           BIHAR_DISTRICT_HINDI.some(d => dateline.includes(d)) ||
                           dateline.includes('पटना') ||
                           dateline.includes('patna');
    if (isBiharDateline) {
      score += 3;
      hasBiharSignal = true;
      details.push(`bihar dateline "${dateline}" (+3)`);
    }
  }

  // 1i. Hindi district names in combined text
  for (const hindiName of BIHAR_DISTRICT_HINDI) {
    if (combined.includes(hindiName)) {
      if (!hasBiharSignal) {
        score += 2;
        hasBiharSignal = true;
        details.push(`hindi district "${hindiName}" (+2)`);
      }
      break;
    }
  }

  // ── Phase 2: Apply Non-Bihar Penalties (ONLY if no Bihar signal) ──

  if (!hasBiharSignal) {
    // 2a. Non-Bihar district in title
    for (const district of NON_BIHAR_DISTRICT_NAMES) {
      if (matchesToken(titleLower, district)) {
        score -= 4;
        details.push(`non-bihar district "${district}" in title (-4)`);
        break;
      }
    }

    // 2b. Non-Bihar districts in body (max -6)
    let nonBiharBodyHits = 0;
    for (const district of NON_BIHAR_DISTRICT_NAMES) {
      if (matchesToken(bodyLower, district)) {
        nonBiharBodyHits++;
        if (nonBiharBodyHits <= 3) {
          score -= 2;
          details.push(`non-bihar district "${district}" in body (-2)`);
        }
      }
    }

    // 2c. Non-Bihar state name in title
    for (const state of NON_BIHAR_STATE_NAMES) {
      if (matchesToken(titleLower, state)) {
        score -= 3;
        details.push(`non-bihar state "${state}" in title (-3)`);
        break;
      }
    }

    // 2d. Non-Bihar Hindi district in combined text
    for (const hindiName of NON_BIHAR_DISTRICT_HINDI) {
      if (combined.includes(hindiName)) {
        score -= 2;
        details.push(`non-bihar hindi "${hindiName}" (-2)`);
        break;
      }
    }
  }

  // ── Phase 3: Decision ──

  const pass = score >= 3;

  return {
    pass,
    score,
    details,
    hasBiharSignal,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Backward-Compatible Wrapper
// ═══════════════════════════════════════════════════════════════════

/**
 * Legacy wrapper — returns boolean for backward compatibility.
 * Use isBiharCentric() for full scoring details.
 */
export function isBiharCentricLegacy(title: string, body: string): boolean {
  return isBiharCentric(title, body).pass;
}

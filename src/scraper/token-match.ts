/**
 * Token-bounded boundary matching — NO substring matches.
 *
 * English: uses regex \b word-boundary so "gst" inside "Gangster" does NOT match.
 * Hindi/Devanagari: splits text on non-Devanagari chars, then exact-token comparison
 * so "कर" inside "विशेषकर" does NOT match.
 */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Cache compiled regex patterns to avoid recompilation on every call
const regexCache = new Map<string, RegExp>();

function getCachedRegex(pattern: string): RegExp {
  let re = regexCache.get(pattern);
  if (!re) {
    re = new RegExp(pattern, 'i');
    regexCache.set(pattern, re);
  }
  return re;
}

/**
 * Check if `term` appears as a standalone whole token in `text`.
 * Case-insensitive for English; exact-match for Hindi tokens.
 */
export function matchesToken(text: string, term: string): boolean {
  const lower = text.toLowerCase();
  const t = term.toLowerCase();

  // Hindi/Devanagari terms: split text into Devanagari tokens, compare exactly
  if (/[\u0900-\u097F]/.test(t)) {
    const tokens = lower.split(/[^ऀ-ॿ]+/).filter(Boolean);
    return tokens.some((tok) => tok === t);
  }

  // English terms: use cached word-boundary regex
  return getCachedRegex(`\\b${escapeRegex(t)}\\b`).test(lower);
}

/**
 * Check if ANY term from the list appears as a standalone token in `text`.
 */
export function matchesAnyToken(text: string, terms: string[]): boolean {
  return terms.some((term) => matchesToken(text, term));
}

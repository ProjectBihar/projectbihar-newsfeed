/**
 * Token-bounded boundary matching — NO substring matches.
 *
 * English: uses regex \b word-boundary so "gst" inside "Gangster" does NOT match.
 * Hindi/Devanagari: bounded substring match — handles multi-word terms correctly
 * (बिहार शरीफ, उत्तर प्रदेश) while still blocking partial matches like "कर" inside "विशेषकर".
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

  // Hindi/Devanagari terms: bounded substring match — handles multi-word
  // terms correctly (बिहार शरीफ, उत्तर प्रदेश), while still blocking partial
  // matches like "कर" inside "विशेषकर"
  if (/[\u0900-\u097F]/.test(t)) {
    const pattern = new RegExp(`(^|[^ऀ-ॿ])${escapeRegex(t)}([^ऀ-ॿ]|$)`, 'i');
    return pattern.test(lower);
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

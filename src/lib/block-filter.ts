import { matchesToken } from '../scraper/token-match';

/**
 * Master Block Filter — single implementation used everywhere.
 *
 * - Quoted phrases (e.g., "train ki chapet") are matched as exact units
 * - Unquoted phrases are matched with token-boundary rules
 * - Case-insensitive for both English and Hindi
 */
export function isBlockedArticle(
  headline: string,
  synopsis: string,
  blockedPhrases: string[]
): boolean {
  if (blockedPhrases.length === 0) return false;
  const text = `${headline} ${synopsis}`;

  for (const phrase of blockedPhrases) {
    // Quoted phrases: exact substring match (treat as one unit)
    const quoted = phrase.match(/^["""「」](.+)["""「」]$/);
    if (quoted) {
      if (text.toLowerCase().includes(quoted[1].toLowerCase())) return true;
    } else {
      // Unquoted: token-boundary match
      if (matchesToken(text, phrase)) return true;
    }
  }
  return false;
}

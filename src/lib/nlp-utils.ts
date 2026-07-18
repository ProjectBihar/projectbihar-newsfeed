/**
 * Shared NLP utilities for keyword extraction and stop word filtering.
 * Used by both the scraper and API routes.
 */

const STOP_WORDS_EN = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'about', 'also', 'and', 'but',
  'or', 'if', 'its', 'it', 'he', 'she', 'they', 'them', 'his', 'her',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
]);

const STOP_WORDS_HI = new Set([
  'के', 'की', 'का', 'में', 'से', 'को', 'पर', 'ने', 'और', 'यह', 'वह',
  'एक', 'भी', 'था', 'थे', 'है', 'हैं', 'थी', 'गया', 'गई', 'हो', 'हुआ',
  'हुई', 'कर', 'किया', 'इस', 'उस', 'अपने', 'अपनी', 'उन', 'इन', 'वे',
  'ये', 'क्या', 'कैसे', 'क्यों', 'जब', 'तब', 'अब', 'तो', 'ही', 'भी',
  'मे', 'पे', 'कि', 'जो', 'वो', 'इसमें', 'उसमें', 'यहां', 'वहां',
]);

/**
 * Extract meaningful keywords from a headline, filtering out stop words.
 */
export function extractKeywords(headline: string): string[] {
  const text = headline.toLowerCase();
  const tokens = text.split(/[^a-z\u0900-\u097F]+/).filter(Boolean);
  return tokens.filter((t) => {
    if (t.length < 3) return false;
    if (/[\u0900-\u097F]/.test(t)) return !STOP_WORDS_HI.has(t);
    return !STOP_WORDS_EN.has(t);
  });
}

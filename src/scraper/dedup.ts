/**
 * Deterministic Deduplication Engine
 *
 * Compares incoming article titles against already-stored titles to prevent
 * story spam. Uses token-based similarity — no AI embeddings, no ML models.
 *
 * The formula: intersection.size / Math.min(setA.size, setB.size)
 * Dividing by the smaller set handles clickbait vs descriptive headline mismatches.
 */

import type { RawArticle } from './types';

// ═══════════════════════════════════════════════════════════════════
// Stop Words — stripped from titles before comparison
// ═══════════════════════════════════════════════════════════════════

export const STOP_WORDS = [
  'the',
  'is',
  'in',
  'and',
  'to',
  'at',
  'a',
  'for',
  'on',
  'with',
  'of',
  'bihar',
  'news',
  'update',
];

// ═══════════════════════════════════════════════════════════════════
// Tokenizer
// ═══════════════════════════════════════════════════════════════════

/**
 * Convert text to a set of meaningful tokens.
 *
 * Steps:
 * 1. Lowercase
 * 2. Remove all punctuation (allows Hindi/Devanagari characters)
 * 3. Split into words
 * 4. Filter out stop words and short tokens (< 3 chars)
 *
 * @returns Set of unique tokens
 */
export function tokenize(text: string): Set<string> {
  const lower = text.toLowerCase();
  const cleaned = lower.replace(/[^\w\s\u0900-\u097F]/g, '');
  const words = cleaned.split(/\s+/);

  const tokens = new Set<string>();
  for (const word of words) {
    if (word.length >= 3 && !STOP_WORDS.includes(word)) {
      tokens.add(word);
    }
  }

  return tokens;
}

// ═══════════════════════════════════════════════════════════════════
// Similarity Calculator
// ═══════════════════════════════════════════════════════════════════

/**
 * Calculate token-based similarity between two titles.
 *
 * Formula: intersection.size / Math.min(setA.size, setB.size)
 *
 * We divide by the smaller set because one news site might use a short
 * clickbait headline while another uses a long descriptive one.
 *
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(titleA: string, titleB: string): number {
  const setA = tokenize(titleA);
  const setB = tokenize(titleB);

  if (setA.size === 0 || setB.size === 0) return 0;

  // Count intersection
  let intersectionSize = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionSize++;
    }
  }

  return intersectionSize / Math.min(setA.size, setB.size);
}

// ═══════════════════════════════════════════════════════════════════
// Main Deduplication Filter
// ═══════════════════════════════════════════════════════════════════

/**
 * Filter out duplicate articles by comparing titles.
 *
 * @param newArticles - Fresh articles from the pipeline
 * @param existingTitles - Titles already stored in the database (last 24h)
 * @param threshold - Similarity threshold (default 0.65)
 * @returns Array of unique articles that passed deduplication
 */
export function deduplicateArticles(
  newArticles: RawArticle[],
  existingTitles: string[],
  threshold = 0.65
): RawArticle[] {
  const unique: RawArticle[] = [];
  const seenTitles: string[] = [...existingTitles]; // Running list of checked titles

  for (const article of newArticles) {
    let isDuplicate = false;

    // Check against all previously seen titles
    for (const existingTitle of seenTitles) {
      const similarity = calculateSimilarity(article.title, existingTitle);

      if (similarity >= threshold) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(article);
      seenTitles.push(article.title); // Add to running list
    }
  }

  return unique;
}

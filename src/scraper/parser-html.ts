/**
 * The "Clean Paragraph" Extractor (The Brittle-Proof Scraper)
 *
 * This is the most critical part. Do NOT use selectors like .article-body or .story-content.
 * They will break.
 *
 * Instead, we:
 * 1. Fetch HTML with axios (anti-blocking headers)
 * 2. Aggressively remove all noise tags
 * 3. Extract all <p> tags
 * 4. Filter out short junk paragraphs (< 40 chars)
 * 5. Join valid paragraphs with double newline
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Extract clean article text from a URL.
 *
 * @param url - The article URL to scrape
 * @returns Clean concatenated paragraphs, or null if extraction fails
 */
export async function extractCleanArticleText(url: string): Promise<string | null> {
  try {
    // 1. Fetch HTML with anti-blocking headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000, // Don't hang forever
    });

    // 2. Load into Cheerio
    const $ = cheerio.load(response.data);

    // 3. The Purge: Destroy all non-content and layout elements
    $(
      'script, style, noscript, iframe, nav, footer, header, aside, form, button'
    ).remove();
    $('[class*="ad"], [id*="ad"], [class*="social"], [class*="share"]').remove();

    // 4 & 5. Extract and Filter standard paragraphs
    let cleanText = '';

    $('p').each((_, element) => {
      const text = $(element).text().trim();

      // Filter out short junk snippets (lowered to 20 for Hindi text and media summaries)
      if (text.length > 20 && !text.toLowerCase().includes('read also:')) {
        cleanText += text + '\n\n';
      }
    });

    // Structural fallback if no clean <p> text was captured (regional layout support)
    if (!cleanText.trim()) {
      console.warn(`  [Parser] No <p> text for ${url}, trying structural fallback...`);
      $('article, div[class*="content"], div[class*="body"], div[class*="story"]').each(
        (_, element) => {
          const text = $(element).text().trim();
          if (text.length > 30) {
            cleanText += text + '\n\n';
          }
        }
      );
    }

    if (!cleanText.trim()) {
      console.warn(`  [Parser] Empty content extracted for ${url}`);
    }

    return cleanText.trim() || null;
  } catch (error: any) {
    console.error(`Scraping failed for ${url}:`, error.message);
    return null;
  }
}

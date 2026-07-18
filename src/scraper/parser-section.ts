/**
 * HTML Section Link Crawler
 *
 * A deterministic, zero-AI, regex-and-string-rule-based HTML section link crawler.
 * For modern news websites that do not provide functional RSS feeds.
 *
 * Link Extraction Rules:
 * 1. Convert relative paths to absolute URLs using baseDomain
 * 2. Domain lockout — drop any out-of-domain links
 * 3. SEO structural fingerprint — only keep URLs with 3+ hyphens/underscores or .html/.ece/.cms
 * 4. Junk keyword exclusion — reject utility pages (about, privacy, terms, etc.)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NewsSourceConfig } from './config';

/**
 * Discover article links from an HTML section landing page.
 *
 * @param source - The news source configuration with targetUrl and baseDomain
 * @returns Array of verified article URLs
 */
export async function discoverLinksFromHTMLSection(
  source: NewsSourceConfig
): Promise<string[]> {
  const verifiedArticleUrls = new Set<string>();

  try {
    const response = await axios.get(source.targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    $('a').each((_, element) => {
      let href = $(element).attr('href')?.trim();

      if (!href || href.startsWith('#') || href.startsWith('javascript:'))
        return;

      // Rule 1: Normalize Relative Paths
      if (href.startsWith('/')) {
        href = `${source.baseDomain}${href}`;
      }

      // Rule 2: Enforce Domain Boundary
      if (!href.startsWith(source.baseDomain)) return;

      const pathLower = href.replace(source.baseDomain, '').toLowerCase();

      // Rule 3: Structural SEO Analysis
      const hyphenCount = (pathLower.match(/-/g) || []).length;
      const underscoreCount = (pathLower.match(/_/g) || []).length;

      const validatesAsArticle =
        hyphenCount >= 3 ||
        underscoreCount >= 3 ||
        pathLower.includes('.html') ||
        pathLower.includes('.cms') ||
        pathLower.includes('.ece');

      // Rule 4: Strip Structural Clutter
      const containsJunkWords = [
        '/about',
        '/privacy',
        '/terms',
        '/contact',
        '/advertise',
        '/sign-in',
        '/login',
        '/subscribe',
        '/video',
        '/gallery',
      ].some((junkWord) => pathLower.includes(junkWord));

      if (validatesAsArticle && !containsJunkWords) {
        verifiedArticleUrls.add(href);
      }
    });
  } catch (error: any) {
    console.error(
      `[HTML Discovery Error] Failed crawling links for ${source.sourceName}: ${error.message}`
    );
  }

  // Drop non-news layout paths (sports, entertainment, etc.)
  const filteredLinks = Array.from(verifiedArticleUrls).filter((url) => {
    const lowerUrl = url.toLowerCase();
    return !['/sports/', '/cricket/', '/entertainment/', '/bollywood/', '/lifestyle/', '/photos/', '/videos/'].some(
      (junk) => lowerUrl.includes(junk)
    );
  });

  // Return only the top 20 freshest links to prevent execution timeouts
  return filteredLinks.slice(0, 10);
}

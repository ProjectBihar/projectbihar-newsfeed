import * as cheerio from 'cheerio';
import { extractPublishDate } from './date-handler';

export interface ArticleData {
  headline: string;
  synopsis: string;
  published_timestamp: number | null;
}

/**
 * Fetch an article page and extract headline, synopsis, and publish date.
 * Uses structured data (JSON-LD, meta tags) first, falls back to DOM.
 */
export async function extractArticleData(
  url: string,
  knownHeadline?: string
): Promise<ArticleData | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
      },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    });

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // ── Headline ──
    let headline =
      knownHeadline ||
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text().trim() ||
      $('h1').first().text().trim();

    if (!headline || headline.length < 5) return null;

    // Clean common suffixes like " - The Hindu" or " | NDTV"
    headline = headline
      .replace(/\s*[-–|]\s*(The Hindu|NDTV|Indian Express|India Today|Hindustan Times|Telegraph|Moneycontrol|Mint|Economic Times|BusinessLine|The Print|Down To Earth|IndiaSpend|The Wire|Scroll|Mongabay).*$/i, '')
      .trim();

    // ── Synopsis ──
    let synopsis =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    if (!synopsis) {
      // Fallback: first <p> in the article body
      const firstP = $('article p, .article-body p, .story-content p, .content p')
        .first()
        .text()
        .trim();
      synopsis = firstP.slice(0, 300);
    }

    // ── Publish Date ──
    const published_timestamp = extractPublishDate(html);

    return {
      headline: headline.slice(0, 300),
      synopsis: synopsis.slice(0, 500),
      published_timestamp,
    };
  } catch (err) {
    console.error(`  Extract failed for ${url}:`, (err as Error).message);
    return null;
  }
}

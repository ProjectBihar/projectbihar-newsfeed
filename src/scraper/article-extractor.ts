import * as cheerio from 'cheerio';
import { extractPublishDate } from './date-handler';
import { FETCH_TIMEOUT_MS, USER_AGENT } from './config';

export interface ArticleData {
  headline: string;
  synopsis: string;
  dateline: string | null;
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
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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

    // ── Dateline — structural location signal, independent of keyword scanning ──
    const firstPara = $('article p, .article-body p, .story-content p, .content p')
      .first()
      .text()
      .trim();

    const datelineMatch =
      firstPara.match(/^([A-Z][A-Za-z\s]{2,20})(?:\s*\([A-Z]+\))?\s*[:|]/) || // PATNA: / PATNA (PTI):
      firstPara.match(/^([ऀ-ॿ\s]{2,20})[,।]/);                                // पटना, / पटना।

    const dateline = datelineMatch?.[1]?.trim() ?? null;

    // ── Publish Date ──
    const published_timestamp = extractPublishDate(html);

    return {
      headline: headline.slice(0, 300),
      synopsis: synopsis.slice(0, 500),
      dateline,
      published_timestamp,
    };
  } catch (err) {
    console.error(`  Extract failed for ${url}:`, (err as Error).message);
    return null;
  }
}

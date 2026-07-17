import * as cheerio from 'cheerio';
import type { SourceConfig } from './sources';

export interface DiscoveredArticle {
  url: string;
  headline?: string;
}

/**
 * Discover article links from a source's listing page HTML.
 * Returns unique article URLs found on the page.
 */
export function discoverFromHTML(
  html: string,
  source: SourceConfig,
  baseUrl: string
): DiscoveredArticle[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const articles: DiscoveredArticle[] = [];

  // Find all <a> tags that look like article links
  $('a[href]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href');
    if (!href) return;

    // Resolve relative URLs
    let fullUrl: string;
    try {
      fullUrl = new URL(href, baseUrl).toString();
    } catch {
      return;
    }

    // Skip non-article URLs (category pages, tags, search, pagination, etc.)
    if (shouldSkipUrl(fullUrl, source)) return;

    // Deduplicate
    const key = fullUrl.replace(/\/+$/, '').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    // Try to grab the headline text from the link
    const headline = $a.text().trim() || $a.find('img').attr('alt') || undefined;

    if (headline && headline.length > 10) {
      articles.push({ url: fullUrl, headline });
    }
  });

  return articles;
}

function shouldSkipUrl(url: string, source: SourceConfig): boolean {
  const lower = url.toLowerCase();

  // Skip obvious non-article patterns
  const skipPatterns = [
    '/tag/', '/tags/', '/topic/', '/category/', '/author/',
    '/page/', '/search', '#', 'javascript:', 'mailto:',
    '.jpg', '.png', '.gif', '.svg', '.pdf', '.mp3', '.mp4',
    'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com',
    'linkedin.com', 'whatsapp:',
    source.listingUrl.toLowerCase(), // skip self-links
  ];

  return skipPatterns.some((p) => lower.includes(p));
}

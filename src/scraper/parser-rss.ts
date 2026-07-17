import Parser from 'rss-parser';
import type { SourceConfig } from './sources';
import type { DiscoveredArticle } from './parser-html';

const rssParser = new Parser({
  timeout: 15_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  },
});

/**
 * Discover articles from an RSS feed URL.
 * RSS gives us title, link, pubDate, and contentSnippet directly — most reliable.
 */
export async function discoverFromRSS(
  source: SourceConfig
): Promise<DiscoveredArticle[]> {
  if (!source.rssUrl) return [];

  try {
    const feed = await rssParser.parseURL(source.rssUrl);

    return (feed.items || [])
      .filter((item) => item.link)
      .map((item) => ({
        url: item.link!,
        headline: item.title || undefined,
        pubDate: extractRSSDate(item) ?? undefined,
      }))
      .slice(0, 30);
  } catch (err) {
    console.error(`  RSS failed for ${source.name}:`, (err as Error).message);
    return [];
  }
}

/**
 * Try to extract a date from RSS item metadata (for when the article page
 * doesn't have good date data).
 */
export function extractRSSDate(item: { pubDate?: string; isoDate?: string }): number | null {
  const dateStr = item.isoDate || item.pubDate;
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.getTime();
  } catch {
    return null;
  }
}

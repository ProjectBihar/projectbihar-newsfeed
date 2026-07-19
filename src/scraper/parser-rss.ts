/**
 * RSS Trigger (The Discovery Layer)
 *
 * The scraper must NEVER start by blindly crawling HTML pages.
 * It must only look at RSS feeds, which are highly structured XML.
 */

import Parser from 'rss-parser';
import type { RSSFeedItem } from './types';

const parser = new Parser({
  timeout: 15_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
  },
});

/**
 * Fetch article URLs from RSS feeds.
 * Only returns articles published within the last 24 hours.
 *
 * @param feedUrls - Array of RSS feed URLs (e.g., specific Bihar tags from NDTV, HT, etc.)
 * @returns Array of recent RSS feed items with title, link, pubDate, summary
 */
export async function fetchArticleUrlsFromRSS(
  feedUrls: string[]
): Promise<RSSFeedItem[]> {
  const recentArticles: RSSFeedItem[] = [];
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const url of feedUrls) {
    try {
      const feed = await parser.parseURL(url);

      for (const item of feed.items) {
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

        if (pubDate >= twentyFourHoursAgo && item.link) {
          recentArticles.push({
            title: item.title || '',
            link: item.link,
            pubDate: pubDate,
            summary: item.contentSnippet || '',
            content: item['content:encoded'] || item.content || undefined,
          });
        }
      }
    } catch (error) {
      console.error(`Failed to parse RSS feed: ${url}`, error);
    }
  }

  return recentArticles.slice(0, 10);
}

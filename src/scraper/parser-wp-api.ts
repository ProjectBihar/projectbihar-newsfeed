/**
 * WordPress REST API Parser
 *
 * Fetches articles from WordPress sites that block RSS feeds
 * but expose the standard /wp-json/wp/v2/posts endpoint.
 */

import axios from 'axios';
import type { RSSFeedItem } from './types';

/**
 * Fetch articles from a WordPress REST API endpoint.
 *
 * @param apiUrl - The WordPress API URL (e.g., https://site.com/wp-json/wp/v2/posts)
 * @returns Array of RSSFeedItem-compatible objects
 */
export async function fetchFromWPApi(apiUrl: string): Promise<RSSFeedItem[]> {
  try {
    const response = await axios.get(apiUrl, {
      params: {
        per_page: 10,
        _fields: 'title,link,content,date',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return response.data
      .filter((item: any) => {
        const pubDate = new Date(item.date);
        return pubDate >= twentyFourHoursAgo && item.link;
      })
      .map((item: any) => ({
        title: item.title?.rendered || '',
        link: item.link,
        pubDate: new Date(item.date),
        summary: '',
        content: item.content?.rendered || '',
      }));
  } catch (error: any) {
    console.error(`[WP API] Failed to fetch from ${apiUrl}:`, error.message);
    return [];
  }
}

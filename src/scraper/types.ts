/**
 * Strict data interfaces for the scraping pipeline.
 * All functions must adhere to these interfaces to prevent pipeline leaks.
 */

export interface RawArticle {
  title: string;
  sourceUrl: string;
  publishedAt: Date;
  rssSummary: string;
  fullContent: string;
  sourceName: string;
  category: string;
  isNoise: boolean;
}

export interface RSSFeedItem {
  title: string;
  link: string;
  pubDate: Date;
  summary: string;
  content?: string; // Full article content from <content:encoded> when available
}

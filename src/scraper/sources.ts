import type { Category } from './config';

export type SourceType = 'bihar-dedicated' | 'regional-page';

export interface SourceConfig {
  name: string;
  language: 'en' | 'hi';
  type: SourceType;
  listingUrl: string;
  rssUrl?: string;
  allowedCategories: Category[];
  selectors: {
    articleLink: string;
    headline?: string;
    synopsis?: string;
  };
}

// Bihar-dedicated sources: all articles pass relevance gate
const biharDedicatedAll: Category[] = [
  'economy',
  'infrastructure',
  'industry',
  'agriculture',
  'education',
  'healthcare',
  'environment',
];

// ── ENGLISH_BIHAR_SEEDS: pre-curated Bihar pages — all auto-pass the geo-fence ──
export const ENGLISH_SOURCES: SourceConfig[] = [
  // Bihar-dedicated sources (bypass geo-fence entirely)
  {
    name: 'Patna Press',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://patnapress.com/',
    rssUrl: 'https://patnapress.com/feed/',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'The Hindu',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.thehindu.com/news/national/bihar/',
    rssUrl: 'https://www.thehindu.com/news/national/bihar/feeder/default.rss',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/national/bihar/"]' },
  },
  {
    name: 'Indian Express',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://indianexpress.com/about/bihar/',
    rssUrl: 'https://indianexpress.com/section/india/bihar/feed/',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/article/"]' },
  },
  {
    name: 'Hindustan Times',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.hindustantimes.com/topic/bihar/news',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'NDTV',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.ndtv.com/bihar',
    rssUrl: 'https://feeds.feedburner.com/ndtvnews-latest',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/india/"]' },
  },
  {
    name: 'India Today',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.indiatoday.in/india/bihar',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/india/story/"]' },
  },
  {
    name: 'Telegraph India',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.telegraphindia.com/bihar',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },

  // Regional pages — auto-pass geo-fence since they're Bihar-tagged feeds
  {
    name: 'BusinessLine',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.thehindubusinessline.com/topic/bihar/',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'Economic Times',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://economictimes.indiatimes.com/topic/bihar',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/articleshow/"]' },
  },
  {
    name: 'Mint',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.livemint.com/topic/bihar',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'Down To Earth',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.downtoearth.org.in/topic/bihar',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'IndiaSpend',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.indiaspend.com/bihar',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/"]' },
  },
  {
    name: 'The Wire',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://m.thewire.in/tagsearch?keyword=bihar',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/"]' },
  },
  {
    name: 'Scroll',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://scroll.in/tag/bihar',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/"]' },
  },

  // ── New RSS sources ──
  {
    name: 'Times of India',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://timesofindia.indiatimes.com/india/bihar',
    rssUrl: 'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/articleshow/"]' },
  },
  {
    name: 'Business Standard',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.business-standard.com/topic/bihar',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'Financial Express',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.financialexpress.com/about/bihar',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/article/"]' },
  },
  {
    name: 'Moneycontrol',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.moneycontrol.com/news/india',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
];

export const HINDI_SOURCES: SourceConfig[] = [
  {
    name: 'Hindustan',
    language: 'hi',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.livehindustan.com/bihar/',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/story/"]' },
  },
  {
    name: 'Dainik Jagran',
    language: 'hi',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.jagran.com/bihar',
    // rssUrl: 'https://www.bhaskar.com/rss/national/bihar.xml',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'Dainik Bhaskar',
    language: 'hi',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.bhaskar.com/local/bihar/',
    // RSS removed — /rss/national/bihar.xml returns non-Bihar articles
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'Prabhat Khabar',
    language: 'hi',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.prabhatkhabar.com/state/bihar',
    rssUrl: 'https://www.prabhatkhabar.com/feed/',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'Amar Ujala',
    language: 'hi',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.amarujala.com/bihar',
    rssUrl: 'https://www.amarujala.com/rss/bihar.xml',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'ABP Bihar',
    language: 'hi',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.abplive.com/news/states/bihar',
    rssUrl: 'https://www.abplive.com/news/states/bihar/feed',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
];

export const ALL_SOURCES = [...ENGLISH_SOURCES, ...HINDI_SOURCES];

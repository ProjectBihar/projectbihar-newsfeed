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
    name: 'The Print',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://theprint.in/tag/bihar/',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/tag/bihar/"] ~ a, a.entry-title' },
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
    rssUrl: 'https://www.business-standard.com/rss/india-news-216.rss',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'Financial Express',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.financialexpress.com/about/bihar',
    rssUrl: 'https://www.financialexpress.com/rss/section/national/rssfeed.xml',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/article/"]' },
  },
  {
    name: 'Moneycontrol',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.moneycontrol.com/news/india',
    rssUrl: 'https://www.moneycontrol.com/rss/markets_news.xml',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'Bihar Times',
    language: 'en',
    type: 'bihar-dedicated',
    listingUrl: 'https://bihartimes.in',
    rssUrl: 'https://bihartimes.in/feed/',
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
    rssUrl: 'https://www.livehindustan.com/rss/bihar/feed',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/story/"]' },
  },
  {
    name: 'Dainik Jagran',
    language: 'hi',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.jagran.com/bihar-news-hindi.html',
    rssUrl: 'https://www.jagran.com/rss/bihar-patna.xml',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
  {
    name: 'Dainik Bhaskar',
    language: 'hi',
    type: 'bihar-dedicated',
    listingUrl: 'https://www.bhaskar.com/local/bihar/',
    rssUrl: 'https://www.bhaskar.com/rss/national/bihar.xml',
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
    name: 'News18 Bihar',
    language: 'hi',
    type: 'bihar-dedicated',
    listingUrl: 'https://hindi.news18.com/bihar/',
    rssUrl: 'https://hindi.news18.com/rss/india/bihar-jharkhand.xml',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },

  // ── New Hindi RSS sources ──
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
    name: 'Zee Bihar',
    language: 'hi',
    type: 'bihar-dedicated',
    listingUrl: 'https://zeenews.india.com/hindi/india/bihar-jharkhand',
    rssUrl: 'https://zeenews.india.com/rss/hindi/india/bihar-jharkhand.xml',
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
  {
    name: 'ETV Bharat',
    language: 'hi',
    type: 'bihar-dedicated',
    listingUrl: 'https://etvbharat.com/hi/bihar',
    rssUrl: 'https://etvbharat.com/hi/india/bihar/feed',
    allowedCategories: biharDedicatedAll,
    selectors: { articleLink: 'a[href*="/news/"]' },
  },
];

export const ALL_SOURCES = [...ENGLISH_SOURCES, ...HINDI_SOURCES];

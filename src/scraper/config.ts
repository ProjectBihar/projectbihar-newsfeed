// ═══════════════════════════════════════════════════════════════════
// Category Types & Constants (preserved for classification pipeline)
// ═══════════════════════════════════════════════════════════════════

export type Category =
  | 'economy'
  | 'infrastructure'
  | 'industry'
  | 'agriculture'
  | 'education'
  | 'healthcare'
  | 'environment'
  | 'governance'
  | 'exclude';

export const ALL_CATEGORIES: Category[] = [
  'economy',
  'infrastructure',
  'industry',
  'agriculture',
  'education',
  'healthcare',
  'environment',
  'governance',
];

export const CATEGORY_DISPLAY: Record<Category, string> = {
  economy: 'Economy',
  infrastructure: 'Infrastructure',
  industry: 'Industry',
  agriculture: 'Agriculture',
  education: 'Education',
  healthcare: 'Healthcare',
  environment: 'Environment',
  governance: 'Governance',
  exclude: 'Exclude',
};

// ═══════════════════════════════════════════════════════════════════
// Pipeline Constants
// ═══════════════════════════════════════════════════════════════════

export const FETCH_TIMEOUT_MS = 15_000;
export const DELAY_BETWEEN_REQUESTS_MS = 800;
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════
// News Source Registry — Unified Configuration for All Discovery Tracks
// ═══════════════════════════════════════════════════════════════════

export interface NewsSourceConfig {
  sourceName: string;
  targetUrl: string;      // The RSS feed URL OR the HTML section landing page URL
  discoveryType: 'rss' | 'html_section';
  baseDomain: string;     // Used to resolve relative URLs (e.g., "https://timesofindia.indiatimes.com")
}

export const NEWS_SOURCES_REGISTRY: NewsSourceConfig[] = [
  // ── RSS Sources Group ──
  {
    sourceName: 'Prabhat Khabar',
    targetUrl: 'https://www.prabhatkhabar.com/feed/',
    discoveryType: 'rss',
    baseDomain: 'https://www.prabhatkhabar.com',
  },
  {
    sourceName: 'Amar Ujala Bihar',
    targetUrl: 'https://www.amarujala.com/rss/bihar.xml',
    discoveryType: 'rss',
    baseDomain: 'https://www.amarujala.com',
  },

  // ── Non-RSS HTML Section Sources Group ──
  {
    sourceName: 'Times of India Patna',
    targetUrl: 'https://timesofindia.indiatimes.com/city/patna',
    discoveryType: 'html_section',
    baseDomain: 'https://timesofindia.indiatimes.com',
  },
  {
    sourceName: 'Hindustan Times Patna',
    targetUrl: 'https://www.hindustantimes.com/cities/patna-news',
    discoveryType: 'html_section',
    baseDomain: 'https://www.hindustantimes.com',
  },
  {
    sourceName: 'The Hindu Bihar',
    targetUrl: 'https://www.thehindu.com/news/national/bihar/',
    discoveryType: 'html_section',
    baseDomain: 'https://www.thehindu.com',
  },
  {
    sourceName: 'India Today Bihar',
    targetUrl: 'https://www.indiatoday.in/india/bihar',
    discoveryType: 'html_section',
    baseDomain: 'https://www.indiatoday.in',
  },
  {
    sourceName: 'Hindustan Live Bihar',
    targetUrl: 'https://www.livehindustan.com/bihar/',
    discoveryType: 'html_section',
    baseDomain: 'https://www.livehindustan.com',
  },
  {
    sourceName: 'Dainik Bhaskar Bihar',
    targetUrl: 'https://www.bhaskar.com/local/bihar/',
    discoveryType: 'html_section',
    baseDomain: 'https://www.bhaskar.com',
  },
  {
    sourceName: 'Economic Times Bihar',
    targetUrl: 'https://economictimes.indiatimes.com/topic/bihar',
    discoveryType: 'html_section',
    baseDomain: 'https://economictimes.indiatimes.com',
  },
  {
    sourceName: 'Scroll Bihar',
    targetUrl: 'https://scroll.in/tag/bihar',
    discoveryType: 'html_section',
    baseDomain: 'https://scroll.in',
  },
  {
    sourceName: 'The Wire Bihar',
    targetUrl: 'https://thewire.in/tag/bihar',
    discoveryType: 'html_section',
    baseDomain: 'https://thewire.in',
  },
  {
    sourceName: 'Mint Bihar',
    targetUrl: 'https://www.livemint.com/topic/bihar',
    discoveryType: 'html_section',
    baseDomain: 'https://www.livemint.com',
  },
  {
    sourceName: 'IndiaSpend Bihar',
    targetUrl: 'https://www.indiaspend.com/bihar',
    discoveryType: 'html_section',
    baseDomain: 'https://www.indiaspend.com',
  },
  {
    sourceName: 'Down To Earth Bihar',
    targetUrl: 'https://www.downtoearth.org.in/topic/bihar',
    discoveryType: 'html_section',
    baseDomain: 'https://www.downtoearth.org.in',
  },
  {
    sourceName: 'Financial Express Bihar',
    targetUrl: 'https://www.financialexpress.com/about/bihar',
    discoveryType: 'html_section',
    baseDomain: 'https://www.financialexpress.com',
  },
  {
    sourceName: 'BusinessLine Bihar',
    targetUrl: 'https://www.thehindubusinessline.com/topic/bihar/',
    discoveryType: 'html_section',
    baseDomain: 'https://www.thehindubusinessline.com',
  },
];

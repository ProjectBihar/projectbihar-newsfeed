export const FETCH_TIMEOUT_MS = 10_000;
export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

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

export interface NewsSourceConfig {
  sourceName: string;
  targetUrl: string;
  discoveryType: 'rss' | 'html_section' | 'wp_api';
}

export const SCRAPER_SOURCES: NewsSourceConfig[] = [
  // ── National English Media (Filtered for Bihar via Geo-Filter) ──
  { 
    sourceName: 'The Indian Express', 
    targetUrl: 'https://indianexpress.com/section/india/rss/', 
    discoveryType: 'rss' 
  },
  { 
    sourceName: 'The Hindu', 
    targetUrl: 'https://www.thehindu.com/news/national/feeder/default.rss', 
    discoveryType: 'rss' 
  },
  {
    sourceName: 'The Print',
    targetUrl: 'https://theprint.in/wp-json/wp/v2/posts',
    discoveryType: 'wp_api'
  },
  { 
    sourceName: 'The Economic Times', 
    targetUrl: 'https://economictimes.indiatimes.com/news/india/rssfeeds/1052732854.cms', 
    discoveryType: 'rss' 
  },
  { 
    sourceName: 'Mint', 
    targetUrl: 'https://www.livemint.com/rss/news', 
    discoveryType: 'rss' 
  },

  // ── Independent & Alternative Media ──
  {
    sourceName: 'Scroll.in',
    targetUrl: 'https://scroll.in/',
    discoveryType: 'html_section'
  },
  { 
    sourceName: 'Newslaundry', 
    targetUrl: 'https://www.newslaundry.com/feed', 
    discoveryType: 'rss' 
  },
  { 
    sourceName: 'Main Media', 
    targetUrl: 'https://mainmedia.in/', 
    discoveryType: 'html_section' 
  },

  // ── Hindi & Regional Bihar Media ──
  { 
    sourceName: 'BBC News Hindi', 
    targetUrl: 'https://feeds.bbci.co.uk/hindi/rss.xml', 
    discoveryType: 'rss' 
  },
  {
    sourceName: 'Patna Press',
    targetUrl: 'https://patnapress.com/feed/',
    discoveryType: 'rss'
  },
  {
    sourceName: 'Live Hindustan Bihar',
    targetUrl: 'https://www.livehindustan.com/bihar/',
    discoveryType: 'html_section'
  },
  {
    sourceName: 'Prabhat Khabar Bihar',
    targetUrl: 'https://www.prabhatkhabar.com/feed/',
    discoveryType: 'rss'
  },
  { 
    // Using HTML discovery for better accuracy
    sourceName: 'Dainik Bhaskar Bihar', 
    targetUrl: 'https://www.bhaskar.com/local/bihar/', 
    discoveryType: 'html_section' 
  }
];
export interface NewsSourceConfig {
  sourceName: string;
  targetUrl: string;
  discoveryType: 'rss' | 'html_section';
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
    targetUrl: 'https://theprint.in/feed/', 
    discoveryType: 'rss' 
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
    targetUrl: 'https://scroll.in/feed', 
    discoveryType: 'rss' 
  },
  { 
    sourceName: 'Newslaundry', 
    targetUrl: 'https://www.newslaundry.com/feed', 
    discoveryType: 'rss' 
  },
  { 
    sourceName: 'Main Media', 
    targetUrl: 'https://mainmedia.in/feed/', 
    discoveryType: 'rss' 
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
    targetUrl: 'https://www.livehindustan.com/bihar/rss/', 
    discoveryType: 'rss' 
  },
  { 
    // Using HTML discovery because regional RSS feeds often break
    sourceName: 'Prabhat Khabar Bihar', 
    targetUrl: 'https://www.prabhatkhabar.com/state/bihar', 
    discoveryType: 'html_section' 
  },
  { 
    // Using HTML discovery for better accuracy
    sourceName: 'Dainik Bhaskar Bihar', 
    targetUrl: 'https://www.bhaskar.com/local/bihar/', 
    discoveryType: 'html_section' 
  }
];
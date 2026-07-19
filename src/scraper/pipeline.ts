import type { NewsSourceConfig } from './config';
import { fetchArticleUrlsFromRSS } from './parser-rss';
import { discoverLinksFromHTMLSection } from './parser-section';
import { extractCleanArticleText } from './parser-html';
import { isBiharCentric } from './geo-filter';

// ── FAIL-SAFE: Advanced Absolute URL Resolver ──
function resolveUrl(targetUrl: string, baseUrl: string): string {
  if (!targetUrl) return '';
  let clean = targetUrl.trim();
  if (clean.startsWith('undefined')) clean = clean.replace('undefined', '');
  if (clean.startsWith('//')) return 'https:' + clean; // Catch protocol-relative links
  try {
    return new URL(clean, baseUrl).href;
  } catch (e) {
    return baseUrl.replace(/\/$/, '') + '/' + clean.replace(/^\//, '');
  }
}

// ── FAIL-SAFE: Timeout Wrapper for Metadata Fetches ──
async function fetchWithTimeout(url: string, ms = 4000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: controller.signal
    });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    return null; // Fail gracefully
  }
}

// ── METADATA EXTRACTOR ──
async function peekArticleMetadata(url: string) {
  const result: { publishedAt: Date | null; title: string | null } = { publishedAt: null, title: null };
  const html = await fetchWithTimeout(url);
  if (!html) return result;
  
  const titleMatch = html.match(/<meta[^>]+(?:property|name)=["'](?:og:title|twitter:title|title)["'][^>]+content=["']([^"']+)["']/i) || html.match(/<title[^>*]>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) result.title = titleMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();

  const dateMatch = html.match(/<meta[^>]+(?:property|name)=["'](?:article:published_time|datePublished|pubdate)["'][^>]+content=["']([^"']+)["']/i) || html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  if (dateMatch && dateMatch[1]) {
    const parsed = new Date(dateMatch[1]);
    if (!isNaN(parsed.getTime())) result.publishedAt = parsed;
  }
  return result;
}

export async function runUnifiedPipeline(sources: NewsSourceConfig[]): Promise<any[]> {
  const ingestedArticlesLog: any[] = [];
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const source of sources) {
    console.log(`\n▶ [Pipeline] Launching discovery track for: ${source.sourceName}`);
    let candidateUrls: string[] = [];
    const urlDateMap = new Map<string, Date>();
    const urlTitleMap = new Map<string, string>(); 
    const baseUrl = new URL(source.targetUrl).origin;

    try {
      if (source.discoveryType === 'rss') {
        const rssItems = await fetchArticleUrlsFromRSS([source.targetUrl]);
        candidateUrls = rssItems.map(item => item.link).filter(Boolean);
        for (const item of rssItems) {
          if (!item.link) continue;
          urlDateMap.set(item.link, item.pubDate);
          if ((item as any).title) urlTitleMap.set(item.link, (item as any).title);
        }
      } else {
        const rawLinks = await discoverLinksFromHTMLSection(source);
        candidateUrls = rawLinks.map(u => resolveUrl(u, baseUrl));
      }
    } catch (err: any) {
      console.error(`  [Pipeline Error] Discovery failed for ${source.sourceName}, moving to next source.`);
      continue; 
    }

    const executionQueue = Array.from(new Set(candidateUrls));
    
    for (let index = 0; index < executionQueue.length; index++) {
      const url = executionQueue[index];
      if (!url) continue;

      // The 2026 Year Guillotine
      if (url.match(/\/(19\d{2}|201\d|202[0-5])\//)) {
        continue;
      }
      
      let titleGuess = urlTitleMap.get(url);
      let publishedAt = urlDateMap.get(url);

      // Meta-Tag Fallback
      if (!titleGuess || !publishedAt || (now - publishedAt.getTime() < 3600000)) {
        const liveMeta = await peekArticleMetadata(url);
        if (liveMeta.title) titleGuess = liveMeta.title;
        if (liveMeta.publishedAt) publishedAt = liveMeta.publishedAt;
      }

      // URL String Parsing Fallback
      if (!titleGuess) {
        const segments = url.split('?')[0].replace(/\/$/, '').split('/');
        for (let i = segments.length - 1; i >= 0; i--) {
          let seg = segments[i].replace(/\.\w+$/, '').replace(/[-_]/g, ' ').trim();
          if (/[a-zA-Z]/.test(seg) && !/^article\d*$/i.test(seg) && seg.length > 3) {
            titleGuess = seg;
            break;
          }
        }
      }

      const displayTitle = (titleGuess || 'Untitled Article').substring(0, 100);
      console.log(`   [Processing] ${index + 1}/${executionQueue.length} — ${displayTitle}...`);

      if (!publishedAt || (now - publishedAt.getTime() > SEVEN_DAYS_MS)) {
        continue; 
      }

      try {
        const bodyText = await Promise.race([
          extractCleanArticleText(url),
          new Promise<null>((_, r) => setTimeout(() => r(new Error('Timeout')), 8000))
        ]);

        if (!bodyText || bodyText.trim().length <= 100) continue;
        if (!isBiharCentric(titleGuess || '', bodyText)) continue;

        // Auto-detect Hindi vs English sources for the frontend filter
        const isHindi = /(bbc news hindi|prabhat khabar|live hindustan|dainik bhaskar|main media)/i.test(source.sourceName);

        // Map strictly to expected schema with absolute fallbacks to prevent Database NULL crashes
        ingestedArticlesLog.push({
          headline: titleGuess || 'Untitled Article',
          url: url,
          synopsis: (bodyText.split('\n')[0] || 'No synopsis available.').substring(0, 250),
          source: source.sourceName,
          published_timestamp: publishedAt.getTime(),
          language: isHindi ? 'hi' : 'en'
        });

      } catch (err: any) {
        // Silently skip failed extractions to keep the master pipeline moving
      }
    }
  }
  return ingestedArticlesLog;
}
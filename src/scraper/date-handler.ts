import { fromZonedTime } from 'date-fns-tz';

const IST = 'Asia/Kolkata';

function toISTEpoch(input: string | Date): number | null {
  try {
    const d = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(d.getTime())) return null;
    // If the date string had no timezone info, assume IST
    if (typeof input === 'string' && !input.match(/[Zz]|[+-]\d{2}:\d{2}|GMT|UTC/)) {
      const utc = fromZonedTime(d, IST);
      return utc.getTime();
    }
    return d.getTime();
  } catch {
    return null;
  }
}

function extractJsonLDDatePublished(html: string): string | null {
  const match = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!match) return null;
  for (const block of match) {
    const jsonStr = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
    try {
      const obj = JSON.parse(jsonStr);
      if (obj.datePublished) return obj.datePublished;
      if (Array.isArray(obj['@graph'])) {
        for (const item of obj['@graph']) {
          if (item.datePublished) return item.datePublished;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractMetaDate(html: string): string | null {
  const patterns = [
    /property="article:published_time"\s+content="([^"]+)"/i,
    /content="([^"]+)"\s+property="article:published_time"/i,
    /property="og:pubdate"\s+content="([^"]+)"/i,
    /content="([^"]+)"\s+property="og:pubdate"/i,
    /name="publish-date"\s+content="([^"]+)"/i,
    /name="date"\s+content="([^"]+)"/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

function extractTimeElement(html: string): string | null {
  const m = html.match(/<time[^>]*datetime="([^"]+)"/i);
  return m?.[1] ?? null;
}

function parseRelativeTime(html: string): number | null {
  // Look for text like "2 hours ago", "3 days ago", "1 week ago"
  const patterns: [RegExp, number][] = [
    [/(\d+)\s*minutes?\s*ago/i, 60_000],
    [/(\d+)\s*hours?\s*ago/i, 3_600_000],
    [/(\d+)\s*days?\s*ago/i, 86_400_000],
    [/(\d+)\s*weeks?\s*ago/i, 604_800_000],
    [/(\d+)\s*months?\s*ago/i, 2_592_000_000],
  ];
  for (const [re, multiplier] of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const val = parseInt(m[1], 10) * multiplier;
      if (val <= 7 * 86_400_000) return val; // within 7 days
      return null; // too old, signal to drop
    }
  }
  return null;
}

/**
 * Ordered fallback date extraction. Returns IST epoch ms or null.
 * Never guesses. Never substitutes "now".
 */
export function extractPublishDate(html: string): number | null {
  // TIER 1: JSON-LD datePublished (most reliable for Indian CMS)
  const ldDate = extractJsonLDDatePublished(html);
  if (ldDate) {
    const ts = toISTEpoch(ldDate);
    if (ts) return ts;
  }

  // TIER 2: Meta tags
  const metaDate = extractMetaDate(html);
  if (metaDate) {
    const ts = toISTEpoch(metaDate);
    if (ts) return ts;
  }

  // TIER 3: <time datetime=""> element
  const timeEl = extractTimeElement(html);
  if (timeEl) {
    const ts = toISTEpoch(timeEl);
    if (ts) return ts;
  }

  // TIER 4: Relative text ("2 hours ago")
  const relativeMs = parseRelativeTime(html);
  if (relativeMs !== null) {
    return Date.now() - relativeMs;
  }

  // NO DATE FOUND → return null (caller should DROP the article)
  return null;
}

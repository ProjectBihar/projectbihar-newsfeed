import { createHash } from 'crypto';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_cid',
  'ref',
  'source',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'spm',
]);

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hostname = u.hostname.toLowerCase();
    // Strip tracking params
    for (const p of TRACKING_PARAMS) {
      u.searchParams.delete(p);
    }
    // Remove trailing slash
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    // Strip fragment
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

export function generateArticleId(url: string): string {
  const normalized = normalizeUrl(url);
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

export function isSameArticle(url1: string, url2: string): boolean {
  return generateArticleId(url1) === generateArticleId(url2);
}

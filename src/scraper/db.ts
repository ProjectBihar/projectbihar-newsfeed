import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Get or create the Supabase client (service-role key for scraper writes).
 * Runs in GitHub Actions or local testing — never in the browser.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars. ' +
      'Set them in .env.local (local) or GitHub Actions secrets.'
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}

export interface ArticleRow {
  id: string;
  url: string;
  headline: string;
  synopsis: string;
  source: string;
  language: string;
  category: string;
  published_timestamp: number;
  ingested_at: number;
}

/**
 * Upsert an article into Supabase. Dedup is handled by primary key (id = URL hash).
 * If the article already exists, it gets updated with fresh data.
 */
export async function upsertArticle(article: ArticleRow): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('articles').upsert(article, {
    onConflict: 'id',
  });
  if (error) {
    console.error(`  DB upsert error for ${article.id}:`, error.message);
  }
}

/**
 * Check which article IDs already exist in the database (for faster dedup).
 */
export async function getExistingIds(ids: string[]): Promise<Set<string>> {
  const supabase = getSupabaseClient();
  const existing = new Set<string>();

  // Query in batches of 50 (Supabase 'in' limit)
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const { data } = await supabase
      .from('articles')
      .select('id')
      .in('id', batch);
    if (data) {
      for (const row of data) existing.add(row.id);
    }
  }

  return existing;
}

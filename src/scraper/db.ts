/**
 * Supabase Storage Sync Module
 *
 * Connects the pipeline to the database and ensures duplicate URLs never
 * crash the script. Uses native upsert with onConflict for safe inserts.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import crypto from 'crypto';
import WebSocket from 'ws';
import type { RawArticle } from './types';

// ── ID Generator: SHA-256 hex slice matching schema.sql ──
const generateId = (url: string) =>
  crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);

// Polyfill WebSocket for Supabase client in Node.js environments
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

const DB_QUERY_TIMEOUT_MS = 10_000;

// ═══════════════════════════════════════════════════════════════════
// Environment Loading (for standalone scraper execution)
// ═══════════════════════════════════════════════════════════════════

function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local not found — rely on environment variables
  }
}

loadEnvFile();

// ═══════════════════════════════════════════════════════════════════
// Supabase Client Initialization
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
// Database Functions
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch recent article titles from the database (last 24 hours).
 * Used for title-based deduplication before insertion.
 *
 * @returns Array of title strings from recent articles
 */
export async function fetchRecentTitles(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const result = await Promise.race([
    supabase
      .from('articles')
      .select('headline')
      .gte('created_at', twentyFourHoursAgo),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('DB fetchRecentTitles timeout')),
        DB_QUERY_TIMEOUT_MS
      )
    ),
  ]);

  if (result.error) {
    console.error('  DB fetchRecentTitles error:', result.error.message);
    return [];
  }

  return (result.data || []).map(
    (row: { headline: string }) => row.headline
  );
}

/**
 * Sync articles to the database using upsert.
 * Duplicate URLs are safely ignored via onConflict.
 *
 * @param articles - Array of RawArticle objects to insert
 */
export async function syncToDatabase(articles: RawArticle[]): Promise<void> {
  if (articles.length === 0) {
    console.log('  [DB] No articles to sync');
    return;
  }

  const supabase = getSupabaseClient();

  // Map RawArticle to Supabase schema (columns must match schema.sql exactly)
  const formattedData = articles.map((article) => ({
    id: generateId(article.sourceUrl),
    url: article.sourceUrl,
    headline: article.title,
    synopsis: article.rssSummary || article.fullContent.substring(0, 200),
    content: article.fullContent,
    source: article.sourceName,
    language: article.sourceName.includes('Hindustan') || article.sourceName.includes('Bhaskar') || article.sourceName.includes('Amar') || article.sourceName.includes('Prabhat') ? 'hi' : 'en',
    category: article.category.toLowerCase(),
    published_timestamp: new Date(article.publishedAt).getTime(),
    ingested_at: Date.now(),
    is_noise: article.isNoise || false,
  }));

  // Upsert with onConflict to safely ignore duplicate URLs
  const result = await Promise.race([
    supabase
      .from('articles')
      .upsert(formattedData, {
        onConflict: 'id',
        ignoreDuplicates: true,
      }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('DB syncToDatabase timeout')),
        DB_QUERY_TIMEOUT_MS
      )
    ),
  ]);

  if (result.error) {
    console.error('  [DB] Sync error:', result.error.message);
  } else {
    console.log(
      `  [DB] Successfully synced ${articles.length} articles to database`
    );
  }
}

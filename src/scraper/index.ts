/**
 * Bihar News Scraper — Master Orchestrator
 *
 * Wires together the entire pipeline:
 *   RSS/HTML Discovery → Content Extraction → Geo-Fencing → Classification
 *   → Deduplication → Database Sync
 *
 * Flow:
 *   Discovered X links → Y passed Geo-Fence → Z passed Deduplication → Synced to DB
 */

import { NEWS_SOURCES_REGISTRY } from './config';
import { runUnifiedPipeline } from './pipeline';
import { fetchRecentTitles, syncToDatabase } from './db';
import { deduplicateArticles } from './dedup';

// Overall script timeout — kill after 15 minutes no matter what
const SCRIPT_TIMEOUT_MS = 15 * 60 * 1000;
const scriptTimer = setTimeout(() => {
  console.error(
    `\n⏱ FATAL: Script exceeded ${SCRIPT_TIMEOUT_MS / 60_000} minute timeout. Forcing exit.`
  );
  process.exit(1);
}, SCRIPT_TIMEOUT_MS);
scriptTimer.unref();

// ═══════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════');
  console.log(`Bihar News Scraper — ${new Date().toISOString()}`);
  console.log(`Sources: ${NEWS_SOURCES_REGISTRY.length}`);
  console.log('═══════════════════════════════════════════');

  // ── Step 0: Fetch historical context from DB ──
  console.log('\n▶ [DB] Fetching recent titles for deduplication...');
  const existingTitles = await fetchRecentTitles();
  console.log(`  [DB] Found ${existingTitles.length} titles from last 24 hours`);

  // ── Step 1: Run unified pipeline (discover + extract + geo-fence + classify) ──
  console.log('\n▶ [Pipeline] Starting unified pipeline...');
  const rawArticles = await runUnifiedPipeline(NEWS_SOURCES_REGISTRY);

  const discovered = rawArticles.length; // After geo-fence (pipeline filters internally)

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`Pipeline complete: ${discovered} articles passed geo-fence`);
  console.log('═══════════════════════════════════════════');

  // ── Step 2: Deduplication ──
  console.log('\n▶ [Dedup] Running title-based deduplication...');
  const uniqueArticles = deduplicateArticles(rawArticles, existingTitles);
  const dedupPassed = uniqueArticles.length;
  const dedupDropped = discovered - dedupPassed;

  console.log(
    `  [Dedup] ${dedupPassed} unique articles (${dedupDropped} duplicates removed)`
  );

  // ── Step 3: Sync to Database ──
  console.log('\n▶ [DB] Syncing to database...');
  await syncToDatabase(uniqueArticles);

  // ── Final Summary ──
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n═══════════════════════════════════════════');
  console.log(
    `Discovered ${NEWS_SOURCES_REGISTRY.length} sources → ` +
    `${discovered} passed Geo-Fence → ` +
    `${dedupPassed} passed Deduplication → ` +
    `Synced to DB`
  );
  console.log(`Elapsed: ${elapsed}s`);
  console.log('═══════════════════════════════════════════');

  clearTimeout(scriptTimer);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  clearTimeout(scriptTimer);
  process.exit(1);
});

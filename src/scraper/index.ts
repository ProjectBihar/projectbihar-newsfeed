import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { SCRAPER_SOURCES } from './config';
import { runUnifiedPipeline } from './pipeline';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '', 
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log(`Bihar News Scraper — ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════');

  try {
    const articles = await runUnifiedPipeline(SCRAPER_SOURCES);

    if (!articles || articles.length === 0) {
      console.log('\n[Scraper] No new articles found or all were filtered out.');
      return;
    }

    console.log(`\n[Scraper] Pipeline returned ${articles.length} valid articles. Syncing in batches...`);

    // ── THE BULLETPROOF BATCH UPSERT ──
    const BATCH_SIZE = 50;
    let successCount = 0;

    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('articles')
        .upsert(batch, { onConflict: 'url', ignoreDuplicates: true });

      if (error) {
        console.error(`\n❌ [Database Error] Batch ${i/BATCH_SIZE + 1} failed:`, error.message);
      } else {
        successCount += batch.length;
      }
    }

    console.log(`\n✅ Successfully synced ${successCount}/${articles.length} fresh articles to Supabase!`);

  } catch (err: any) {
    console.error('\n❌ Fatal error in scraper main loop:', err.message);
  }
}

main().then(() => {
  console.log('\n🛑 Task complete. Closing database connections and exiting process...');
  process.exit(0);
}).catch((err) => {
  console.error('\n❌ Unhandled rejection in main:', err);
  process.exit(1);
});
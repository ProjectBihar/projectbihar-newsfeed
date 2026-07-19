import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { analyzeArticle } from './categorizer';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const VALID_CATEGORIES = new Set([
  'economy', 'infrastructure', 'industry', 'agriculture',
  'education', 'healthcare', 'environment', 'governance'
]);

async function runBackfill() {
  console.log('═══════════════════════════════════════════');
  console.log('   Starting Database Category Backfill     ');
  console.log('═══════════════════════════════════════════');

  // 1. Fetch ALL articles from the database
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, headline, synopsis, category');

  if (error || !articles) {
    console.error('Failed to fetch articles:', error);
    return;
  }

  // 2. Filter to articles with null, empty, or invalid categories
  const needsUpdate = articles.filter(a => {
    const cat = (a.category || '').trim().toLowerCase();
    return !cat || !VALID_CATEGORIES.has(cat);
  });
  console.log(`Found ${needsUpdate.length} legacy articles needing categorization.`);

  if (needsUpdate.length === 0) {
    console.log('Database is already perfectly categorized!');
    return;
  }

  let successCount = 0;

  // 3. Run them through the categorization engine and update Supabase
  for (const article of needsUpdate) {
    const analysis = analyzeArticle(article.headline || '', article.synopsis || '');
    const computedCategory = analysis.category || 'governance';

    const { error: updateError } = await supabase
      .from('articles')
      .update({ category: computedCategory })
      .eq('id', article.id);

    if (updateError) {
      console.error(`Failed to update [${article.id}]:`, updateError.message);
    } else {
      successCount++;
    }
  }

  console.log(`\nBackfill complete! Categorized ${successCount}/${needsUpdate.length} articles.`);
}

runBackfill();

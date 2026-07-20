import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SCRAPER_SOURCES } from '@/scraper/config';
import { runUnifiedPipeline } from '@/scraper/pipeline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  // Optional: Protect with a secret key
  const authHeader = request.headers.get('authorization');
  if (process.env.SCRAPER_API_KEY && authHeader !== `Bearer ${process.env.SCRAPER_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  
  try {
    console.log(`[API Scraper] Starting at ${new Date().toISOString()}`);
    
    const articles = await runUnifiedPipeline(SCRAPER_SOURCES);
    
    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        articlesFound: 0,
        articlesSaved: 0,
        message: 'No new articles found',
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
      });
    }

    // Batch upsert to Supabase
    const BATCH_SIZE = 50;
    let successCount = 0;

    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('articles')
        .upsert(batch, { onConflict: 'url', ignoreDuplicates: true });

      if (!error) {
        successCount += batch.length;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[API Scraper] Completed: ${successCount}/${articles.length} articles in ${duration}s`);

    return NextResponse.json({
      success: true,
      articlesFound: articles.length,
      articlesSaved: successCount,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error(`[API Scraper] Fatal error:`, error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
    }, { status: 500 });
  }
}

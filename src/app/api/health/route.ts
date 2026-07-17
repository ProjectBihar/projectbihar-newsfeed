import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerClient();
  const ninetyMinAgo = Date.now() - 90 * 60 * 1000;

  const { count } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .gte('ingested_at', ninetyMinAgo);

  const ok = (count ?? 0) > 0;

  return NextResponse.json({
    ok,
    recentArticles: count ?? 0,
    timestamp: new Date().toISOString(),
  });
}

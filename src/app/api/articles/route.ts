import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const tab = request.nextUrl.searchParams.get('tab') || 'curated';
  const minTimestamp = Date.now() - SEVEN_DAYS_MS;
  const supabase = await createClient();

  if (tab === 'all') {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .gte('published_timestamp', minTimestamp)
      .order('published_timestamp', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ articles: data || [] });
  }

  // Curated: is_noise = false, sorted by sentiment score
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_noise', false)
    .gte('published_timestamp', minTimestamp);

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  const articles = (data || []).map((a) => {
    let score = 0;
    if (a.user_rating === 'positive') score = 2;
    else if (a.user_rating === 'negative') score = -2;
    return { ...a, _score: score };
  });

  articles.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    return b.published_timestamp - a.published_timestamp;
  });

  const result = articles.map(({ _score, ...rest }) => rest);
  return NextResponse.json({ articles: result });
}

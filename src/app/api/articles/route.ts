import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const tab = request.nextUrl.searchParams.get('tab') || 'curated';
  const minTimestamp = Date.now() - SEVEN_DAYS_MS;

  if (tab === 'all') {
    // All News: no is_noise filter, ordered by published_timestamp desc
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .gte('published_timestamp', minTimestamp)
      .order('published_timestamp', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ articles: data || [] });
  }

  // Curated (default): is_noise = false, sorted by sentiment score
  // Score: positive +2, negative -2, neutral/unrated 0
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_noise', false)
    .gte('published_timestamp', minTimestamp);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sort by sentiment score, then by published_timestamp
  const articles = (data || []).map((a) => {
    let score = 0;
    if (a.user_rating === 'positive') score = 2;
    else if (a.user_rating === 'negative') score = -2;
    return { ...a, _score: score };
  });

  articles.sort((a, b) => {
    // Higher score rises, lower score sinks
    if (b._score !== a._score) return b._score - a._score;
    // Same score: chronological
    return b.published_timestamp - a.published_timestamp;
  });

  // Remove the internal score field
  const result = articles.map(({ _score, ...rest }) => rest);

  return NextResponse.json({ articles: result });
}

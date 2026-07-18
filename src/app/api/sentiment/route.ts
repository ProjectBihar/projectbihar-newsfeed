import { createServerClient } from '@/lib/supabase-server';
import { extractKeywords } from '@/lib/nlp-utils';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

async function rebuildProfile(supabase: SupabaseClient, userId: string) {
  // Fetch all rated articles for this user only
  const { data: ratings } = await supabase
    .from('user_sentiment')
    .select('article_id, sentiment, articles(headline)')
    .eq('user_id', userId)
    .neq('sentiment', 'neutral');

  if (!ratings || ratings.length === 0) return;

  // Clear existing profile for this user only
  await supabase.from('user_sentiment_profile').delete().eq('user_id', userId);

  // Extract keywords and count frequencies
  const keywordCounts: Record<string, Record<string, number>> = {};

  for (const rating of ratings) {
    const articles = rating.articles as { headline: string }[] | null;
    const article = articles?.[0];
    if (!article?.headline) continue;

    const keywords = extractKeywords(article.headline);
    for (const kw of keywords) {
      if (!keywordCounts[kw]) keywordCounts[kw] = { positive: 0, negative: 0 };
      keywordCounts[kw][rating.sentiment as 'positive' | 'negative']++;
    }
  }

  // Insert keywords with weight >= 2
  const inserts: { keyword: string; sentiment: string; weight: number; user_id: string }[] = [];
  for (const [keyword, counts] of Object.entries(keywordCounts)) {
    if (counts.positive >= 2) {
      inserts.push({ keyword, sentiment: 'positive', weight: counts.positive, user_id: userId });
    }
    if (counts.negative >= 2) {
      inserts.push({ keyword, sentiment: 'negative', weight: counts.negative, user_id: userId });
    }
  }

  if (inserts.length > 0) {
    await supabase.from('user_sentiment_profile').insert(inserts);
  }
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Unauthenticated: return empty (no per-user data to show)
  if (!user) {
    return NextResponse.json({ ratings: [] });
  }

  const { data, error } = await supabase
    .from('user_sentiment')
    .select('id, article_id, sentiment, rated_at, articles(headline)')
    .eq('user_id', user.id)
    .order('rated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ ratings: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { article_id, sentiment } = await req.json();

  if (!article_id || !['positive', 'negative', 'neutral'].includes(sentiment)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_sentiment')
    .upsert({ article_id, sentiment, user_id: user.id }, { onConflict: 'article_id,user_id' });

  if (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Rebuild keyword profile
  await rebuildProfile(supabase, user.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { article_id } = await req.json();

  if (!article_id) {
    return NextResponse.json({ error: 'Missing article_id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_sentiment')
    .delete()
    .eq('article_id', article_id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Rebuild keyword profile
  await rebuildProfile(supabase, user.id);

  return NextResponse.json({ ok: true });
}

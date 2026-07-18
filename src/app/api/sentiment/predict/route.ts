import { createServerClient } from '@/lib/supabase-server';
import { extractKeywords } from '@/lib/nlp-utils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const idsParam = req.nextUrl.searchParams.get('ids');

  if (!idsParam) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
  }

  const ids = idsParam.split(',').filter(Boolean).slice(0, 100);

  // Fetch articles
  const { data: articles } = await supabase
    .from('articles')
    .select('id, headline')
    .in('id', ids);

  if (!articles) {
    return NextResponse.json({ predictions: {} });
  }

  // Check minimum threshold (need at least 5 ratings)
  const { count } = await supabase
    .from('user_sentiment')
    .select('*', { count: 'exact', head: true });

  if (!count || count < 5) {
    return NextResponse.json({ predictions: {}, threshold: false });
  }

  // Fetch keyword profile
  const { data: profile } = await supabase
    .from('user_sentiment_profile')
    .select('keyword, sentiment, weight');

  if (!profile || profile.length === 0) {
    return NextResponse.json({ predictions: {}, threshold: true });
  }

  // Build lookup maps
  const positiveMap = new Map<string, number>();
  const negativeMap = new Map<string, number>();
  for (const p of profile) {
    if (p.sentiment === 'positive') positiveMap.set(p.keyword, p.weight);
    else negativeMap.set(p.keyword, p.weight);
  }

  // Predict for each article
  const predictions: Record<string, { sentiment: string; confidence: number }> = {};

  for (const article of articles) {
    const keywords = extractKeywords(article.headline);
    let positiveScore = 0;
    let negativeScore = 0;

    for (const kw of keywords) {
      if (positiveMap.has(kw)) positiveScore += positiveMap.get(kw)!;
      if (negativeMap.has(kw)) negativeScore += negativeMap.get(kw)!;
    }

    if (positiveScore === 0 && negativeScore === 0) {
      predictions[article.id] = { sentiment: 'neutral', confidence: 0 };
    } else if (positiveScore > negativeScore) {
      const confidence = Math.min(1, positiveScore / (positiveScore + negativeScore));
      predictions[article.id] = { sentiment: 'positive', confidence };
    } else if (negativeScore > positiveScore) {
      const confidence = Math.min(1, negativeScore / (positiveScore + negativeScore));
      predictions[article.id] = { sentiment: 'negative', confidence };
    } else {
      predictions[article.id] = { sentiment: 'neutral', confidence: 0 };
    }
  }

  return NextResponse.json({ predictions, threshold: true });
}

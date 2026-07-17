import { createServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// Same stop words as main route
const STOP_WORDS_EN = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'about', 'also', 'and', 'but',
  'or', 'if', 'its', 'it', 'he', 'she', 'they', 'them', 'his', 'her',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
]);

const STOP_WORDS_HI = new Set([
  'के', 'की', 'का', 'में', 'से', 'को', 'पर', 'ने', 'और', 'यह', 'वह',
  'एक', 'भी', 'था', 'थे', 'है', 'हैं', 'थी', 'गया', 'गई', 'हो', 'हुआ',
  'हुई', 'कर', 'किया', 'इस', 'उस', 'अपने', 'अपनी', 'उन', 'इन', 'वे',
  'ये', 'क्या', 'कैसे', 'क्यों', 'जब', 'तब', 'अब', 'तो', 'ही', 'भी',
  'मे', 'पे', 'कि', 'जो', 'वो', 'इसमें', 'उसमें', 'यहां', 'वहां',
]);

function extractKeywords(headline: string): string[] {
  const text = headline.toLowerCase();
  const tokens = text.split(/[^a-z\u0900-\u097F]+/).filter(Boolean);
  return tokens.filter((t) => {
    if (t.length < 3) return false;
    if (/[\u0900-\u097F]/.test(t)) return !STOP_WORDS_HI.has(t);
    return !STOP_WORDS_EN.has(t);
  });
}

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

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service key');
  return createClient(url, key);
}

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

const ALLOWED_CATEGORIES = ['economy', 'infrastructure', 'industry', 'agriculture', 'education', 'healthcare', 'environment', 'governance'];

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { article_id, corrected_category } = await req.json();

  if (!article_id || !corrected_category || !ALLOWED_CATEGORIES.includes(corrected_category)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Get original article
  const { data: article } = await supabase
    .from('articles')
    .select('category, headline')
    .eq('id', article_id)
    .single();

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  // Update article category FIRST (most important, user sees this)
  const serviceClient = getServiceClient();
  await serviceClient
    .from('articles')
    .update({ category: corrected_category })
    .eq('id', article_id);

  // Save correction record + learn keywords — all in parallel, don't block response
  const keywords = extractKeywords(article.headline);

  // Fire-and-forget: correction + keyword learning
  Promise.all([
    // Save correction
    supabase.from('category_corrections').insert({
      article_id,
      original_category: article.category,
      corrected_category,
    }),
    // Upsert learned keywords in parallel
    ...keywords.map(async (keyword) => {
      const { data: existing } = await supabase
        .from('learned_category_keywords')
        .select('id, weight')
        .eq('keyword', keyword)
        .eq('category', corrected_category)
        .single();

      if (existing) {
        return supabase
          .from('learned_category_keywords')
          .update({ weight: existing.weight + 1, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        return supabase
          .from('learned_category_keywords')
          .insert({ keyword, category: corrected_category, weight: 1 });
      }
    }),
  ]).catch(() => {}); // background — don't fail the response

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: corrections, error } = await supabase
    .from('category_corrections')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const { data: learned } = await supabase
    .from('learned_category_keywords')
    .select('*')
    .order('weight', { ascending: false });

  return NextResponse.json({
    corrections: corrections || [],
    learned_keywords: learned || [],
  });
}

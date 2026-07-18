import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase-server';
import { extractKeywords } from '@/lib/nlp-utils';
import { NextRequest, NextResponse } from 'next/server';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service key');
  return createClient(url, key);
}

const ALLOWED_CATEGORIES = ['economy', 'infrastructure', 'industry', 'agriculture', 'education', 'healthcare', 'environment', 'governance'];

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { article_id, corrected_category, is_noise } = await req.json();

  // Marking as noise — only flip is_noise, preserve category
  if (is_noise === true) {
    if (!article_id) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { data: article } = await supabase
      .from('articles')
      .select('id')
      .eq('id', article_id)
      .single();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const serviceClient = getServiceClient();
    await serviceClient
      .from('articles')
      .update({ is_noise: true })
      .eq('id', article_id);

    return NextResponse.json({ ok: true });
  }

  // Category correction — set category + clear is_noise
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

  // Update article category + clear is_noise (most important, user sees this)
  const serviceClient = getServiceClient();
  await serviceClient
    .from('articles')
    .update({ category: corrected_category, is_noise: false })
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

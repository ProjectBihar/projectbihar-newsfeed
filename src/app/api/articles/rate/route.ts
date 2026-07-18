import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { article_id, rating } = await req.json();

    if (!article_id || (rating !== null && !['positive', 'negative', 'neutral'].includes(rating))) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Use service client for the articles update
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Update article rating
    const { error } = await serviceClient
      .from('articles')
      .update({ user_rating: rating })
      .eq('id', article_id);

    if (error) {
      return NextResponse.json({ error: 'Failed to update rating' }, { status: 500 });
    }

    // Track per-user sentiment for daily counts (reset at midnight IST)
    if (rating) {
      // Upsert: if user already rated this article today, update the sentiment
      const { error: sentimentError } = await supabase
        .from('user_sentiment')
        .upsert(
          {
            user_id: user.id,
            article_id: article_id,
            sentiment: rating,
            rated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,article_id' }
        );

      if (sentimentError) {
        console.error('Failed to track sentiment:', sentimentError.message);
      }
    } else {
      // Rating cleared — remove the sentiment record
      await supabase
        .from('user_sentiment')
        .delete()
        .eq('user_id', user.id)
        .eq('article_id', article_id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    if (!article_id || !['positive', 'negative', 'neutral'].includes(rating)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Use service client only for the update (articles table has no user_id column for ratings)
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { error } = await serviceClient
      .from('articles')
      .update({ user_rating: rating })
      .eq('id', article_id);

    if (error) {
      return NextResponse.json({ error: 'Failed to update rating' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

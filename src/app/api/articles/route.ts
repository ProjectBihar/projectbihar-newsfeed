import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Initialize Supabase client for Next.js App Router
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Fetch the latest 100 articles, newest first
    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .order('published_timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error("Database fetch error:", error);
      return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }

    // Return the articles to the frontend!
    return NextResponse.json(articles || []);
    
  } catch (err) {
    console.error("Unexpected API error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
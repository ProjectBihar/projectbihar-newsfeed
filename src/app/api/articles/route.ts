import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Initialize Supabase client for Next.js App Router
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignored in Route Handlers
          }
        },
      },
    }
  );

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
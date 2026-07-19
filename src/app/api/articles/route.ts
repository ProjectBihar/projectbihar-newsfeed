import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // 1. Await the cookie store (required in modern Next.js)
  const cookieStore = await cookies();
  
  // 2. Initialize the modern SSR client
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

  // ... your existing database fetch logic below stays exactly the same ...
  // const { data } = await supabase.from('articles').select('*');
  // return NextResponse.json(data);
}
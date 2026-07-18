import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Simple in-memory rate limiter (per IP, per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 120; // requests per minute
const RATE_WINDOW = 60_000;
const MAX_RATE_LIMIT_ENTRIES = 10_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Lazy cleanup: evict expired entries when map gets too large
  if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Rate limiting — use x-real-ip (set by Vercel/Cloudflare proxy) to avoid spoofing
  const ip = request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
  if (!checkRateLimit(ip)) {
    const response = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    response.headers.set('Retry-After', '60');
    return response;
  }

  // Refresh session
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow public routes (read-only endpoints with public RLS)
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/api/health' ||
    pathname === '/api/articles' ||
    pathname === '/api/sentiment/counts' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icon-')
  ) {
    return supabaseResponse;
  }

  // Unauthenticated: API routes get 401 JSON, pages get redirect
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-192.svg|icon-512.svg|sw.js|manifest.json).*)',
  ],
};

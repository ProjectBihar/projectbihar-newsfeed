import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Return 200 instead of redirect — the client handles navigation via
  // window.location.href. A redirect response can cause fetch() to follow
  // it as a GET, which may drop the Set-Cookie headers that signOut() set.
  return NextResponse.json({ ok: true });
}

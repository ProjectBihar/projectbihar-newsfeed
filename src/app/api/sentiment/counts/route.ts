import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createServerClient();

  // Get midnight IST today (IST = UTC+5:30, so midnight IST = 18:30 UTC previous day)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const midnightIST = new Date(istNow);
  midnightIST.setHours(0, 0, 0, 0);
  const midnightUTC = new Date(midnightIST.getTime() - istOffset);

  const minTimestamp = midnightUTC.toISOString();

  const [positive, negative, neutral] = await Promise.all([
    supabase
      .from('user_sentiment')
      .select('*', { count: 'exact', head: true })
      .eq('sentiment', 'positive')
      .gte('rated_at', minTimestamp),
    supabase
      .from('user_sentiment')
      .select('*', { count: 'exact', head: true })
      .eq('sentiment', 'negative')
      .gte('rated_at', minTimestamp),
    supabase
      .from('user_sentiment')
      .select('*', { count: 'exact', head: true })
      .eq('sentiment', 'neutral')
      .gte('rated_at', minTimestamp),
  ]);

  return NextResponse.json({
    positive: positive.count || 0,
    negative: negative.count || 0,
    neutral: neutral.count || 0,
  });
}

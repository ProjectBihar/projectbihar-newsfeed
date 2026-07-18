-- Bihar News Aggregator — Supabase Schema
-- Run this in Supabase SQL Editor (https://app.supabase.com → SQL Editor)

-- 1. Articles table — only grows, never deleted
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,                        -- SHA-256 hash of normalized URL (first 16 chars)
  url TEXT NOT NULL,
  headline TEXT NOT NULL,
  synopsis TEXT,
  source TEXT NOT NULL,                        -- e.g. "The Hindu", "Dainik Jagran"
  language TEXT NOT NULL DEFAULT 'en',         -- 'en' or 'hi'
  category TEXT NOT NULL CHECK (category IN (
    'economy', 'infrastructure', 'industry',
    'agriculture', 'education', 'healthcare', 'environment'
  )),
  published_timestamp BIGINT NOT NULL,         -- IST epoch ms (actual publish date)
  ingested_at BIGINT NOT NULL,                 -- when scraper found it
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_ingested ON articles(ingested_at DESC);

-- 2. Blocked phrases — phrase/keyword blocking, server-side persistent
CREATE TABLE IF NOT EXISTS blocked_phrases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phrase TEXT NOT NULL UNIQUE,
  blocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_phrases ENABLE ROW LEVEL SECURITY;

-- Anyone can read articles
CREATE POLICY "Public read articles" ON articles FOR SELECT USING (true);

-- Anyone can read blocked phrases
CREATE POLICY "Public read blocked" ON blocked_phrases FOR SELECT USING (true);

-- Anyone can add blocked phrases (no auth for this personal app)
CREATE POLICY "Public insert blocked" ON blocked_phrases FOR INSERT WITH CHECK (true);

-- Anyone can delete blocked phrases
CREATE POLICY "Public delete blocked" ON blocked_phrases FOR DELETE USING (true);

-- 4. Database function: get articles with blocked phrases filtered out (server-side)
CREATE OR REPLACE FUNCTION get_filtered_articles(min_timestamp BIGINT)
RETURNS SETOF articles AS $$
  SELECT a.*
  FROM articles a
  WHERE a.published_timestamp >= min_timestamp
    AND NOT EXISTS (
      SELECT 1 FROM blocked_phrases b
      WHERE LOWER(a.headline) LIKE '%' || LOWER(b.phrase) || '%'
    )
  ORDER BY a.published_timestamp DESC;
$$ LANGUAGE sql STABLE;

-- 5. User sentiment ratings (per-user, resets daily at midnight IST)
CREATE TABLE IF NOT EXISTS user_sentiment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  article_id TEXT NOT NULL REFERENCES articles(id),
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  rated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

ALTER TABLE user_sentiment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all sentiment" ON user_sentiment FOR ALL USING (true);

-- 6. User sentiment keyword profile
CREATE TABLE IF NOT EXISTS user_sentiment_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative')),
  weight INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(keyword, sentiment)
);

ALTER TABLE user_sentiment_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all profile" ON user_sentiment_profile FOR ALL USING (true);

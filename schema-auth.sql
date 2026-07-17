-- Migration: Add auth + per-user scoping
-- Run this in Supabase SQL Editor

-- 1. Add user_id to user_sentiment
ALTER TABLE user_sentiment ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add user_id to blocked_phrases
ALTER TABLE blocked_phrases ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Update RLS policies for user_sentiment
DROP POLICY IF EXISTS "Public all sentiment" ON user_sentiment;
CREATE POLICY "Users read own sentiment" ON user_sentiment
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sentiment" ON user_sentiment
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sentiment" ON user_sentiment
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sentiment" ON user_sentiment
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Update RLS policies for blocked_phrases
DROP POLICY IF EXISTS "Public read blocked" ON blocked_phrases;
DROP POLICY IF EXISTS "Public insert blocked" ON blocked_phrases;
DROP POLICY IF EXISTS "Public delete blocked" ON blocked_phrases;
CREATE POLICY "Users read own blocked" ON blocked_phrases
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own blocked" ON blocked_phrases
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own blocked" ON blocked_phrases
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Keep articles public read-only (no change needed)
-- The existing "Public read articles" policy is fine

-- 6. Keep category_corrections shared (beneficial for everyone)
-- The existing policies are fine

-- 7. Update user_sentiment_profile to be per-user
ALTER TABLE user_sentiment_profile ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
DROP POLICY IF EXISTS "Public all profile" ON user_sentiment_profile;
CREATE POLICY "Users read own profile" ON user_sentiment_profile
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON user_sentiment_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON user_sentiment_profile
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own profile" ON user_sentiment_profile
  FOR DELETE USING (auth.uid() = user_id);

-- Migration: Add user_id to user_sentiment for per-user daily tracking
-- Run this in Supabase SQL Editor

-- 1. Add user_id column (nullable first for existing rows)
ALTER TABLE user_sentiment ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Drop the old UNIQUE(article_id) constraint
ALTER TABLE user_sentiment DROP CONSTRAINT IF EXISTS user_sentiment_article_id_key;

-- 3. Add new UNIQUE(user_id, article_id) constraint
ALTER TABLE user_sentiment ADD CONSTRAINT user_sentiment_user_article_unique UNIQUE (user_id, article_id);

-- 4. Add foreign key to auth.users
ALTER TABLE user_sentiment ADD CONSTRAINT user_sentiment_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Clean up any orphaned rows (no user_id)
DELETE FROM user_sentiment WHERE user_id IS NULL;

-- 6. Make user_id NOT NULL after cleanup
ALTER TABLE user_sentiment ALTER COLUMN user_id SET NOT NULL;

-- 7. Update RLS policy to be per-user
DROP POLICY IF EXISTS "Public all sentiment" ON user_sentiment;
CREATE POLICY "Users can manage their own sentiment" ON user_sentiment
  FOR ALL USING (auth.uid() = user_id);

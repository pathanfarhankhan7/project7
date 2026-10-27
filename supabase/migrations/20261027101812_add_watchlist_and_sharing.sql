/*
# Add Watchlist Table and Public Sharing Support

1. New Tables
   - `watchlist`
     - `id` (uuid, primary key)
     - `user_id` (uuid, owner-scoped)
     - `product_url` (text) - the URL to monitor
     - `product_name` (text)
     - `platform` (text)
     - `last_trust_score` (int, nullable)
     - `last_checked` (timestamptz, nullable)
     - `notify_on_change` (boolean, default true)
     - `created_at` (timestamptz)

2. Modified Tables
   - `analyses` - add `share_token` (text, unique, nullable) for public sharing
   - `analyses` - add `is_shared` (boolean, default false)

3. Security
   - RLS enabled on watchlist
   - Owner-scoped CRUD on watchlist
   - Public read access on analyses where is_shared = true (for sharing)
*/

CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_url text NOT NULL,
  product_name text NOT NULL,
  platform text DEFAULT 'Unknown',
  last_trust_score int,
  last_checked timestamptz,
  notify_on_change boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_watchlist" ON watchlist;
CREATE POLICY "select_own_watchlist" ON watchlist FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_watchlist" ON watchlist;
CREATE POLICY "insert_own_watchlist" ON watchlist FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_watchlist" ON watchlist;
CREATE POLICY "update_own_watchlist" ON watchlist FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_watchlist" ON watchlist;
CREATE POLICY "delete_own_watchlist" ON watchlist FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Add sharing columns to analyses
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyses' AND column_name = 'share_token') THEN
    ALTER TABLE analyses ADD COLUMN share_token text UNIQUE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyses' AND column_name = 'is_shared') THEN
    ALTER TABLE analyses ADD COLUMN is_shared boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Allow public read of shared analyses (for public report pages)
DROP POLICY IF EXISTS "select_shared_analyses_public" ON analyses;
CREATE POLICY "select_shared_analyses_public" ON analyses FOR SELECT
  TO anon, authenticated USING (is_shared = true);

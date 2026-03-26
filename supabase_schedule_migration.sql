-- Run this in Supabase SQL Editor > New Query
-- Adds required columns to the "Schedule database" table

ALTER TABLE "Schedule database"
  ADD COLUMN IF NOT EXISTS connection_id   TEXT,
  ADD COLUMN IF NOT EXISTS connection_name TEXT,
  ADD COLUMN IF NOT EXISTS host            TEXT,
  ADD COLUMN IF NOT EXISTS database_name   TEXT,
  ADD COLUMN IF NOT EXISTS db_type         TEXT DEFAULT 'MySQL',
  ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS synced_at       TIMESTAMPTZ DEFAULT now();

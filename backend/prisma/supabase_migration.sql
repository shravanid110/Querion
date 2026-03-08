-- =============================================================
-- Querion AI Database Assistant — Supabase Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================

-- Enable UUID extension (already enabled in Supabase by default)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- 1. USERS
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'admin', 'viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_created  ON users (created_at);

-- =============================================================
-- 2. CHAT SESSIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  session_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user    ON chat_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created ON chat_sessions (created_at);

-- =============================================================
-- 3. CHAT MESSAGES
-- =============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  message_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES chat_sessions (session_id) ON DELETE CASCADE,
  user_message  TEXT NOT NULL,
  ai_response   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- JSON support for structured AI responses
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages (created_at);

-- =============================================================
-- 4. PROMPTS
-- =============================================================
CREATE TABLE IF NOT EXISTS prompts (
  prompt_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompts_user    ON prompts (user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_created ON prompts (created_at);

-- =============================================================
-- 5. GENERATED QUERIES
-- =============================================================
CREATE TABLE IF NOT EXISTS generated_queries (
  query_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id      UUID NOT NULL REFERENCES prompts (prompt_id) ON DELETE CASCADE,
  generated_sql  TEXT NOT NULL,
  execution_time DOUBLE PRECISION,  -- milliseconds; NULL if not yet executed
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gen_queries_prompt  ON generated_queries (prompt_id);
CREATE INDEX IF NOT EXISTS idx_gen_queries_created ON generated_queries (created_at);

-- =============================================================
-- 6. QUERY LOGS
-- =============================================================
CREATE TABLE IF NOT EXISTS query_logs (
  log_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id      UUID NOT NULL REFERENCES generated_queries (query_id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('success', 'error', 'timeout', 'pending')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_logs_query   ON query_logs (query_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_status  ON query_logs (status);
CREATE INDEX IF NOT EXISTS idx_query_logs_created ON query_logs (created_at);

-- =============================================================
-- 7. CHARTS
-- =============================================================
CREATE TABLE IF NOT EXISTS charts (
  chart_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id   UUID NOT NULL REFERENCES generated_queries (query_id) ON DELETE CASCADE,
  chart_type TEXT NOT NULL,  -- 'bar' | 'line' | 'pie' | 'scatter' | 'table' | ...
  chart_data JSONB NOT NULL DEFAULT '{}'::jsonb  -- Full chart config as JSON
);

CREATE INDEX IF NOT EXISTS idx_charts_query      ON charts (query_id);
CREATE INDEX IF NOT EXISTS idx_charts_chart_type ON charts (chart_type);

-- =============================================================
-- 8. ANALYTICS
-- =============================================================
CREATE TABLE IF NOT EXISTS analytics (
  analytics_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name   TEXT NOT NULL,
  metric_value  DOUBLE PRECISION NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_metric  ON analytics (metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics (created_at);

-- =============================================================
-- 9. CONNECTIONS (existing table — kept for backward compat)
-- =============================================================
CREATE TABLE IF NOT EXISTS connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT,
  host        TEXT NOT NULL,
  port        INTEGER NOT NULL DEFAULT 3306,
  database    TEXT NOT NULL,
  username    TEXT NOT NULL,
  password    TEXT NOT NULL,  -- Encrypted at application layer
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 10. ROW LEVEL SECURITY (RLS) — Security best practice
-- =============================================================
-- Enable RLS on all tables so that direct API access is safe
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_queries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE charts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections        ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- VERIFY — List all created tables
-- =============================================================
SELECT table_name, table_type
FROM   information_schema.tables
WHERE  table_schema = 'public'
ORDER  BY table_name;

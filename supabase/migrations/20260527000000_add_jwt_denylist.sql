-- Migration: Add JWT denylist for session revocation
-- Phase: splithold-jwt-revocation (CRITICAL H1)
-- Rows in this table are revoked tokens. verifyToken rejects any token whose jti is found here.

CREATE TABLE IF NOT EXISTS jwt_denylist (
  jti          TEXT        PRIMARY KEY,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jwt_denylist_expires ON jwt_denylist (expires_at);

-- Enable RLS — only service role can read/write (app uses supabaseAdmin)
ALTER TABLE jwt_denylist ENABLE ROW LEVEL SECURITY;

-- Cleanup policy: run periodically to remove expired entries
-- Suggested: Supabase scheduled function or pg_cron job:
-- DELETE FROM jwt_denylist WHERE expires_at < NOW();

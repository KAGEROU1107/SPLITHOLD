-- Migration: Enable Row-Level Security on all application tables
-- Phase: splithold-rls-policies (HIGH H3+H4)
--
-- NOTE: This project uses a custom JWT (not Supabase Auth), so auth.uid() is always NULL
-- for non-service-role connections. Enabling RLS with no permissive policies for
-- anon/authenticated roles ensures: direct DB access via anon key is blocked for all tables.
-- The application layer (supabaseAdmin / service role) bypasses RLS and handles authorization.
--
-- Full row-level isolation per-user would require migrating to Supabase Auth or
-- setting custom JWT claims via Supabase's custom auth hooks.

-- ── bills ──────────────────────────────────────────────────────────────────────
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- ── bill_participants ──────────────────────────────────────────────────────────
ALTER TABLE bill_participants ENABLE ROW LEVEL SECURITY;

-- ── users ─────────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ── password_reset_requests ───────────────────────────────────────────────────
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- ── activity_logs ─────────────────────────────────────────────────────────────
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- No permissive policies for anon or authenticated roles are added here.
-- All application access goes through the service role key (supabaseAdmin),
-- which bypasses RLS. Direct anon key access to all tables is blocked.

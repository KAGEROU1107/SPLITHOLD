-- Rate limiting via Supabase RPC
-- Called by src/lib/rateLimit.ts with: bucket_key, window_seconds, max_requests
-- Returns: { allowed, count, max_requests, reset_at }

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key   text        NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer    NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_key, window_start)
);

-- No user-level access — admin-only via service role key
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_rate_limit(
  bucket_key    text,
  window_seconds integer,
  max_requests  integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start timestamptz;
  v_reset_at     timestamptz;
  v_count        integer;
  v_allowed      boolean;
BEGIN
  -- Truncate now to the current window boundary
  v_window_start := date_trunc('second', now()) - (
    EXTRACT(EPOCH FROM (now() - date_trunc('second', now())))::integer % window_seconds
  ) * interval '1 second';
  v_reset_at := v_window_start + (window_seconds * interval '1 second');

  -- Upsert: increment count within the current window
  INSERT INTO rate_limit_buckets (bucket_key, window_start, request_count)
  VALUES (bucket_key, v_window_start, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET request_count = rate_limit_buckets.request_count + 1
  RETURNING request_count INTO v_count;

  v_allowed := v_count <= max_requests;

  -- Clean up old windows (keep last 2 windows to avoid bloat)
  DELETE FROM rate_limit_buckets rl
  WHERE rl.bucket_key = check_rate_limit.bucket_key
    AND rl.window_start < v_window_start - (window_seconds * interval '1 second');

  RETURN json_build_object(
    'allowed',      v_allowed,
    'count',        v_count,
    'max_requests', max_requests,
    'reset_at',     v_reset_at
  );
END;
$$;

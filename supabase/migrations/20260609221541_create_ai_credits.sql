
CREATE TABLE IF NOT EXISTS ai_credits (
  token       TEXT PRIMARY KEY,
  balance     INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_credits ENABLE ROW LEVEL SECURITY;

-- Only the service role (edge function) may read or mutate credits.
-- No client-facing policies — all access is via the Edge Function with service key.

CREATE OR REPLACE FUNCTION decrement_ai_credit(p_token TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE ai_credits
     SET balance    = balance - 1,
         updated_at = now()
   WHERE token = p_token
     AND balance > 0
  RETURNING balance INTO new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  RETURN new_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrement_ai_credit(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_ai_credit(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.decrement_ai_credit(text) TO authenticated;

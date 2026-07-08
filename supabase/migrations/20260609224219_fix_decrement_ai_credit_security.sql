
-- Fix 1: Immutable search_path (prevents search_path injection attacks)
-- Fix 2: Revoke PUBLIC/anon/authenticated execute; only service_role may call this

CREATE OR REPLACE FUNCTION public.decrement_ai_credit(p_token TEXT)
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
REVOKE EXECUTE ON FUNCTION public.decrement_ai_credit(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.decrement_ai_credit(text) TO service_role;

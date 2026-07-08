-- Revoke client access; only service_role (edge functions) may call this function.
REVOKE EXECUTE ON FUNCTION public.decrement_ai_credit(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.decrement_ai_credit(text) TO service_role;

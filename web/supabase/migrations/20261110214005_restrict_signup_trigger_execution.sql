-- Used only by the auth.users INSERT trigger. The function owner and service
-- role retain execution; public API roles must not call this SECURITY DEFINER.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

# Registration trigger permissions

Applied migration: `20261110214005_restrict_signup_trigger_execution`.

`public.handle_new_user()` is a SECURITY DEFINER trigger function used by
`on_auth_user_created` on `auth.users`. Its empty search path and qualified table
references are retained. EXECUTE is revoked from PUBLIC, anon and authenticated;
the function owner and service_role retain their existing privileges. Profile
SELECT/UPDATE row-level policies and session settings are unchanged.

Verification after applying the migration:

- Neither anon nor authenticated has EXECUTE privilege.
- The registration trigger remains enabled.
- Inserting a synthetic auth user inside a rolled-back transaction creates the
  expected profile. The assertion passed and no synthetic user remains. This
  tests the database trigger, not a real emailed sign-up.
- Both SECURITY DEFINER execution warnings disappeared from Security Advisors.

The organization is on Free. Leaked-password protection remains disabled because
[Supabase requires Pro or above](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
No subscription change was made. This server-only change does not require an
Android rebuild; APK 1.0.44 remains the current packaged application.

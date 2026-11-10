# Compact screens, session restoration and startup

The questionnaire presents one of its nine existing questions at a time.
Answers stay selected when navigating back, and changing an answer does not
advance the page. Header and navigation remain visible; the content region may
scroll on landscape displays, enlarged text, or when optional content is open.
At 320 × 568, all nine default question pages fit without scrolling. Context,
consent details and optional training-profile fields remain available.

The campaign displays one chapter at a time with five chapter buttons and a
compact row of levels. Continue selects the chapter containing the next pending
level. On a 390 × 844 phone, the default home, drill and assistant screens fit
without scrolling. Saved words and longer explanations are expandable.

Startup HTML contains the purple soundwave before any JavaScript loads. The
wave respects reduced-motion preferences, and a retry action appears if loading
takes unusually long. The screen disappears when engines are ready, allowing up
to 1.5 seconds for a fast session restore. A script-loading error replaces it
with an explicit retry action. Android's native starting theme uses the same
logo and background.

Supabase retains the existing persistent local-storage key and automatic token
refresh. The auth subscription is installed before initial/deep-link handling.
Identity appears before profile fetch completion; a failed profile request does
not sign the user out. Concurrent profile fetches are deduplicated and stale
responses are ignored. Refresh events do not repeatedly reload the profile.
Android pause/resume and connectivity recovery resume automatic session work.
An explicit sign-out affects the current device, and queued writes are scoped
to the user who scheduled them.

Validation uses the actual Supabase SDK against mocked Auth/profile endpoints:
registration and password login persist across reloads/reopening, expired tokens
refresh, temporary offline failures preserve saved sessions, deep-link sessions
keep their auth subscription, and explicit sign-out still clears the session.
The production public Auth settings endpoint also returned HTTP 200 with email
and Google sign-in enabled, sign-up enabled, and email auto-confirm enabled.
The dashboard required an administrator login, so private server-side maximum
session lifetime, inactivity and single-session policies were not inspected or
changed. Revoked sessions still require signing in again.

References: [Supabase sessions](https://supabase.com/docs/guides/auth/sessions),
[auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange),
[automatic refresh](https://supabase.com/docs/reference/javascript/auth-startautorefresh).

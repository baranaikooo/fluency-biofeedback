# Glide integration audit

## Implementation

The original web application's markup and engines are mounted in the same document as React.
There is no iframe and no second application hidden behind the navigation. Keeping the engine's
DOM IDs preserves all original event bindings. `src/glide/theme.css` applies the light
DM Sans / Newsreader design on top of the original structural stylesheet.

The React bootstrap loads local classic scripts in dependency order exactly once.
The supplied project's existing cloud client is retained, rather than replacing it with mock authentication.

| Original area | Integrated implementation                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Cesta         | All 5 worlds, 25 lessons, locked levels, bosses, next lesson, progress                                               |
| Lessons       | Word queues, retry rotation, feedback drawer, metric matrix, graph, rewards, celebration                             |
| Dril          | Custom phrases, presets, breathing pacer, time-pressure and incoming-call modes                                      |
| Vault         | Add, delete, categories, filters, random challenge, per-attempt mastery, local persistence                           |
| DSP           | Microphone, room-noise calibration, phonetic parsing, RMS/features, VRT evaluation                                   |
| Assistant     | Real microphone input, DAF delay, dual-delay FAF pitch shifting, live level indicator                                |
| Exposure      | Camera, dialogue scenarios, Slovak MP3s, browser speech fallback, timed exercise                                     |
| Telemetry     | Actual attempt history, XP, streak, rank, completed levels, averages, profile name                                   |
| Questionnaire | Adult/consent checks, 9 items, contexts, note, summary, repeat/reset; optional original five-domain training profile |
| Research      | All original reference content and working accordion modal                                                           |
| Profile       | Original email/Google/magic-link authentication and optional cloud sync integration                                  |
| Data          | Original storage keys, reset controls, JSON export                                                                   |
| PWA           | Manifest, installation prompt, production-only service worker and local audio cache                                  |

## Corrected defects

- Removed syntax-breaking duplicate fragments in DSP and an extra closing brace in DAF.
- Replaced two independent monitor outputs with one shared, limited DAF/FAF graph.
- Changing volume while stopped no longer turns on another monitor.
- Added headphone confirmation and a lower initial monitoring volume.
- The zero-semitone setting no longer falls back to +2 or introduce unintended modulation.
- FAF modulation loops use a whole cycle and a longer grain to reduce strong fixed-8-Hz sidebands.
- Audio startup is serialized; microphone is never requested by an arbitrary first click.
- Microphone/camera streams, output nodes and pending DSP callbacks are cleaned up on navigation,
  hiding the app and exiting a lesson. Cancelled permission requests cannot leave a late stream active.
- Failed calibration stops the trial instead of continuing without a working analyser.
- Restored missing `.active` display rules for lesson, level and science modals.
- Removed fabricated VRT/latency/success defaults and sample successes in the vault.
- Vault mastery counts individual attempts, not whole three-attempt lessons.
- Accuracy is no longer artificially clamped to 50%.
- User-entered vault/history text is HTML-escaped before rendering.
- Questionnaire repeat clears previous answers, consent and contexts; notes are included in local export.
- The optional five-domain profile reconnects the original recommendation logic, vault suggestions,
  initial DAF defaults and recommended-world unlocking. Skipped worlds are no longer marked completed.
- Profile labels distinguish self-report from diagnosis; applying a stored profile no longer repeatedly
  overwrites manually adjusted delay.
- Removed logging of OAuth callback URLs, tokens and user profiles.

## Verification

Run against the host-supervised app:

```sh
pnpm exec playwright test tests/glide.spec.mjs --reporter=line --workers=1
pnpm exec tsc --noEmit
pnpm build
```

The test URL defaults to `http://localhost:3000`; set `GLIDE_TEST_URL` when necessary.
Tests use Chromium's fake media devices and OfflineAudioContext, not a physical microphone.
They cover navigation, 25 lesson nodes, vault persistence and HTML safety, actual audio parameters,
mute, DAF impulse timing, FAF frequency shifts (-4/0/+2/+4), denied microphone access,
questionnaire completion/reset and personalization, lesson rewards/history/mastery, camera cleanup and mobile overflow.

## External / hardware limitations

- Real perceived audio quality, Bluetooth latency and acoustic feedback must be checked on headphones
  and the target device. Browser DSP tests do not validate clinical efficacy or diagnose stuttering.
- Original cloud authentication/sync requires its existing remote project, schema, policies and allowed
  OAuth redirect URLs. No live account was created and no remote user records were modified in verification.
- Android Java/Gradle files from the archive belong to a separate Capacitor native build. The browser
  preview cannot execute Java, build an APK or verify native deep-link permission handling.
- Offline install behaviour depends on the final HTTPS production origin and service-worker permissions;
  the development preview deliberately does not register a service worker.

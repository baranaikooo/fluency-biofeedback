# Feedback fixes — 2026-11-10

- The headphone monitor starts at 70% and has a 4× preamp before the existing
  output limiter. The microphone signal used for calibration and evaluation is
  unchanged. Muting still disconnects the output.
- A fast vocal onset below the capture interval is coaching feedback rather
  than an automatic failed attempt. Unvoiced consonants no longer count as
  interrupted phonation; repetition detection requires a sustained quiet gap.
- Capture length grows with the target text (up to 30 seconds). The pacer can
  still be clicked to finish early.
- Selecting a questionnaire answer preserves the scroll position. Moving to a
  different questionnaire step resets it to the top.

Validation: TypeScript, production build, Capacitor Android synchronization,
and 17 Playwright tests passed. Regression coverage includes three acoustic
attempts of “Dve veľké kávy” completing the drill, silence/clipping rejection,
offline headphone signal gain, FAF pitch shift and mobile questionnaire scroll.
Physical phone/headphone loudness has not been measured; the volume slider is
available for adjustment. Evaluation measures acoustic onset, not word identity.

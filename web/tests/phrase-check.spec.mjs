import { test, expect } from "@playwright/test";
test.use({ baseURL: "http://localhost:3000" });

test("fixed phrase requires every word and an unavailable transcript requires confirmation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("fl_guest_mode", "1");
    localStorage.setItem("fl_onboarding_completed", "1");
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
  await page.locator("#sidebarTabDril").click();
  await page.locator("#wordInput").fill("Dve veľké kávy");
  await page.locator("#launchSosDrillBtn").click();
  async function evaluate(transcript) {
    return page.evaluate((text) => {
      noiseDb = -70;
      const frames = Array.from({ length: 130 }, (_, i) => {
        const voiced = i >= 20 && i < 100;
        const rms = voiced ? 0.08 : 0.0001;
        return {
          t: i * 10,
          rawDb: 20 * Math.log10(rms),
          rawRms: rms,
          fDb: 20 * Math.log10(rms),
          fRms: rms,
          dPrime: voiced ? 0.1 : 0.9,
          zcr: voiced ? 0.1 : 0.8,
          clipped: false,
        };
      });
      let result;
      window.addEventListener("dsp-evaluation-complete", (e) => (result = e.detail), {
        once: true,
      });
      runPostHocEvaluation(frames, analyzePhonetics("Dve veľké kávy"), 1600, 5500, text);
      return {
        passed: result.passed,
        reason: result.reason,
        progress: duoLesson.completedItemsCount,
      };
    }, transcript);
  }
  expect(await evaluate("dve")).toEqual({ passed: false, reason: "phrase_mismatch", progress: 0 });
  await expect(page.locator("#practiceCorrect")).toBeHidden();
  await page.locator("#drawerContinueBtn").click();
  expect(await evaluate("dve kávy")).toEqual({
    passed: false,
    reason: "phrase_mismatch",
    progress: 0,
  });
  await page.locator("#drawerContinueBtn").click();
  expect(await evaluate("")).toEqual({ passed: false, reason: "phrase_unverified", progress: 0 });
  await expect(page.locator("#practiceCorrect")).toHaveText("Povedal/a som celý text");
  await page.locator("#practiceCorrect").click();
  await page.locator("#drawerContinueBtn").click();
  expect(await evaluate("dve, ehm, dve ve veľké kávy")).toMatchObject({
    passed: true,
    progress: 2,
  });
  await page.locator("#drawerContinueBtn").click();
  expect(await evaluate("2 velke kavy")).toMatchObject({ passed: true, progress: 3 });
});

test("phrase capture sends PCM from the current attempt to the device bridge", async ({page}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
  const captured = await page.evaluate(async () => {
    let bytes;
    window.Capacitor = {
      isPluginAvailable: name => name === "GlideSpeech",
      Plugins: {GlideSpeech: {
        async transcribe({pcm}) {
          bytes = Uint8Array.from(atob(pcm), char => char.charCodeAt(0));
          return {text: "dve veľké kávy"};
        },
      }},
    };
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    try {
      await context.resume();
      if (!(await window.GlidePhrase.prepare(context))) throw Error("Worklet unavailable");
      const recording = window.GlidePhrase.capture(context, oscillator);
      oscillator.start();
      await new Promise(resolve => setTimeout(resolve, 250));
      const text = await recording.finish();
      return {text, count:bytes.length, hasSignal:bytes.some(byte => byte !== 0)};
    } finally {
      oscillator.disconnect();
      await context.close();
    }
  });
  expect(captured).toMatchObject({text:"dve veľké kávy", hasSignal:true});
  expect(captured.count).toBeGreaterThan(3200);
});

import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.GLIDE_TEST_URL || "http://localhost:3000",
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  },
});

async function openApp(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("fl_guest_mode", "1");
    localStorage.setItem("fl_custom_name", "Nina");
    localStorage.setItem("fl_onboarding_completed", "1");
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
}

async function completeQuestionnaire(page) {
  await page.locator("#qAdultCheck").check();
  await page.locator("#qConsentCheck").check();
  await page.locator("#qNextBtn").click();
  for (let question = 0; question < 9; question++) {
    await page.locator('.question-item:not([hidden]) input[type="radio"]').nth(2).check();
    await page.locator("#qNextBtn").click();
  }
  await page.locator("#qNextBtn").click();
  await page.locator("#qFinishEnterBtn").click();
}

test("mobile questionnaire keeps one question and its actions visible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
  await page.locator("#welcomeGuestBtn").click();
  await page.locator("#qAdultCheck").check();
  await page.locator("#qConsentCheck").check();
  await page.locator("#qNextBtn").click();
  const answer = page.locator('.question-item:not([hidden]) input').nth(2);
  await expect(page.locator('.question-item:visible')).toHaveCount(1);
  await answer.check();
  await expect(answer).toBeChecked();
  await expect(page.locator('#qNextBtn')).toBeInViewport();
  await page.locator('#qNextBtn').click();
  await expect(page.locator('#qCountText')).toHaveText('2 / 9');
  await page.locator('#qBackBtn').click();
  await expect(page.locator('.question-item:not([hidden]) input').nth(2)).toBeChecked();
});

test("natural consonant transitions pass all three phrase attempts; silence and clipping fail", async ({ page }) => {
  await openApp(page);
  await page.locator("#sidebarTabDril").click();
  await page.locator("#wordInput").fill("Dve veľké kávy");
  await page.locator("#launchSosDrillBtn").click();
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await page.evaluate(() => {
      noiseDb = -70;
      const frames = Array.from({ length: 550 }, (_, i) => {
        const voiced = i >= 20 && i < 200 && !(i >= 26 && i <= 32) && i % 40 < 35;
        const rms = i < 20 || i >= 200 ? 0.0001 : voiced ? 0.08 : 0.03;
        return { t: i * 10, rawDb: 20 * Math.log10(rms), rawRms: rms,
          fDb: 20 * Math.log10(rms), fRms: rms, dPrime: voiced && i >= 23 ? 0.1 : 0.8,
          zcr: voiced ? 0.1 : 0.4, clipped: false };
      });
      let result;
      window.addEventListener('dsp-evaluation-complete', e => { result = e.detail; }, { once: true });
      runPostHocEvaluation(frames, analyzePhonetics('Dve veľké kávy'), 1600, 5500, 'dve veľké kávy');
      return { passed: result.passed, vrt: result.vrt, p5: result.p5 };
    });
    expect(result.passed).toBe(true);
    expect(result.vrt).toBe(4); // formerly rejected solely because of the sampling floor
    expect(result.p5).toBe(true);
    await page.locator("#drawerContinueBtn").click();
  }
  await expect(page.locator("#celebrationModal")).toHaveClass(/active/);
  const failures = await page.evaluate(() => ['silence', 'clipping'].map(kind => {
    const frames = Array.from({ length: 100 }, (_, i) => ({ t: i * 10,
      rawDb: -80, rawRms: 0.0001, fDb: -80, fRms: 0.0001,
      dPrime: 1, zcr: 0, clipped: kind === 'clipping' }));
    let result;
    window.addEventListener('dsp-evaluation-complete', e => { result = e.detail; }, { once: true });
    runPostHocEvaluation(frames, analyzePhonetics('Dve veľké kávy'), 1600, 1000);
    return { passed: result.passed, reason: result.reason };
  }));
  expect(failures).toEqual([{ passed: false, reason: 'silent_block' }, { passed: false, reason: 'clipping' }]);
  expect(await page.evaluate(() => getCaptureDurationMs(analyzePhonetics('Prosím si dve veľké kávy a jeden čaj so sebou')))).toBeGreaterThan(7000);
});

test("quiet microphone is amplified in headphones with an output limiter", async ({ page }) => {
  await openApp(page);
  const levels = await page.evaluate(async () => {
    const originalSetup = window.setupAudio;
    const results = [];
    try {
      for (const pitch of [0, 2]) {
        const ctx = new OfflineAudioContext(1, 48000, 48000);
        // Offline contexts begin suspended and only start during startRendering().
        ctx.resume = async () => {};
        const source = ctx.createOscillator();
        source.frequency.value = 200;
        const quiet = ctx.createGain();
        quiet.gain.value = 0.02;
        source.connect(quiet);
        window.audioCtx = ctx;
        window.mediaStreamSource = quiet;
        window.setupAudio = async () => ctx;
        const engine = new window.dafAssistant.constructor();
        engine.pitchSemitones = pitch;
        await engine.ensureAudioPipeline();
        engine.masterGain.gain.value = engine.volumePercent / 100;
        engine.limiter.connect(ctx.destination);
        source.start();
        const samples = (await ctx.startRendering()).getChannelData(0).slice(24000);
        results.push(Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length));
      }
    } finally {
      window.setupAudio = originalSetup;
      window.audioCtx = window.mediaStreamSource = null;
    }
    return results;
  });
  for (const rms of levels) {
    expect(rms).toBeGreaterThan(0.018);
    expect(rms).toBeLessThan(0.1);
  }
});

test("first launch shows the welcome screen, then questionnaire, and only then asks for the name", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
  // The welcome screen is first; the name is not asked at entry.
  await expect(page.locator("#welcomeAuthOverlay")).toBeVisible();
  await expect(page.locator("#firstNameDialog")).toHaveCount(0);
  await page.locator("#welcomeGuestBtn").click();
  await expect(page.locator("#figmaQuestionnaireModal")).toBeVisible();
  await expect(page.locator("#firstNameDialog")).toHaveCount(0);
  await completeQuestionnaire(page);
  await expect(page.locator("#figmaQuestionnaireModal")).toBeHidden();
  await expect(page.locator("#firstNameDialog")).toBeVisible();
  await page.locator("#personalName").fill("Nina");
  await page.getByRole("button", { name: "Pokračovať", exact: true }).click();
  await expect(page.locator("#firstNameDialog")).toHaveCount(0);
  await expect(page.locator("#dailyGreetingHeading")).toHaveText(
    /^(Dobré ráno|Dobrý deň|Dobrý večer), Nina\.$/,
  );
  expect(await page.evaluate(() => localStorage.getItem("fl_custom_name"))).toBe("Nina");
  // Reload: nothing blocks the app any more.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
  await expect(page.locator("#welcomeAuthOverlay")).toBeHidden();
  await expect(page.locator("#figmaQuestionnaireModal")).toBeHidden();
  await expect(page.locator("#firstNameDialog")).toHaveCount(0);
  await expect(page.locator("#tabCesta #personalName")).toHaveCount(0);
});

test("the welcome screen and name prompt never block the app", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
  await expect(page.locator("#welcomeAuthOverlay")).toBeVisible();
  await page.locator("#closeAuthBtn").click();
  await page.locator("#sidebarTabDril").click();
  await expect(page.locator("#tabDril")).toHaveClass(/active/);
  await page.locator("#wordInput").fill("Objednávka");
  await page.locator("#sidebarTabTelemetria").click();
  await page.locator("details:has(#reopenDiagnosticBtn) > summary").click();
  await page.locator("#reopenDiagnosticBtn").click();
  await expect(page.locator("#figmaQuestionnaireModal")).toBeVisible();
  await completeQuestionnaire(page);
  await expect(page.locator("#firstNameDialog")).toBeVisible();
  await page.locator("#firstNameSkipBtn").click();
  await expect(page.locator("#firstNameDialog")).toHaveCount(0);
  await page.locator("#sidebarTabAsistent").click();
  await expect(page.locator("#tabAsistent")).toHaveClass(/active/);
  await expect(page.locator("#cardioBtn")).toHaveCount(0);
});

test("React remount keeps the engine-owned DOM and controls alive", async ({ page }) => {
  await openApp(page);
  await page.evaluate(async () => {
    const reactModule = await import("/node_modules/.vite/deps/react.js");
    const React = reactModule.default || reactModule;
    const clientModule = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { createRoot } = clientModule.default || clientModule;
    const { default: App } = await import("/src/App.tsx");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(React.createElement(App));
    await new Promise((resolve) => setTimeout(resolve, 100));
    root.unmount();
    container.remove();
  });
  await expect(page.locator("#glide-runtime")).toHaveCount(1);
  await expect(page.locator('script[src="/engine/dsp-core.js"]')).toHaveCount(1);
  await page.locator("#sidebarTabDril").click();
  await expect(page.locator("#tabDril")).toHaveClass(/active/);
  await page.locator("#sidebarTabAsistent").click();
  await expect(page.locator("#tabAsistent")).toHaveClass(/active/);
});

test("all original worlds, navigation, vault and persistence work without iframe", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openApp(page);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator(".world-section")).toHaveCount(5);
  await expect(page.locator(".path-node-btn")).toHaveCount(25);
  await page.locator("#continuePathBtn").click();
  await expect(page.locator("#nodePopoverBackdrop")).toHaveClass(/active/);
  await page.locator("#popoverCloseBtn").click();
  await page.locator("#sidebarTabDril").click();
  await expect(page.locator("#tabDril")).toHaveClass(/active/);
  const word = '<img src=x onerror="window.injected=true">Test';
  await page.getByText('Tvoje uložené slová', { exact: true }).click();
  await page.locator("#vaultWordInput").fill(word);
  await page.locator("#vaultAddBtn").click();
  await expect(page.locator(".vault-item-word").filter({ hasText: word })).toBeVisible();
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
  await page.locator("#sidebarTabDril").click();
  await page.getByText('Tvoje uložené slová', { exact: true }).click();
  await expect(page.locator(".vault-item-word").filter({ hasText: word })).toBeVisible();
  await page.locator("#sidebarTabTelemetria").click();
  await expect(page.locator("#tabTelemetria")).toHaveClass(/active/);
  await page.locator("#sidebarScienceBtn").click();
  await expect(page.locator("#scienceModalBackdrop")).toHaveClass(/active/);
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});

test("DAF sliders control actual nodes, mute stays muted, navigation releases microphone", async ({
  page,
}) => {
  await openApp(page);
  page.on("dialog", (dialog) => dialog.accept());
  expect(await page.evaluate(() => !!window.micStream)).toBe(false);
  await page.locator("#sidebarTabAsistent").click();
  await page.locator("#assistantToggle").click();
  await expect.poll(() => page.evaluate(() => window.dafAssistant.isActive)).toBe(true);
  const result = await page.evaluate(async () => {
    const engine = window.dafAssistant;
    engine.setDelay(110);
    engine.setVolume(28);
    engine.setPitch(0);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const result = {
      delay: engine.delayNodeA.delayTime.value,
      volume: engine.masterGain.gain.value,
      pitch: engine.pitchSemitones,
      stream: window.micStream.active,
    };
    engine.stop();
    engine.setVolume(90);
    await new Promise((resolve) => setTimeout(resolve, 80));
    result.muted = engine.masterGain.gain.value;
    return result;
  });
  expect(result.delay).toBeCloseTo(0.11, 4);
  expect(result.volume).toBeCloseTo(0.28, 4);
  expect(result.pitch).toBe(0);
  expect(result.stream).toBe(true);
  expect(result.muted).toBe(0);
  await page.locator("#sidebarTabCesta").click();
  expect(await page.evaluate(() => window.micStream)).toBeNull();
});

test("offline signal verifies actual FAF frequency shift in both directions and zero bypass", async ({
  page,
}) => {
  await openApp(page);
  const frequencies = await page.evaluate(async () => {
    const results = [];
    for (const semitones of [-4, 0, 2, 4]) {
      const ctx = new OfflineAudioContext(1, 96000, 48000);
      const engine = new window.dafAssistant.constructor();
      engine.audioCtx = ctx;
      engine.pitchSemitones = semitones;
      const source = ctx.createOscillator();
      source.frequency.value = 200;
      const output = engine.buildDopplerPitchShifter(source);
      // Zero pitch uses the direct branch in the live graph; inspect its unmodulated buffer here.
      if (semitones === 0) output.gain.value = 1;
      output.connect(ctx.destination);
      source.start();
      const buffer = (await ctx.startRendering()).getChannelData(0);
      let peak = 0,
        best = 0;
      // A one-second DFT window avoids startup transients.
      for (let frequency = 140; frequency <= 280; frequency++) {
        let real = 0,
          imag = 0;
        for (let i = 24000; i < 72000; i++) {
          const angle = (2 * Math.PI * frequency * i) / 48000;
          real += buffer[i] * Math.cos(angle);
          imag += buffer[i] * Math.sin(angle);
        }
        const power = real * real + imag * imag;
        if (power > peak) {
          peak = power;
          best = frequency;
        }
      }
      results.push({ semitones, frequency: best, power: peak });
    }
    return results;
  });
  for (const result of frequencies) {
    expect(result.power).toBeGreaterThan(1);
    expect(Math.abs(result.frequency - 200 * 2 ** (result.semitones / 12))).toBeLessThan(5);
  }
});

test("questionnaire consent, all sections and completion are reachable", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => window.openFigmaQuestionnaire(true));
  await expect(page.locator("#qNextBtn")).toBeDisabled();
  await page.locator("#qAdultCheck").check();
  await page.locator("#qConsentCheck").check();
  await page.locator("#qNextBtn").click();
  for (let question = 0; question < 9; question++) {
    await page.locator('.question-item:not([hidden]) input[type="radio"]').nth(2).check();
    await page.locator("#qNextBtn").click();
  }
  await page.locator(".motor-profile summary").click();
  for (const key of ["laryngeal", "plosives", "prolongation", "clonic", "social"]) {
    await page.locator(`[data-profile-score="${key}"]`).selectOption(key === "clonic" ? "5" : "1", {force:true});
  }
  await page.getByText("Doplniť poznámku (nepovinné)", { exact: true }).click();
  await page.locator("#qNoteInput").fill("Moja poznámka k tréningu.");
  await page.locator("#qNextBtn").click();
  await expect(page.locator("#qStep5")).toBeVisible();
  await page.locator("#qFinishEnterBtn").click();
  await expect(page.locator("#figmaQuestionnaireModal")).toBeHidden();
  const profile = await page.evaluate(() => ({
    diagnostic: JSON.parse(localStorage.getItem("fl_diagnostic")),
    note: JSON.parse(localStorage.getItem("fl_figma_answers")).note,
    state: JSON.parse(localStorage.getItem("fluency_duo_save_v3")),
    delay: window.dafAssistant.delayMs,
  }));
  expect(profile.diagnostic.recWorldId).toBe(4);
  expect(profile.delay).toBe(115);
  expect(profile.note).toBe("Moja poznámka k tréningu.");
  expect(profile.state.unlockedLevels).toContain("4.1");
  expect(Object.keys(profile.state.completedLevels)).toHaveLength(0);
  expect(await page.locator("#worldChaptersNav button").evaluateAll(
    (buttons) => buttons.map((button) => button.dataset.world),
  )).toEqual(["4", "5", "1", "2", "3"]);
  await page.reload();
  await expect(page.locator("#world-section-4")).toBeVisible();
  await page.locator("#continuePathBtn").click();
  expect(await page.evaluate(() => duoLesson.currentLevel.id)).toBe("4.1");
  expect(await page.evaluate(() => duoState.findNextLevelId("5.5"))).toBe("1.1");
  await page.locator("#popoverCloseBtn").click();
  await page.evaluate(() => window.openFigmaQuestionnaire(true));
  await expect(page.locator("#qNextBtn")).toBeDisabled();
  await expect(page.locator("#figmaQuestionnaireModal input:checked")).toHaveCount(0);
});

test("DAF impulse arrives at requested delay", async ({ page }) => {
  await openApp(page);
  const delay = await page.evaluate(async () => {
    const ctx = new OfflineAudioContext(1, 24000, 48000);
    const engine = new window.dafAssistant.constructor();
    engine.audioCtx = ctx;
    engine.delayNodeA = ctx.createDelay(1);
    engine.setDelay(100);
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 480, 48000);
    source.buffer.getChannelData(0)[0] = 1;
    source.connect(engine.delayNodeA);
    engine.delayNodeA.connect(ctx.destination);
    source.start();
    const samples = (await ctx.startRendering()).getChannelData(0);
    return samples.findIndex((sample) => Math.abs(sample) > 0.5) / 48000;
  });
  expect(delay).toBeCloseTo(0.1, 3);
});

test("microphone denial never marks assistant active", async ({ page }) => {
  await openApp(page);
  page.on("dialog", (dialog) => dialog.accept());
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Permission denied", "NotAllowedError");
    };
  });
  await page.locator("#sidebarTabAsistent").click();
  await page.locator("#assistantToggle").click();
  await expect.poll(() => page.evaluate(() => window.dafAssistant.starting)).toBe(false);
  expect(await page.evaluate(() => window.dafAssistant.isActive)).toBe(false);
  await expect(page.locator("#assistantToggle")).not.toHaveClass(/active/);
});

test("lesson feedback records attempts, three successes master a vault word and silence calibration persists", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await openApp(page);
  await page.locator("#sidebarTabDril").click();
  await page.locator("#wordInput").fill("Peter Novák");
  await page.locator("#launchSosDrillBtn").click();
  await expect(page.locator("#lessonScreen")).toBeVisible();
  for (const id of ["camToggle", "cameraFeed", "headphoneLiveIndicator", "calibrateBtn"]) {
    await expect(page.locator("#" + id)).toHaveCount(0);
  }
  // The silence calibration belongs to the app session, not to each lesson.
  await page.evaluate(() => {
    isCalibrated = true;
    window.releaseGlideAudio();
  });
  expect(await page.evaluate(() => isCalibrated)).toBe(true);
  // Feed deterministic analysis events to verify the lesson state machine separately from acoustic tests.
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent("dsp-evaluation-complete", {
          detail: { passed: true, isPerfect: true, vrt: 80, latency: 400 },
        }),
      ),
    );
    await expect(page.locator("#feedbackDrawer")).toHaveClass(/active/);
    await page.locator("#drawerContinueBtn").click();
  }
  await expect(page.locator("#celebrationModal")).toHaveClass(/active/);
  const data = await page.evaluate(() => ({
    history: JSON.parse(localStorage.getItem("fluency_telemetry_history_v1")),
    vault: JSON.parse(localStorage.getItem("fluency_feared_words_v1")),
  }));
  expect(data.history).toHaveLength(3);
  expect(data.vault.find((item) => item.word === "Peter Novák").isMastered).toBe(true);
  await page.locator("#celebrationBackBtn").click();
  await expect(page.locator("#lessonScreen")).toBeHidden();
  expect(await page.evaluate(() => isCalibrated)).toBe(true);
  expect(errors).toEqual([]);
});

async function expectWithinScreen(page, scope) {
  const overflow = await page.locator(scope).evaluateAll((roots) =>
    roots
      .flatMap((root) => [root, ...root.querySelectorAll("*")])
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          getComputedStyle(el).visibility !== "hidden" &&
          (rect.left < -1 || rect.right > innerWidth + 1)
        );
      })
      .map((el) => el.id || el.className),
  );
  expect(overflow).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("mobile layout fits narrow phones, tablets and landscape, including long text", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page);
  await page.evaluate(() => {
    document.querySelector("#dailyGreetingHeading").textContent =
      "Dobrý deň, Alexandramimoriadnedlhémeno.";
    document.querySelector("#telemetryDisplayName").textContent = "Alexandramimoriadnedlhémeno";
  });
  for (const width of [320, 360, 390, 430, 768, 844]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    for (const tab of ["Cesta", "Dril", "Asistent", "Telemetria"]) {
      await page.locator(`#${width > 768 ? "sidebarTab" : "navTab"}${tab}`).click();
      await expectWithinScreen(page, ".app-layout, .desktop-sidebar");
    }
  }
});

test("phone safe areas protect the header, navigation, dialogs and lesson controls", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page);
  // Headless Chromium has zero physical insets; simulate a notched device.
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--safe-area-inset-top", "44px");
    document.documentElement.style.setProperty("--safe-area-inset-bottom", "34px");
  });
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
  await expect
    .poll(async () => (await page.locator(".header-inner").boundingBox()).y)
    .toBeGreaterThanOrEqual(44);
  const nav = await page.locator("#navTabCesta").boundingBox();
  expect(nav.y + nav.height).toBeLessThanOrEqual(640 - 34);
  await page.evaluate(() => window.scrollTo(0, 500));
  expect((await page.locator(".header-inner").boundingBox()).y).toBeGreaterThanOrEqual(44);
  await page.locator("#headerProfileBtn").click();
  await expectWithinScreen(page, "#welcomeAuthOverlay");
  const auth = await page.locator("#welcomeAuthOverlay .auth-modal-card").boundingBox();
  expect(auth.y).toBeGreaterThanOrEqual(44);
  expect(auth.y + auth.height).toBeLessThanOrEqual(640 - 34);
  await page.locator("#closeAuthBtn").click();
  await page.locator("#navTabTelemetria").click();
  await page.locator("details:has(#reopenDiagnosticBtn) > summary").click();
  await page.locator("#reopenDiagnosticBtn").click();
  await expectWithinScreen(page, "#figmaQuestionnaireModal");
  await page.locator("#qAdultCheck").check();
  await page.locator("#qConsentCheck").check();
  await page.locator("#qNextBtn").click();
  await expect(page.locator("#qStep1")).toBeVisible();
  await expectWithinScreen(page, "#figmaQuestionnaireModal");
  await page.locator("#closeQuestionnaireBtn").click();
  await page.locator('details:has(#openScienceModalBtn) > summary').click();
  await page.locator("#openScienceModalBtn").click();
  await expectWithinScreen(page, "#scienceModalBackdrop");
  await page.locator("#scienceModalCloseBtn").click();
  await page.locator("#navTabDril").click();
  await page.locator("#wordInput").fill("Najnepravdepodobnejšiemimoriadnedlhéslovo");
  await page.locator("#launchSosDrillBtn").click();
  await expect(page.locator("#lessonScreen")).toBeVisible();
  await expectWithinScreen(page, "#lessonScreen");
  expect((await page.locator(".lesson-topbar").boundingBox()).y).toBeGreaterThanOrEqual(44);
  await page.locator("#exitLessonBtn").click();
  await expect(page.locator("#lessonScreen")).toBeHidden();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--safe-area-inset-left", "44px");
    document.documentElement.style.setProperty("--safe-area-inset-right", "44px");
  });
  for (const tab of ["Cesta", "Dril", "Asistent", "Telemetria"]) {
    await page.locator(`#sidebarTab${tab}`).click();
    await expectWithinScreen(page, ".app-layout, .desktop-sidebar");
  }
  expect((await page.locator(".desktop-sidebar").boundingBox()).x).toBeGreaterThanOrEqual(44);
});

test("telemetry only includes requested training cards and drill controls stay operable", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openApp(page);
  await page.locator("#sidebarTabTelemetria").click();
  await expect(page.locator("#telemetryDisplayName")).toHaveText("Nina");
  for (const id of [
    "telemetryProfileCard",
    "authEmailInput",
    "telemetryHistoryList",
    "calibrateFromTelemetryBtn",
    "resetTelemetryProgressBtn",
    "apkDownloadBtn",
  ]) {
    await expect(page.locator("#" + id)).toHaveCount(0);
  }
  await page.locator("#sidebarTabDril").click();
  await page.getByText('Príklady slov a viet', { exact: true }).click();
  await page.locator('.chip[data-word="Kartou, prosím"]').click();
  await expect(page.locator("#wordInput")).toHaveValue("Kartou, prosím");
  await page.locator("#clearWordBtn").click();
  await expect(page.locator("#wordInput")).toHaveValue("");
  await page.locator('input[name="sandboxMode"][value="guillotine"]').check();
  await expect(page.locator('input[name="sandboxMode"][value="guillotine"]')).toBeChecked();
  await page.getByText('Tvoje uložené slová', { exact: true }).click();
  await page.locator("#vFilterTraining").click();
  await expect(page.locator("#vFilterTraining")).toHaveClass(/active/);
  expect(errors).toEqual([]);
});

test("sign-up is followed by the questionnaire and the profile row is created in the cloud", async ({
  page,
}) => {
  const requests = [];
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "nina@example.com",
    user_metadata: { full_name: "Nina" },
    app_metadata: {},
    created_at: new Date().toISOString(),
  };
  const session = {
    access_token: "a.b.c",
    refresh_token: "r",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const reply = (status, body) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(body),
      });
    if (request.method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
    }
    requests.push(`${request.method()} ${url.pathname}`);
    if (url.pathname.endsWith("/token"))
      return reply(400, { code: "invalid_credentials", message: "Invalid login credentials" });
    if (url.pathname.endsWith("/signup")) return reply(200, session);
    if (url.pathname.includes("/rest/v1/profiles")) {
      // The row does not exist yet: reads and updates match nothing, the insert creates it.
      return reply(request.method() === "POST" ? 201 : 200, []);
    }
    return reply(200, {});
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
  await expect(page.locator("#welcomeAuthOverlay")).toBeVisible();
  await page.locator("#welcomeEmailInput").fill("nina@example.com");
  await page.locator("#welcomePasswordInput").fill("secret12");
  await page.locator("#welcomeSubmitBtn").click();
  await expect(page.locator("#welcomeAuthOverlay")).toBeHidden();
  await expect(page.locator("#figmaQuestionnaireModal")).toBeVisible();
  await page.locator("#qAdultCheck").check();
  await page.locator("#qConsentCheck").check();
  await page.locator("#qNextBtn").click();
  for (let question = 0; question < 9; question++) {
    await page.locator('.question-item:not([hidden]) input[type="radio"]').nth(2).check();
    await page.locator("#qNextBtn").click();
  }
  await page.locator(".motor-profile summary").click();
  for (const key of ["laryngeal", "plosives", "prolongation", "clonic", "social"]) {
    await page.locator(`[data-profile-score="${key}"]`).selectOption("2", {force:true});
  }
  await page.locator("#qNextBtn").click();
  await page.locator("#qFinishEnterBtn").click();
  await expect(page.locator("#figmaQuestionnaireModal")).toBeHidden();
  // The account already supplies the name, so it is not asked again.
  await expect(page.locator("#firstNameDialog")).toHaveCount(0);
  await expect.poll(() => requests.includes("POST /rest/v1/profiles")).toBe(true);
  expect(requests).toContain("PATCH /rest/v1/profiles");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
  await expect.poll(() => page.evaluate(() => window.fluencyAuth.getCurrentUser()?.id)).toBe(user.id);
  await expect(page.locator("#welcomeAuthOverlay")).toBeHidden();
  expect(requests.filter(request => request === 'POST /auth/v1/token')).toHaveLength(1);
});

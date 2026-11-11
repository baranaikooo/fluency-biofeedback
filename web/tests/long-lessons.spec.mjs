import { test, expect } from "@playwright/test";
test.use({ baseURL: "http://localhost:3000" });
async function open(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("fl_guest_mode", "1");
    localStorage.setItem("fl_onboarding_completed", "1");
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
}
async function launch(page, level = "1.1") {
  await page.evaluate(
    ({ level }) => {
      const world = WORLDS_DATA.find((w) => w.levels.some((l) => l.id === level));
      duoLesson.openLevelPopover(
        world.levels.find((l) => l.id === level),
        world,
      );

      duoLesson.launchLesson();
    },
    { level },
  );
}
async function answer(page) {
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("dsp-evaluation-complete", {
        detail: { passed: true, vrt: 55, latency: 500 },
      }),
    ),
  );
  await page.locator("#drawerContinueBtn").click();
}
test("full lesson has twelve tasks and pausable round breaks", async ({ page }) => {
  await open(page);
  await launch(page);
  expect(await page.evaluate(() => duoLesson.initialWordCount)).toBe(12);
  for (let i = 0; i < 3; i++) await answer(page);
  await expect(page.locator("#lessonRoundDialog")).toBeVisible();
  await page.locator("#lessonRoundPause").click();
  await expect(page.locator("#lessonScreen")).toBeHidden();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
  await launch(page);
  await expect(page.locator("#lessonStepCount")).toHaveText("4 / 12");
  expect(await page.evaluate(() => duoLesson.lessonQueue[0].round)).toBe(1);
  await expect(page.locator("#lessonRoundDialog")).not.toBeVisible();
});
test("lesson completes twelve tasks and clears checkpoint", async ({ page }) => {
  await open(page);
  await launch(page, "1.1");
  for (let i = 0; i < 12; i++) {
    await answer(page);
    if (i === 2 || i === 8) {
      await expect(page.locator("#lessonRoundDialog")).toBeVisible();
      await page.locator("#lessonRoundContinue").click();
    }
  }
  await expect(page.locator("#celebrationModal")).toHaveClass(/active/);
  expect(await page.evaluate(() => window.GlideLessons.saved(duoLesson.currentLevel))).toBe(null);
});
test("reload after a rewarded attempt resumes next task without rewarding it again", async ({
  page,
}) => {
  await open(page);
  await launch(page);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("dsp-evaluation-complete", {
        detail: { passed: true, vrt: 50, latency: 500 },
      }),
    ),
  );
  const before = await page.evaluate(() => ({
    xp: duoState.state.xp,
    next: duoLesson.lessonQueue[0].id,
  }));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
  await launch(page);
  expect(
    await page.evaluate(() => ({ xp: duoState.state.xp, next: duoLesson.lessonQueue[0].id })),
  ).toEqual(before);
  await expect(page.locator("#lessonStepCount")).toHaveText("2 / 12");
});
test("optional repeat adds only one chosen task and silence keeps current task", async ({
  page,
}) => {
  await open(page);
  await launch(page);
  const original = await page.evaluate(() => duoLesson.currentWordItem.id);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("dsp-evaluation-complete", { detail: { passed: false, meta: {} } }),
    ),
  );
  await page.locator("#drawerContinueBtn").click();
  expect(await page.evaluate(() => duoLesson.currentWordItem.id)).toBe(original);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("dsp-evaluation-complete", {
        detail: { passed: true, vrt: 50, latency: 500 },
      }),
    ),
  );
  await page.locator("#lessonRepeat").click();
  await expect(page.locator("#lessonRepeat")).toBeHidden();
  expect(await page.evaluate(() => duoLesson.initialWordCount)).toBe(13);
  await page.locator("#drawerContinueBtn").click();
  expect(await page.evaluate(() => duoLesson.currentWordItem.id)).toContain("-repeat-");
});
test("boss has sixteen distinct scenario prompts and no scripted answers", async ({ page }) => {
  await open(page);
  await launch(page, "5.1");
  const tasks = await page.evaluate(() => duoLesson.lessonQueue);
  expect(tasks).toHaveLength(16);
  expect(new Set(tasks.map((t) => t.questionId)).size).toBe(16);
  expect(tasks.every((t) => t.freeReply)).toBeTruthy();
});
test("checkpoints stay isolated across accounts", async ({ page }) => {
  await open(page);
  await launch(page);
  expect(
    await page.evaluate(() => {
      const old = window.fluencyAuth.getCurrentUser;
      window.fluencyAuth.getCurrentUser = () => ({ id: "different-account" });
      const snapshot = window.GlideLessons.saved(duoLesson.currentLevel);
      window.fluencyAuth.getCurrentUser = old;
      return snapshot;
    }),
  ).toBe(null);
});
test("older short checkpoint keeps participation credit in the single lesson", async ({ page }) => {
  await open(page);
  const xp = await page.evaluate(() => duoState.state.xp);
  await page.evaluate(() => {
    const level = WORLDS_DATA[0].levels[0];
    const tasks = window.GlideLessonPlan.build(level, window.QUESTION_BANK).tasks;
    localStorage.setItem(
      "glide_path_sessions_v1_guest",
      JSON.stringify({
        "1.1:short": {
          version: 1,
          levelId: "1.1",
          size: "short",
          queue: tasks.slice(2, 6),
          total: 6,
          completed: 2,
          attempts: 2,
          seenRounds: [1],
          voiceIntroPlayed: true,
        },
      }),
    );
  });
  await launch(page);
  await expect(page.locator("#lessonStepCount")).toHaveText("3 / 12");
  expect(await page.evaluate(() => duoState.state.xp)).toBe(xp);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("glide_path_sessions_v1_guest"))["1.1:short"],
    ),
  ).toBeUndefined();
});

test("continue path opens the saved lesson without a length selector", async ({ page }) => {
  await open(page);
  await launch(page, "1.1", true);
  await page.locator("#lessonPause").click();
  await page.locator("#continuePathBtn").click();
  await expect(page.locator("#lessonLength")).toHaveCount(0);
  await expect(page.locator("#startLessonBtn")).toContainText("POKRAČOVAŤ");
});
test("invalid checkpoint is ignored and a fresh lesson remains usable", async ({ page }) => {
  await open(page);
  await page.evaluate(() =>
    localStorage.setItem(
      "glide_path_sessions_v1_guest",
      JSON.stringify({
        "1.1:full": { version: 1, levelId: "1.1", size: "full", queue: "broken", total: 12 },
      }),
    ),
  );
  await launch(page);
  await expect(page.locator("#lessonStepCount")).toHaveText("1 / 12");
});
test("own sentence task controls fit a small phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await open(page);
  await launch(page);
  await page.evaluate(() => {
    duoLesson.lessonQueue = duoLesson.lessonQueue.filter((t) => t.round === 2);
    duoLesson.completedItemsCount = 9;
    duoLesson.loadNextItem();
  });
  await expect(page.locator("#startBtn")).toBeInViewport({ ratio: 1 });
  await expect(page.locator("#lessonPause")).toBeInViewport({ ratio: 1 });
  await expect(page.locator("#targetWord")).toContainText("vlastnej vete");
});
test("text-only question waits for readiness and cannot continue after cancellation", async ({
  page,
}) => {
  await open(page);
  await launch(page, "4.1");
  await page.evaluate(() => {
    document.getElementById("voicePromptToggle").checked = false;
    window.readinessCallbacks = 0;
    const question = lessonScenario();
    playScenarioAudio(question, () => window.readinessCallbacks++);
  });
  await expect(page.locator("#scenarioReadyBtn")).toBeVisible();
  expect(await page.evaluate(() => window.readinessCallbacks)).toBe(0);
  await page.locator("#scenarioReadyBtn").click();
  expect(await page.evaluate(() => window.readinessCallbacks)).toBe(1);
  await page.evaluate(() => {
    playScenarioAudio(lessonScenario(), () => window.readinessCallbacks++);
    window.lateReady = document.getElementById("scenarioReadyBtn").onclick;
    window.abortActiveDspSession();
    window.lateReady();
  });
  await expect(page.locator("#scenarioReadyBtn")).toHaveCount(0);
  expect(await page.evaluate(() => window.readinessCallbacks)).toBe(1);
});

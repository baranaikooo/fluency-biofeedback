import { test, expect } from "@playwright/test";
test.use({ baseURL: "http://localhost:3000" });

async function open(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("fl_guest_mode", "1");
    localStorage.setItem("fl_onboarding_completed", "1");
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-engine", "ready");
  await page.locator("#sidebarTabDril").click();
}

async function speak(page, transcript) {
  await page.evaluate((text) => {
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
    runPostHocEvaluation(
      frames,
      {
        ...analyzePhonetics("odpoveď"),
        freeReply: true,
        conversation: duoLesson.conversation.sceneId,
      },
      600,
      5500,
      text,
    );
  }, transcript);
}

test("café rehearsal follows both responses and recommends a next scene from the real-life check-in", async ({
  page,
}) => {
  await open(page);
  await page.locator("#conversationOpen").click();
  await page.getByRole("button", { name: "Začať rozhovor", exact: true }).click();
  await expect(page.locator("#lessonConversationGoal")).toContainText("dve kávy");
  expect(await page.evaluate(() => lessonScenario().audioUrl)).toContain("glide-cafe-opening");
  await speak(page, "Dve veľké kávy");
  await page.locator("#drawerContinueBtn").click();
  expect(await page.evaluate(() => lessonScenario().promptText)).toContain("Dve kávy");
  await speak(page, "so sebou");
  await page.locator("#drawerContinueBtn").click();
  expect(await page.evaluate(() => lessonScenario().promptText)).toContain("Zabalím");
  await speak(page, "Áno, ďakujem");
  await page.locator("#drawerContinueBtn").click();
  await expect(page.locator("#celebrationTitle")).toHaveText("Rozhovor dokončený");
  await page.locator("#conversationRecap").click();
  await page.locator(".conversation-rating label").filter({ hasText: "Áno" }).click();
  await page.locator(".conversation-rating label").filter({ hasText: "Zvládnuteľný" }).click();
  await page.getByRole("button", { name: "Uložiť záznam", exact: true }).click();
  await expect(page.locator("#conversationRecommendation")).toContainText(
    "Telefonát do ambulancie",
  );
  const entries = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("glide_conversations_v1_guest")),
  );
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({ sceneId: "cafe", outcome: "yes", effort: 1 });
});

test("a custom situation and a missing transcript preserve the user's choice of follow-up", async ({
  page,
}) => {
  await open(page);
  await page.locator("#conversationOpen").click();
  await page.locator("#conversationSceneTrigger").click();
  await page.getByRole("option", { name: "Vlastná situácia", exact: true }).click();
  await page.locator("#conversationGoal").fill("Spýtať sa na prestup na vlak");
  await page.getByRole("button", { name: "Začať rozhovor", exact: true }).click();
  await expect(page.locator("#lessonConversationGoal")).toHaveText("Spýtať sa na prestup na vlak");
  await speak(page, "");
  await expect(page.locator("#drawerContinueBtn")).toBeDisabled();
  await page.keyboard.press("Enter");
  await expect(page.locator("#targetWord")).toHaveText("Začni rozhovor");
  await page.getByRole("button", { name: "Skúsiť inú možnosť", exact: true }).click();
  await page.locator("#drawerContinueBtn").click();
  expect(await page.evaluate(() => lessonScenario().promptText)).toContain("iná možnosť");
});

test("word library finds accentless queries and uses the selected word in a drill", async ({
  page,
}) => {
  await open(page);
  await page.locator("#vocabularyOpen").click();
  await page.locator("#vocabularySearch").fill("ciapka");
  await expect(page.locator("#vocabularyWords button")).toHaveText("čiapka");
  await page.getByRole("button", { name: "čiapka", exact: true }).click();
  await expect(page.locator("#wordInput")).toHaveValue("čiapka");
  await page.locator("#launchSosDrillBtn").click();
  await expect(page.locator("#targetWord")).toHaveText("ČIAPKA");
});

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
test("category picker uses app dialog and supports keyboard selection", async ({ page }) => {
  await open(page);
  await page.locator("#vocabularyOpen").click();
  await page.getByText("Pridať vlastné slovo", { exact: true }).click();
  await expect(page.locator("#vaultCategorySelect")).toBeHidden();
  await page.locator("#vaultCategorySelectTrigger").click();
  await expect(page.locator("#glideChoiceDialog")).toBeVisible();
  await page.getByRole("option", { name: "📍 Mesto", exact: true }).click();
  await expect(page.locator("#vaultCategorySelect")).toHaveValue("Cestovanie");
  await expect(page.locator("#vaultCategorySelectTrigger")).toContainText("Mesto");
  await page.locator("#vaultCategorySelectTrigger").press("ArrowDown");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator("#vaultCategorySelect")).toHaveValue("Kaviareň");
});
test("nested form picker cancels safely, commits values and follows programmatic reset", async ({
  page,
}) => {
  await open(page);
  await page.locator("#practiceOpen").click();
  await page.locator("#practiceReview summary").click();
  await page.locator("#practiceSaidTrigger").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#practiceSaidTrigger")).toBeFocused();
  await expect(page.locator("#practiceSaid")).toHaveValue("yes");
  await page.locator("#practiceSaidTrigger").click();
  await page.getByRole("option", { name: "Čiastočne", exact: true }).click();
  await expect(page.locator("#practiceSaid")).toHaveValue("partly");
  await page.evaluate(() => document.getElementById("practiceReviewForm").reset());
  await expect(page.locator("#practiceSaidTrigger")).toHaveText(/Áno/);
  await page.evaluate(() => (document.getElementById("practiceSaid").value = "no"));
  await expect(page.locator("#practiceSaidTrigger")).toContainText("Zatiaľ nie");
});
test("mobile picker fits the viewport and option text stays text", async ({ page }) => {
  await open(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator("#practiceOpen").click();
  await page.locator("#practiceReview summary").click();
  await page.locator("#practiceFeedbackTrigger").click();
  const box = await page.locator("#glideChoiceDialog").boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(box.y + box.height).toBeLessThanOrEqual(568);
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const s = document.getElementById("practiceFeedback");
    s.add(new Option("<img src=x onerror=alert(1)>", "test"));
  });
  await page.locator("#practiceFeedbackTrigger").click();
  await expect(page.locator("#glideChoiceList img")).toHaveCount(0);
  await expect(
    page.getByRole("option", { name: "<img src=x onerror=alert(1)>", exact: true }),
  ).toBeVisible();
});

import { test, expect } from '@playwright/test';
test.use({ baseURL: process.env.GLIDE_TEST_URL || 'http://localhost:3000' });
async function open(page) {
  await page.addInitScript(() => {
    localStorage.setItem('fl_onboarding_completed', '1');
    localStorage.setItem('fl_custom_name', 'Nina');
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'ready');
}
test('all nine questions and navigation fit a small portrait phone without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await open(page);
  await page.evaluate(() => window.openFigmaQuestionnaire(true));
  await page.locator('#qAdultCheck').check();
  await page.locator('#qConsentCheck').check();
  await page.locator('#qNextBtn').click();
  for (let i = 0; i < 9; i++) {
    await expect(page.locator('.question-item:visible')).toHaveCount(1);
    const section = page.locator('.questionnaire-form:visible');
    expect(await section.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    await expect(page.locator('.question-item:visible label').last()).toBeInViewport();
    await expect(page.locator('#qNextBtn')).toBeInViewport();
    await page.locator('.question-item:visible input').nth(2).check();
    await page.locator('#qNextBtn').click();
  }
  await expect(page.locator('#qStep4')).toBeVisible();
});
test('home, drill and assistant primary screens fit a typical phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  for (const tab of ['Cesta', 'Dril', 'Asistent']) {
    await page.locator('#navTab' + tab).click();
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
  }
  await expect(page.locator('#assistantToggle')).toBeInViewport();
  await expect(page.locator('#assistantPitchSlider')).toBeInViewport();
});
test('chapter switching keeps every chapter and level accessible without a long page', async ({ page }) => {
  await open(page);
  for (let chapter = 1; chapter <= 5; chapter++) {
    await page.locator(`#worldChaptersNav button[data-world="${chapter}"]`).click();
    await expect(page.locator('.world-section:visible')).toHaveCount(1);
    await expect(page.locator(`#world-section-${chapter}`)).toBeVisible();
    await expect(page.locator(`#world-section-${chapter} .path-node-btn`)).toHaveCount(5);
  }
  await page.locator('#continuePathBtn').click();
  await expect(page.locator('#world-section-1')).toBeVisible();
  await expect(page.locator('#nodePopoverBackdrop')).toHaveClass(/active/);
});

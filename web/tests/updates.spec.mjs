import { test, expect } from '@playwright/test';

test.use({ baseURL: process.env.GLIDE_TEST_URL || 'http://localhost:3000' });

async function openAndroid(page, options = {}) {
  await page.addInitScript((options) => {
    sessionStorage.setItem('fl_guest_mode', '1');
    localStorage.setItem('fl_custom_name', 'Nina');
    localStorage.setItem('fl_onboarding_completed', '1');
    window.updateTest = {
      offline: options.offline || false,
      downloadError: false,
      checks: 0,
      downloads: [],
      current: options.current || 101,
      latest: options.latest || 102,
      url: options.url || 'https://github.com/baranaikooo/glide/releases/download/v1.0.2/glide-native.apk',
    };
    window.Capacitor = {
      getPlatform: () => 'android',
      Plugins: { GlideUpdates: {
        getVersion: async () => ({ versionCode: window.updateTest.current, versionName: '1.0.1' }),
        checkForUpdate: async () => {
          const state = window.updateTest;
          state.checks++;
          if (state.offline) throw new Error('Offline');
          return { available: true, versionCode: state.latest, versionName: '1.0.2', downloadUrl: state.url };
        },
        downloadUpdate: async ({ url }) => {
          if (window.updateTest.downloadError) throw new Error('No browser');
          window.updateTest.downloads.push(url);
        },
        addListener: (event, listener) => { window.updateTest[event] = listener; },
      } },
    };
  }, options);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'ready');
}

test('Android offers the exact newer APK immediately on launch, fits phones and permits dismissal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openAndroid(page);
  await expect(page.locator('#appUpdateNotice')).toBeVisible();
  await expect(page.locator('#appUpdateVersion')).toHaveText('Verzia 1.0.2');
  const box = await page.locator('#appUpdateNotice').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await page.locator('#downloadAppUpdate').click();
  expect(await page.evaluate(() => window.updateTest.downloads)).toEqual([
    'https://github.com/baranaikooo/glide/releases/download/v1.0.2/glide-native.apk',
  ]);
  await expect(page.locator('#appUpdateHelp')).toContainText('Po stiahnutí otvor APK');
  await page.locator('#dismissAppUpdate').click();
  await expect(page.locator('#appUpdateNotice')).toBeHidden();
  await page.locator('#navTabTelemetria').click();
  await page.locator('#checkAppUpdate').click();
  await expect(page.locator('#appUpdateNotice')).toBeVisible();
});

for (const [name, options] of [
  ['same version', { current: 102 }],
  ['older release', { current: 103 }],
  ['untrusted download', { url: 'https://example.com/fake.apk' }],
]) {
  test(`Android never offers ${name}`, async ({ page }) => {
    await openAndroid(page, options);
    await expect(page.locator('#appUpdateNotice')).toBeHidden();
    await expect(page.locator('#appUpdateStatus')).toHaveText('Máš najnovšiu verziu aplikácie.');
  });
}

test('offline update check leaves training usable and retries when online', async ({ page }) => {
  await openAndroid(page, { offline: true });
  await expect(page.locator('#appUpdateNotice')).toBeHidden();
  await expect(page.locator('#appUpdateStatus')).toContainText('nemožno skontrolovať');
  await page.locator('#sidebarTabDril').click();
  await page.locator('#wordInput').fill('Dve veľké kávy');
  await page.evaluate(() => { window.updateTest.offline = false; window.dispatchEvent(new Event('online')); });
  await expect(page.locator('#appUpdateNotice')).toBeVisible();
  expect(await page.evaluate(() => window.updateTest.checks)).toBe(2);
});

test('download failure is recoverable and a fresh launch shows an available update again', async ({ page }) => {
  await openAndroid(page);
  await expect(page.locator('#appUpdateNotice')).toBeVisible();
  await page.evaluate(() => { window.updateTest.downloadError = true; });
  await page.locator('#downloadAppUpdate').click();
  await expect(page.locator('#appUpdateHelp')).toContainText('Skús tlačidlo znova');
  await expect(page.locator('#downloadAppUpdate')).toBeEnabled();
  await page.locator('#dismissAppUpdate').click();
  await page.reload();
  await expect(page.locator('#appUpdateNotice')).toBeVisible();
});

test('browser version does not offer installation of an Android APK', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'ready');
  await expect(page.locator('#appUpdateNotice')).toHaveCount(0);
});

import { test, expect } from '@playwright/test';
test.use({ baseURL: process.env.GLIDE_TEST_URL || 'http://localhost:3000' });
const storageKey = 'sb-valdfrjvcvxosjtxhqqb-auth-token';
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'nina@example.com', user_metadata: { full_name: 'Nina' }, app_metadata: {}, created_at: new Date().toISOString() };
function session(expired = false, generation = 1) {
  const expiresAt = Math.floor(Date.now() / 1000) + (expired ? -3600 : 3600);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: expiresAt, iat: expiresAt - 3600 })}.test-signature-${generation}`, refresh_token: `refresh-${generation}`, token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, user };
}
async function mockAuth(page, state) {
  await page.route('**/*.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const reply = (body, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (state.offline) return route.abort('internetdisconnected');
    if (url.pathname.endsWith('/token')) {
      state.tokens++;
      state.grants.push(url.searchParams.get('grant_type'));
      return reply(session(false, state.tokens + 1));
    }
    if (url.pathname.endsWith('/user')) return reply(user);
    if (url.pathname.endsWith('/logout')) return reply({});
    if (url.pathname.includes('/rest/v1/profiles')) {
      state.profiles++;
      if (state.profileError) return reply({ message: 'temporarily unavailable' }, 503);
      return reply(request.method() === 'GET' ? { id: user.id, xp: 0, progress: { unlockedLevels: ['1.1'], diagnostic: state.diagnostic } } : [{ id: user.id }]);
    }
    return reply({});
  });
}
async function prepare(page, saved = null) {
  await page.addInitScript(({ saved, storageKey }) => {
    localStorage.setItem('fl_onboarding_completed', '1');
    localStorage.setItem('fl_custom_name', 'Nina');
    if (saved) localStorage.setItem(storageKey, JSON.stringify(saved));
  }, { saved, storageKey });
}
async function ready(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'ready');
}
function state() { return { tokens: 0, grants: [], profiles: 0, offline: false }; }

test('password login survives closing the browser session without entering credentials again', async ({ page, browser }) => {
  const network = state();
  await mockAuth(page, network);
  await prepare(page);
  await ready(page);
  await page.evaluate(() => window.fluencyAuth.handleEmailAuth('nina@example.com', 'secret12', 'Nina'));
  await expect.poll(() => page.evaluate(() => window.fluencyAuth.getCurrentUser()?.id)).toBe(user.id);
  const saved = await page.context().storageState();
  const newContext = await browser.newContext({ storageState: saved, baseURL: process.env.GLIDE_TEST_URL || 'http://localhost:3000' });
  try {
    const reopened = await newContext.newPage();
    await mockAuth(reopened, network);
    await ready(reopened);
    await expect.poll(() => reopened.evaluate(() => window.fluencyAuth.getCurrentUser()?.id)).toBe(user.id);
    await expect(reopened.locator('#welcomeAuthOverlay')).toBeHidden();
    expect(network.grants).toEqual(['password']);
  } finally { await newContext.close(); }
});

test('restoring a saved training profile does not play the completion fanfare', async ({ page }) => {
  const network = { ...state(), diagnostic: {} };
  await mockAuth(page, network);
  await prepare(page, session());
  await page.addInitScript(() => {
    window.testAudioStarts = 0;
    const createOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      window.testAudioStarts++;
      return createOscillator.call(this);
    };
  });
  await ready(page);
  await expect.poll(() => page.evaluate(() => window.fluencyAuth.getCurrentProfile()?.progress?.diagnostic?.recWorldId)).toBeTruthy();
  expect(await page.evaluate(() => window.testAudioStarts)).toBe(0);
});

test('expired saved session refreshes automatically and token refresh does not reopen login', async ({ page }) => {
  const network = state();
  await mockAuth(page, network);
  await prepare(page, session(true));
  await ready(page);
  await expect.poll(() => page.evaluate(() => window.fluencyAuth.getCurrentUser()?.id)).toBe(user.id);
  expect(network.grants).toContain('refresh_token');
  const before = network.tokens;
  await page.evaluate(() => window.fluencySupabase.auth.refreshSession());
  expect(network.tokens).toBeGreaterThan(before);
  await expect(page.locator('#welcomeAuthOverlay')).toBeHidden();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).refresh_token, storageKey)).not.toBe('refresh-1');
});

test('offline expiry preserves the session and restores it when connectivity returns', async ({ page }) => {
  const network = { ...state(), offline: true };
  await mockAuth(page, network);
  await prepare(page, session(true));
  await ready(page);
  await expect(page.locator('#welcomeAuthOverlay')).toBeHidden();
  expect(await page.evaluate(key => !!localStorage.getItem(key), storageKey)).toBe(true);
  await page.locator('#sidebarTabDril').click();
  await page.locator('#wordInput').fill('Dve veľké kávy');
  network.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => page.evaluate(() => window.fluencyAuth.getCurrentUser()?.id), { timeout: 15000 }).toBe(user.id);
  await expect(page.locator('#welcomeAuthOverlay')).toBeHidden();
});

test('profile server failure does not sign out a restored account; explicit logout still works', async ({ page }) => {
  const network = { ...state(), profileError: true };
  await mockAuth(page, network);
  await prepare(page, session());
  await ready(page);
  await expect.poll(() => page.evaluate(() => window.fluencyAuth.getCurrentUser()?.id)).toBe(user.id);
  await expect(page.locator('#headerProfileBtn')).toHaveClass(/logged-in/);
  await page.evaluate(() => window.fluencyAuth.signOut());
  expect(await page.evaluate(() => window.fluencyAuth.getCurrentUser())).toBeNull();
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
});

test('initial OAuth deep link keeps auth monitoring active afterwards', async ({ page }) => {
  const network = state();
  await mockAuth(page, network);
  await prepare(page);
  const saved = session();
  await page.addInitScript(saved => {
    window.__pendingDeepLink = `com.fluency.biofeedback://auth#access_token=${saved.access_token}&refresh_token=${saved.refresh_token}`;
  }, saved);
  await ready(page);
  await expect.poll(() => page.evaluate(() => window.fluencyAuth.getCurrentUser()?.id)).toBe(user.id);
  // Use the SDK directly: the auth subscription must update application state.
  await page.evaluate(() => window.fluencySupabase.auth.signOut({ scope: 'local' }));
  await expect.poll(() => page.evaluate(() => window.fluencyAuth.getCurrentUser())).toBeNull();
});

test('Android browser offers to open Glide for a Google callback from an older APK', async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: process.env.GLIDE_TEST_URL || 'http://localhost:3000',
    userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/132.0 Mobile Safari/537.36',
  });
  try {
    const page = await context.newPage();
    await mockAuth(page, state());
    const saved = session();
    const fragment = new URLSearchParams({
      access_token: saved.access_token,
      refresh_token: saved.refresh_token,
      token_type: 'bearer',
      expires_in: '3600',
      expires_at: String(saved.expires_at),
    });
    await page.goto(`/#${fragment}`);
    await expect(page.getByRole('button', { name: 'Otvoriť Glide' })).toBeVisible();
    await page.getByRole('button', { name: 'Pokračovať v prehliadači' }).click();
    await expect.poll(() => page.evaluate(() => window.fluencyAuth?.getCurrentUser()?.id)).toBe(user.id);
  } finally {
    await context.close();
  }
});

test('Android migrates a saved Google session and restores it after WebView storage is cleared', async ({ page }) => {
  const network = state();
  const native = new Map();
  await mockAuth(page, network);
  await prepare(page);
  await page.exposeFunction('testNativeAuth', (operation, { key, value }) => {
    if (operation === 'get') return { value: native.get(key) };
    if (operation === 'set') native.set(key, value);
    if (operation === 'remove') native.delete(key);
  });
  await page.addInitScript(({ storageKey, saved }) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(storageKey, JSON.stringify(saved));
      sessionStorage.setItem('seeded', '1');
    }
    window.Capacitor = {
      getPlatform: () => 'android',
      Plugins: { GlideAuthStorage: {
        get: args => window.testNativeAuth('get', args),
        set: args => window.testNativeAuth('set', args),
        remove: args => window.testNativeAuth('remove', args),
      } },
    };
  }, { storageKey, saved: session(true) });
  await ready(page);
  await expect.poll(() => page.evaluate(() => window.fluencyAuth.getCurrentUser()?.id)).toBe(user.id);
  expect(network.grants).toEqual(['refresh_token']);
  expect(JSON.parse(native.get(storageKey)).refresh_token).toBe('refresh-2');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.fluencyAuth.getCurrentUser()?.id)).toBe(user.id);
  expect(network.grants).toEqual(['refresh_token']);
  await page.evaluate(() => window.fluencyAuth.signOut());
  expect(native.has(storageKey)).toBe(false);
});

test('splash with the soundwave stays visible until the engine loads', async ({ page }) => {
  await prepare(page);
  await page.route('**/engine/questions-and-voices.js', async route => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#appLoadingScreen')).toBeVisible();
  await expect(page.locator('#appLoadingScreen .loading-wave')).toHaveCount(3);
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'ready');
  await expect(page.locator('#appLoadingScreen')).toHaveCount(0);
});

test('engine loading failure replaces the splash with a retry action', async ({ page }) => {
  await page.route('**/engine/questions-and-voices.js', route => route.fulfill({ status: 500, body: '' }));
  await page.goto('/');
  await expect(page.locator('.engine-error')).toBeVisible();
  await expect(page.locator('#appLoadingScreen')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Skúsiť znova' })).toBeVisible();
});

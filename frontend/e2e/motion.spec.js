import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({ reducedMotion: 'no-preference' });

async function prepare(page, hardwareConcurrency = 8) {
  // Select the device capability being exercised instead of inheriting the CI host's CPU count.
  await page.addInitScript(cores => Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => cores }), hardwareConcurrency);
  await page.route('**/api/ping', route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"status":"ok"}' }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Detect phishing. Stay ahead.' })).toBeVisible();
}

test('original waves and X animate without a pause button and honor system motion preferences', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  const errors = [];
  if (testInfo.project.name === 'desktop-chrome') await page.setViewportSize({ width: 1440, height: 1050 });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await prepare(page);
  const waves = page.getByTestId('chroma-waves');
  await expect(waves).toHaveAttribute('data-motion', 'running');
  await expect(waves.locator('canvas')).toHaveCount(1);
  const desktop = testInfo.project.name === 'desktop-chrome';
  if (!desktop) await page.getByTestId('hero-visual').scrollIntoViewIfNeeded();
  await expect(page.locator('.ascii-canvas')).toHaveCount(1);
  await expect.poll(() => page.locator('.ascii-canvas').getAttribute('data-frame')).not.toBeNull();
  for (const type of ['verdict', 'coverage', 'model', 'gemini']) await expect(page.getByTestId(`hud-${type}`)).toBeVisible();
  const waveCanvas = waves.locator('canvas');
  const asciiCanvas = page.locator('.ascii-canvas');
  const waveFrame = await waveCanvas.getAttribute('data-frame');
  const asciiFrame = await asciiCanvas.getAttribute('data-frame');
  await expect.poll(() => waveCanvas.getAttribute('data-frame')).not.toBe(waveFrame);
  await expect.poll(() => asciiCanvas.getAttribute('data-frame')).not.toBe(asciiFrame);
  await page.screenshot({ path: testInfo.outputPath('restored-full-motion.png'), fullPage: true });
  await expect(page.getByRole('button', { name: /Pause decorative animation|Resume decorative animation/ })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(waves).toHaveAttribute('data-motion', 'static');
  await expect(waves.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.ascii-canvas')).toHaveCount(0);
  await expect(page.getByTestId('ascii-static')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(waves.locator('canvas')).toHaveCount(1);
  await expect(page.locator('.ascii-canvas')).toHaveCount(1);
  await expect(page.locator('.scanner-enter')).toHaveCSS('opacity', '1');
  const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations;
  expect(violations).toEqual([]);
  expect(errors).toEqual([]);
});

test('low power devices retain static identity without starting WebGL rendering', async ({ page }) => {
  await prepare(page, 2);
  await expect(page.getByTestId('chroma-waves')).toHaveAttribute('data-motion', 'static');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByTestId('ascii-static')).toBeVisible();
});

test('hidden documents suspend wave and ASCII drawing and resume without duplicate canvases', async ({ page }) => {
  await prepare(page);
  const canvas = page.getByTestId('chroma-waves').locator('canvas');
  await expect.poll(() => canvas.getAttribute('data-frame')).not.toBeNull();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  const frames = await canvas.getAttribute('data-frame');
  const asciiFrames = await page.locator('.ascii-canvas').getAttribute('data-frame');
  await page.waitForTimeout(350);
  expect(await canvas.getAttribute('data-frame')).toBe(frames);
  if (asciiFrames) expect(await page.locator('.ascii-canvas').getAttribute('data-frame')).toBe(asciiFrames);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => canvas.getAttribute('data-frame')).not.toBe(frames);
  await expect(canvas).toHaveCount(1);
  await expect(page.locator('.ascii-canvas')).toHaveCount(1);
});

test('reduced motion renders static identity and never starts continuous canvas rendering', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page);
  await expect(page.getByTestId('chroma-waves')).toHaveAttribute('data-motion', 'static');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByTestId('ascii-static')).toBeVisible();
  await expect(page.getByText('Stay ahead.', { exact: true })).toBeVisible();
});

test('WebGL failure retains static waves and X with an operable scanner and no runtime errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return kind.includes('webgl') ? null : getContext.call(this, kind, ...args); };
  });
  await prepare(page);
  await page.waitForTimeout(500);
  await expect(page.getByTestId('ascii-static')).toBeVisible();
  await expect(page.getByTestId('chroma-waves').locator('canvas')).toHaveCount(0);
  await page.getByLabel('URL to inspect').fill('https://example.com/');
  await expect(page.getByRole('button', { name: 'Analyze URL' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

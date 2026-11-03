import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { scanReport } from '../test/fixtures';

async function prepare(page) {
  await page.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(route.request().url().endsWith('/api/ping') ? { status: 'ok' } : scanReport()) }));
  await page.goto('/');
}

test('scanner, official result and history satisfy automated WCAG checks', async ({ page }) => {
  await prepare(page);
  const scan = () => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect((await scan()).violations).toEqual([]);
  await page.getByLabel('URL to inspect').fill('https://example.com/login');
  await page.getByRole('button', { name: 'Analyze URL' }).click();
  await expect(page.getByTestId('verdict')).toBeFocused();
  await expect(page.getByRole('status').filter({ hasText: 'Assessment for example.com' })).toContainText('Unable to determine');
  expect((await scan()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Recent scans' }).click();
  expect((await scan()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Recent scans' })).toBeFocused();
});

test('actual domain copy has a keyboard operable action and announced outcome', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await prepare(page);
  await page.getByLabel('URL to inspect').fill('https://example.com/login');
  await page.getByRole('button', { name: 'Analyze URL' }).click();
  const copy = page.getByRole('button', { name: 'Copy actual domain' });
  await copy.focus(); await page.keyboard.press('Enter');
  await expect(page.getByText('Actual domain copied.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('example.com');
});

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { scanReport } from '../test/fixtures';

function completeReport() {
  const report = scanReport();
  report.engines.push(...[
    ['xgboost', 'XGBoost URL model', 'model'], ['registration', 'Domain registration context', 'heuristic'],
  ].map(([id, name, kind]) => ({ id, name, kind, status: 'no_detection', observed_at: report.observed_at, evidence: [],
    targets: [{ url: report.url, status: 'no_detection', observed_at: report.observed_at, evidence: [] }] })));
  report.explanation = { source: 'deterministic', ai_status: 'unavailable', model: 'gemini-3.5-flash-lite',
    evidence_ids: [], text: report.summary };
  return report;
}

test('waits for tracked completion, then presents compact tabs and inspectable source cards', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'desktop-chrome') await page.setViewportSize({ width: 1440, height: 1050 });
  const final = completeReport();
  const pending = structuredClone(final);
  pending.engines[3].status = 'pending'; pending.engines[3].targets[0].status = 'pending';
  pending.coverage = { ...pending.coverage, pending: 1, unavailable: 3 };
  pending.deep_scan = { poll_path: `/api/scans/${pending.scan_id}`, next_poll_at: new Date(Date.now() + 10_000).toISOString(), expires_at: new Date(Date.now() + 60_000).toISOString() };
  let polls = 0;
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes('/api/scans/')) polls++;
    await route.fulfill({ json: path.endsWith('/api/ping') ? { status: 'ok' } : path.includes('/api/scans/') ? final : pending });
  });
  await page.clock.install();
  await page.goto('/');
  await page.getByLabel('URL to inspect').fill(final.url);
  await page.getByRole('button', { name: 'Analyze URL' }).click();
  await expect(page.getByTestId('scan-progress')).toBeVisible();
  await expect(page.getByTestId('verdict')).toHaveCount(0);
  await expect(page.getByRole('tab')).toHaveCount(0);
  await page.clock.fastForward(11_000);
  await expect(page.getByTestId('verdict')).toBeVisible();
  await expect(page.getByTestId('scan-progress')).toHaveCount(0);
  expect(polls).toBe(1);
  await expect(page.getByRole('tab')).toHaveCount(4);
  await page.screenshot({ path: testInfo.outputPath('compact-overview.png'), fullPage: true });
  if (testInfo.project.name === 'desktop-chrome') {
    const box = await page.locator('.report-workspace').boundingBox();
    expect(box.width).toBeGreaterThan(1100);
    expect(box.height).toBeLessThan(1400);
  }
  await page.getByRole('tab', { name: 'Sources 7' }).click();
  await expect(page.locator('.report-source-grid > button')).toHaveCount(7);
  const source = page.getByRole('button', { name: /VirusTotal/ });
  await source.click();
  const dialog = page.getByRole('dialog', { name: 'VirusTotal' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Requested targets (1)')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(source).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('compact-sources.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations;
  expect(violations).toEqual([]);
});

test('initial waiting screen can be cancelled without publishing a late response', async ({ page }) => {
  let respond;
  const gate = new Promise(resolve => { respond = resolve; });
  await page.route('**/api/**', async route => {
    if (route.request().url().endsWith('/api/ping')) { await route.fulfill({ json: { status: 'ok' } }); return; }
    await gate;
    await route.fulfill({ json: completeReport() }).catch(() => {});
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Pause decorative animation/ })).toHaveCount(0);
  await page.getByLabel('URL to inspect').fill('https://example.com/');
  await page.getByRole('button', { name: 'Analyze URL' }).click();
  await expect(page.getByTestId('scan-progress')).toBeVisible();
  await expect(page.getByText('Awaiting response')).toHaveCount(7);
  await page.getByRole('button', { name: 'Cancel request' }).click();
  respond();
  await expect(page.getByRole('alert')).toContainText('Request cancelled');
  await expect(page.getByTestId('verdict')).toHaveCount(0);
  await expect(page.getByLabel('URL to inspect')).toBeVisible();
});

test('independent Gemini review is opt-in and exposes its caution with model provenance', async ({ page }) => {
  const report = completeReport();
  report.verdict = 'suspicious';
  report.summary = 'This URL has warning signals that require independent verification.';
  report.engines.push({ id: 'gemini-url', name: 'Gemini URL assessment', kind: 'model', status: 'detected',
    observed_at: report.observed_at, evidence: [], targets: [{ url: report.url, status: 'detected',
      observed_at: report.observed_at, evidence: [], message: 'Gemini flagged URL structure for independent review.',
      data: { status: 'risk_signal', source: 'gemini', model: 'gemini-3.5-flash-lite', prompt_version: 'url-risk-v1', reason_codes: ['deceptive_host'] } }] });
  await page.route('**/api/**', async route => {
    if (route.request().url().endsWith('/api/verify')) expect(route.request().postDataJSON().gemini_assessment).toBe(true);
    await route.fulfill({ json: route.request().url().endsWith('/api/ping') ? { status: 'ok' } : report });
  });
  await page.goto('/');
  const option = page.getByRole('checkbox', { name: /Include independent Gemini URL review/ });
  await expect(option).not.toBeChecked();
  await option.check();
  await page.getByLabel('URL to inspect').fill(report.url);
  await page.getByRole('button', { name: 'Analyze URL' }).click();
  await expect(page.getByRole('heading', { name: 'Suspicious URL' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Independent Gemini URL review' })).toContainText('Gemini raised caution');
  await page.getByRole('tab', { name: 'Model & AI' }).click();
  const panel = page.getByRole('region', { name: 'Independent Gemini URL review' });
  await expect(panel).toContainText('gemini-3.5-flash-lite');
  await expect(panel).toContainText('It did not inspect page content');
});

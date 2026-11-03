import { test, expect } from '@playwright/test';

function report(verdict = 'unknown', input = 'https://example.com/') {
  const now = new Date().toISOString();
  const url = new URL(input).href;
  const engines = ['gsb', 'urlhaus', 'virustotal', 'cloudflare'].map(id => ({
    id, name: id, kind: id === 'cloudflare' ? 'active' : 'reputation', status: 'unavailable',
    observed_at: now, evidence: [], message: 'Provider is not configured.',
    targets: [{ url, status: 'unavailable', observed_at: now, evidence: [] }],
  }));
  const reasons = verdict === 'suspicious' ? [{
    id: 'brand-impersonation', source: 'URL heuristics', title: 'Brand outside its official domain',
    description: 'PayPal appears in a subdomain of example.com, which is not an official PayPal domain.',
    severity: 'warning', threat_type: 'suspicious_structure', observed_at: now, target_url: url,
  }] : [];
  return {
    schema_version: 2, policy_version: '2026-11-evidence-v1',
    scan_id: '9d9f25cf-daf3-4f44-ab50-e81509f7e990', url, checked_urls: [url], dual_protocol: false,
    domain: { hostname: new URL(url).hostname, registrable_domain: 'example.com', unicode_hostname: new URL(url).hostname, is_ip: false },
    verdict, summary: verdict === 'suspicious' ? 'This URL contains a deceptive brand reference. Avoid entering credentials.' : 'There is not enough fresh threat intelligence to assess this URL.',
    reasons, engines, cloudflare_reports: [],
    coverage: { total: 4, completed: 0, detected: 0, no_detection: 0, unavailable: 4, error: 0, pending: 0, unknown: 0, sufficient: false },
    whois: { registrar: null, creation_date: null, source: null, observed_at: null },
    observed_at: now, expires_at: new Date(Date.now() + 300_000).toISOString(), cached: false,
    privacy: { sensitive_parameters: false, third_party_submission: false },
  };
}

async function mockApi(page, response) {
  await page.route('**/api/**', async route => {
    const payload = route.request().url().includes('/api/ping') ? { status: 'ok' } : response;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(payload) });
  });
}

test('provider outage stays unknown with real coverage and no synthetic telemetry', async ({ page }, testInfo) => {
  await mockApi(page, report());
  await page.goto('/');
  await page.getByLabel(/url to inspect/i).fill('https://example.com/');
  await page.getByRole('button', { name: /analyze|scan url/i }).click();
  await expect(page.getByRole('heading', { name: /unable to determine/i })).toBeVisible();
  await expect(page.getByText(/safe to visit|very safe/i)).toHaveCount(0);
  await expect(page.getByText('No inference performed')).toBeVisible();
  await expect(page.getByText(/104\.21\.57\.174|800\+ ACTIVE SOURCES|18 GLOBAL DATABASES/)).toHaveCount(0);
  await expect(page.getByText('example.com', { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('unknown-report.png'), fullPage: true });
});

test('brand impersonation is prominent and the actual domain remains visible', async ({ page }) => {
  const input = 'https://paypal.com.verify-account.example.com/login';
  await mockApi(page, report('suspicious', input));
  await page.goto('/');
  await page.getByLabel(/url to inspect/i).fill(input);
  await page.getByRole('button', { name: /analyze|scan url/i }).click();
  await expect(page.getByRole('heading', { name: /suspicious url/i })).toBeVisible();
  await expect(page.getByText('Brand outside its official domain', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('example.com', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/safe to visit|very safe/i)).toHaveCount(0);
});

test('legacy responses produce an error rather than an implicit clean verdict', async ({ page }) => {
  await mockApi(page, { url: 'https://example.com/', is_phishing: false });
  await page.goto('/');
  await page.getByLabel(/url to inspect/i).fill('https://example.com/');
  await page.getByRole('button', { name: /analyze|scan url/i }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText(/safe to visit|very safe|no known threats detected/i)).toHaveCount(0);
});

test('sensitive URLs require an explicit acknowledgement before any scan submission', async ({ page }) => {
  const input = 'https://example.com/?token=private-value';
  let submissions = 0;
  await page.route('**/api/**', async route => {
    if (route.request().url().endsWith('/api/verify')) {
      submissions++;
      expect(route.request().postDataJSON().sensitive_url_consent).toBe(true);
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(route.request().url().endsWith('/api/ping') ? { status: 'ok' } : report('unknown', input)) });
  });
  await page.goto('/');
  await page.getByLabel(/url to inspect/i).fill(input);
  await expect(page.getByRole('button', { name: 'Analyze URL' })).toBeDisabled();
  expect(submissions).toBe(0);
  await page.getByRole('checkbox', { name: /I understand this URL/i }).check();
  await page.getByRole('button', { name: 'Analyze URL' }).click();
  await expect(page.getByTestId('verdict')).toHaveText('Unable to determine');
  expect(submissions).toBe(1);
});

test('opt-in history is redacted, clearable and keyboard accessible with reduced motion', async ({ page }) => {
  const input = 'https://example.com/search?q=private-search';
  await mockApi(page, report('unknown', input));
  await page.goto('/');
  await page.getByRole('checkbox', { name: /Remember redacted scans/i }).check();
  await page.getByLabel(/url to inspect/i).fill(input);
  await page.getByRole('button', { name: 'Analyze URL' }).click();
  await expect(page.getByTestId('verdict')).toHaveText('Unable to determine');
  const button = page.getByRole('button', { name: 'Recent scans' });
  await button.click();
  const dialog = page.getByRole('dialog', { name: 'Scan history' });
  await expect(dialog.getByText(/%5Bredacted%5D/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('phishx_history_v2'))).not.toContain('private-search');
  await dialog.getByRole('button', { name: 'Clear history' }).click();
  await expect(dialog.getByText(/No saved scans/i)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();
});

test('stopping active report updates preserves uncertainty and prevents polling', async ({ page }) => {
  let polls = 0;
  const initial = report();
  initial.engines[3].status = 'pending'; initial.engines[3].targets[0].status = 'pending';
  Object.assign(initial.coverage, { pending: 1, unavailable: 3 });
  initial.deep_scan = { poll_path: `/api/scans/${initial.scan_id}`, next_poll_at: new Date(Date.now() + 10_000).toISOString(), expires_at: initial.expires_at };
  await page.route('**/api/**', async route => {
    if (route.request().url().includes('/api/scans/')) polls++;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(route.request().url().endsWith('/api/ping') ? { status: 'ok' } : initial) });
  });
  await page.clock.install();
  await page.goto('/');
  await page.getByLabel(/url to inspect/i).fill(initial.url);
  await page.getByRole('button', { name: 'Analyze URL' }).click();
  await page.getByRole('button', { name: 'Stop report updates' }).click();
  await page.clock.fastForward(20_000);
  await expect(page.getByTestId('verdict')).toHaveText('Unable to determine');
  await expect(page.getByText(/Report updates stopped/i)).toBeVisible();
  expect(polls).toBe(0);
});

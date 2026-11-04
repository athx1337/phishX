import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ResultsDashboard from '../src/components/ResultsDashboard';
import { scanReport, evidence } from './fixtures';

function richReport() {
  const r = scanReport(); const second = 'http://example.com/login'; r.checked_urls.push(second); r.dual_protocol = true;
  r.engines.forEach(e => e.targets.push({ ...e.targets[0], url: second, error_code: 'fixture_target_error', message: 'Detailed target failure message.' }));
  Object.assign(r.engines[0], { status: 'error', error_code: 'fixture_provider_failure', message: 'Full provider error message retained inside the inspector.' });
  r.engines.push({ id: 'xgboost', name: 'XGBoost URL model', kind: 'model', status: 'unknown', observed_at: r.observed_at, evidence: [], targets: [{ url: r.url, status: 'unknown', observed_at: r.observed_at, expires_at: r.expires_at, evidence: [evidence({ id: 'selected-model-observation', title: 'Selected model observation' })], data: { model_version: 'native-model-fixture', features_version: 'fixture-features', raw_score: .1234, calibrated_score: .4321, warning_threshold: .91, promoted: false, provider_field: 'preserved raw data' } }] });
  r.engines.push({ id: 'registration', name: 'Domain registration', kind: 'heuristic', status: 'no_detection', observed_at: r.observed_at, evidence: [], targets: [{ url: r.url, status: 'no_detection', observed_at: r.observed_at, evidence: [] }] });
  r.registration = { source: 'Fixture Registry', registrar: 'Fixture Registrar', created_at: '2020-01-01T00:00:00Z', age_days: 2000, status: 'available', observed_at: r.observed_at };
  r.reasons = Array.from({ length: 6 }, (_, i) => evidence({ id: `finding-${i}`, title: `Recorded finding ${i}` }));
  r.explanation = { source: 'gemini', ai_status: 'complete', model: 'fixture-current-model', evidence_ids: ['finding-5'], text: 'Detailed grounded explanation. '.repeat(25) + 'Complete final explanation sentence.' };
  r.cloudflare_reports = [{ url: r.url, source: 'Cloudflare URL Scanner', observed_at: r.observed_at, ip: '192.0.2.10', asn: 'AS64500 Fixture Network', country: 'IN', final_url: 'https://destination.example/', redirect_chain: [r.url, 'https://destination.example/'], certificates: [{ subject: 'Fixture certificate subject', issuer: 'Fixture issuer', valid_from: r.observed_at, valid_to: r.expires_at }], requests: [{ url: 'https://destination.example/request', method: 'POST', status: 403, ip: '192.0.2.11' }], risks: [evidence({ title: 'Recorded browser risk' })], links: ['https://untrusted.example/observed-link'] }];
  r.engines.slice(-2).forEach(e => e.targets.push({ ...e.targets[0], url: second }));
  r.coverage = { ...r.coverage, unavailable: 3, error: 1 };
  r.destinations = [{ url: 'https://destination.example/', domain: { hostname: 'destination.example', unicode_hostname: 'destination.example', registrable_domain: 'destination.example', is_ip: false }, verdict: 'suspicious', summary: 'Destination evidence summary.', reasons: [evidence({ title: 'Destination finding' })], coverage: { total: 0, completed: 0, detected: 0, no_detection: 0, pending: 0, unavailable: 0, error: 0, unknown: 0, sufficient: false }, engines: [], observed_at: r.observed_at, expires_at: r.expires_at }];
  return r;
}
function show(result = richReport(), props = {}) { return render(<ResultsDashboard result={result} resetScan={vi.fn()} onRescan={vi.fn()} {...props} />); }

describe('compact report workspace', () => {
  it('announces failed polling as an alert and explicit stop as a status', () => {
    const result = scanReport();
    const view = show(result, { pollError: 'Status checks failed.', completionReason: 'Status checks failed.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Status checks failed.');
    view.rerender(<ResultsDashboard result={result} resetScan={vi.fn()} onRescan={vi.fn()} pollError="Status checks failed." pollingStopped />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Partial report').closest('[role]')).toHaveAttribute('role', 'status');
  });
  it('keeps summary mounted and supports arrows, Home and End', () => {
    show(); const overview = screen.getByRole('tab', { name: 'Overview' }); overview.focus(); fireEvent.keyDown(overview, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Sources 7' })).toHaveFocus(); expect(screen.getByRole('tab', { name: 'Sources 7' })).toHaveAttribute('aria-selected', 'true'); expect(screen.getByTestId('registrable-domain')).toHaveTextContent('example.com');
    fireEvent.keyDown(document.activeElement, { key: 'End' }); expect(screen.getByRole('tab', { name: 'Model & AI' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement, { key: 'Home' }); expect(overview).toHaveFocus(); fireEvent.keyDown(overview, { key: 'ArrowLeft' }); expect(screen.getByRole('tab', { name: 'Model & AI' })).toHaveFocus();
    expect(screen.getAllByRole('tab').filter(tab => tab.tabIndex === 0)).toHaveLength(1); expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', document.activeElement.id);
  });
  it('derives seven cards and inspects every source kind with full metadata and focus restoration', async () => {
    const user = userEvent.setup(); const r = richReport(); show(r); await user.click(screen.getByRole('tab', { name: 'Sources 7' }));
    for (const engine of r.engines) {
      const trigger = screen.getByRole('button', { name: new RegExp(engine.name) }); await user.click(trigger); const dialog = screen.getByRole('dialog', { name: engine.name }); expect(within(dialog).getByText(`Requested targets (${engine.targets.length})`)).toBeInTheDocument();
      if (engine.kind === 'model') { expect(within(dialog).getAllByText('native-model-fixture')[0]).toBeInTheDocument(); for (const score of ['0.1234', '0.4321', '0.9100']) expect(within(dialog).getAllByText(score)[0]).toBeInTheDocument(); expect(within(dialog).getAllByText(/shadow mode/)[0]).toBeInTheDocument(); await user.click(within(dialog).getAllByText('Complete source data')[0]); expect(within(dialog).getAllByText(/preserved raw data/)[0]).toBeVisible(); }
      if (engine.id === 'gsb') { expect(within(dialog).getByText('fixture_provider_failure')).toBeInTheDocument(); expect(within(dialog).getByText('Full provider error message retained inside the inspector.')).toBeInTheDocument(); expect(within(dialog).getByText('fixture_target_error')).toBeInTheDocument(); expect(within(dialog).getByText('http://example.com/login')).toBeInTheDocument(); }
      if (engine.id === 'registration') expect(within(dialog).getByText('Fixture Registry')).toBeInTheDocument();
      await user.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
    }
  });
  it('reveals full assistant text and cross-tab links focus visible selected evidence beyond initial finding group', async () => {
    const user = userEvent.setup(); show(); expect(screen.queryByText(/Complete final explanation sentence/)).not.toBeInTheDocument(); await user.click(screen.getByRole('button', { name: 'Read full explanation' })); expect(screen.getByText(/Complete final explanation sentence/)).toBeInTheDocument();
    for (const [title, id] of [['Recorded finding 5', 'finding-5']]) { await user.click(screen.getByRole('tab', { name: 'Model & AI' })); await user.click(screen.getByRole('link', { name: title })); expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true'); expect(document.activeElement).toHaveAttribute('id', `evidence-${id}`); }
  });
  it('retains browser network facts, all collections and destination evidence without untrusted links', () => {
    show(); fireEvent.click(screen.getByRole('tab', { name: 'Browser' })); expect(screen.getByText('192.0.2.10')).toBeInTheDocument(); expect(screen.getByText('AS64500 Fixture Network')).toBeInTheDocument(); expect(screen.getByText('Destination evidence summary.')).toBeInTheDocument(); expect(screen.getByText('Destination finding')).toBeInTheDocument();
    const selector = screen.getByLabelText('Observation view');
    for (const [value, text] of [['Certificates', 'Fixture certificate subject'], ['HTTP transactions', 'https://destination.example/request'], ['Reported risks', 'Recorded browser risk'], ['Observed links', 'https://untrusted.example/observed-link']]) { fireEvent.change(selector, { target: { value } }); expect(screen.getByText(text)).toBeInTheDocument(); }
    expect(document.querySelector('a[href^="http"]')).toBeNull();
  });
  it('distinguishes pending, unknown and failures while preserving partial reason', () => {
    const r = richReport(); r.engines[1].status = 'pending'; r.coverage.pending = 1; r.coverage.unavailable = 2; show(r, { completionReason: 'The inspection deadline elapsed.' }); expect(screen.getByText('Partial report')).toBeInTheDocument(); expect(screen.getByText('The inspection deadline elapsed.')).toBeInTheDocument(); fireEvent.click(screen.getByRole('tab', { name: 'Sources 7' })); for (const status of ['Pending', 'Unknown / stale', 'Check failed']) expect(screen.getByText(status)).toBeInTheDocument(); expect(screen.queryByText(/will update/)).not.toBeInTheDocument();
  });
  it.each(['malicious', 'suspicious', 'no_known_threats'])('qualifies expired %s evidence', verdict => { const report = scanReport({ verdict }); if (verdict === 'no_known_threats') { report.engines.slice(0, 2).forEach(engine => { engine.status = 'no_detection'; engine.targets[0].status = 'no_detection'; }); Object.assign(report.coverage, { completed: 2, no_detection: 2, unavailable: 2, sufficient: true }); } show(report, { expired: true }); expect(screen.getByRole('alert')).toHaveTextContent('Report expired'); expect(screen.getByTestId('verdict')).toHaveTextContent(verdict === 'no_known_threats' ? 'Report expired' : verdict === 'malicious' ? 'Malicious URL' : 'Suspicious URL'); expect(screen.getByRole('button', { name: 'Refresh report' })).toBeEnabled(); });
});

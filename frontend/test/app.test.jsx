import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { pingApi, pollScan, requestScan } from '../src/lib/api';
import { scanReport } from './fixtures';

vi.mock('../src/lib/api', () => ({ pingApi: vi.fn(), pollScan: vi.fn(), requestScan: vi.fn() }));

beforeEach(() => {
  pingApi.mockReset().mockResolvedValue({ status: 'ok' });
  requestScan.mockReset(); pollScan.mockReset();
});

async function submit(url = 'https://example.com/login') {
  const input = screen.getByLabelText('URL to inspect');
  fireEvent.change(input, { target: { value: url } });
  await act(async () => { fireEvent.submit(input.closest('form')); });
}

function pendingReport() {
  const report = scanReport();
  const cf = report.engines.find(engine => engine.kind === 'active');
  cf.status = 'pending'; cf.targets.forEach(target => { target.status = 'pending'; });
  report.coverage = { ...report.coverage, unavailable: 3, pending: 1 };
  report.deep_scan = {
    poll_path: `/api/scans/${report.scan_id}`,
    next_poll_at: new Date(Date.now() + 10_000).toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  return report;
}

function noThreatReport(expiresAt) {
  const report = scanReport({ expires_at: expiresAt, cached: true });
  report.engines = report.engines.map((engine, index) => index < 2 ? {
    ...engine, status: 'no_detection', targets: engine.targets.map(target => ({ ...target, status: 'no_detection', expires_at: expiresAt })),
  } : engine);
  report.coverage = { ...report.coverage, completed: 2, no_detection: 2, unavailable: 2, sufficient: true };
  report.verdict = 'no_known_threats';
  return report;
}

describe('scanner workflow', () => {
  it('does not gate scanning on an unavailable health check', async () => {
    pingApi.mockRejectedValue(new Error('offline'));
    requestScan.mockResolvedValue(scanReport());
    render(<App />);
    await submit();
    expect(requestScan).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('verdict')).toHaveTextContent('Unable to determine');
    expect(screen.queryByText(/WAKING CLOUD BACKEND/)).not.toBeInTheDocument();
  });

  it('requires sensitive-input acknowledgement before forwarding a URL', async () => {
    const user = userEvent.setup();
    const url = 'https://example.com/reset?token=private-value';
    requestScan.mockResolvedValue(scanReport({ url, privacy: { sensitive_parameters: true, third_party_submission: true } }));
    render(<App />);
    fireEvent.change(screen.getByLabelText('URL to inspect'), { target: { value: url } });
    expect(screen.getByRole('button', { name: 'Analyze URL' })).toBeDisabled();
    expect(requestScan).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox', { name: /I understand this URL/ }));
    await user.click(screen.getByRole('button', { name: 'Analyze URL' }));
    expect(requestScan).toHaveBeenCalledWith(expect.objectContaining({ url, sensitive_url_consent: true }), expect.any(Object));
  });

  it('stores redacted opt-in history and clears it through the dialog', async () => {
    const user = userEvent.setup();
    const url = 'https://example.com/page?tracking=private-query-value';
    requestScan.mockResolvedValue(scanReport({ url }));
    render(<App />);
    await user.click(screen.getByRole('checkbox', { name: /Remember redacted scans/ }));
    await submit(url);
    const stored = localStorage.getItem('phishx_history_v2');
    expect(stored).not.toContain('private-query-value');
    expect(JSON.parse(stored)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Recent scans' }));
    expect(screen.getByRole('dialog', { name: 'Scan history' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear history' }));
    expect(screen.getByText(/No saved scans/)).toBeInTheDocument();
    expect(localStorage.getItem('phishx_history_v2')).toBeNull();
  });

  it('cancels a pending request and suppresses its late response', async () => {
    let resolve;
    requestScan.mockImplementation(() => new Promise(done => { resolve = done; }));
    render(<App />);
    await submit();
    const signal = requestScan.mock.calls[0][1].signal;
    fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve(scanReport()); });
    expect(screen.queryByTestId('verdict')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/Request cancelled/);
  });

  it('refreshes the current URL with an explicit cache bypass', async () => {
    requestScan.mockResolvedValue(scanReport());
    render(<App />); await submit();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh report' }));
    await waitFor(() => expect(requestScan).toHaveBeenCalledTimes(2));
    expect(requestScan.mock.calls[1][0]).toMatchObject({ url: 'https://example.com/login', refresh: true });
  });

  it('rejects a polling response for a different inspection scope', async () => {
    vi.useFakeTimers();
    requestScan.mockResolvedValue(pendingReport());
    pollScan.mockResolvedValue(scanReport({ scan_id: '7af105aa-a173-466f-8d32-f104833456bb' }));
    render(<App />); await submit();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_010); });
    expect(pollScan).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent(/different URL or inspection scope/);
    expect(screen.getByTestId('verdict')).toHaveTextContent('Unable to determine');
  });

  it('stops further polling when the user stops report updates', async () => {
    vi.useFakeTimers(); requestScan.mockResolvedValue(pendingReport());
    render(<App />); await submit();
    fireEvent.click(screen.getByRole('button', { name: 'Stop waiting and view partial report' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(pollScan).not.toHaveBeenCalled();
    expect(screen.getByText(/Pending observations remain unverified/)).toBeInTheDocument();
  });

  it('retries a temporarily missing job within a bounded lifecycle', async () => {
    vi.useFakeTimers();
    requestScan.mockResolvedValue(pendingReport());
    pollScan.mockRejectedValueOnce(Object.assign(new Error('Job not visible yet'), { status: 404 })).mockResolvedValueOnce(scanReport());
    render(<App />); await submit();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_010); });
    expect(screen.getByText(/Retrying \(1\/3\)/)).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_010); });
    expect(pollScan).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Stop waiting and view partial report' })).not.toBeInTheDocument();
    expect(screen.getByTestId('verdict')).toHaveTextContent('Unable to determine');
  });

  it('turns an expired cached negative into a neutral historical report and allows refresh', async () => {
    vi.useFakeTimers();
    requestScan.mockResolvedValueOnce(noThreatReport(new Date(Date.now() + 2000).toISOString()));
    render(<App />); await submit();
    expect(screen.getByTestId('verdict')).toHaveTextContent('No threat matches returned');
    await act(async () => { await vi.advanceTimersByTimeAsync(2010); });
    expect(screen.getByTestId('verdict')).toHaveTextContent('Report expired');
    expect(screen.getByTestId('verdict')).toHaveClass('text-slate-200');
    expect(screen.getByRole('alert')).toHaveTextContent('Report expired — refresh to assess current evidence.');
    expect(screen.getByText(/Historical assessment: No threat matches returned/)).toBeInTheDocument();
    expect(screen.queryByText('Report unavailable')).not.toBeInTheDocument();
    expect(screen.getByText(/Historical snapshot/)).toBeInTheDocument();
    requestScan.mockResolvedValueOnce(noThreatReport(new Date(Date.now() + 60_000).toISOString()));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refresh report' })); });
    expect(requestScan.mock.calls[1][0]).toMatchObject({ refresh: true });
    expect(screen.getByTestId('verdict')).toHaveTextContent('No threat matches returned');
    expect(screen.queryByText(/Historical assessment:/)).not.toBeInTheDocument();
  });

  it('preserves a positive warning after its snapshot expires', async () => {
    vi.useFakeTimers();
    requestScan.mockResolvedValue(scanReport({ verdict: 'suspicious', expires_at: new Date(Date.now() + 1000).toISOString() }));
    render(<App />); await submit();
    await act(async () => { await vi.advanceTimersByTimeAsync(1010); });
    expect(screen.getByTestId('verdict')).toHaveTextContent('Suspicious URL');
    expect(screen.getByText(/Expiry does not establish that the threat has gone away/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/Report expired/);
  });

  it('aborts an in-flight poll at the job deadline and ignores its late clean result', async () => {
    vi.useFakeTimers();
    const pending = pendingReport();
    pending.deep_scan.expires_at = new Date(Date.now() + 12_000).toISOString();
    requestScan.mockResolvedValue(pending);
    let finishPoll;
    pollScan.mockImplementation(() => new Promise(resolve => { finishPoll = resolve; }));
    render(<App />); await submit();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_010); });
    expect(pollScan).toHaveBeenCalledTimes(1);
    const signal = pollScan.mock.calls[0][1].signal;
    await act(async () => { await vi.advanceTimersByTimeAsync(2010); });
    expect(signal.aborted).toBe(true);
    await act(async () => { finishPoll(noThreatReport(new Date(Date.now() + 60_000).toISOString())); });
    expect(screen.getByRole('alert')).toHaveTextContent(/Active inspection expired/);
    expect(screen.getByTestId('verdict')).toHaveTextContent('Unable to determine');
    expect(screen.queryByRole('button', { name: 'Stop waiting and view partial report' })).not.toBeInTheDocument();
  });
});


describe('completion-first scan session', () => {
  it('keeps provisional results behind live progress until the last tracked job clears', async () => {
    vi.useFakeTimers(); requestScan.mockResolvedValue(pendingReport()); pollScan.mockResolvedValue(scanReport());
    render(<App />); await submit();
    expect(screen.getByTestId('scan-progress')).toBeInTheDocument();
    expect(screen.queryByTestId('verdict')).not.toBeInTheDocument();
    expect(screen.getByText('4 / 5 returned')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_010); });
    expect(screen.queryByTestId('scan-progress')).not.toBeInTheDocument();
    expect(screen.getByTestId('verdict')).toHaveTextContent('Unable to determine');
    expect(pollScan).toHaveBeenCalledTimes(1);
  });
  it('waits for a returned job even when its current source statuses are terminal', async () => {
    vi.useFakeTimers(); const waiting = pendingReport();
    waiting.engines = scanReport().engines; waiting.coverage = scanReport().coverage;
    requestScan.mockResolvedValue(waiting); pollScan.mockResolvedValue(scanReport());
    render(<App />); await submit();
    expect(screen.queryByTestId('verdict')).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_010); });
    expect(screen.getByTestId('verdict')).toBeInTheDocument();
  });
  it('releases orphaned pending observations as partial instead of waiting forever', async () => {
    const orphan = pendingReport(); delete orphan.deep_scan;
    requestScan.mockResolvedValue(orphan); render(<App />); await submit();
    expect(screen.queryByTestId('scan-progress')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/no trackable job/);
    expect(screen.getByTestId('verdict')).toHaveTextContent('Unable to determine');
    expect(pollScan).not.toHaveBeenCalled();
  });
  it('never extends the original deadline when later polling offers a longer one', async () => {
    vi.useFakeTimers(); const first = pendingReport(); first.deep_scan.expires_at = new Date(Date.now() + 20_000).toISOString();
    const later = pendingReport(); later.deep_scan.expires_at = new Date(Date.now() + 180_000).toISOString(); later.deep_scan.next_poll_at = new Date(Date.now() + 40_000).toISOString();
    requestScan.mockResolvedValue(first); pollScan.mockResolvedValue(later);
    render(<App />); await submit(); await act(async () => { await vi.advanceTimersByTimeAsync(10_010); });
    expect(screen.queryByTestId('verdict')).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_010); });
    expect(screen.getByRole('alert')).toHaveTextContent(/Active inspection expired/);
    expect(screen.getByTestId('verdict')).toHaveTextContent('Unable to determine');
    expect(pollScan).toHaveBeenCalledTimes(1);
  });
  it('saves only the accepted published snapshot to opted-in history', async () => {
    vi.useFakeTimers(); requestScan.mockResolvedValue(pendingReport()); pollScan.mockResolvedValue(scanReport());
    const { readHistory } = await import('../src/lib/history');
    render(<App />); fireEvent.click(screen.getByRole('checkbox', { name: /Remember redacted scans/ })); await submit();
    expect(readHistory()).toHaveLength(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_010); });
    expect(readHistory()).toHaveLength(1);
  });
  it('ignores an old poll after an explicit partial exit and reset', async () => {
    vi.useFakeTimers(); let resolve;
    requestScan.mockResolvedValue(pendingReport()); pollScan.mockImplementation(() => new Promise(done => { resolve = done; }));
    render(<App />); await submit(); await act(async () => { await vi.advanceTimersByTimeAsync(10_010); });
    const signal = pollScan.mock.calls[0][1].signal;
    fireEvent.click(screen.getByRole('button', { name: 'Stop waiting and view partial report' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check another URL' }));
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve(noThreatReport(new Date(Date.now() + 60_000).toISOString())); });
    expect(screen.queryByTestId('verdict')).not.toBeInTheDocument();
    expect(screen.getByLabelText('URL to inspect')).toBeInTheDocument();
  });
});

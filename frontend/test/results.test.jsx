import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResultsDashboard from '../src/components/ResultsDashboard';
import { scanReport, evidence } from './fixtures';
import HUDCard from '../src/components/HUDCard';
import { ModelObservation } from '../src/components/AnalysisExtensions';

function completedReport() {
  const report = scanReport();
  report.engines = report.engines.map((engine, index) => index < 2 ? {
    ...engine, status: 'no_detection', targets: engine.targets.map(target => ({ ...target, status: 'no_detection', expires_at: report.expires_at })),
  } : engine);
  report.coverage = { ...report.coverage, completed: 2, no_detection: 2, unavailable: 2, sufficient: true };
  report.verdict = 'no_known_threats';
  return report;
}

function show(report) { return render(<ResultsDashboard result={report} resetScan={vi.fn()} onRescan={vi.fn()} />); }

describe('evidence-first results', () => {
  it('distinguishes successful shadow inference from unavailable model execution', () => {
    const model = { id: 'xgboost', kind: 'model', status: 'unknown', targets: [{ url: 'https://example.com/', status: 'unknown', data: { promoted: false, model_version: 'test-model', calibrated_score: .8 } }] };
    const result = scanReport(); result.engines.push(model);
    render(<><HUDCard type="model" result={result} /><ModelObservation engine={model} /></>);
    expect(screen.getByText('Shadow inference only')).toBeInTheDocument();
    expect(screen.getByText(/predictions do not affect the verdict/)).toBeInTheDocument();
    expect(screen.queryByText(/inference was not available|Inference unavailable/)).not.toBeInTheDocument();
  });
  it('does not reassure when every external provider is unavailable', () => {
    show(scanReport());
    expect(screen.getByTestId('verdict')).toHaveTextContent('Unable to determine');
    expect(screen.getByText('0 of 4 remote providers completed')).toBeInTheDocument();
    expect(screen.getByText(/Missing evidence does not establish safety/)).toBeInTheDocument();
    expect(screen.queryByText(/SAFE TO VISIT|VERY SAFE|800\+ ACTIVE SOURCES|18 GLOBAL DATABASES/i)).not.toBeInTheDocument();
    expect(screen.getByText(/No completed Cloudflare browser report/)).toBeInTheDocument();
    expect(screen.queryByText('104.21.57.174')).not.toBeInTheDocument();
  });

  it('places impersonation evidence beside the actual domain and warning', () => {
    show(scanReport({ verdict: 'suspicious', reasons: [evidence()], url: 'https://paypal.com.verify-account.example.com/login' }));
    expect(screen.getByTestId('verdict')).toHaveTextContent('Suspicious URL');
    expect(screen.getByTestId('registrable-domain')).toHaveTextContent('example.com');
    expect(screen.getByText('Brand outside its official domain')).toBeInTheDocument();
    expect(screen.getByText(/Do not enter credentials/)).toBeInTheDocument();
  });

  it('gives a malicious finding precedence over other missing checks', () => {
    show(scanReport({ verdict: 'malicious', reasons: [evidence({ severity: 'high', threat_type: 'malware', source: 'URLhaus', title: 'Malware distribution record' })] }));
    expect(screen.getByTestId('verdict')).toHaveTextContent('Malicious URL');
    expect(screen.getByText(/Avoid this URL/)).toBeInTheDocument();
    expect(screen.getByText('Malware distribution record')).toBeInTheDocument();
  });

  it('qualifies a sufficiently covered negative instead of promising safety', () => {
    show(completedReport());
    expect(screen.getByTestId('verdict')).toHaveTextContent('No known threats detected');
    expect(screen.getByText(/not a guarantee of safety/)).toBeInTheDocument();
    expect(screen.getByText(/scheme alone does not verify a TLS connection/)).toBeInTheDocument();
    expect(screen.queryByText('SAFE TO VISIT')).not.toBeInTheDocument();
  });

  it('refuses a binary legacy response at render time', () => {
    show({ url: 'https://example.com/', is_phishing: false });
    expect(screen.getByRole('alert')).toHaveTextContent('Report unavailable');
    expect(screen.queryByTestId('verdict')).not.toBeInTheDocument();
  });

  it('states that pending and cancelled updates leave observations unverified', () => {
    render(<ResultsDashboard result={scanReport()} polling pollingStopped resetScan={vi.fn()} onRescan={vi.fn()} onCancelPolling={vi.fn()} />);
    expect(screen.getByText(/Active browser inspection is pending/)).toBeInTheDocument();
    expect(screen.getByText(/Pending observations remain unverified/)).toBeInTheDocument();
  });
});

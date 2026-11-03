import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResultsDashboard from '../src/components/ResultsDashboard';
import { scanReport } from './fixtures';

describe('accessible enriched evidence', () => {
  it('focuses and announces the official verdict and copies the actual domain', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<ResultsDashboard result={scanReport()} resetScan={vi.fn()} onRescan={vi.fn()} />);
    expect(screen.getByTestId('verdict')).toHaveFocus();
    expect(screen.getByText(/Assessment for example.com: Unable to determine/)).toHaveAttribute('aria-live', 'polite');
    fireEvent.click(screen.getByRole('button', { name: 'Copy actual domain' }));
    expect(await screen.findByText('Actual domain copied.')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('example.com');
  });
  it('displays real model provenance and warns that output is not a safety score', () => {
    const report = scanReport();
    report.engines.push({ id: 'xgboost', name: 'XGBoost URL model', kind: 'model', status: 'no_detection',
      observed_at: report.observed_at, evidence: [], targets: [{ url: report.url, observed_at: report.observed_at,
        status: 'no_detection', evidence: [], data: { model_version: 'fixture-native-model', features_version: 'lexical-v1', raw_score: 0.12, threshold: 0.9 } }] });
    render(<ResultsDashboard result={report} resetScan={vi.fn()} onRescan={vi.fn()} />);
    expect(screen.getByTestId('verdict')).toHaveTextContent('Unable to determine');
    expect(screen.getByText('fixture-native-model')).toBeInTheDocument();
    expect(screen.getByText(/not a safety score or a probability/)).toBeInTheDocument();
    expect(screen.getByText('0 of 4 remote providers completed')).toBeInTheDocument();
  });
});

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResultsDashboard from '../src/components/ResultsDashboard';
import { scanReport } from './fixtures';

function renderExplanation(explanation) {
  const report = scanReport();
  report.reasons = [{ id: 'known-observation', title: 'Recorded observation', description: 'Evidence from the original provider.', source: 'URL rules', severity: 'warning', threat_type: 'suspicious_structure', observed_at: report.observed_at, target_url: report.url }];
  report.verdict = 'suspicious';
  report.explanation = explanation;
  render(<ResultsDashboard result={report} resetScan={vi.fn()} onRescan={vi.fn()} />);
  return screen.getByRole('region', { name: 'Gemini AI explanation' });
}

describe('prominent grounded Gemini provenance', () => {
  it('shows validated Gemini completion, model and linked recorded evidence beside the verdict', () => {
    const panel = renderExplanation({ source: 'gemini', ai_status: 'complete', model: 'fixture-supported-model', evidence_ids: ['known-observation'], text: 'Recorded evidence supports this assessment.' });
    expect(within(panel).getByText('Gemini completed')).toBeInTheDocument();
    expect(within(panel).getByText(/Gemini selected recorded observations/)).toHaveTextContent('fixture-supported-model');
    expect(within(panel).getByRole('link', { name: 'Recorded observation' })).toHaveAttribute('href', '#evidence-known-observation');
    expect(screen.getByTestId('verdict')).toHaveTextContent('Suspicious URL');
    expect(screen.getByTestId('verdict').compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it.each([
    ['disabled', 'Disabled by the operator'], ['not_configured', 'Not configured'],
    ['unavailable', 'Temporarily unavailable'], ['rate_limited', 'Provider rate limit reached'],
    ['timeout', 'Provider timed out'], ['invalid_response', 'Provider response could not be validated'],
  ])('labels %s as deterministic fallback without claiming Gemini wrote it', (ai_status, label) => {
    const panel = renderExplanation({ source: 'deterministic', ai_status, evidence_ids: ['known-observation'], text: 'Preserved deterministic evidence.' });
    expect(within(panel).getByText(label)).toBeInTheDocument();
    expect(within(panel).getByText(/Gemini did not generate this explanation/)).toBeInTheDocument();
    expect(within(panel).queryByText(/Gemini selected/)).not.toBeInTheDocument();
    expect(within(panel).getByText('Preserved deterministic evidence.')).toBeInTheDocument();
  });
  it('keeps old deterministic reports readable without inventing an unavailable/disabled state', () => {
    const panel = renderExplanation({ source: 'deterministic', evidence_ids: [], text: 'Legacy explanation.' });
    expect(within(panel).getByText('Provider status not reported')).toBeInTheDocument();
    expect(within(panel).getByText('Legacy explanation.')).toBeInTheDocument();
  });
  it('does not claim a verified completion for legacy Gemini reports without status metadata', () => {
    const panel = renderExplanation({ source: 'gemini', evidence_ids: [], text: 'Legacy selected observations.' });
    expect(within(panel).getByText('Gemini selection · legacy status')).toBeInTheDocument();
    expect(within(panel).queryByText('Gemini completed')).not.toBeInTheDocument();
  });
});

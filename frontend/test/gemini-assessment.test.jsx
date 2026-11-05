import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import GeminiAssessment from '../src/components/GeminiAssessment';
import { scanReport } from './fixtures';

it('labels an independent URL warning with the model and its limited input scope', () => {
  const result = scanReport();
  result.engines.push({ id: 'gemini-url', targets: [{ message: 'Gemini flagged URL structure for review.',
    data: { status: 'risk_signal', reason_codes: ['deceptive_host', 'invented'], model: 'gemini-3.5-flash-lite', prompt_version: 'url-risk-v1' } }] });
  render(<GeminiAssessment result={result} />);
  expect(screen.getByText('Gemini raised caution')).toBeVisible();
  expect(screen.getByText('Potentially misleading hostname structure')).toBeVisible();
  expect(screen.queryByText('invented')).not.toBeInTheDocument();
  expect(screen.getByText(/It did not inspect page content/)).toBeVisible();
});

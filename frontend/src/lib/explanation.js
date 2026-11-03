const STATUS = {
  disabled: 'Disabled by the operator',
  not_configured: 'Not configured',
  unavailable: 'Temporarily unavailable',
  rate_limited: 'Provider rate limit reached',
  timeout: 'Provider timed out',
  invalid_response: 'Provider response could not be validated',
};

export function explanationStatus(explanation) {
  if (!explanation) return 'No explanation returned';
  if (explanation.source === 'gemini') return explanation.ai_status === 'complete' ? 'Gemini completed' : 'Gemini selection · legacy status';
  return STATUS[explanation.ai_status] || 'Provider status not reported';
}

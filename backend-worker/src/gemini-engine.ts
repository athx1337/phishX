import type { EngineResult } from '../../shared/scan';
import type { Bindings } from './types';
import type { ParsedInput } from './url';
import { assessGeminiUrl } from './gemini-assessment';
import { aggregate, evidence, target } from './evidence';

export const GEMINI_REASON_TEXT: Record<string, string> = {
  deceptive_host: 'The hostname has a potentially misleading structure.',
  credential_lure: 'Credential-related wording appears alongside a potentially misleading hostname.',
  brand_impersonation: 'The hostname may imitate a recognizable brand.',
  obfuscated_host: 'The hostname may conceal or disguise the destination.',
  suspicious_download: 'An executable path appears alongside suspicious URL context.',
};

export async function geminiEngine(input: ParsedInput, env: Bindings): Promise<EngineResult | undefined> {
  if (!input.geminiAssessment) return undefined;
  const result = await assessGeminiUrl(input, env);
  return aggregate('gemini-url', 'Gemini URL assessment', 'model', input.targets.map(url => {
    if (!result) return target(url, 'unavailable', {
      error_code: input.sensitive ? 'SENSITIVE_URL_SKIPPED' : 'GEMINI_NOT_CONFIGURED',
      message: input.sensitive ? 'Independent Gemini assessment is skipped for sensitive URLs.' : 'Independent Gemini assessment is not configured.',
    });
    const findings = result.status === 'risk_signal' ? result.reason_codes.map(code => evidence(
      'Gemini URL assessment', `gemini-url-${code}`, 'Gemini URL risk signal',
      `${GEMINI_REASON_TEXT[code]} This is a probabilistic URL-only assessment and needs independent verification.`,
      'warning', 'suspicious_structure', url,
    )) : [];
    return target(url, result.status === 'risk_signal' ? 'detected' : result.status === 'abstained' ? 'unknown' :
      result.status === 'unavailable' || result.status === 'rate_limited' ? 'unavailable' : 'error', {
      evidence: findings,
      data: { ...result, prompt_version: 'url-risk-v1' },
      message: result.status === 'risk_signal' ? 'Gemini flagged URL structure for independent review.' :
        result.status === 'abstained' ? 'Gemini abstained. It has no verified page or reputation evidence.' :
        'Gemini could not complete its independent assessment.',
    });
  }));
}

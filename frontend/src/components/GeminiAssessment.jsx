import { Sparkles } from 'lucide-react';

const REASONS = {
  deceptive_host: 'Potentially misleading hostname structure',
  credential_lure: 'Credential wording alongside a suspicious hostname',
  brand_impersonation: 'Possible brand imitation in the hostname',
  obfuscated_host: 'Possible concealment of the destination',
  suspicious_download: 'Executable path alongside suspicious URL context',
};

export default function GeminiAssessment({ result }) {
  const engine = result.engines.find(item => item.id === 'gemini-url');
  if (!engine) return null;
  const data = engine.targets[0]?.data;
  const codes = Array.isArray(data?.reason_codes) ? data.reason_codes.filter(code => Object.hasOwn(REASONS, code)) : [];
  return <section className="report-panel report-assistant" aria-label="Independent Gemini URL review">
    <div className="report-panel-heading"><h3><Sparkles size={16} aria-hidden="true" />Independent URL review</h3>
      <span className="report-status">{data?.status === 'risk_signal' ? 'Gemini raised caution' : data?.status === 'abstained' ? 'Gemini abstained' : 'Review unavailable'}</span></div>
    <p>{engine.message || engine.targets[0]?.message}</p>
    {codes.length > 0 && <ul className="report-url-list">{codes.map(code => <li key={code}>{REASONS[code]}</li>)}</ul>}
    <p className="report-muted">Gemini assessed the hostname and derived URL structure independently of provider results. It did not inspect page content. An abstention does not establish safety.</p>
    {typeof data?.model === 'string' && <p className="report-mono">Model {data.model} · {data.prompt_version}</p>}
  </section>;
}

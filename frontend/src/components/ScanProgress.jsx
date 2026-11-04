import { useEffect, useRef, useState } from 'react';
import '../scan-progress.css';

const INITIAL = ['Google Safe Browsing', 'URLhaus', 'VirusTotal', 'Cloudflare URL Scanner', 'URL analysis', 'XGBoost model', 'Registration context'];
const LABEL = { detected: 'Evidence received', no_detection: 'Response received', unavailable: 'Unavailable', error: 'Check failed', unknown: 'Unknown / stale', pending: 'Running' };
const pending = engine => engine.status === 'pending' || engine.targets?.some(target => target.status === 'pending');
const clock = milliseconds => { const seconds = Math.max(0, Math.floor(milliseconds / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };

export default function ScanProgress({ snapshot, startedAt, submittedUrl, nextPollAt, deadline, notice, onCancel, onShowPartial }) {
  const [now, setNow] = useState(Date.now);
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  let hostname = 'your URL';
  try { hostname = new URL(/^https?:\/\//i.test(submittedUrl) ? submittedUrl : `https://${submittedUrl}`).hostname; } catch { /* Validation belongs to the API. */ }
  const engines = snapshot?.engines || INITIAL.map((name, index) => ({ id: `waiting-${index}`, name }));
  const received = snapshot ? engines.filter(engine => !pending(engine)).length : 0;
  return <section className="scan-progress glass-panel" aria-label="Live scan progress" data-testid="scan-progress">
    <header className="scan-progress-heading">
      <p className="report-kicker">Live inspection</p>
      <h1 ref={heading} tabIndex={-1}>Inspecting <span>{hostname}</span></h1>
      <p role="status" aria-live="polite">{snapshot ? 'Collecting the remaining browser observations' : 'Waiting for the scan service to return observations'}</p>
    </header>
    <div className="scan-progress-workspace">
      <div className="scan-orbit" aria-hidden="true"><span /><span /><strong>X</strong></div>
      <div className="scan-source-progress" aria-label="Source response status">
        {engines.map(engine => <div key={engine.id} className={`scan-source-step ${snapshot ? pending(engine) ? 'is-pending' : 'is-returned' : ''}`}>
          <span aria-hidden="true" className="scan-step-icon">{!snapshot || pending(engine) ? '◌' : engine.status === 'error' || engine.status === 'unavailable' ? '!' : '✓'}</span>
          <div><p>{engine.name}</p><span>{snapshot ? LABEL[pending(engine) ? 'pending' : engine.status] || 'Response received' : 'Awaiting response'}</span></div>
        </div>)}
      </div>
    </div>
    <div className="scan-progress-telemetry">
      <p><span>Elapsed</span><strong>{clock(now - startedAt)}</strong></p>
      <p role="status"><span>Source responses</span><strong>{snapshot ? `${received} / ${engines.length} returned` : 'Waiting for first snapshot'}</strong></p>
      {snapshot && <p><span>Remote coverage</span><strong>{snapshot.coverage.completed} / {snapshot.coverage.total} completed</strong></p>}
      {deadline && <p><span>Time remaining</span><strong>{clock(deadline - now)}</strong></p>}
      {nextPollAt && <p><span>Next status update</span><strong>{Math.max(0, Math.ceil((nextPollAt - now) / 1000))}s</strong></p>}
    </div>
    {notice && <p role="status" className="scan-progress-notice">{notice}</p>}
    <footer className="scan-progress-footer"><p>{snapshot?.deep_scan && 'Status refreshes as the scan service schedules updates. '}Results appear when the tracked work finishes. Failed or unavailable checks remain explicit.</p>
      {snapshot ? <button type="button" onClick={onShowPartial}>Stop waiting and view partial report</button> : <button type="button" onClick={onCancel}>Cancel request</button>}
    </footer>
  </section>;
}

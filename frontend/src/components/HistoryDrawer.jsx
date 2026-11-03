import { VERDICT_LABELS } from '../../../shared/scan';
import Dialog from './Dialog';

export default function HistoryDrawer({ isOpen, onClose, history = [], onClear, rememberHistory, onRememberChange }) {
  return <Dialog open={isOpen} onClose={onClose} title="Scan history" drawer>
    <div className="space-y-5">
      <p className="text-xs text-slate-300 leading-relaxed">Redacted summaries on this device only. Query values and fragments are omitted. A summary expires after seven days and does not preserve a complete report.</p>
      <label className="flex items-start gap-3 text-sm text-slate-200"><input type="checkbox" checked={Boolean(rememberHistory)} onChange={event => onRememberChange?.(event.target.checked)} className="rounded accent-violet-500" /><span>Remember redacted scans on this device</span></label>
      <button type="button" onClick={onClear} className="text-sm text-violet-200 border border-violet-400/40 rounded px-3 py-2 hover:bg-white/5">Clear history</button>
      {history.length === 0 ? <p className="text-sm text-slate-400">No saved scans. History is optional and only records scans made while enabled.</p>
        : <ol className="space-y-3">{history.map(item => <li key={`${item.url}-${item.date}`} className="rounded border border-white/10 p-4 space-y-2">
          <p className="font-mono text-xs break-all text-slate-200">{item.url}</p>
          <p className="text-sm font-semibold text-violet-200">{VERDICT_LABELS[item.verdict] || 'Unable to determine'}</p>
          <p className="text-xs text-slate-400"><time dateTime={item.date}>{new Date(item.date).toLocaleString()}</time>{item.cached ? ' · Cached observation' : ''}</p>
        </li>)}</ol>}
    </div>
  </Dialog>;
}

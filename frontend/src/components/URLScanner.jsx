import { hasSensitiveParameters } from '../../../shared/scan';

export default function URLScanner({ url, setUrl, onSubmit, loading, error, onCancel, sensitiveConsent,
  setSensitiveConsent, rememberHistory, setRememberHistory }) {
  const sensitive = hasSensitiveParameters(url);
  return <div className="scanner-enter glass-panel p-6 sm:p-8 rounded-lg border border-white/10 bg-white/[0.02] shadow-2xl relative max-w-xl">
    <form onSubmit={onSubmit} className="space-y-5" aria-busy={loading}>
      <div className="space-y-2">
        <label htmlFor="url-input" className="block font-mono text-xs font-bold tracking-widest uppercase text-slate-200">URL to inspect</label>
        <div className="flex flex-col sm:flex-row gap-3"><div className="relative flex-1 min-w-0"><span aria-hidden="true" className="absolute inset-y-0 left-4 flex items-center text-slate-400">↗</span><input id="url-input" type="text" value={url} onChange={event => setUrl(event.target.value)} required maxLength={4096}
          disabled={loading} autoComplete="off" autoCapitalize="none" spellCheck="false" aria-describedby="submission-disclosure"
          className="w-full rounded border border-white/10 bg-black/40 pl-11 pr-4 py-4 font-mono text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-60"
          placeholder="example.com or https://example.com/..." /></div>
          <button type="submit" disabled={loading || (sensitive && !sensitiveConsent)} className="scanner-button rounded bg-violet-600 hover:bg-violet-700 px-6 py-3 font-bold text-xs tracking-widest uppercase text-white disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 shrink-0">{loading ? 'Checking sources…' : <>Analyze URL <span aria-hidden="true">→</span></>}</button>
        </div>
      </div>
      <p id="submission-disclosure" className="text-xs text-slate-300 leading-relaxed">The URL, including its path and query, is shared with configured security providers. Active browser reports are requested as unlisted, not private. Do not submit confidential links.</p>
      {sensitive && <div className="border border-amber-400/40 rounded p-4 bg-amber-400/5 space-y-3">
        <p className="text-sm text-amber-200 font-semibold">This URL may contain sensitive information.</p>
        <p className="text-xs text-slate-300">Authentication parameters, email addresses or fragments may expose a private link. Review the full URL before continuing.</p>
        <label className="flex items-start gap-3 text-xs text-slate-200 leading-relaxed"><input type="checkbox" checked={sensitiveConsent}
          onChange={event => setSensitiveConsent(event.target.checked)} disabled={loading} className="mt-0.5 rounded accent-violet-500" />
          <span>I understand this URL may contain sensitive information and agree to share it with security providers.</span></label>
      </div>}
      <label className="flex items-start gap-3 text-xs text-slate-300"><input type="checkbox" checked={rememberHistory}
        onChange={event => setRememberHistory(event.target.checked)} className="rounded accent-violet-500" /><span>Remember redacted scans on this device <span className="block text-slate-400 mt-1">Optional · 50 summaries · 7 days · clear anytime</span></span></label>
      {error && <p role="alert" className="text-sm text-red-300 break-words">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {loading && <button type="button" onClick={onCancel} className="rounded border border-white/20 px-4 py-3 text-sm text-slate-200 hover:bg-white/5">Cancel request</button>}
      </div>
      {loading && <p role="status" className="text-xs text-violet-200">Reputation checks are in progress. Active inspection may continue in a separate report. No percentage is available.</p>}
    </form>
  </div>;
}

const time = value => value ? new Date(value).toLocaleString() : 'Not reported';

export default function CloudflareDeepAnalysis({ reports = [] }) {
  if (!reports.length) return <div className="rounded border border-white/10 p-4 space-y-2"><h4 className="font-semibold text-white">Active browser observations unavailable</h4><p className="text-sm text-slate-300">No completed Cloudflare browser report is available. IP address, certificates, redirects and transactions have not been established by this report.</p></div>;
  return <div className="space-y-6">{reports.map(report => <section key={report.url} className="rounded border border-white/10 p-4 space-y-5 min-w-0">
    <div><h4 className="font-semibold text-white">Cloudflare browser observations</h4><p className="font-mono text-xs text-slate-300 break-all mt-2">{report.url}</p><p className="text-xs text-slate-400 mt-2">{report.source} · observed {time(report.observed_at)}</p></div>
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-400 text-xs">IP address</dt><dd className="font-mono break-all">{report.ip || 'Not reported'}</dd></div><div><dt className="text-slate-400 text-xs">ASN</dt><dd className="break-all">{report.asn || 'Not reported'}</dd></div><div><dt className="text-slate-400 text-xs">Server country</dt><dd>{report.country || 'Not reported'}</dd></div><div><dt className="text-slate-400 text-xs">Final observed URL</dt><dd className="font-mono text-xs break-all">{report.final_url || 'Not reported'}</dd></div></dl>
    {!!report.redirect_chain?.length && <details><summary className="cursor-pointer text-sm text-violet-200">Observed redirect chain ({report.redirect_chain.length})</summary><ol className="mt-3 space-y-2">{report.redirect_chain.map((url, index) => <li key={`${url}-${index}`} className="text-xs font-mono break-all text-slate-300">{index + 1}. {url}</li>)}</ol><p className="text-xs text-slate-400 mt-3">Observed browser navigation only. Reputation checks for discovered destinations are listed separately.</p></details>}
    <details><summary className="cursor-pointer text-sm text-violet-200">Certificates ({report.certificates.length})</summary>
      <p className="text-xs text-slate-400 mt-3">Certificate observations do not establish that a site is trustworthy.</p>
      {!report.certificates.length ? <p className="text-sm text-slate-300 mt-3">No certificate data returned.</p> : <ul className="space-y-3 mt-3">{report.certificates.map((cert, index) => <li key={index} className="text-xs border border-white/10 rounded p-3 space-y-1 break-all"><p>Subject: {cert.subject || 'Not reported'}</p><p>Issuer: {cert.issuer || 'Not reported'}</p><p>Issued: {time(cert.valid_from)}</p><p>Expires: {time(cert.valid_to)}</p></li>)}</ul>}
    </details>
    <details><summary className="cursor-pointer text-sm text-violet-200">HTTP transactions ({report.requests.length})</summary>
      {!report.requests.length ? <p className="text-sm text-slate-300 mt-3">No transaction data returned.</p> : <ol className="space-y-3 mt-3">{report.requests.map((request, index) => <li key={index} className="text-xs font-mono border border-white/10 p-3 rounded space-y-2"><p className="break-all text-slate-200">{request.url}</p><p className="text-slate-400">{request.method || 'Method not reported'} · HTTP {request.status ?? 'status not reported'} · {request.ip || 'IP not reported'}</p></li>)}</ol>}
    </details>
    <details><summary className="cursor-pointer text-sm text-violet-200">Reported risks ({report.risks.length})</summary>
      {!report.risks.length ? <p className="text-sm text-slate-300 mt-3">The source returned no risk observations in this completed report. This is not a guarantee that no threats exist.</p> : <ul className="mt-3 space-y-3">{report.risks.map((risk, index) => <li key={`${risk.id}-${index}`} className="space-y-1"><p className="font-semibold text-sm text-amber-200">{risk.title}</p><p className="text-sm text-slate-300">{risk.description}</p></li>)}</ul>}
    </details>
    <details><summary className="cursor-pointer text-sm text-violet-200">Observed links ({report.links.length})</summary>
      <p className="text-xs text-slate-400 mt-3">Addresses are shown as text to avoid accidentally opening an untrusted destination.</p>
      <ul className="mt-3 space-y-2">{report.links.map((link, index) => <li key={`${link}-${index}`} className="text-xs font-mono break-all text-slate-300">{link}</li>)}</ul>
    </details>
  </section>)}</div>;
}

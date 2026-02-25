import React, { useState } from 'react';

export default function CloudflareDeepAnalysis({ report }) {
    const [innerTab, setInnerTab] = useState('risks');

    if (!report || Object.keys(report).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-[#1a1c23] border border-border-light dark:border-white/10 rounded-xl shadow-sm animate-in fade-in duration-500">
                <div className="flex h-16 w-16 mb-4 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 ring-8 ring-slate-50 dark:ring-[#1a1c23]">
                    <span className="material-symbols-outlined text-4xl">radar</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Analysis Unavailable</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                    Cloudflare Radar was unable to generate a deep threat intelligence report for this URL. The target server may be blocking headless analysis, or the database scan timed out.
                </p>
            </div>
        );
    }
    const { certificates = [], requests = [], risks = [], links = [] } = report;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Sub-Tabs Nav */}
            <div className="flex bg-surface-light dark:bg-background-dark border-b border-border-light dark:border-white/10 overflow-x-auto">
                <button
                    onClick={() => setInnerTab('risks')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${innerTab === 'risks' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main dark:text-slate-400 dark:hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-sm">warning</span>
                    Risks & Violations · {risks.length}
                </button>
                <button
                    onClick={() => setInnerTab('certs')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${innerTab === 'certs' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main dark:text-slate-400 dark:hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    Certificates · {certificates.length}
                </button>
                <button
                    onClick={() => setInnerTab('requests')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${innerTab === 'requests' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main dark:text-slate-400 dark:hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-sm">swap_horiz</span>
                    HTTP Transactions · {requests.length}
                </button>
                <button
                    onClick={() => setInnerTab('links')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${innerTab === 'links' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main dark:text-slate-400 dark:hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-sm">link</span>
                    External Links · {links.length}
                </button>
            </div>

            <div className="bg-background-light dark:bg-[#1a1c23] border border-border-light dark:border-white/10 rounded-xl overflow-hidden shadow-sm">

                {/* RISKS TAB */}
                {innerTab === 'risks' && (
                    <div className="divide-y divide-border-light dark:divide-white/10">
                        {risks.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center gap-3">
                                <span className="material-symbols-outlined text-4xl text-emerald-500/50">verified</span>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">No security violations or risks detected by Cloudflare Radar.</p>
                            </div>
                        ) : (
                            risks.map((risk, idx) => (
                                <div key={idx} className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 text-danger">
                                            <span className="material-symbols-outlined">gpp_bad</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                                                {risk.name || risk.rule || "Security Risk"}
                                            </h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                                {risk.description || "A security policy violation or risk pattern was observed during the headless browser scan."}
                                            </p>
                                            {risk.url && (
                                                <div className="inline-flex max-w-[500px] overflow-hidden truncate px-2 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded text-xs font-mono text-slate-500">
                                                    Resource: {risk.url}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* CERTIFICATES TAB */}
                {innerTab === 'certs' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 dark:bg-white/5 border-b border-border-light dark:border-white/10">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Subject</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Issuer</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Issue Date</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Expiry Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-light dark:divide-white/10">
                                {certificates.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-10 text-center text-slate-500">No certificate data captured.</td>
                                    </tr>
                                )}
                                {certificates.map((cert, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-800 dark:text-slate-200 break-all max-w-xs">{cert.subjectName || cert.subject || 'Unknown'}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400 break-all max-w-xs">{cert.issuer || cert.issuerName || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {cert.validFrom ? new Date(cert.validFrom * 1000).toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {cert.validTo ? new Date(cert.validTo * 1000).toLocaleString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* REQUESTS TAB */}
                {innerTab === 'requests' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 dark:bg-white/5 border-b border-border-light dark:border-white/10">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Method</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Resource Target / URL</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">IP Location</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-light dark:divide-white/10">
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-10 text-center text-slate-500">No HTTP transactions recorded.</td>
                                    </tr>
                                )}
                                {requests.map((req, idx) => {
                                    const method = req.request?.method || req.method || 'GET';
                                    const url = req.request?.url || req.url || 'Unknown';
                                    const status = req.response?.status || req.status || '-';
                                    const ipParams = req.response?.primary_ip || req.primary_ip || 'Hidden/Local';

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${method === 'POST' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>
                                                    {method}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-mono font-bold ${status >= 400 ? 'text-danger' : (status >= 300 ? 'text-amber-500' : 'text-emerald-500')}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-md overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-300" title={url}>
                                                    {url}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                                                {ipParams}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* LINKS TAB */}
                {innerTab === 'links' && (
                    <div className="divide-y divide-border-light dark:divide-white/10">
                        {links.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center gap-3">
                                <span className="material-symbols-outlined text-4xl text-emerald-500/50">verified</span>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">No external links discovered.</p>
                            </div>
                        ) : (
                            <div className="p-6">
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {links.map((link, idx) => (
                                        <li key={idx} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-border-light dark:border-white/10">
                                            <span className="material-symbols-outlined text-slate-400">link</span>
                                            <span className="font-mono break-all font-bold">{link}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

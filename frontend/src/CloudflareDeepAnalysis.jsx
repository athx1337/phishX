import React, { useState } from 'react';

export default function CloudflareDeepAnalysis({ report }) {
    const [innerTab, setInnerTab] = useState('risks');

    if (!report || Object.keys(report).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center glass-panel rounded-lg border border-white/10">
                <div className="flex h-16 w-16 mb-4 items-center justify-center rounded-full bg-white/[0.02] text-[#8a8a92] ring-8 ring-white/[0.01]">
                    <span className="material-symbols-outlined text-4xl">radar</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Analysis Unavailable</h3>
                <p className="text-xs text-[#8a8a92] max-w-md leading-relaxed font-mono">
                    Cloudflare Radar was unable to generate a deep threat intelligence report for this URL. The target server may be blocking headless analysis, or the database scan timed out.
                </p>
            </div>
        );
    }
    const { certificates = [], requests = [], risks = [], links = [] } = report;

    return (
        <div className="flex flex-col gap-6 animate-in">

            {/* Sub-Tabs Nav */}
            <div className="flex bg-black/40 border-b border-white/5 overflow-x-auto font-mono text-xs tracking-wider">
                <button
                    onClick={() => setInnerTab('risks')}
                    className={`flex items-center gap-2 px-6 py-4 font-bold border-b-2 whitespace-nowrap transition-colors ${innerTab === 'risks' ? 'border-[#8b5cf6] text-[#8b5cf6]' : 'border-transparent text-[#8a8a92] hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-xs">warning</span>
                    Risks & Violations · {risks.length}
                </button>
                <button
                    onClick={() => setInnerTab('certs')}
                    className={`flex items-center gap-2 px-6 py-4 font-bold border-b-2 whitespace-nowrap transition-colors ${innerTab === 'certs' ? 'border-[#8b5cf6] text-[#8b5cf6]' : 'border-transparent text-[#8a8a92] hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-xs">verified_user</span>
                    Certificates · {certificates.length}
                </button>
                <button
                    onClick={() => setInnerTab('requests')}
                    className={`flex items-center gap-2 px-6 py-4 font-bold border-b-2 whitespace-nowrap transition-colors ${innerTab === 'requests' ? 'border-[#8b5cf6] text-[#8b5cf6]' : 'border-transparent text-[#8a8a92] hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-xs">swap_horiz</span>
                    HTTP Transactions · {requests.length}
                </button>
                <button
                    onClick={() => setInnerTab('links')}
                    className={`flex items-center gap-2 px-6 py-4 font-bold border-b-2 whitespace-nowrap transition-colors ${innerTab === 'links' ? 'border-[#8b5cf6] text-[#8b5cf6]' : 'border-transparent text-[#8a8a92] hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-xs">link</span>
                    External Links · {links.length}
                </button>
            </div>

            <div className="border border-white/10 rounded overflow-hidden">

                {/* RISKS TAB */}
                {innerTab === 'risks' && (
                  <div className="divide-y divide-white/5">
                      {risks.length === 0 ? (
                          <div className="p-10 text-center flex flex-col items-center gap-3">
                              <span className="material-symbols-outlined text-4xl text-emerald-500/50">verified</span>
                              <p className="text-[#8a8a92] text-xs font-mono">No security violations or risks detected by Cloudflare Radar.</p>
                          </div>
                      ) : (
                          risks.map((risk, idx) => (
                              <div key={idx} className="p-6 hover:bg-white/[0.01] transition-colors">
                                  <div className="flex items-start gap-4">
                                      <div className="mt-1 text-[#ef4444]">
                                          <span className="material-symbols-outlined">gpp_bad</span>
                                      </div>
                                      <div className="text-left font-sans text-xs">
                                          <h4 className="font-bold text-white mb-1">
                                              {risk.name || risk.rule || "Security Risk"}
                                          </h4>
                                          <p className="text-[#8a8a92] leading-relaxed mb-2">
                                              {risk.description || "A security policy violation or risk pattern was observed during the headless browser scan."}
                                          </p>
                                          {risk.url && (
                                              <div className="inline-flex max-w-full overflow-hidden truncate px-2 py-1 bg-white/5 border border-white/5 rounded text-[10px] font-mono text-[#8a8a92]">
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
                        <table className="w-full text-left text-xs border-collapse font-mono">
                            <thead className="bg-white/[0.02] border-b border-white/5">
                                <tr className="text-[#8a8a92]">
                                    <th className="px-6 py-4 font-semibold">Subject</th>
                                    <th className="px-6 py-4 font-semibold">Issuer</th>
                                    <th className="px-6 py-4 font-semibold">Issue Date</th>
                                    <th className="px-6 py-4 font-semibold">Expiry Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-[#8a8a92]">
                                {certificates.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-10 text-center text-slate-500 font-sans">No certificate data captured.</td>
                                    </tr>
                                )}
                                {certificates.map((cert, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors text-white">
                                        <td className="px-6 py-4 break-all max-w-xs">{cert.subjectName || cert.subject || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-[#8a8a92] break-all max-w-xs">{cert.issuer || cert.issuerName || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-[#8a8a92]">
                                            {cert.validFrom ? new Date(cert.validFrom * 1000).toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-[#8a8a92]">
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
                        <table className="w-full text-left text-xs border-collapse font-mono">
                            <thead className="bg-white/[0.02] border-b border-white/5">
                                <tr className="text-[#8a8a92]">
                                    <th className="px-6 py-4 font-semibold">Method</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold">Resource Target / URL</th>
                                    <th className="px-6 py-4 font-semibold">IP Location</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-[#8a8a92]">
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-10 text-center text-slate-500 font-sans">No HTTP transactions recorded.</td>
                                    </tr>
                                )}
                                {requests.map((req, idx) => {
                                    const method = req.request?.method || req.method || 'GET';
                                    const url = req.request?.url || req.url || 'Unknown';
                                    const status = req.response?.status || req.status || '-';
                                    const ipParams = req.response?.primary_ip || req.primary_ip || 'Hidden/Local';

                                    return (
                                        <tr key={idx} className="hover:bg-white/[0.01] transition-colors text-white">
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${method === 'POST' ? 'bg-amber-500/15 text-orange-400' : 'bg-[#8b5cf6]/15 text-[#8b5cf6]'}`}>
                                                    {method}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-bold ${status >= 400 ? 'text-[#ef4444]' : (status >= 300 ? 'text-amber-500' : 'text-[#22c55e]')}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-md overflow-hidden text-ellipsis whitespace-nowrap text-[#8a8a92] hover:text-white transition-colors" title={url}>
                                                    {url}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[#8a8a92]">
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
                    <div className="divide-y divide-white/5 font-mono text-xs">
                        {links.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center gap-3">
                                <span className="material-symbols-outlined text-4xl text-emerald-500/50">verified</span>
                                <p className="text-[#8a8a92]">No external links discovered.</p>
                            </div>
                        ) : (
                            <div className="p-6">
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {links.map((link, idx) => (
                                        <li key={idx} className="flex items-center gap-3 text-[#8a8a92] bg-white/[0.01] p-3 rounded border border-white/5">
                                            <span className="material-symbols-outlined text-[#8a8a92]/60 text-sm">link</span>
                                            <a href={`https://${link}`} target="_blank" rel="noopener noreferrer" className="break-all font-bold hover:text-[#8b5cf6] transition-colors">{link}</a>
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

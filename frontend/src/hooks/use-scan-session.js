import { useCallback, useEffect, useRef, useState } from 'react';
import { pollScan, requestScan } from '../lib/api';

const ACTIVE_LIFETIME = 180_000;
const hasPending = report => report.engines.some(engine => engine.status === 'pending' || engine.targets.some(target => target.status === 'pending'));

/** Keep provisional observations out of the published report until tracking terminates. */
export function useScanSession(onPublish) {
  const [phase, setPhase] = useState('idle');
  const [snapshot, setSnapshot] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [completionReason, setCompletionReason] = useState(null);
  const [stopped, setStopped] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [submittedUrl, setSubmittedUrl] = useState('');
  const [deadline, setDeadline] = useState(null);
  const [retry, setRetry] = useState({ attempt: 0, next: 0, notice: null });
  const version = useRef(0);
  const initialRequest = useRef(null);
  const activePoll = useRef(null);
  const fixedDeadline = useRef(null);
  const publishRef = useRef(onPublish);
  useEffect(() => { publishRef.current = onPublish; }, [onPublish]);

  const publish = useCallback((value, reason = null) => {
    setReport(value); setSnapshot(null); setPhase('report'); setCompletionReason(reason);
    publishRef.current?.(value);
  }, []);
  const accept = useCallback(value => {
    if (value.deep_scan) {
      const supplied = Date.parse(value.deep_scan.expires_at);
      fixedDeadline.current = Math.min(fixedDeadline.current ?? Date.now() + ACTIVE_LIFETIME, supplied);
      setDeadline(fixedDeadline.current);
      if (Date.now() >= fixedDeadline.current) {
        publish(value, 'Active inspection expired. These are the available observations; pending checks remain unverified.');
      } else { setSnapshot(value); setPhase('waiting'); }
    } else if (hasPending(value)) {
      publish(value, 'A source is still pending, but the service returned no trackable job. This report is partial.');
    } else publish(value);
  }, [publish]);

  useEffect(() => {
    if (phase !== 'waiting' || !snapshot?.deep_scan) return;
    const generation = version.current;
    const job = snapshot.deep_scan;
    const deadline = Math.min(fixedDeadline.current, Date.parse(job.expires_at));
    const controller = new AbortController(); activePoll.current = controller;
    const finishPartial = message => {
      if (generation !== version.current) return;
      controller.abort(); publish(snapshot, message);
    };
    const expiryTimer = setTimeout(() => finishPartial('Active inspection expired. These are the available observations; pending checks remain unverified.'), Math.max(0, deadline - Date.now()));
    const due = Math.min(deadline, Math.max(Date.parse(job.next_poll_at), retry.next));
    const timer = setTimeout(async () => {
      if (generation !== version.current || controller.signal.aborted) return;
      if (Date.now() >= deadline) { finishPartial('Active inspection expired before completion. This report is partial.'); return; }
      try {
        const updated = await pollScan(job.poll_path, { signal: controller.signal });
        if (generation !== version.current || controller.signal.aborted) return;
        if (Date.now() >= deadline) { finishPartial('Active inspection expired before its response arrived. The last report remains partial.'); return; }
        if (updated.scan_id !== snapshot.scan_id || updated.url !== snapshot.url || updated.checked_urls.length !== snapshot.checked_urls.length ||
            updated.checked_urls.some((target, index) => target !== snapshot.checked_urls[index])) throw new Error('The scan service returned a report for a different URL or inspection scope.');
        setRetry({ attempt: 0, next: 0, notice: null }); accept(updated);
      } catch (problem) {
        if (generation !== version.current || controller.signal.aborted) return;
        if ([404, 503].includes(problem.status) && retry.attempt < 3 && Date.now() + 10_000 < deadline) {
          setRetry({ attempt: retry.attempt + 1, next: Date.now() + 10_000,
            notice: `The browser report is temporarily unavailable. Retrying (${retry.attempt + 1}/3).` });
        } else finishPartial(`${problem.message} The last available report is partial.`);
      }
    }, Math.max(1000, due - Date.now()));
    return () => { clearTimeout(timer); clearTimeout(expiryTimer); controller.abort(); };
  }, [phase, snapshot, retry, accept, publish]);

  useEffect(() => () => { version.current += 1; initialRequest.current?.abort(); activePoll.current?.abort(); }, []);

  const reset = useCallback(() => {
    version.current += 1; initialRequest.current?.abort(); activePoll.current?.abort(); fixedDeadline.current = null;
    setPhase('idle'); setSnapshot(null); setReport(null); setError(null); setCompletionReason(null); setStopped(false); setDeadline(null);
    setRetry({ attempt: 0, next: 0, notice: null });
  }, []);
  const start = async (url, options = {}) => {
    if (!url.trim() || ['submitting', 'waiting'].includes(phase)) return;
    reset(); const generation = version.current;
    const controller = new AbortController(); initialRequest.current = controller;
    setStartedAt(Date.now()); setSubmittedUrl(url); setPhase('submitting');
    try {
      const value = await requestScan({ url, refresh: Boolean(options.refresh), sensitive_url_consent: Boolean(options.sensitiveConsent),
        ...(options.geminiAssessment ? { gemini_assessment: true } : {}) }, { signal: controller.signal });
      if (!controller.signal.aborted && generation === version.current) { accept(value); return value; }
    } catch (problem) {
      if (!controller.signal.aborted && generation === version.current) { setError(problem.message); setPhase('idle'); }
    }
  };
  const cancel = () => { reset(); setError('Request cancelled. Providers may still finish requests already submitted.'); };
  const showPartial = () => {
    if (!snapshot) { cancel(); return; }
    version.current += 1; initialRequest.current?.abort(); activePoll.current?.abort(); setStopped(true);
    publish(snapshot, 'Report updates stopped. Pending observations remain unverified; the provider may still finish its scan.');
  };
  return { phase, snapshot, report, error, setError, completionReason, stopped, startedAt, submittedUrl, retry,
    deadline, running: phase === 'submitting' || phase === 'waiting', start, reset, cancel, showPartial };
}

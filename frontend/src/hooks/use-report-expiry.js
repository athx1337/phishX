import { useCallback, useSyncExternalStore } from 'react';

/** Recheck on the deadline and tab return: suspended tabs must not retain reassurance. */
export function useReportExpiry(report) {
  const deadline = report ? Date.parse(report.expires_at) : Number.NaN;
  const getSnapshot = useCallback(() => Number.isFinite(deadline) && Date.now() >= deadline, [deadline]);
  const subscribe = useCallback(notify => {
    if (!Number.isFinite(deadline)) return () => {};
    const remaining = deadline - Date.now();
    const timer = remaining > 0 ? setTimeout(notify, Math.min(remaining, 2_147_483_647)) : undefined;
    window.addEventListener('focus', notify);
    document.addEventListener('visibilitychange', notify);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', notify);
      document.removeEventListener('visibilitychange', notify);
    };
  }, [deadline]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

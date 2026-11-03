import { redactUrl, VERDICTS } from '../../../shared/scan';

const HISTORY_KEY = 'phishx_history_v2';
const PREFERENCE_KEY = 'phishx_history_enabled';
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function validEntries(value, now = Date.now()) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item.url === 'string' && item.url.length <= 8192 &&
    VERDICTS.includes(item.verdict) && typeof item.date === 'string' && Number.isFinite(Date.parse(item.date)) &&
    Date.parse(item.date) > now - RETENTION_MS && Date.parse(item.date) <= now && typeof item.cached === 'boolean')
    .map(item => ({ url: redactUrl(item.url), verdict: item.verdict, date: item.date, cached: item.cached }))
    .slice(0, 50);
}
export function readHistoryPreference() {
  try { return localStorage.getItem(PREFERENCE_KEY) === 'true'; } catch { return false; }
}
export function setHistoryPreference(enabled) {
  try { localStorage.setItem(PREFERENCE_KEY, String(enabled)); } catch { /* Browser storage is optional. */ }
}
export function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); localStorage.removeItem('phishx_history'); } catch { /* Browser storage is optional. */ }
}
export function readHistory() {
  try {
    localStorage.removeItem('phishx_history');
    if (!readHistoryPreference()) { localStorage.removeItem(HISTORY_KEY); return []; }
    const entries = validEntries(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    return entries;
  } catch { return []; }
}
export function saveHistory(history) {
  if (!readHistoryPreference()) return;
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(validEntries(history))); } catch { /* Keep current in-memory history if storage is full. */ }
}
export function addToHistory(history, report) {
  const url = redactUrl(report.url);
  const entry = { url, verdict: report.verdict, date: new Date().toISOString(), cached: report.cached };
  return [entry, ...validEntries(history).filter(item => item.url !== url)].slice(0, 50);
}

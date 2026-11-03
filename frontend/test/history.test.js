import { describe, expect, it } from 'vitest';
import { addToHistory, clearHistory, readHistory, readHistoryPreference, saveHistory, setHistoryPreference } from '../src/lib/history';
import { scanReport } from './fixtures';

describe('opt-in redacted history', () => {
  it('defaults off and deletes legacy raw history instead of migrating it', () => {
    localStorage.setItem('phishx_history', '[{"url":"https://example.com/?token=secret"}]');
    expect(readHistoryPreference()).toBe(false);
    expect(readHistory()).toEqual([]);
    expect(localStorage.getItem('phishx_history')).toBeNull();
    saveHistory(addToHistory([], scanReport()));
    expect(localStorage.getItem('phishx_history_v2')).toBeNull();
  });

  it('retains outcome and timestamp but omits query values and fragments', () => {
    setHistoryPreference(true);
    const report = scanReport({ url: 'https://example.com/reset?token=private-value&email=person%40example.com#session' });
    saveHistory(addToHistory([], report));
    const stored = localStorage.getItem('phishx_history_v2');
    expect(stored).not.toContain('private-value');
    expect(stored).not.toContain('person');
    expect(stored).not.toContain('#session');
    expect(readHistory()[0]).toMatchObject({ verdict: 'unknown', cached: false });
  });

  it('filters malformed, expired, future and unsupported entries', () => {
    setHistoryPreference(true);
    const entry = { url: 'https://example.com/', verdict: 'unknown', date: new Date().toISOString(), cached: false };
    localStorage.setItem('phishx_history_v2', JSON.stringify([
      entry, null, {}, { ...entry, verdict: 'safe' }, { ...entry, date: new Date(Date.now() - 8 * 86400000).toISOString() },
      { ...entry, date: new Date(Date.now() + 86400000).toISOString() }, { ...entry, cached: 'false' },
    ]));
    expect(readHistory()).toEqual([entry]);
    localStorage.setItem('phishx_history_v2', '{}');
    expect(readHistory()).toEqual([]);
    localStorage.setItem('phishx_history_v2', '{');
    expect(readHistory()).toEqual([]);
  });

  it('caps entries at fifty and replaces an existing URL summary', () => {
    let history = [];
    for (let i = 0; i < 55; i++) history = addToHistory(history, scanReport({ url: `https://example.com/${i}` }));
    expect(history).toHaveLength(50);
    history = addToHistory(history, scanReport({ url: 'https://example.com/54', verdict: 'suspicious' }));
    expect(history).toHaveLength(50);
    expect(history[0].verdict).toBe('suspicious');
  });

  it('clears new and old data and stops persistence when disabled', () => {
    setHistoryPreference(true);
    saveHistory(addToHistory([], scanReport()));
    clearHistory();
    expect(readHistory()).toEqual([]);
    setHistoryPreference(false);
    saveHistory(addToHistory([], scanReport()));
    expect(readHistory()).toEqual([]);
    expect(localStorage.getItem('phishx_history_v2')).toBeNull();
  });
});

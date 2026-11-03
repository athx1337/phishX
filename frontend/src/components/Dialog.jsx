import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

export default function Dialog({ open, onClose, title, children, drawer = false }) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const root = document.getElementById('root');
    const wasInert = root?.inert;
    if (root) root.inert = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = ref.current;
    (panel?.querySelector(FOCUSABLE) || panel)?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== 'Tab') return;
      const items = [...(panel?.querySelectorAll(FOCUSABLE) || [])];
      const first = items[0]; const last = items[items.length - 1];
      if (!first) { event.preventDefault(); panel?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
      if (root) root.inert = wasInert;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex ${drawer ? 'justify-end' : 'items-center justify-center p-4'}`}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={`bg-[#0e091a] border border-white/15 shadow-2xl flex flex-col outline-none ${drawer ? 'h-full w-full max-w-md' : 'max-h-[90dvh] rounded-lg w-full max-w-xl'}`}>
        <div className="flex items-center justify-between gap-4 p-5 border-b border-white/10">
          <h2 id={titleId} className="font-gothic-block text-2xl font-bold tracking-wide text-white">{title}</h2>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose} className="p-2 rounded text-slate-300 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">✕</button>
        </div>
        <div className="p-5 overflow-y-auto min-h-0">{children}</div>
      </section>
    </div>, document.body,
  );
}

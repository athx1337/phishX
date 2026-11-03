import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HistoryDrawer from '../src/components/HistoryDrawer';

function Harness() {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Open history</button>
    <HistoryDrawer isOpen={open} onClose={() => setOpen(false)} onClear={vi.fn()} onRememberChange={vi.fn()} rememberHistory
      history={[{ url: 'https://example.com/', verdict: 'unknown', date: new Date().toISOString(), cached: false }]} />
  </>;
}

describe('history dialog accessibility', () => {
  it('keeps actual history available with reduced motion, traps focus and restores it', async () => {
    const user = userEvent.setup(); render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open history' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Scan history' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('https://example.com/')).toBeInTheDocument();
    expect(screen.getByText('Unable to determine')).toBeInTheDocument();
    const close = screen.getByRole('button', { name: 'Close Scan history' });
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Clear history' })).toHaveFocus();
    await user.tab(); expect(close).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import DeathScreen from './DeathScreen.svelte';

describe('DeathScreen.svelte', () => {
  it('offers a retry when retries remain', async () => {
    const onretry = vi.fn();
    render(DeathScreen, { props: { retriesLeft: 2, onretry, onabandon: vi.fn() } });
    expect(screen.getByText(/2 left/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onretry).toHaveBeenCalled();
  });

  it('hides retry at zero and only offers abandon', () => {
    render(DeathScreen, { props: { retriesLeft: 0, onretry: vi.fn(), onabandon: vi.fn() } });
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.getByRole('button', { name: /abandon/i })).toBeInTheDocument();
  });
});

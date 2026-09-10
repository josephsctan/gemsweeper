import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { getItemDef } from '../content/items';
import RewardScreen from './RewardScreen.svelte';

const offers = [getItemDef('iron-maul'), getItemDef('focus-battery'), getItemDef('ember-cloak')];

describe('RewardScreen.svelte', () => {
  it('offers three items and reports the pick', async () => {
    const onpick = vi.fn(); const onskip = vi.fn();
    render(RewardScreen, { props: { offers, onpick, onskip } });
    expect(screen.getByText('Iron Maul')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /take iron maul/i }));
    expect(onpick).toHaveBeenCalledWith('iron-maul');
  });

  it('supports skipping for a heal', async () => {
    const onskip = vi.fn();
    render(RewardScreen, { props: { offers, onpick: vi.fn(), onskip } });
    await userEvent.click(screen.getByRole('button', { name: /skip for a heal/i }));
    expect(onskip).toHaveBeenCalled();
  });
});

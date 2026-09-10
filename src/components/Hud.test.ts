import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRun, enterFloor } from '../lib/run';
import { createRng } from '../lib/rng';
import { makeItem } from '../lib/items';
import { setRun } from '../stores/runStore';
import Hud from './Hud.svelte';

describe('Hud.svelte', () => {
  beforeEach(() => {
    const r = createRun(1, 'sapper', makeItem('sappers-pick', createRng(1)), makeItem('blast-plating', createRng(2)), 0);
    enterFloor(r);
    setRun(r);
  });

  it('shows HP and fires the ability + inventory callbacks', async () => {
    const onuseAbility = vi.fn();
    const onopenInventory = vi.fn();
    render(Hud, { props: { abilityLabel: 'Probe (2)', abilityEnabled: true, onuseAbility, onopenInventory } });
    expect(screen.getByText(/HP/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /probe/i }));
    await userEvent.click(screen.getByRole('button', { name: /loadout|inventory/i }));
    expect(onuseAbility).toHaveBeenCalled();
    expect(onopenInventory).toHaveBeenCalled();
  });

  it('disables the ability button when abilityEnabled is false', () => {
    render(Hud, { props: { abilityLabel: 'Probe (2)', abilityEnabled: false, onuseAbility: vi.fn(), onopenInventory: vi.fn() } });
    expect(screen.getByRole('button', { name: /probe/i })).toBeDisabled();
  });
});

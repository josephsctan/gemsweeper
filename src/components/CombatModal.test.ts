import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { CombatContext } from '../lib/types';
import { DEFAULT_RULE_FLAGS } from '../lib/types';
import { beginCombat, endCombat } from '../stores/combatStore';
import CombatModal from './CombatModal.svelte';

const ctx: CombatContext = {
  power: 4, guard: 3, focus: 5, classId: 'diviner',
  rules: { ...DEFAULT_RULE_FLAGS }, isFirstFightThisRoom: false, sapperFirstMineHandled: true,
};

describe('CombatModal.svelte', () => {
  beforeEach(() => { endCombat(); });

  it('shows monster info and round counter, and resolves via Strike', async () => {
    beginCombat({ type: 'fast', threat: 5, pips: 1, maxPips: 1, isBoss: false, debuffStat: null }, 3, ctx);
    const ondone = vi.fn();
    render(CombatModal, { props: { ondone } });
    expect(screen.getByText(/round 1 \/ 3/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /strike/i }));
    expect(screen.getByText(/defused|victory|won/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(ondone).toHaveBeenCalledOnce();
    expect(ondone.mock.calls[0]![0].state.resolution).toBe('win');
  });

  it('disables the Scry button for a sapper', async () => {
    beginCombat({ type: 'fast', threat: 5, pips: 2, maxPips: 2, isBoss: false, debuffStat: null }, 3,
      { ...ctx, classId: 'sapper' });
    render(CombatModal, { props: { ondone: vi.fn() } });
    expect(screen.getByRole('button', { name: /scry/i })).toBeDisabled();
  });

  it('disables Scry when the diviner cannot afford it', async () => {
    beginCombat({ type: 'fast', threat: 5, pips: 2, maxPips: 2, isBoss: false, debuffStat: null }, 3,
      { ...ctx, focus: 1 });
    render(CombatModal, { props: { ondone: vi.fn() } });
    expect(screen.getByRole('button', { name: /scry/i })).toBeDisabled();
  });
});

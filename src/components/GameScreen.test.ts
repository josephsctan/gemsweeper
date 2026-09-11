import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { DEFAULT_RULE_FLAGS } from '../lib/types';
import { applyReveal } from '../stores/boardStore';
import { patchRun } from '../stores/runStore';
import { reloadMeta } from '../stores/metaStore';
import { startRunWithSeed, toMenu } from '../stores/gameFlow';
import GameScreen from './GameScreen.svelte';

const RULES = { ...DEFAULT_RULE_FLAGS };
const abilityButton = () => screen.getByRole('button', { name: /Probe/ });

describe('GameScreen.svelte ability button', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadMeta();
    toMenu();
  });

  it('stays disabled until the board is seeded, then re-disables when Focus runs out', async () => {
    startRunWithSeed(777, 'sapper');
    render(GameScreen);

    // unseeded board: abilities would target a board with no mines at all
    expect(abilityButton()).toBeDisabled();

    applyReveal(4, 4, RULES); // first reveal places the mines
    await tick();
    expect(abilityButton()).toBeEnabled();

    // the button must react to the run store, not freeze on its first read
    patchRun((r) => { r.focus = 0; });
    await tick();
    expect(abilityButton()).toBeDisabled();
  });
});

import { describe, it, expect } from 'vitest';
import type { RunState, Board, ItemDef } from './types';
import { EMPTY_EQUIPPED, DEFAULT_RULE_FLAGS } from './types';

describe('types', () => {
  it('exposes an empty equipped loadout with three slot keys', () => {
    expect(EMPTY_EQUIPPED).toEqual({ weapon: null, armor: null, trinkets: [null, null] });
  });

  it('default rule flags are all off / zero', () => {
    expect(DEFAULT_RULE_FLAGS.noFlagging).toBe(false);
    expect(DEFAULT_RULE_FLAGS.scryFocusDiscount).toBe(0);
  });

  it('lets a well-formed RunState / Board / ItemDef literal type-check', () => {
    const item: ItemDef = {
      defId: 'x', name: 'X', slot: 'weapon', rarity: 'common', flavor: '',
      statMods: [], ruleFlags: {}, hooks: [],
    };
    const board: Board = { rows: 0, cols: 0, tiles: [], minesPlaced: false, hazard: 'none', isBoss: false };
    const run = { seed: 1, classId: 'sapper' } as Partial<RunState>;
    expect(item.defId).toBe('x');
    expect(board.rows).toBe(0);
    expect(run.seed).toBe(1);
  });
});

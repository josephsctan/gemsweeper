import { describe, it, expect } from 'vitest';
import type { DerivedStats, RunState } from './types';
import { DEFAULT_RULE_FLAGS } from './types';
import { createRun, enterFloor } from './run';
import { createRng } from './rng';
import { makeItem } from './items';
import { generateRoom } from './boardgen';
import { abilityCost, canUseAbility, useProbe, useScry, SCRY_DURATION_MS } from './abilities';

const derived = (over: Partial<DerivedStats> = {}): DerivedStats => ({
  maxHp: 12, power: 4, guard: 3, focusCap: 5,
  rules: { ...DEFAULT_RULE_FLAGS }, ...over,
});
const mkRun = (cls: 'sapper' | 'diviner'): RunState => {
  const r = createRun(7, cls, makeItem('sappers-pick', createRng(1)), makeItem('plain-robe', createRng(2)), 0);
  enterFloor(r);
  r.focus = 5;
  return r;
};

describe('abilityCost / canUseAbility', () => {
  it('probe costs 2 and is blocked in combat and after use', () => {
    const r = mkRun('sapper');
    expect(abilityCost(r, derived())).toBe(2);
    expect(canUseAbility(r, derived(), false).ok).toBe(true);
    expect(canUseAbility(r, derived(), true).ok).toBe(false); // not usable in combat
    r.abilityUsedThisRoom = true;
    expect(canUseAbility(r, derived(), false).ok).toBe(false);
  });

  it('scry costs 2 minus the discount and is allowed in combat', () => {
    const r = mkRun('diviner');
    expect(abilityCost(r, derived({ rules: { ...DEFAULT_RULE_FLAGS, scryFocusDiscount: 1 } }))).toBe(1);
    expect(canUseAbility(r, derived(), true).ok).toBe(true);
  });

  it('blocks when focus is short', () => {
    const r = mkRun('diviner');
    r.focus = 1;
    expect(canUseAbility(r, derived(), false).ok).toBe(false);
  });
});

describe('useProbe', () => {
  it('reveals a safe tile, spends focus, and marks the ability used', () => {
    const r = mkRun('sapper');
    const board = generateRoom(7, 1, 0, 5, { r: 4, c: 4 });
    const safe = board.tiles.flat().find((t) => !t.isMine && !t.revealed && t.hazard === 'none')!;
    const out = useProbe(r, board, { r: safe.r, c: safe.c }, { ...DEFAULT_RULE_FLAGS });
    expect(out.hitMine).toBe(false);
    expect(board.tiles[safe.r]![safe.c]!.revealed).toBe(true);
    expect(r.focus).toBe(3);
    expect(r.abilityUsedThisRoom).toBe(true);
  });

  it('flags a mine instead of fighting it', () => {
    const r = mkRun('sapper');
    const board = generateRoom(7, 1, 0, 5, { r: 4, c: 4 });
    const mine = board.tiles.flat().find((t) => t.isMine)!;
    const out = useProbe(r, board, { r: mine.r, c: mine.c }, { ...DEFAULT_RULE_FLAGS });
    expect(out.hitMine).toBe(true);
    expect(out.result.mines).toEqual([]);
    expect(board.tiles[mine.r]![mine.c]!.flagged).toBe(true);
    expect(board.tiles[mine.r]![mine.c]!.revealed).toBe(false);
  });
});

describe('useScry', () => {
  it('marks mines in the 3x3 visible until a deadline and spends focus', () => {
    const r = mkRun('diviner');
    const board = generateRoom(7, 4, 1, 6, { r: 6, c: 6 });
    // find a 3x3 window containing at least one mine
    let center = { r: 1, c: 1 };
    outer: for (let rr = 1; rr < board.rows - 1; rr++)
      for (let cc = 1; cc < board.cols - 1; cc++) {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++)
          if (board.tiles[rr + dr]![cc + dc]!.isMine) { center = { r: rr, c: cc }; break outer; }
      }
    const out = useScry(r, board, center, 1000);
    expect(out.spentFocus).toBe(2);
    expect(r.focus).toBe(3);
    const marked = out.coords.every((c) => board.tiles[c.r]![c.c]!.scryVisibleUntil === 1000 + SCRY_DURATION_MS);
    expect(marked).toBe(true);
    expect(out.coords.length).toBeGreaterThan(0);
  });

  it('clamps to the board edges without throwing', () => {
    const r = mkRun('diviner');
    const board = generateRoom(7, 1, 0, 5, { r: 4, c: 4 });
    expect(() => useScry(r, board, { r: 0, c: 0 }, 0)).not.toThrow();
  });
});

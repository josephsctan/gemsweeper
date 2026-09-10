import { describe, it, expect } from 'vitest';
import type { Item, RunState } from './types';
import { createRun, enterFloor } from './run';
import { createRng } from './rng';
import {
  makeItem, rollRewards, onRoomStartRevealCount, onSafeRevealFocus,
  postCombatHpCost, onRoomClearHeal, hasLuckyCoin,
} from './items';

function runWith(trinket?: string): RunState {
  const r = createRun(1, 'sapper',
    makeItem('sappers-pick', createRng(1)),
    makeItem('blast-plating', createRng(2)), 0);
  enterFloor(r);
  if (trinket) r.equipped.trinkets[0] = makeItem(trinket, createRng(9));
  return r;
}

describe('makeItem', () => {
  it('copies the def and assigns a unique instance id', () => {
    const a = makeItem('iron-maul', createRng(1));
    const b = makeItem('iron-maul', createRng(2));
    expect(a.defId).toBe('iron-maul');
    expect(a.name).toBe('Iron Maul');
    expect(a.id).not.toBe(b.id);
    a.statMods![0]!.amount = 99;
    expect(makeItem('iron-maul', createRng(3)).statMods![0]!.amount).toBe(3); // def untouched
  });
});

describe('rollRewards', () => {
  it('returns the requested number of distinct defs', () => {
    const defs = rollRewards(1, false, createRng(5), 3);
    expect(defs.length).toBe(3);
    expect(new Set(defs.map((d) => d.defId)).size).toBe(3);
  });

  it('boss draws lean richer than floor-1 normal draws', () => {
    const score = (rarity: string) => (rarity === 'cursed' ? 2 : rarity === 'rare' ? 1 : 0);
    let normal = 0, boss = 0;
    for (let s = 0; s < 200; s++) {
      normal += rollRewards(1, false, createRng(s), 3).reduce((a, d) => a + score(d.rarity), 0);
      boss += rollRewards(1, true, createRng(s), 3).reduce((a, d) => a + score(d.rarity), 0);
    }
    expect(boss).toBeGreaterThan(normal);
  });
});

describe('equipped-item hooks', () => {
  it('Cartographer\'s Eye asks for one room-start reveal', () => {
    expect(onRoomStartRevealCount(runWith())).toBe(0);
    expect(onRoomStartRevealCount(runWith('cartographers-eye'))).toBe(1);
  });

  it('Seer\'s Thread sometimes grants focus on a safe reveal', () => {
    const r = runWith('seers-thread');
    let gained = 0;
    const rng = createRng(3);
    for (let i = 0; i < 100; i++) gained += onSafeRevealFocus(r, rng);
    expect(gained).toBeGreaterThan(0);
    expect(onSafeRevealFocus(runWith(), createRng(1))).toBe(0);
  });

  it('Reaper Edge charges 2 HP after each fight', () => {
    const r = runWith();
    r.equipped.weapon = makeItem('reaper-edge', createRng(1));
    expect(postCombatHpCost(r)).toBe(2);
    expect(postCombatHpCost(runWith())).toBe(0);
  });

  it('Quick Salve heals 2 on room clear', () => {
    expect(onRoomClearHeal(runWith('quick-salve'))).toBe(2);
    expect(onRoomClearHeal(runWith())).toBe(0);
  });

  it('hasLuckyCoin reflects the equipped trinket', () => {
    expect(hasLuckyCoin(runWith('lucky-coin'))).toBe(true);
    expect(hasLuckyCoin(runWith())).toBe(false);
  });
});

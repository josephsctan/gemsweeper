import { describe, it, expect } from 'vitest';
import type { Item, RunState } from './types';
import { createRun, enterFloor } from './run';
import { deriveStats, equippedItems } from './stats';

const item = (over: Partial<Item>): Item => ({
  id: Math.random().toString(36), defId: 'd', name: 'n', slot: 'trinket', rarity: 'common', flavor: '', ...over,
});
const baseRun = (): RunState => {
  const r = createRun(1, 'sapper',
    item({ slot: 'weapon', defId: 'sappers-pick' }),
    item({ slot: 'armor', defId: 'blast-plating' }), 0);
  enterFloor(r);
  // strip default gear effects for a clean baseline in most tests
  r.equipped = { weapon: null, armor: null, trinkets: [null, null] };
  return r;
};

describe('deriveStats', () => {
  it('with no gear returns the class base stats', () => {
    const d = deriveStats(baseRun());
    expect(d).toMatchObject({ maxHp: 12, power: 4, guard: 3, focusCap: 3 });
    expect(d.rules).toEqual({ ...deriveStats(baseRun()).rules });
  });

  it('adds stat mods from every equipped slot', () => {
    const r = baseRun();
    r.equipped.weapon = item({ slot: 'weapon', statMods: [{ stat: 'power', amount: 2 }] });
    r.equipped.armor = item({ slot: 'armor', statMods: [{ stat: 'guard', amount: 3 }] });
    r.equipped.trinkets[0] = item({ statMods: [{ stat: 'focusCap', amount: 2 }] });
    r.equipped.trinkets[1] = item({ statMods: [{ stat: 'maxHp', amount: 1 }] });
    const d = deriveStats(r);
    expect(d.power).toBe(6);
    expect(d.guard).toBe(6);
    expect(d.focusCap).toBe(5);
    expect(d.maxHp).toBe(13);
  });

  it('ORs boolean rule flags and sums scryFocusDiscount', () => {
    const r = baseRun();
    r.equipped.trinkets[0] = item({ ruleFlags: { chordWithoutFlags: true, scryFocusDiscount: 1 } });
    r.equipped.trinkets[1] = item({ ruleFlags: { noFlagging: true, scryFocusDiscount: 1 } });
    const d = deriveStats(r);
    expect(d.rules.chordWithoutFlags).toBe(true);
    expect(d.rules.noFlagging).toBe(true);
    expect(d.rules.scryFocusDiscount).toBe(2);
  });

  it('applies room debuffs as -1 per entry, clamped', () => {
    const r = baseRun();
    r.roomDebuffs = ['power', 'power', 'guard'];
    const d = deriveStats(r);
    expect(d.power).toBe(2);
    expect(d.guard).toBe(2);
  });

  it('bloodpact adds +2 power only at or below half HP', () => {
    const r = baseRun();
    r.equipped.trinkets[0] = item({ ruleFlags: { bloodpact: true } });
    r.hp = 12;
    expect(deriveStats(r).power).toBe(4);
    r.hp = 6;
    expect(deriveStats(r).power).toBe(6);
  });

  it('does not mutate the run', () => {
    const r = baseRun();
    r.roomDebuffs = ['power'];
    const before = JSON.stringify(r);
    deriveStats(r);
    expect(JSON.stringify(r)).toBe(before);
  });
});

describe('equippedItems', () => {
  it('returns only the filled slots in order', () => {
    const r = baseRun();
    const w = item({ slot: 'weapon' });
    r.equipped.weapon = w;
    r.equipped.trinkets[1] = item({});
    expect(equippedItems(r)[0]).toBe(w);
    expect(equippedItems(r).length).toBe(2);
  });
});

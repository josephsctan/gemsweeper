import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { CombatContext, MonsterInstance } from '../lib/types';
import { DEFAULT_RULE_FLAGS } from '../lib/types';
import { combatSession, beginCombat, act, endCombat, scryCost } from './combatStore';

const ctx: CombatContext = {
  power: 4, guard: 3, focus: 5, classId: 'diviner',
  rules: { ...DEFAULT_RULE_FLAGS }, isFirstFightThisRoom: false, sapperFirstMineHandled: true,
};
const mon = (o: Partial<MonsterInstance> = {}): MonsterInstance => ({
  type: 'fast', threat: 5, pips: 1, maxPips: 1, isBoss: false, debuffStat: null, ...o,
});

describe('combatStore', () => {
  beforeEach(() => { endCombat(); });

  it('beginCombat sets an ongoing session', () => {
    beginCombat(mon({ pips: 2 }), 3, ctx);
    expect(get(combatSession)!.state.resolution).toBe('ongoing');
    expect(get(combatSession)!.state.monster.pips).toBe(2);
  });

  it('beginCombat honours firstFightAutoWin', () => {
    beginCombat(mon({ pips: 2 }), 3, { ...ctx, isFirstFightThisRoom: true, rules: { ...DEFAULT_RULE_FLAGS, firstFightAutoWin: true } });
    expect(get(combatSession)!.state.resolution).toBe('win');
  });

  it('act advances rounds and accumulates focus spend', () => {
    beginCombat(mon({ type: 'fast', pips: 3 }), 5, ctx);
    act('ability'); // scry -1, spend 2
    act('ability'); // scry -1, spend 2
    const s = get(combatSession)!;
    expect(s.state.monster.pips).toBe(1);
    expect(s.focusSpent).toBe(4);
  });

  it('act is a no-op once resolved; endCombat returns and clears', () => {
    beginCombat(mon({ pips: 1 }), 3, ctx);
    act('strike');
    expect(get(combatSession)!.state.resolution).toBe('win');
    act('strike'); // ignored
    const final = endCombat();
    expect(final!.state.resolution).toBe('win');
    expect(get(combatSession)).toBeNull();
  });

  it('scryCost applies the discount and floors at 0', () => {
    expect(scryCost(ctx)).toBe(2);
    expect(scryCost({ ...ctx, rules: { ...DEFAULT_RULE_FLAGS, scryFocusDiscount: 3 } })).toBe(0);
  });
});

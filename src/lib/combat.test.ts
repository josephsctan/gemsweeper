import { describe, it, expect } from 'vitest';
import type { CombatContext, MonsterInstance } from './types';
import { DEFAULT_RULE_FLAGS } from './types';
import { createRng } from './rng';
import { getFloor } from '../content/floors';
import {
  monsterForTile, roundLimitFor, startCombat, combatStep, autoResolveIfApplicable,
  NORMAL_ROUND_LIMIT,
} from './combat';

// Default to diviner so the plain "threat - guard" timeout math is not shifted by
// the sapper -1 passive. Sapper-specific tests pass classId: 'sapper' explicitly.
const ctx = (over: Partial<CombatContext> = {}): CombatContext => ({
  power: 4, guard: 3, focus: 5, classId: 'diviner',
  rules: { ...DEFAULT_RULE_FLAGS },
  isFirstFightThisRoom: false,
  sapperFirstMineHandled: true,
  ...over,
});
const mon = (over: Partial<MonsterInstance> = {}): MonsterInstance => ({
  type: 'fast', threat: 5, pips: 1, maxPips: 1, isBoss: false, debuffStat: null, ...over,
});

describe('monsterForTile', () => {
  it('normal monster: threat/pips from the floor, pips in 1..2', () => {
    const f = getFloor(2);
    for (let s = 0; s < 20; s++) {
      const m = monsterForTile(f, false, createRng(s));
      expect(m.threat).toBe(f.monsterThreat);
      expect(m.pips).toBeGreaterThanOrEqual(1);
      expect(m.pips).toBeLessThanOrEqual(2);
      expect(['armored', 'fast', 'cursed']).toContain(m.type);
    }
  });

  it('boss monster: boss threat and boss pips', () => {
    const f = getFloor(4);
    const m = monsterForTile(f, true, createRng(1));
    expect(m.threat).toBe(f.bossThreat);
    expect(m.pips).toBe(f.bossPips);
    expect(m.isBoss).toBe(true);
  });

  it('cursed-type monster carries a pre-rolled debuff stat', () => {
    // force cursed by using a floor-like config with only cursed weight
    const f = { ...getFloor(1), monsterTypeWeights: { armored: 0, fast: 0, cursed: 1 } };
    const m = monsterForTile(f, false, createRng(3));
    expect(m.type).toBe('cursed');
    expect(['power', 'guard', 'focus']).toContain(m.debuffStat);
  });

  it('roundLimitFor: normal is 3, boss is the floor value', () => {
    expect(roundLimitFor(getFloor(1), false)).toBe(NORMAL_ROUND_LIMIT);
    expect(roundLimitFor(getFloor(4), true)).toBe(getFloor(4).bossRoundLimit);
  });
});

describe('combatStep — basic', () => {
  it('a single strike that clears the last pip wins with no HP loss', () => {
    const s = startCombat(mon({ pips: 1 }), 3);
    const r = combatStep(s, 'strike', ctx({ power: 4 }));
    expect(r.state.resolution).toBe('win');
    expect(r.state.hpLoss).toBe(0);
  });

  it('running out of rounds is a timeout costing max(1, threat - guard)', () => {
    let s = startCombat(mon({ type: 'fast', pips: 2, threat: 5 }), 2);
    s = combatStep(s, 'block', ctx({ guard: 3 })).state;
    const r = combatStep(s, 'block', ctx({ guard: 3 }));
    expect(r.state.resolution).toBe('timeout');
    expect(r.state.hpLoss).toBe(2);
  });

  it('timeout HP loss never drops below 1', () => {
    let s = startCombat(mon({ type: 'fast', pips: 5, threat: 3 }), 1);
    const r = combatStep(s, 'block', ctx({ guard: 99 }));
    expect(r.state.resolution).toBe('timeout');
    expect(r.state.hpLoss).toBe(1);
  });
});

describe('combatStep — monster types', () => {
  it('armored halves a strike until a Block breaks its poise', () => {
    // power 4 => base strike 1; armored halves to 0
    let s = startCombat(mon({ type: 'armored', pips: 1 }), 3);
    s = combatStep(s, 'strike', ctx({ power: 4 })).state;
    expect(s.monster.pips).toBe(1); // no progress
    s = combatStep(s, 'block', ctx()).state;
    const r = combatStep(s, 'strike', ctx({ power: 4 })); // poise broken -> full 1
    expect(r.state.resolution).toBe('win');
  });

  it('fast: Block is wasted (no focus from focusOnBlock)', () => {
    const s = startCombat(mon({ type: 'fast', pips: 2 }), 3);
    const r = combatStep(s, 'block', ctx({ rules: { ...DEFAULT_RULE_FLAGS, focusOnBlock: true } }));
    expect(r.focusGained).toBe(0);
  });

  it('cursed: an unblocked round pre-loads the room debuff', () => {
    const s = startCombat(mon({ type: 'cursed', pips: 3, debuffStat: 'power' }), 3);
    const r = combatStep(s, 'strike', ctx());
    expect(r.state.appliedDebuff).toBe('power');
  });

  it('cursed: a blocked round does not apply the debuff', () => {
    const s = startCombat(mon({ type: 'cursed', pips: 3, debuffStat: 'guard' }), 3);
    const r = combatStep(s, 'block', ctx());
    expect(r.state.appliedDebuff).toBeNull();
  });
});

describe('combatStep — class and item effects', () => {
  it('sapper first mine each room: timeout costs 0 and reports the free mine used', () => {
    let s = startCombat(mon({ type: 'fast', pips: 3, threat: 6 }), 1);
    const r = combatStep(s, 'block', ctx({ classId: 'sapper', sapperFirstMineHandled: false, guard: 2 }));
    expect(r.state.resolution).toBe('timeout');
    expect(r.state.hpLoss).toBe(0);
    expect(r.sapperFreeMineUsed).toBe(true);
  });

  it('sapper passive: subsequent timeouts cost one less', () => {
    let s = startCombat(mon({ type: 'fast', pips: 3, threat: 6 }), 1);
    const r = combatStep(s, 'block', ctx({ classId: 'sapper', sapperFirstMineHandled: true, guard: 2 }));
    // base = max(1, 6 - 2) = 4; sapper -1 => 3
    expect(r.state.hpLoss).toBe(3);
  });

  it('firstFightAutoWin resolves before any action', () => {
    const s = startCombat(mon({ pips: 2 }), 3);
    const auto = autoResolveIfApplicable(s, ctx({
      isFirstFightThisRoom: true,
      rules: { ...DEFAULT_RULE_FLAGS, firstFightAutoWin: true },
    }));
    expect(auto?.resolution).toBe('win');
    expect(autoResolveIfApplicable(s, ctx({ isFirstFightThisRoom: false }))).toBeNull();
  });

  it('strikeHitsAllPips clears a boss in one strike', () => {
    const s = startCombat(mon({ isBoss: true, pips: 6, maxPips: 6 }), 6);
    const r = combatStep(s, 'strike', ctx({
      rules: { ...DEFAULT_RULE_FLAGS, strikeHitsAllPips: true },
    }));
    expect(r.state.resolution).toBe('win');
  });

  it('diviner ability removes one pip and spends focus (2 minus discount)', () => {
    const s = startCombat(mon({ type: 'fast', pips: 2 }), 3);
    const r = combatStep(s, 'ability', ctx({
      classId: 'diviner', focus: 5,
      rules: { ...DEFAULT_RULE_FLAGS, scryFocusDiscount: 1 },
    }));
    expect(r.focusSpent).toBe(1);
    expect(r.state.monster.pips).toBe(1);
  });

  it('focusOnBlock grants 1 focus against a non-fast monster', () => {
    const s = startCombat(mon({ type: 'armored', pips: 3 }), 3);
    const r = combatStep(s, 'block', ctx({ rules: { ...DEFAULT_RULE_FLAGS, focusOnBlock: true } }));
    expect(r.focusGained).toBe(1);
  });

  it('a resolved fight ignores further steps', () => {
    let s = startCombat(mon({ pips: 1 }), 3);
    s = combatStep(s, 'strike', ctx()).state;
    const again = combatStep(s, 'strike', ctx());
    expect(again.state).toEqual(s);
  });
});

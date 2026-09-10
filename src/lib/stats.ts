import type { DerivedStats, Item, RuleFlags, RunState } from './types';
import { DEFAULT_RULE_FLAGS } from './types';

export function equippedItems(run: RunState): Item[] {
  const e = run.equipped;
  return [e.weapon, e.armor, e.trinkets[0], e.trinkets[1]].filter((x): x is Item => x !== null);
}

export function deriveStats(run: RunState): DerivedStats {
  let maxHp = run.maxHp;
  let power = run.power;
  let guard = run.guard;
  let focusCap = run.focusCap;
  const rules: RuleFlags = { ...DEFAULT_RULE_FLAGS };

  for (const it of equippedItems(run)) {
    for (const m of it.statMods ?? []) {
      if (m.stat === 'power') power += m.amount;
      else if (m.stat === 'guard') guard += m.amount;
      else if (m.stat === 'maxHp') maxHp += m.amount;
      else if (m.stat === 'focusCap') focusCap += m.amount;
    }
    const rf = it.ruleFlags ?? {};
    for (const [k, v] of Object.entries(rf)) {
      if (k === 'scryFocusDiscount') rules.scryFocusDiscount += (v as number) ?? 0;
      else if (v) (rules as unknown as Record<string, boolean>)[k] = true;
    }
  }

  for (const stat of run.roomDebuffs) {
    if (stat === 'power') power -= 1;
    else if (stat === 'guard') guard -= 1;
    else if (stat === 'focus') focusCap -= 1;
    else if (stat === 'hp') maxHp -= 1;
  }

  power = Math.max(0, power);
  guard = Math.max(0, guard);
  focusCap = Math.max(0, focusCap);
  maxHp = Math.max(1, maxHp);

  if (rules.bloodpact && run.hp <= maxHp / 2) power += 2;

  return { maxHp, power, guard, focusCap, rules };
}

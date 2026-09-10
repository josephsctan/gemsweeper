import { writable, get, type Writable } from 'svelte/store';
import type { CombatAction, CombatContext, CombatState, MonsterInstance } from '../lib/types';
import { startCombat, combatStep, autoResolveIfApplicable } from '../lib/combat';

export interface CombatSession {
  state: CombatState;
  ctx: CombatContext;
  focusSpent: number;
  focusGained: number;
  sapperFreeMineUsed: boolean;
}

export const combatSession: Writable<CombatSession | null> = writable(null);

export function scryCost(ctx: CombatContext): number {
  return Math.max(0, 2 - ctx.rules.scryFocusDiscount);
}

export function beginCombat(monster: MonsterInstance, roundLimit: number, ctx: CombatContext): void {
  const initial = startCombat(monster, roundLimit);
  const auto = autoResolveIfApplicable(initial, ctx);
  combatSession.set({
    state: auto ?? initial,
    ctx,
    focusSpent: 0,
    focusGained: 0,
    sapperFreeMineUsed: false,
  });
}

export function act(action: CombatAction): void {
  const s = get(combatSession);
  if (!s || s.state.resolution !== 'ongoing') return;
  const r = combatStep(s.state, action, s.ctx);
  combatSession.set({
    state: r.state,
    ctx: s.ctx,
    focusSpent: s.focusSpent + r.focusSpent,
    focusGained: s.focusGained + r.focusGained,
    sapperFreeMineUsed: s.sapperFreeMineUsed || r.sapperFreeMineUsed,
  });
}

export function endCombat(): CombatSession | null {
  const s = get(combatSession);
  combatSession.set(null);
  return s;
}

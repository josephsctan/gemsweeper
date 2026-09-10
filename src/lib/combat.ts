import type {
  CombatAction, CombatContext, CombatState, CombatStepResult,
  FloorConfig, MonsterInstance, MonsterType, StatKey,
} from './types';
import type { Rng } from './rng';

export const NORMAL_ROUND_LIMIT = 3;
const DEBUFF_STATS: StatKey[] = ['power', 'guard', 'focus'];

export function monsterForTile(floor: FloorConfig, isBoss: boolean, rng: Rng): MonsterInstance {
  const w = floor.monsterTypeWeights;
  const type = rng.weighted<MonsterType>([
    ['armored', w.armored],
    ['fast', w.fast],
    ['cursed', w.cursed],
  ]);
  const pips = isBoss ? floor.bossPips : rng.int(1, 2);
  return {
    type,
    threat: isBoss ? floor.bossThreat : floor.monsterThreat,
    pips,
    maxPips: pips,
    isBoss,
    debuffStat: type === 'cursed' ? rng.pick(DEBUFF_STATS) : null,
  };
}

export function roundLimitFor(floor: FloorConfig, isBoss: boolean): number {
  return isBoss ? floor.bossRoundLimit : NORMAL_ROUND_LIMIT;
}

export function startCombat(monster: MonsterInstance, roundLimit: number): CombatState {
  return {
    monster: { ...monster },
    round: 1,
    roundLimit,
    lastPlayerAction: null,
    log: [],
    resolution: 'ongoing',
    hpLoss: 0,
    appliedDebuff: null,
  };
}

export function autoResolveIfApplicable(state: CombatState, ctx: CombatContext): CombatState | null {
  if (ctx.rules.firstFightAutoWin && ctx.isFirstFightThisRoom) {
    return {
      ...state,
      monster: { ...state.monster, pips: 0 },
      resolution: 'win',
      hpLoss: 0,
      log: ['auto-won'],
    };
  }
  return null;
}

function baseStrike(power: number, rules: CombatContext['rules']): number {
  if (rules.strikeHitsAllPips) return Number.POSITIVE_INFINITY;
  return power >= 8 ? 2 : 1;
}

function timeoutLoss(state: CombatState, ctx: CombatContext): { loss: number; freeMine: boolean } {
  if (ctx.rules.firstMineFree && ctx.isFirstFightThisRoom) return { loss: 0, freeMine: false };
  if (ctx.classId === 'sapper' && !ctx.sapperFirstMineHandled) return { loss: 0, freeMine: true };
  let loss = Math.max(1, state.monster.threat - ctx.guard);
  if (ctx.classId === 'sapper') loss = Math.max(1, loss - 1);
  return { loss, freeMine: false };
}

export function combatStep(
  state: CombatState, action: CombatAction, ctx: CombatContext,
): CombatStepResult {
  if (state.resolution !== 'ongoing') {
    return { state, focusSpent: 0, focusGained: 0, sapperFreeMineUsed: false };
  }

  const next: CombatState = {
    ...state,
    monster: { ...state.monster },
    log: [...state.log],
  };
  let focusSpent = 0;
  let focusGained = 0;
  let sapperFreeMineUsed = false;

  const poiseBroken = state.lastPlayerAction === 'block';

  if (action === 'strike') {
    let dmg = baseStrike(ctx.power, ctx.rules);
    if (next.monster.type === 'armored' && !poiseBroken && Number.isFinite(dmg)) {
      dmg = Math.floor(dmg / 2);
    }
    next.monster.pips = Math.max(0, next.monster.pips - dmg);
    next.log.push(`strike -${Number.isFinite(dmg) ? dmg : 'all'}`);
  } else if (action === 'block') {
    if (ctx.rules.focusOnBlock && next.monster.type !== 'fast') {
      focusGained = 1;
      next.log.push('block (+1 focus)');
    } else {
      next.log.push('block');
    }
  } else if (action === 'ability') {
    if (ctx.classId === 'diviner') {
      focusSpent = Math.max(0, 2 - ctx.rules.scryFocusDiscount);
      next.monster.pips = Math.max(0, next.monster.pips - 1);
      next.log.push('scry -1');
    } else {
      // sapper has no in-combat ability; treat as a wasted round
      next.log.push('no ability');
    }
  }

  // cursed monster loads its debuff on the first unblocked round
  if (
    next.monster.type === 'cursed'
    && action !== 'block'
    && next.appliedDebuff === null
    && next.monster.debuffStat
  ) {
    next.appliedDebuff = next.monster.debuffStat;
  }

  next.lastPlayerAction = action;

  if (next.monster.pips <= 0) {
    next.resolution = 'win';
    next.hpLoss = 0;
  } else if (next.round >= next.roundLimit) {
    next.resolution = 'timeout';
    const { loss, freeMine } = timeoutLoss(next, ctx);
    next.hpLoss = loss;
    sapperFreeMineUsed = freeMine;
  } else {
    next.round += 1;
  }

  return { state: next, focusSpent, focusGained, sapperFreeMineUsed };
}

import type { Board, Coord, DerivedStats, RevealResult, RuleFlags, RunState } from './types';
import { getClass } from '../content/classes';
import { reveal, toggleFlag, emptyRevealResult } from './reveal';

export const SCRY_DURATION_MS = 6000;

export function abilityCost(run: RunState, derived: DerivedStats): number {
  const ab = getClass(run.classId).ability;
  if (ab.id === 'scry') return Math.max(0, ab.focusCost - derived.rules.scryFocusDiscount);
  return ab.focusCost;
}

export function canUseAbility(
  run: RunState, derived: DerivedStats, inCombat: boolean,
): { ok: boolean; reason?: string } {
  const ab = getClass(run.classId).ability;
  if (inCombat && !ab.usableInCombat) return { ok: false, reason: 'not usable in combat' };
  if (ab.oncePerRoom && run.abilityUsedThisRoom) return { ok: false, reason: 'already used this room' };
  if (run.focus < abilityCost(run, derived)) return { ok: false, reason: 'not enough Focus' };
  return { ok: true };
}

export function useProbe(
  run: RunState, board: Board, coord: Coord, rules: RuleFlags,
): { spentFocus: number; hitMine: boolean; result: RevealResult } {
  const ab = getClass(run.classId).ability;
  const cost = ab.focusCost;
  const t = board.tiles[coord.r]![coord.c]!;
  let hitMine = false;
  let result: RevealResult = emptyRevealResult();

  if (t.isMine) {
    hitMine = true;
    if (!t.flagged) toggleFlag(board, coord.r, coord.c, rules);
  } else {
    result = reveal(board, coord.r, coord.c, rules);
  }

  run.focus = Math.max(0, run.focus - cost);
  run.abilityUsedThisRoom = true;
  return { spentFocus: cost, hitMine, result };
}

export function useScry(
  run: RunState, board: Board, center: Coord, now: number,
  cost: number = 2, durationMs: number = SCRY_DURATION_MS,
): { spentFocus: number; coords: Coord[] } {
  const coords: Coord[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const r = center.r + dr, c = center.c + dc;
      if (r < 0 || r >= board.rows || c < 0 || c >= board.cols) continue;
      const t = board.tiles[r]![c]!;
      if (t.isMine) {
        t.scryVisibleUntil = now + durationMs;
        coords.push({ r, c });
      }
    }
  run.focus = Math.max(0, run.focus - cost);
  return { spentFocus: cost, coords };
}

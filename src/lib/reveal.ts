import type { Board, Coord, RevealResult, RuleFlags, TileState } from './types';
import { neighbourCoords } from './boardgen';
import type { Rng } from './rng';

export function emptyRevealResult(): RevealResult {
  return { revealed: [], mines: [], caches: [], rubbleAdvanced: [] };
}

const at = (b: Board, r: number, c: number): TileState => b.tiles[r]![c]!;
const isFullyRevealed = (t: TileState): boolean => t.revealed;

function mergeResult(into: RevealResult, add: RevealResult): void {
  into.revealed.push(...add.revealed);
  into.mines.push(...add.mines);
  into.caches.push(...add.caches);
  into.rubbleAdvanced.push(...add.rubbleAdvanced);
}

function floodFrom(board: Board, start: Coord, res: RevealResult): void {
  const queue: Coord[] = [start];
  while (queue.length) {
    const { r, c } = queue.shift()!;
    for (const nc of neighbourCoords(board, r, c)) {
      const n = at(board, nc.r, nc.c);
      if (n.flagged || n.isMine || n.revealed) continue;
      if (n.watered) continue; // watered tiles never flood open (chord/watered exclusion)
      if (n.hazard === 'rubble') {
        if (n.rubbleStage === 0) {
          n.rubbleStage = 1;
          res.rubbleAdvanced.push({ r: n.r, c: n.c });
        }
        continue; // never flood through / past rubble
      }
      n.revealed = true;
      res.revealed.push({ r: n.r, c: n.c });
      if (n.isCache) res.caches.push({ r: n.r, c: n.c });
      if (n.adjacent === 0) queue.push({ r: n.r, c: n.c });
    }
  }
}

export function reveal(board: Board, r: number, c: number, _rules: RuleFlags): RevealResult {
  const res = emptyRevealResult();
  const t = at(board, r, c);
  if (t.flagged) return res;

  if (t.hazard === 'rubble' && t.rubbleStage < 2) {
    if (t.rubbleStage === 0) {
      t.rubbleStage = 1;
      res.rubbleAdvanced.push({ r, c });
      return res;
    }
    // stage 1 -> 2: fully cleared
    t.rubbleStage = 2;
    t.revealed = true;
    res.revealed.push({ r, c });
    if (t.isCache) res.caches.push({ r, c });
    if (t.adjacent === 0) floodFrom(board, { r, c }, res);
    return res;
  }

  if (t.revealed) return res;

  if (t.isMine) {
    res.mines.push({ r, c });
    return res;
  }

  t.revealed = true;
  res.revealed.push({ r, c });
  if (t.isCache) res.caches.push({ r, c });
  if (t.adjacent === 0) floodFrom(board, { r, c }, res);
  return res;
}

export function chord(board: Board, r: number, c: number, rules: RuleFlags): RevealResult {
  const res = emptyRevealResult();
  const t = at(board, r, c);
  if (!t.revealed || t.adjacent === 0) return res;

  const ns = neighbourCoords(board, r, c).map((n) => at(board, n.r, n.c));
  const flagged = ns.filter((n) => n.flagged).length;
  const covered = ns.filter((n) => !isFullyRevealed(n) && !n.flagged).length + flagged;
  const satisfied = flagged === t.adjacent || (rules.chordWithoutFlags && covered === t.adjacent);
  if (!satisfied) return res;

  for (const n of ns) {
    if (n.flagged || isFullyRevealed(n)) continue;
    if (n.watered) continue; // watered tiles are excluded from chord auto-reveal
    mergeResult(res, reveal(board, n.r, n.c, rules));
  }
  return res;
}

export function toggleFlag(board: Board, r: number, c: number, rules: RuleFlags): boolean {
  if (rules.noFlagging) return false;
  const t = at(board, r, c);
  if (t.revealed) {
    if (t.hazard === 'ember') {
      t.flagged = !t.flagged;
      if (t.flagged) t.emberRecoverAt = null;
      return t.flagged;
    }
    return false;
  }
  t.flagged = !t.flagged;
  t.numberPeeked = t.flagged && rules.revealNumberOnFlag;
  return t.flagged;
}

export function countTotalSafe(board: Board): number {
  let total = 0;
  for (const row of board.tiles)
    for (const t of row) {
      if (t.isMine) continue;
      total += t.hazard === 'rubble' ? 2 : 1;
    }
  return total;
}

export function countRevealedSafe(board: Board): number {
  let done = 0;
  for (const row of board.tiles)
    for (const t of row) {
      if (t.isMine) continue;
      if (t.hazard === 'rubble') done += t.rubbleStage; // 0,1,2
      else if (t.revealed) done += 1;
    }
  return done;
}

export function isRoomClear(board: Board): boolean {
  if (countRevealedSafe(board) < countTotalSafe(board)) return false;
  if (!board.isBoss) return true;
  for (const row of board.tiles)
    for (const t of row)
      if (t.isBossMine && !t.defused) return false;
  return true;
}

export function armEmbers(
  board: Board, coords: Coord[], now: number, emberRecoverMs: number, rules: RuleFlags,
): void {
  if (rules.immuneEmberRecover) return;
  for (const { r, c } of coords) {
    const t = at(board, r, c);
    if (t.hazard === 'ember' && t.revealed && !t.flagged && t.emberRecoverAt === null) {
      t.emberRecoverAt = now + emberRecoverMs;
    }
  }
}

export function recoverEmbers(board: Board, now: number, rules: RuleFlags): Coord[] {
  if (rules.immuneEmberRecover) return [];
  if (isRoomClear(board)) return [];
  const out: Coord[] = [];
  for (const row of board.tiles)
    for (const t of row) {
      if (
        t.hazard === 'ember' && t.revealed && !t.flagged &&
        t.emberRecoverAt !== null && now >= t.emberRecoverAt
      ) {
        t.revealed = false;
        t.emberRecoverAt = null;
        out.push({ r: t.r, c: t.c });
      }
    }
  return out;
}

export function spreadWater(board: Board, rng: Rng): Coord | null {
  const dry: TileState[] = [];
  const wet: TileState[] = [];
  for (const row of board.tiles)
    for (const t of row) {
      if (!t.revealed || t.isMine) continue;
      (t.watered ? wet : dry).push(t);
    }
  if (dry.length === 0) return null;

  let pool = dry;
  if (wet.length > 0) {
    const adjToWater = dry.filter((t) =>
      neighbourCoords(board, t.r, t.c).some((n) => at(board, n.r, n.c).watered),
    );
    if (adjToWater.length > 0) pool = adjToWater;
  }
  const chosen = rng.pick(pool);
  chosen.watered = true;
  return { r: chosen.r, c: chosen.c };
}

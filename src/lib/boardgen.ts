import type { Board, BoardConfig, Coord, FloorConfig, TileState } from './types';
import { createRng, type Rng } from './rng';
import { getFloor } from '../content/floors';

export const MAX_PLACEMENT_ATTEMPTS = 60;

function newTile(r: number, c: number): TileState {
  return {
    r, c,
    isMine: false, isBossMine: false, isCache: false,
    adjacent: 0, displayDelta: 0, hazard: 'none',
    revealed: false, flagged: false, defused: false,
    rubbleStage: 0, watered: false,
    emberRecoverAt: null, numberPeeked: false, scryVisibleUntil: null,
  };
}

export function roomConfig(
  floor: FloorConfig,
  roomIndex: number,
  roomsThisFloor: number,
  rng: Rng,
): BoardConfig {
  const isBoss = roomIndex === roomsThisFloor - 1;
  const total = floor.rows * floor.cols;
  const mineCount = Math.round(total * floor.mineRatio);
  const hazardCount = Math.max(1, Math.round((total - mineCount) * floor.hazardRatio));
  const cacheCount = isBoss ? 1 : rng.int(0, 2);
  return {
    rows: floor.rows,
    cols: floor.cols,
    mineCount,
    hazard: floor.hazard,
    hazardCount,
    cacheCount,
    isBoss,
  };
}

export function createEmptyBoard(cfg: BoardConfig): Board {
  const tiles: TileState[][] = [];
  for (let r = 0; r < cfg.rows; r++) {
    const row: TileState[] = [];
    for (let c = 0; c < cfg.cols; c++) row.push(newTile(r, c));
    tiles.push(row);
  }
  return { rows: cfg.rows, cols: cfg.cols, tiles, minesPlaced: false, hazard: cfg.hazard, isBoss: cfg.isBoss };
}

function neighbours(board: Board, r: number, c: number): TileState[] {
  const out: TileState[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < board.rows && nc >= 0 && nc < board.cols) out.push(board.tiles[nr]![nc]!);
    }
  return out;
}

export function neighbourCoords(board: Board, r: number, c: number): Coord[] {
  return neighbours(board, r, c).map((t) => ({ r: t.r, c: t.c }));
}

function key(r: number, c: number): string { return `${r},${c}`; }

export function computeAdjacency(board: Board): void {
  for (const row of board.tiles)
    for (const t of row)
      t.adjacent = t.isMine ? 0 : neighbours(board, t.r, t.c).filter((n) => n.isMine).length;
}

/** Mutates `board`: places mines, boss mine, caches, hazards, adjacency, cursed lies. */
export function placeMines(board: Board, cfg: BoardConfig, first: Coord, rng: Rng): void {
  const reserved = new Set<string>([key(first.r, first.c)]);
  for (const n of neighbours(board, first.r, first.c)) reserved.add(key(n.r, n.c));

  const candidates: Coord[] = [];
  for (let r = 0; r < board.rows; r++)
    for (let c = 0; c < board.cols; c++)
      if (!reserved.has(key(r, c))) candidates.push({ r, c });

  const mineCount = Math.min(candidates.length, cfg.mineCount);

  let chosen: Coord[] = [];
  let accepted = false;
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    chosen = rng.shuffle(candidates).slice(0, mineCount);
    for (const { r, c } of chosen) board.tiles[r]![c]!.isMine = true;
    computeAdjacency(board);
    if (board.tiles[first.r]![first.c]!.adjacent === 0) { accepted = true; break; }
    for (const { r, c } of chosen) board.tiles[r]![c]!.isMine = false;
  }
  if (!accepted) {
    // fall back to the last shuffled set even though it left a non-zero first tile
    for (const { r, c } of chosen) board.tiles[r]![c]!.isMine = true;
    computeAdjacency(board);
  }

  board.minesPlaced = true;

  // boss mine
  if (cfg.isBoss && chosen.length > 0) {
    const bm = rng.pick(chosen);
    board.tiles[bm.r]![bm.c]!.isBossMine = true;
  }

  // safe tiles for caches + hazards (never the first tile)
  const safe: Coord[] = [];
  for (let r = 0; r < board.rows; r++)
    for (let c = 0; c < board.cols; c++) {
      if (board.tiles[r]![c]!.isMine) continue;
      if (r === first.r && c === first.c) continue;
      safe.push({ r, c });
    }
  const shuffledSafe = rng.shuffle(safe);
  let cursor = 0;

  const cacheN = Math.min(cfg.cacheCount, shuffledSafe.length);
  for (let i = 0; i < cacheN; i++) {
    const { r, c } = shuffledSafe[cursor++]!;
    board.tiles[r]![c]!.isCache = true;
  }

  const hazardN = Math.min(cfg.hazardCount, shuffledSafe.length - cursor);
  for (let i = 0; i < hazardN; i++) {
    const { r, c } = shuffledSafe[cursor++]!;
    const t = board.tiles[r]![c]!;
    t.hazard = cfg.hazard;
    if (cfg.hazard === 'cursed') {
      let delta: -1 | 1 = rng.chance(0.5) ? -1 : 1;
      if (t.adjacent + delta < 0) delta = 1;
      t.displayDelta = delta;
    }
  }
}

export function prepareRoom(
  seed: number,
  floorId: number,
  roomIndex: number,
  roomsThisFloor: number,
): { board: Board; cfg: BoardConfig; rng: Rng } {
  const rng = createRng(seed).fork(floorId * 1000 + roomIndex);
  const cfg = roomConfig(getFloor(floorId), roomIndex, roomsThisFloor, rng);
  const board = createEmptyBoard(cfg);
  return { board, cfg, rng };
}

export function generateRoom(
  seed: number,
  floorId: number,
  roomIndex: number,
  roomsThisFloor: number,
  first: Coord,
): Board {
  const { board, cfg, rng } = prepareRoom(seed, floorId, roomIndex, roomsThisFloor);
  placeMines(board, cfg, first, rng);
  return board;
}

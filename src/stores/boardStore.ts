import { writable, get, type Writable } from 'svelte/store';
import type { Board, BoardConfig, Coord, RevealResult, RuleFlags } from '../lib/types';
import type { Rng } from '../lib/rng';
import { prepareRoom, placeMines } from '../lib/boardgen';
import { reveal, chord, toggleFlag, emptyRevealResult } from '../lib/reveal';

export interface BoardSession {
  board: Board;
  cfg: BoardConfig;
  rng: Rng;
}

export const boardSession: Writable<BoardSession | null> = writable(null);

/**
 * reveal()/chord()/toggleFlag()/etc. mutate TileState objects in place (by
 * design — see lib/reveal.ts). Svelte 5's per-component prop reactivity
 * checks reference identity, so re-publishing the same board/tiles/tile
 * object references after a mutation is invisible to <Tile> — the board
 * would look permanently unrevealed no matter how many tiles get clicked.
 * Cloning here, at the single point that talks to the store, gives every
 * consumer fresh references without requiring the pure lib layer (which
 * must stay Svelte-free) to know anything about Svelte's reactivity model.
 */
function cloneBoard(board: Board): Board {
  return { ...board, tiles: board.tiles.map((row) => row.map((t) => ({ ...t }))) };
}

/**
 * Called once per room, right after the first reveal seeds mines/hazards.
 * gameFlow registers itself here (boardStore must not import gameFlow).
 */
let minesPlacedHook: ((first: Coord) => void) | null = null;
export function setMinesPlacedHook(fn: ((first: Coord) => void) | null): void {
  minesPlacedHook = fn;
}

export function loadRoom(seed: number, floorId: number, roomIndex: number, roomsThisFloor: number): void {
  const { board, cfg, rng } = prepareRoom(seed, floorId, roomIndex, roomsThisFloor);
  boardSession.set({ board, cfg, rng });
}

export function clearRoom(): void {
  boardSession.set(null);
}

export function bump(): void {
  boardSession.update((s) => (s ? { ...s, board: cloneBoard(s.board) } : s));
}

export function applyReveal(r: number, c: number, rules: RuleFlags): RevealResult {
  const s = get(boardSession);
  if (!s) return emptyRevealResult();
  if (!s.board.minesPlaced) {
    placeMines(s.board, s.cfg, { r, c }, s.rng);
    minesPlacedHook?.({ r, c });
  }
  const res = reveal(s.board, r, c, rules);
  boardSession.set({ ...s, board: cloneBoard(s.board) });
  return res;
}

export function applyChord(r: number, c: number, rules: RuleFlags): RevealResult {
  const s = get(boardSession);
  if (!s) return emptyRevealResult();
  const res = chord(s.board, r, c, rules);
  boardSession.set({ ...s, board: cloneBoard(s.board) });
  return res;
}

export function applyFlag(r: number, c: number, rules: RuleFlags): boolean {
  const s = get(boardSession);
  if (!s) return false;
  const flagged = toggleFlag(s.board, r, c, rules);
  boardSession.set({ ...s, board: cloneBoard(s.board) });
  return flagged;
}

export type { Coord };

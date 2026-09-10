import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { getFloor } from '../content/floors';
import {
  roomConfig, createEmptyBoard, placeMines, generateRoom,
} from './boardgen';
import type { Board, Coord } from './types';

function minePositions(b: Board): string[] {
  const out: string[] = [];
  for (const row of b.tiles) for (const t of row) if (t.isMine) out.push(`${t.r},${t.c}`);
  return out.sort();
}
function tileAt(b: Board, r: number, c: number) { return b.tiles[r]![c]!; }
function neighborsOf(b: Board, r: number, c: number) {
  const out = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < b.rows && nc >= 0 && nc < b.cols) out.push(tileAt(b, nr, nc));
    }
  return out;
}

describe('roomConfig', () => {
  it('marks only the last room of the floor as the boss room', () => {
    expect(roomConfig(getFloor(1), 0, 5, createRng(1)).isBoss).toBe(false);
    expect(roomConfig(getFloor(1), 3, 5, createRng(1)).isBoss).toBe(false);
    expect(roomConfig(getFloor(1), 4, 5, createRng(1)).isBoss).toBe(true);
  });

  it('boss room forces exactly one cache; normal rooms have 0..2', () => {
    const boss = roomConfig(getFloor(2), 4, 5, createRng(7));
    expect(boss.isBoss).toBe(true);
    expect(boss.cacheCount).toBe(1);
    for (let s = 0; s < 30; s++) {
      const cfg = roomConfig(getFloor(2), 1, 5, createRng(s));
      expect(cfg.cacheCount).toBeGreaterThanOrEqual(0);
      expect(cfg.cacheCount).toBeLessThanOrEqual(2);
    }
  });

  it('board size comes from the floor', () => {
    const cfg = roomConfig(getFloor(3), 0, 5, createRng(1));
    expect([cfg.rows, cfg.cols]).toEqual([12, 12]);
    expect(cfg.mineCount).toBe(Math.round(12 * 12 * getFloor(3).mineRatio));
  });
});

describe('createEmptyBoard', () => {
  it('builds a fully covered grid with correct coords and no mines placed', () => {
    const cfg = roomConfig(getFloor(1), 0, 5, createRng(1));
    const b = createEmptyBoard(cfg);
    expect(b.rows).toBe(8);
    expect(b.tiles.length).toBe(8);
    expect(b.tiles[0]!.length).toBe(8);
    expect(b.minesPlaced).toBe(false);
    expect(tileAt(b, 3, 5).r).toBe(3);
    expect(tileAt(b, 3, 5).c).toBe(5);
    for (const row of b.tiles) for (const t of row) {
      expect(t.revealed).toBe(false);
      expect(t.isMine).toBe(false);
      expect(t.flagged).toBe(false);
    }
  });
});

describe('placeMines', () => {
  const first: Coord = { r: 3, c: 3 };

  it('places exactly cfg.mineCount mines and sets minesPlaced', () => {
    const cfg = roomConfig(getFloor(1), 0, 5, createRng(11));
    const b = createEmptyBoard(cfg);
    placeMines(b, cfg, first, createRng(11));
    expect(minePositions(b).length).toBe(cfg.mineCount);
    expect(b.minesPlaced).toBe(true);
  });

  it('never places a mine on the first tile or its 8 neighbours', () => {
    for (let s = 0; s < 25; s++) {
      const cfg = roomConfig(getFloor(4), 0, 5, createRng(s));
      const b = createEmptyBoard(cfg);
      placeMines(b, cfg, first, createRng(s));
      expect(tileAt(b, first.r, first.c).isMine).toBe(false);
      for (const n of neighborsOf(b, first.r, first.c)) expect(n.isMine).toBe(false);
    }
  });

  it('first tile has a true adjacent count of 0 (opens a zero region)', () => {
    for (let s = 0; s < 25; s++) {
      const cfg = roomConfig(getFloor(1), 0, 5, createRng(s));
      const b = createEmptyBoard(cfg);
      placeMines(b, cfg, first, createRng(s));
      expect(tileAt(b, first.r, first.c).adjacent).toBe(0);
    }
  });

  it('adjacency numbers equal the count of neighbouring mines', () => {
    const cfg = roomConfig(getFloor(2), 1, 5, createRng(3));
    const b = createEmptyBoard(cfg);
    placeMines(b, cfg, first, createRng(3));
    for (const row of b.tiles) for (const t of row) {
      if (t.isMine) continue;
      const actual = neighborsOf(b, t.r, t.c).filter((n) => n.isMine).length;
      expect(t.adjacent).toBe(actual);
    }
  });

  it('is deterministic for the same (seed, floor, room, first click)', () => {
    const a = generateRoom(999, 3, 2, 6, first);
    const b = generateRoom(999, 3, 2, 6, first);
    expect(minePositions(a)).toEqual(minePositions(b));
    expect(a.tiles.map((r) => r.map((t) => t.adjacent))).toEqual(
      b.tiles.map((r) => r.map((t) => t.adjacent)),
    );
  });

  it('boss room gets exactly one boss mine among its mines', () => {
    const b = generateRoom(5, 2, 4, 5, first); // room 4 of 5 => boss
    const bossMines = b.tiles.flat().filter((t) => t.isBossMine);
    expect(bossMines.length).toBe(1);
    expect(bossMines[0]!.isMine).toBe(true);
  });

  it('places cfg.cacheCount cache tiles, all on safe non-first tiles', () => {
    const cfg = roomConfig(getFloor(2), 1, 5, createRng(21));
    const b = createEmptyBoard(cfg);
    placeMines(b, cfg, first, createRng(21));
    const caches = b.tiles.flat().filter((t) => t.isCache);
    expect(caches.length).toBe(cfg.cacheCount);
    for (const t of caches) {
      expect(t.isMine).toBe(false);
      expect(t.r === first.r && t.c === first.c).toBe(false);
    }
  });

  it('hazard tiles use the floor hazard and sit only on safe tiles', () => {
    const b = generateRoom(8, 3, 1, 6, first); // ember floor
    const haz = b.tiles.flat().filter((t) => t.hazard !== 'none');
    expect(haz.length).toBeGreaterThan(0);
    for (const t of haz) {
      expect(t.hazard).toBe('ember');
      expect(t.isMine).toBe(false);
    }
  });

  it('createEmptyBoard + placeMines with mismatched cfg is a usage error we do not guard (docs only)', () => {
    // placeMines trusts the cfg passed to it; prepareRoom/generateRoom always pass the matching cfg.
    const cfg = roomConfig(getFloor(1), 0, 5, createRng(1));
    const b = createEmptyBoard(cfg);
    placeMines(b, cfg, first, createRng(1));
    expect(b.minesPlaced).toBe(true);
  });

  it('cursed floor sets displayDelta only on cursed-hazard tiles and keeps shown value >= 0', () => {
    const b1 = generateRoom(4, 4, 1, 6, first);
    const b2 = generateRoom(4, 4, 1, 6, first);
    for (let r = 0; r < b1.rows; r++) for (let c = 0; c < b1.cols; c++) {
      const t = b1.tiles[r]![c]!;
      if (t.hazard !== 'cursed') expect(t.displayDelta).toBe(0);
      if (t.displayDelta !== 0) expect(t.adjacent + t.displayDelta).toBeGreaterThanOrEqual(0);
      expect(t.displayDelta).toBe(b2.tiles[r]![c]!.displayDelta); // stable
    }
  });
});

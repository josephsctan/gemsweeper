import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { DEFAULT_RULE_FLAGS } from '../lib/types';
import { boardSession, loadRoom, clearRoom, applyReveal, applyFlag } from './boardStore';

const RULES = { ...DEFAULT_RULE_FLAGS };

describe('boardStore', () => {
  beforeEach(() => clearRoom());

  it('loadRoom populates a covered, un-mined session', () => {
    loadRoom(123, 1, 0, 5);
    const s = get(boardSession)!;
    expect(s).not.toBeNull();
    expect(s.board.minesPlaced).toBe(false);
    expect(s.board.rows).toBe(8);
    expect(s.board.tiles.flat().every((t) => !t.revealed)).toBe(true);
  });

  it('the first applyReveal places mines with that tile safe, then reveals', () => {
    loadRoom(123, 1, 0, 5);
    const res = applyReveal(4, 4, RULES);
    const s = get(boardSession)!;
    expect(s.board.minesPlaced).toBe(true);
    expect(s.board.tiles[4]![4]!.isMine).toBe(false);
    expect(s.board.tiles[4]![4]!.revealed).toBe(true);
    expect(res.revealed.length).toBeGreaterThan(0);
  });

  it('is deterministic: same seed/floor/room/first click => same mines', () => {
    loadRoom(77, 2, 1, 5);
    applyReveal(5, 5, RULES);
    const a = get(boardSession)!.board.tiles.flat().filter((t) => t.isMine).map((t) => `${t.r},${t.c}`).sort();
    clearRoom();
    loadRoom(77, 2, 1, 5);
    applyReveal(5, 5, RULES);
    const b = get(boardSession)!.board.tiles.flat().filter((t) => t.isMine).map((t) => `${t.r},${t.c}`).sort();
    expect(a).toEqual(b);
  });

  it('applyFlag toggles and notifies subscribers', () => {
    loadRoom(1, 1, 0, 5);
    let ticks = 0;
    const unsub = boardSession.subscribe(() => ticks++);
    const start = ticks;
    applyFlag(0, 0, RULES);
    expect(get(boardSession)!.board.tiles[0]![0]!.flagged).toBe(true);
    expect(ticks).toBeGreaterThan(start);
    unsub();
  });
});

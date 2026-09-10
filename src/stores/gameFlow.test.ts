import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { DEFAULT_RULE_FLAGS } from '../lib/types';
import { boardSession, applyReveal } from './boardStore';
import { runState, checkpointStore } from './runStore';
import { combatSession, act } from './combatStore';
import { reloadMeta, meta } from './metaStore';
import {
  phase, rewardOffers, lastOutcome, startNewRun, handleMines, resolveCombat,
  skipReward, retry, abandon, toMenu,
} from './gameFlow';

const RULES = { ...DEFAULT_RULE_FLAGS };
const firstMine = () => get(boardSession)!.board.tiles.flat().find((t) => t.isMine)!;

describe('gameFlow', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadMeta();
    toMenu();
  });

  it('startNewRun creates a run, loads a room, and enters play', () => {
    startNewRun('sapper');
    expect(get(phase)).toBe('playing');
    expect(get(runState)).not.toBeNull();
    expect(get(boardSession)).not.toBeNull();
    expect(get(meta).runsStarted).toBe(1);
    expect(get(checkpointStore)).not.toBeNull();
  });

  it('a mine hit opens combat; resolving a won fight defuses the tile and banks the kill', () => {
    startNewRun('sapper');
    applyReveal(4, 4, RULES); // first reveal places mines
    const mine = firstMine();
    handleMines([{ r: mine.r, c: mine.c }]);
    expect(get(phase)).toBe('combat');
    for (let i = 0; i < 8 && get(combatSession)?.state.resolution === 'ongoing'; i++) act('strike');
    resolveCombat();
    const board = get(boardSession)!.board;
    expect(board.tiles[mine.r]![mine.c]!.defused).toBe(true);
    expect(get(runState)!.monstersDefused).toBeGreaterThanOrEqual(1);
  });

  it('skipReward heals and advances the room', () => {
    startNewRun('sapper');
    rewardOffers.set([]);
    phase.set('reward');
    get(runState)!.hp = 1;
    skipReward();
    expect(get(runState)!.hp).toBeGreaterThan(1);
    expect(['playing', 'floor-cleared', 'summary']).toContain(get(phase));
  });

  it('retry after running out sends the run to the summary as died-out', () => {
    startNewRun('sapper');
    get(runState)!.retriesLeft = 0;
    get(runState)!.hp = 0;
    phase.set('dead');
    retry();
    expect(get(phase)).toBe('summary');
    expect(get(lastOutcome)).toBe('died-out');
  });

  it('abandon records the run end and clears the save', () => {
    startNewRun('sapper');
    abandon();
    expect(get(phase)).toBe('summary');
    expect(get(lastOutcome)).toBe('abandoned');
    expect(localStorage.getItem('gemsweeper:save')).toBeNull();
  });
});

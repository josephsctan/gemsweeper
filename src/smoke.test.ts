import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { DEFAULT_RULE_FLAGS } from './lib/types';
import { deriveStats } from './lib/stats';
import { isBossRoom } from './lib/run';
import { SAVE_VERSION, loadRunSave } from './lib/storage';
import { boardSession, applyReveal } from './stores/boardStore';
import { runState } from './stores/runStore';
import { combatSession, act } from './stores/combatStore';
import { reloadMeta } from './stores/metaStore';
import {
  phase, startRunWithSeed, handleMines, handleCaches, handleBoardClear,
  resolveCombat, skipReward, toMenu,
} from './stores/gameFlow';
import { isRoomClear } from './lib/reveal';

function fightOut() {
  for (let i = 0; i < 12 && get(combatSession)?.state.resolution === 'ongoing'; i++) act('strike');
  resolveCombat();
}

function playRoomToClear() {
  const rules = { ...DEFAULT_RULE_FLAGS, ...deriveStats(get(runState)!).rules };
  let safety = 0;
  while (get(phase) === 'playing' && safety++ < 400) {
    const b = get(boardSession)!.board;
    let acted = false;
    for (const t of b.tiles.flat()) {
      if (t.isMine) continue;
      const needs = t.hazard === 'rubble' ? t.rubbleStage < 2 : !t.revealed;
      if (!needs) continue;
      const res = applyReveal(t.r, t.c, rules);
      if (res.caches.length) handleCaches(res.caches);
      acted = true;
      break;
    }
    const b2 = get(boardSession)!.board;
    if (get(phase) === 'playing' && isBossRoom(get(runState)!)) {
      const boss = b2.tiles.flat().find((t) => t.isBossMine && !t.defused);
      if (boss && !b2.tiles.flat().some((t) => !t.isMine && (t.hazard === 'rubble' ? t.rubbleStage < 2 : !t.revealed))) {
        handleMines([{ r: boss.r, c: boss.c }]);
      }
    }
    if (get(phase) === 'combat') fightOut();
    if (get(phase) === 'playing' && isRoomClear(get(boardSession)!.board)) handleBoardClear();
    if (!acted && get(phase) === 'playing') break;
  }
  if (get(phase) === 'reward') skipReward();
}

describe('smoke: a seeded run through floor 1', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadMeta();
    toMenu();
  });

  it('clears every room of floor 1 and writes a valid checkpoint save', () => {
    startRunWithSeed(12345, 'sapper');
    let safety = 0;
    while (!['floor-cleared', 'summary', 'dead'].includes(get(phase)) && safety++ < 20) {
      playRoomToClear();
    }
    expect(get(phase)).toBe('floor-cleared');

    const save = loadRunSave()!;
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.seed).toBe(12345);
    expect(save.classId).toBe('sapper');
    expect(save.floor).toBe(2);
    expect(save.roomIndex).toBe(0);
    expect(save.retriesLeft).toBe(2);
    expect(Array.isArray(save.inventory)).toBe(true);
    expect(save.equipped.weapon).not.toBeNull();
    expect(save.equipped.armor).not.toBeNull();
  });
});

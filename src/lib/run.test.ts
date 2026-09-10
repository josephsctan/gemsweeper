import { describe, it, expect } from 'vitest';
import type { Item, RunState } from './types';
import {
  createRun, enterFloor, snapshotCheckpoint, restoreCheckpoint, roomCleared,
  advanceRoom, applyDeath, noteSafeReveals, applyHpLoss, isDead,
  isBossRoom, isCheckpointRoom, isFinalBoss, depthOf, START_RETRIES,
} from './run';

const wpn: Item = { id: 'w1', defId: 'sappers-pick', name: 'Pick', slot: 'weapon', rarity: 'common', flavor: '' };
const arm: Item = { id: 'a1', defId: 'blast-plating', name: 'Plate', slot: 'armor', rarity: 'common', flavor: '' };
const mkRun = (): RunState => {
  const r = createRun(42, 'sapper', wpn, arm, 1_000);
  enterFloor(r);
  return r;
};

describe('createRun', () => {
  it('seeds base stats from the class and starts on floor 1 room 0', () => {
    const r = createRun(42, 'sapper', wpn, arm, 1_000);
    expect(r.floor).toBe(1);
    expect(r.roomIndex).toBe(0);
    expect(r.retriesLeft).toBe(START_RETRIES);
    expect([r.hp, r.maxHp, r.power, r.guard, r.focus, r.focusCap]).toEqual([12, 12, 4, 3, 3, 3]);
    expect(r.equipped.weapon).toBe(wpn);
    expect(r.equipped.armor).toBe(arm);
    expect(r.startedAtMs).toBe(1_000);
  });
});

describe('enterFloor', () => {
  it('draws a room count within the floor range and resets per-room state', () => {
    const r = mkRun();
    expect(r.roomsThisFloor).toBeGreaterThanOrEqual(4);
    expect(r.roomsThisFloor).toBeLessThanOrEqual(5); // floor 1 range [4,5]
    r.abilityUsedThisRoom = true;
    r.roomDebuffs = ['power'];
    enterFloor(r);
    expect(r.abilityUsedThisRoom).toBe(false);
    expect(r.roomDebuffs).toEqual([]);
  });

  it('is deterministic for the same seed + floor', () => {
    const a = mkRun().roomsThisFloor;
    const b = mkRun().roomsThisFloor;
    expect(a).toBe(b);
  });
});

describe('checkpoints', () => {
  it('snapshot then restore round-trips loadout and hp', () => {
    const r = mkRun();
    r.hp = 7;
    r.focus = 1;
    r.inventory = [wpn];
    const cp = snapshotCheckpoint(r);
    r.hp = 1;
    r.focus = 3;
    r.inventory = [];
    r.roomIndex = 2;
    restoreCheckpoint(r, cp);
    expect(r.hp).toBe(7);
    expect(r.focus).toBe(1);
    expect(r.inventory).toEqual([wpn]);
    expect(r.roomIndex).toBe(0);
  });

  it('snapshot is a deep copy — later mutation does not leak in', () => {
    const r = mkRun();
    const cp = snapshotCheckpoint(r);
    r.inventory.push(wpn);
    expect(cp.inventory).toEqual([]);
  });
});

describe('roomCleared', () => {
  it('adds one focus up to the derived cap and resets per-room flags', () => {
    const r = mkRun();
    r.focus = 1;
    r.abilityUsedThisRoom = true;
    r.fightsThisRoom = 2;
    roomCleared(r, 3);
    expect(r.focus).toBe(2);
    expect(r.abilityUsedThisRoom).toBe(false);
    expect(r.fightsThisRoom).toBe(0);
    r.focus = 3;
    roomCleared(r, 3);
    expect(r.focus).toBe(3); // capped
  });
});

describe('advanceRoom', () => {
  it('walks rooms, then floors, then completes', () => {
    const r = mkRun();
    r.roomsThisFloor = 4;
    expect(advanceRoom(r)).toBe('next-room'); // 0 -> 1
    expect(advanceRoom(r)).toBe('next-room'); // 1 -> 2
    expect(advanceRoom(r)).toBe('next-room'); // 2 -> 3
    expect(advanceRoom(r)).toBe('next-floor'); // 3 -> floor 2 room 0
    expect(r.floor).toBe(2);
    expect(r.roomIndex).toBe(0);
    r.floor = 4;
    r.roomsThisFloor = 4;
    r.roomIndex = 3;
    expect(advanceRoom(r)).toBe('run-complete');
  });
});

describe('death and retries', () => {
  it('applyDeath decrements retries then reports game-over', () => {
    const r = mkRun();
    expect(r.retriesLeft).toBe(2);
    expect(applyDeath(r)).toBe('retry');
    expect(applyDeath(r)).toBe('retry');
    expect(r.retriesLeft).toBe(0);
    expect(applyDeath(r)).toBe('game-over');
  });

  it('applyHpLoss floors at zero and isDead flips', () => {
    const r = mkRun();
    applyHpLoss(r, 100);
    expect(r.hp).toBe(0);
    expect(isDead(r)).toBe(true);
  });
});

describe('noteSafeReveals', () => {
  it('sapper gains no passive focus', () => {
    const r = mkRun(); // sapper
    expect(noteSafeReveals(r, 25, 3).focusGained).toBe(0);
  });

  it('diviner gains one focus per ten safe tiles, capped', () => {
    const r = createRun(1, 'diviner', wpn, arm, 0);
    enterFloor(r);
    r.focus = 0;
    expect(noteSafeReveals(r, 9, 9).focusGained).toBe(0);
    expect(noteSafeReveals(r, 1, 9).focusGained).toBe(1); // crossed 10
    expect(r.focus).toBe(1);
    expect(noteSafeReveals(r, 30, 9).focusGained).toBe(3);
    expect(r.focus).toBe(4);
  });
});

describe('room predicates', () => {
  it('identifies checkpoint, boss, and final-boss rooms', () => {
    const r = mkRun();
    r.roomsThisFloor = 5;
    r.roomIndex = 0;
    expect(isCheckpointRoom(r)).toBe(true);
    expect(isBossRoom(r)).toBe(false);
    r.roomIndex = 4;
    expect(isBossRoom(r)).toBe(true);
    expect(isFinalBoss(r)).toBe(false);
    r.floor = 4;
    expect(isFinalBoss(r)).toBe(true);
  });

  it('depthOf is monotonic across floors and rooms', () => {
    expect(depthOf(1, 0)).toBe(1);
    expect(depthOf(1, 4)).toBe(5);
    expect(depthOf(2, 0)).toBe(7);
    expect(depthOf(4, 5)).toBe(24);
  });
});

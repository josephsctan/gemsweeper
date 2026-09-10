import type { Checkpoint, ClassId, Item, RunState, StatKey, Equipped } from './types';
import { createRng } from './rng';
import { getClass } from '../content/classes';
import { getFloor, FLOOR_COUNT } from '../content/floors';

export const START_RETRIES = 2;
export const ROOMS_PER_FLOOR_MAX = 6;

export function depthOf(floor: number, roomIndex: number): number {
  return (floor - 1) * ROOMS_PER_FLOOR_MAX + roomIndex + 1;
}

function cloneItem(i: Item): Item {
  return {
    ...i,
    statMods: i.statMods ? [...i.statMods] : undefined,
    hooks: i.hooks ? [...i.hooks] : undefined,
    ruleFlags: i.ruleFlags ? { ...i.ruleFlags } : undefined,
  };
}

function cloneEquipped(e: Equipped): Equipped {
  return {
    weapon: e.weapon ? cloneItem(e.weapon) : null,
    armor: e.armor ? cloneItem(e.armor) : null,
    trinkets: [
      e.trinkets[0] ? cloneItem(e.trinkets[0]) : null,
      e.trinkets[1] ? cloneItem(e.trinkets[1]) : null,
    ],
  };
}

function resetRoomState(run: RunState): void {
  run.abilityUsedThisRoom = false;
  run.sapperFirstMineHandled = false;
  run.fightsThisRoom = 0;
  run.safeRevealsThisRoom = 0;
  run.roomDebuffs = [];
}

export function createRun(
  seed: number, classId: ClassId, startWeapon: Item, startArmor: Item, now: number,
): RunState {
  const cls = getClass(classId);
  const run: RunState = {
    seed,
    classId,
    floor: 1,
    roomIndex: 0,
    roomsThisFloor: 0,
    retriesLeft: START_RETRIES,
    hp: cls.start.hp,
    maxHp: cls.start.hp,
    focus: cls.start.focus,
    focusCap: cls.start.focusCap,
    power: cls.start.power,
    guard: cls.start.guard,
    equipped: { weapon: startWeapon, armor: startArmor, trinkets: [null, null] },
    inventory: [],
    codexUnlocks: [],
    abilityUsedThisRoom: false,
    sapperFirstMineHandled: false,
    fightsThisRoom: 0,
    safeRevealsThisRoom: 0,
    roomDebuffs: [],
    startedAtMs: now,
    monstersDefused: 0,
    deepestDepth: depthOf(1, 0),
  };
  return run;
}

export function enterFloor(run: RunState): void {
  const floor = getFloor(run.floor);
  const rng = createRng(run.seed).fork(9000 + run.floor);
  run.roomIndex = 0;
  run.roomsThisFloor = rng.int(floor.roomCountRange[0], floor.roomCountRange[1]);
  run.deepestDepth = Math.max(run.deepestDepth, depthOf(run.floor, 0));
  resetRoomState(run);
}

export function snapshotCheckpoint(run: RunState): Checkpoint {
  return {
    floor: run.floor,
    hp: run.hp,
    maxHp: run.maxHp,
    focus: run.focus,
    focusCap: run.focusCap,
    power: run.power,
    guard: run.guard,
    retriesLeft: run.retriesLeft,
    equipped: cloneEquipped(run.equipped),
    inventory: run.inventory.map(cloneItem),
    codexUnlocks: [...run.codexUnlocks],
  };
}

export function restoreCheckpoint(run: RunState, cp: Checkpoint): void {
  run.floor = cp.floor;
  run.hp = cp.hp;
  run.maxHp = cp.maxHp;
  run.focus = cp.focus;
  run.focusCap = cp.focusCap;
  run.power = cp.power;
  run.guard = cp.guard;
  run.retriesLeft = cp.retriesLeft;
  run.equipped = cloneEquipped(cp.equipped);
  run.inventory = cp.inventory.map(cloneItem);
  run.codexUnlocks = [...cp.codexUnlocks];
  enterFloor(run);
}

export function roomCleared(run: RunState, derivedFocusCap: number): void {
  run.focus = Math.min(run.focus + 1, derivedFocusCap);
  run.deepestDepth = Math.max(run.deepestDepth, depthOf(run.floor, run.roomIndex));
  resetRoomState(run);
}

export function advanceRoom(run: RunState): 'next-room' | 'next-floor' | 'run-complete' {
  if (run.roomIndex < run.roomsThisFloor - 1) {
    run.roomIndex += 1;
    resetRoomState(run);
    return 'next-room';
  }
  if (run.floor < FLOOR_COUNT) {
    run.floor += 1;
    enterFloor(run);
    return 'next-floor';
  }
  return 'run-complete';
}

export function applyDeath(run: RunState): 'retry' | 'game-over' {
  if (run.retriesLeft > 0) {
    run.retriesLeft -= 1;
    return 'retry';
  }
  return 'game-over';
}

export function noteSafeReveals(
  run: RunState, count: number, derivedFocusCap: number,
): { focusGained: number } {
  const before = run.safeRevealsThisRoom;
  run.safeRevealsThisRoom = before + count;
  if (run.classId !== 'diviner') return { focusGained: 0 };
  const crossed = Math.floor(run.safeRevealsThisRoom / 10) - Math.floor(before / 10);
  if (crossed <= 0) return { focusGained: 0 };
  const applied = Math.min(crossed, Math.max(0, derivedFocusCap - run.focus));
  run.focus += applied;
  return { focusGained: applied };
}

export function recordMineDefused(run: RunState): void {
  run.monstersDefused += 1;
}

export function applyRoomDebuff(run: RunState, stat: StatKey): void {
  run.roomDebuffs.push(stat);
}

export function applyHpLoss(run: RunState, amount: number): void {
  run.hp = Math.max(0, run.hp - amount);
}

export function isDead(run: RunState): boolean {
  return run.hp <= 0;
}

export function isBossRoom(run: RunState): boolean {
  return run.roomIndex === run.roomsThisFloor - 1;
}

export function isCheckpointRoom(run: RunState): boolean {
  return run.roomIndex === 0;
}

export function isFinalBoss(run: RunState): boolean {
  return run.floor === FLOOR_COUNT && isBossRoom(run);
}

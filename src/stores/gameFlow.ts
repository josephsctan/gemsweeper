import { writable, get, type Writable } from 'svelte/store';
import type { ClassId, Coord, ItemDef, Item } from '../lib/types';
import { boardSession, loadRoom, clearRoom, bump } from './boardStore';
import { runState, checkpointStore, setRun, patchRun } from './runStore';
import { beginCombat, endCombat, type CombatSession } from './combatStore';
import { persistMeta, reloadMeta } from './metaStore';
import { goto, closeModal, openModal, ui } from './uiStore';
import { getClass } from '../content/classes';
import { getFloor } from '../content/floors';
import { getMonsterDef } from '../content/monsters';
import { createRng } from '../lib/rng';
import {
  createRun, enterFloor, snapshotCheckpoint, restoreCheckpoint, roomCleared,
  advanceRoom, applyDeath, applyHpLoss, isDead, recordMineDefused, applyRoomDebuff,
  noteSafeReveals, isBossRoom,
} from '../lib/run';
import { deriveStats } from '../lib/stats';
import { monsterForTile, roundLimitFor } from '../lib/combat';
import { isRoomClear, recoverEmbers, spreadWater } from '../lib/reveal';
import {
  makeItem, rollRewards, onRoomClearHeal, postCombatHpCost,
} from '../lib/items';
import { addToInventory, resolvePickupAtCap } from '../lib/inventory';
import { abilityCost, canUseAbility, useProbe, useScry } from '../lib/abilities';
import {
  loadRunSave, writeRunSave, clearRunSave, recordRunStart, recordRunEnd,
} from '../lib/storage';

export type Phase =
  | 'loading' | 'playing' | 'combat' | 'reward' | 'floor-cleared' | 'dead' | 'won' | 'summary';

export const phase: Writable<Phase> = writable('loading');
export const rewardOffers: Writable<ItemDef[]> = writable([]);
export const pendingPickup: Writable<Item | null> = writable(null);
export const targeting: Writable<'probe' | 'scry' | null> = writable(null);
export const lastOutcome: Writable<'win' | 'died-out' | 'abandoned'> = writable('win');

export const SKIP_HEAL_HP = 3;

let mineQueue: Coord[] = [];
let firstCacheDoneThisFloor = false;

// ---- helpers ----
function run() { return get(runState)!; }
function board() { return get(boardSession)!.board; }
function rewardRng() {
  const r = run();
  return createRng(r.seed).fork(40000 + r.floor * 100 + r.roomIndex);
}
function combatRngFor(c: Coord) {
  const r = run();
  return createRng(r.seed).fork(70000 + r.floor * 1000 + r.roomIndex * 100 + c.r * 14 + c.c);
}
function buildCtx() {
  const r = run();
  const d = deriveStats(r);
  return {
    power: d.power, guard: d.guard, focus: r.focus, classId: r.classId, rules: d.rules,
    isFirstFightThisRoom: r.fightsThisRoom === 0,
    sapperFirstMineHandled: r.sapperFirstMineHandled,
  };
}

function beginRoom() {
  const r = run();
  loadRoom(r.seed, r.floor, r.roomIndex, r.roomsThisFloor);
  mineQueue = [];
  phase.set('playing');
}

// ---- lifecycle ----
export function startRunWithSeed(seed: number, classId: ClassId): void {
  const cls = getClass(classId);
  const weapon = makeItem(cls.startGear.weapon, createRng(seed).fork(1));
  const armor = makeItem(cls.startGear.armor, createRng(seed).fork(2));
  const r = createRun(seed, classId, weapon, armor, Date.now());
  enterFloor(r);
  setRun(r);
  checkpointStore.set(snapshotCheckpoint(r));
  persistMeta(recordRunStart);
  writeRunSave(r);
  firstCacheDoneThisFloor = false;
  beginRoom();
  goto('game');
}

export function startNewRun(classId: ClassId): void {
  startRunWithSeed(Math.floor(Math.random() * 2 ** 31), classId);
}

export function continueSavedRun(): boolean {
  const s = loadRunSave();
  if (!s) return false;
  const r = createRun(s.seed, s.classId, s.equipped.weapon!, s.equipped.armor!, Date.now());
  r.floor = s.floor;
  r.retriesLeft = s.retriesLeft;
  r.hp = s.hp;
  r.maxHp = getClass(s.classId).start.hp;
  r.focus = s.focus;
  r.focusCap = s.focusCap;
  r.power = s.power;
  r.guard = s.guard;
  r.equipped = s.equipped;
  r.inventory = s.inventory;
  r.codexUnlocks = s.codexUnlocks;
  enterFloor(r);
  setRun(r);
  checkpointStore.set(snapshotCheckpoint(r));
  firstCacheDoneThisFloor = false;
  beginRoom();
  goto('game');
  return true;
}

// ---- board callbacks (wired in GameScreen) ----
export function noteReveals(count: number): void {
  if (count <= 0) return;
  const r = run();
  const cap = deriveStats(r).focusCap;
  noteSafeReveals(r, count, cap);
  patchRun(() => {});
}

export function handleCaches(coords: Coord[]): void {
  const r = run();
  const rng = rewardRng();
  let grants = coords.length;
  if (!firstCacheDoneThisFloor && deriveStats(r).rules.luckyCoin && grants > 0) {
    grants += 1;
    firstCacheDoneThisFloor = true;
  } else if (grants > 0) {
    firstCacheDoneThisFloor = true;
  }
  for (let i = 0; i < grants; i++) {
    const def = rollRewards(r.floor, false, rng, 1)[0]!;
    const item = makeItem(def.defId, rng);
    if (addToInventory(r, item) === 'full') {
      pendingPickup.set(item);
      openModal('drop-choice');
      break;
    }
  }
  patchRun(() => {});
}

export function handleMines(coords: Coord[]): void {
  if (coords.length === 0) return;
  mineQueue = [...coords];
  phase.set('combat');
  startNextFight();
}

function startNextFight() {
  const c = mineQueue[0]!;
  const r = run();
  const tile = board().tiles[c.r]![c.c]!;
  const monster = monsterForTile(getFloor(r.floor), tile.isBossMine, combatRngFor(c));
  beginCombat(monster, roundLimitFor(getFloor(r.floor), tile.isBossMine), buildCtx());
}

export function resolveCombat(session: CombatSession | null = endCombat()): void {
  if (!session) return;
  const r = run();
  const c = mineQueue.shift()!;
  const b = board();
  const tile = b.tiles[c.r]![c.c]!;
  const d = deriveStats(r);

  r.focus = Math.max(0, Math.min(d.focusCap, r.focus - session.focusSpent + session.focusGained));
  if (session.sapperFreeMineUsed) r.sapperFirstMineHandled = true;
  applyHpLoss(r, session.state.hpLoss + postCombatHpCost(r));
  if (session.state.appliedDebuff) applyRoomDebuff(r, session.state.appliedDebuff);

  tile.defused = true;
  tile.revealed = true;
  tile.flagged = false;
  recordMineDefused(r);
  r.fightsThisRoom += 1;

  const codexId = getMonsterDef(session.state.monster.type).codexId;
  if (!r.codexUnlocks.includes(codexId)) {
    r.codexUnlocks.push(codexId);
    persistMeta((m) => (m.codexUnlocks.includes(codexId) ? m : { ...m, codexUnlocks: [...m.codexUnlocks, codexId] }));
  }

  if (getFloor(r.floor).hazard === 'water') {
    spreadWater(b, createRng(r.seed).fork(60000 + r.floor * 100 + r.roomIndex + r.fightsThisRoom));
  }

  bump();
  patchRun(() => {});

  if (mineQueue.length > 0) {
    startNextFight();
    return;
  }
  if (isDead(r)) {
    phase.set('dead');
    return;
  }
  phase.set('playing');
  if (isRoomClear(b)) handleBoardClear();
}

export function handleBoardClear(): void {
  if (get(phase) !== 'playing') return;
  const r = run();
  const heal = onRoomClearHeal(r);
  if (heal > 0) r.hp = Math.min(deriveStats(r).maxHp, r.hp + heal);
  rewardOffers.set(rollRewards(r.floor, isBossRoom(r), rewardRng(), 3));
  patchRun(() => {});
  phase.set('reward');
}

// ---- rewards ----
export function pickReward(defId: string): void {
  const r = run();
  const item = makeItem(defId, rewardRng());
  if (addToInventory(r, item) === 'full') {
    pendingPickup.set(item);
    openModal('drop-choice');
    return;
  }
  patchRun(() => {});
  finishRoom();
}

export function skipReward(): void {
  const r = run();
  const d = deriveStats(r);
  r.hp = Math.min(d.maxHp, r.hp + SKIP_HEAL_HP);
  r.focus = Math.min(d.focusCap, r.focus + 1);
  patchRun(() => {});
  finishRoom();
}

export function resolvePickup(dropId: string): void {
  const r = run();
  const inc = get(pendingPickup);
  if (inc) resolvePickupAtCap(r, inc, dropId);
  pendingPickup.set(null);
  closeModal();
  patchRun(() => {});
  finishRoom();
}

function finishRoom() {
  const r = run();
  roomCleared(r, deriveStats(r).focusCap);
  const step = advanceRoom(r);
  patchRun(() => {});
  if (step === 'run-complete') {
    endRun('win');
  } else if (step === 'next-floor') {
    firstCacheDoneThisFloor = false;
    checkpointStore.set(snapshotCheckpoint(r));
    writeRunSave(r);
    phase.set('floor-cleared');
  } else {
    beginRoom();
  }
}

export function continueToNextFloor(): void {
  beginRoom();
}

// ---- abilities ----
export function abilityView(): { label: string; enabled: boolean } {
  const r = get(runState);
  if (!r) return { label: '', enabled: false };
  const d = deriveStats(r);
  const ab = getClass(r.classId).ability;
  const inCombat = get(phase) === 'combat';
  const label = `${ab.name} (${abilityCost(r, d)})`;
  if (inCombat) return { label, enabled: false }; // in-combat ability is driven from CombatModal
  return { label, enabled: canUseAbility(r, d, false).ok && get(targeting) === null };
}

export function beginTargeting(kind: 'probe' | 'scry'): void {
  const r = get(runState);
  if (!r) return;
  if (!canUseAbility(r, deriveStats(r), false).ok) return;
  targeting.set(kind);
}

export function handleTarget(rr: number, cc: number): void {
  const kind = get(targeting);
  if (!kind) return;
  const r = run();
  const d = deriveStats(r);
  if (kind === 'probe') {
    const res = useProbe(r, board(), { r: rr, c: cc }, d.rules);
    if (res.result.revealed.length) noteReveals(res.result.revealed.length);
    if (res.result.caches.length) handleCaches(res.result.caches);
  } else {
    useScry(r, board(), { r: rr, c: cc }, Date.now(), abilityCost(r, d));
  }
  targeting.set(null);
  bump();
  patchRun(() => {});
  if (isRoomClear(board())) handleBoardClear();
}

// ---- death / end ----
export function retry(): void {
  const r = run();
  const outcome = applyDeath(r);
  if (outcome === 'retry') {
    const cp = get(checkpointStore)!;
    restoreCheckpoint(r, cp);
    setRun(r);
    firstCacheDoneThisFloor = false;
    beginRoom();
  } else {
    endRun('died-out');
  }
}

export function abandon(): void {
  endRun('abandoned');
}

function endRun(outcome: 'win' | 'died-out' | 'abandoned') {
  const r = run();
  lastOutcome.set(outcome);
  persistMeta((m) => recordRunEnd(m, r, outcome === 'win' ? 'win' : 'abandon', Date.now()));
  clearRunSave();
  phase.set(outcome === 'win' ? 'won' : 'summary');
}

export function toWonSummary(): void {
  phase.set('summary');
}

export function toMenu(): void {
  setRun(null);
  clearRoom();
  endCombat();
  reloadMeta();
  ui.update((s) => ({ ...s, selectedClass: null }));
  goto('menu');
  phase.set('loading');
}

// ---- timers ----
export function tickTimers(): void {
  const s = get(boardSession);
  const r = get(runState);
  if (!s || !r || get(phase) !== 'playing') return;
  const rules = deriveStats(r).rules;
  const recovered = recoverEmbers(s.board, Date.now(), rules);
  const anyScry = s.board.tiles.flat().some((t) => t.scryVisibleUntil && t.scryVisibleUntil > Date.now() - 1000);
  if (recovered.length || anyScry) bump();
}

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { DEFAULT_RULE_FLAGS } from '../lib/types';
import { createRng } from '../lib/rng';
import { makeItem } from '../lib/items';
import { INVENTORY_CAP } from '../lib/inventory';
import { boardSession, applyReveal } from './boardStore';
import { runState, checkpointStore } from './runStore';
import { combatSession, act } from './combatStore';
import { reloadMeta, meta } from './metaStore';
import { ui } from './uiStore';
import {
  phase, rewardOffers, lastOutcome, pendingPickup, targeting,
  startNewRun, startRunWithSeed, handleMines, handleCaches, resolveCombat,
  pickReward, resolvePickup, skipReward, retry, abandon, toMenu,
  abilityView, beginTargeting, noteReveals,
} from './gameFlow';

const RULES = { ...DEFAULT_RULE_FLAGS };
const firstMine = () => get(boardSession)!.board.tiles.flat().find((t) => t.isMine)!;

let itemSeed = 0;
function fillInventory(): void {
  const r = get(runState)!;
  const rng = createRng(1234).fork(itemSeed++);
  while (r.inventory.length < INVENTORY_CAP) r.inventory.push(makeItem('quick-salve', rng));
}
function equip(defId: string, slot: 'weapon' | 'armor' | 'trinket'): void {
  const r = get(runState)!;
  const item = makeItem(defId, createRng(99).fork(itemSeed++));
  if (slot === 'weapon') r.equipped.weapon = item;
  else if (slot === 'armor') r.equipped.armor = item;
  else r.equipped.trinkets[0] = item;
}

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

  // ---- regression: cache-triggered pickup must not skip the room ----
  it('a cache pickup at a full inventory closes the modal and leaves the room running', () => {
    startNewRun('sapper');
    applyReveal(4, 4, RULES); // seed the board so the room is genuinely live
    fillInventory();
    const roomBefore = get(runState)!.roomIndex;
    const boardBefore = get(boardSession)!.board;

    handleCaches([{ r: 0, c: 0 }]);
    expect(get(pendingPickup)).not.toBeNull();
    expect(get(ui).modal).toBe('drop-choice');
    expect(get(phase)).toBe('playing');

    resolvePickup(get(pendingPickup)!.id); // discard the incoming item
    expect(get(pendingPickup)).toBeNull();
    expect(get(ui).modal).toBeNull();
    expect(get(phase)).toBe('playing');
    expect(get(runState)!.roomIndex).toBe(roomBefore);
    expect(get(runState)!.floor).toBe(1);
    expect(get(boardSession)!.board).toBe(boardBefore); // same live board, not a fresh room
  });

  it('a reward pickup at a full inventory still advances to the next room', () => {
    startNewRun('sapper');
    fillInventory();
    const roomBefore = get(runState)!.roomIndex;
    rewardOffers.set([]);
    phase.set('reward');

    pickReward('quick-salve');
    expect(get(pendingPickup)).not.toBeNull();
    expect(get(ui).modal).toBe('drop-choice');

    resolvePickup(get(pendingPickup)!.id);
    expect(get(pendingPickup)).toBeNull();
    expect(get(runState)!.roomIndex).toBe(roomBefore + 1);
    expect(get(phase)).toBe('playing');
  });

  // ---- regression: abilities must not fire on an unseeded board ----
  it('beginTargeting is inert until the first reveal has placed mines', () => {
    startNewRun('sapper');
    expect(get(boardSession)!.board.minesPlaced).toBe(false);
    expect(abilityView().enabled).toBe(false);

    beginTargeting('probe');
    expect(get(targeting)).toBeNull();

    applyReveal(4, 4, RULES);
    expect(get(boardSession)!.board.minesPlaced).toBe(true);
    expect(abilityView().enabled).toBe(true);

    beginTargeting('probe');
    expect(get(targeting)).toBe('probe');
    targeting.set(null);
  });

  // ---- regression: Cursed Aegis' numbersSometimesLie must actually lie ----
  it('numbersSometimesLie scatters clamped display deltas on a non-cursed floor', () => {
    startRunWithSeed(4242, 'sapper');
    equip('cursed-aegis', 'armor');
    applyReveal(4, 4, RULES);

    const tiles = get(boardSession)!.board.tiles.flat();
    const lied = tiles.filter((t) => t.displayDelta !== 0);
    expect(lied.length).toBeGreaterThan(0);
    expect(lied.length).toBeLessThan(tiles.length); // a subset, not every tile
    expect(lied.every((t) => !t.isMine && t.hazard === 'none')).toBe(true);
    expect(lied.every((t) => t.adjacent + t.displayDelta >= 0)).toBe(true);
  });

  it('numbers never lie without the rule flag', () => {
    startRunWithSeed(4242, 'sapper');
    applyReveal(4, 4, RULES);
    expect(get(boardSession)!.board.tiles.flat().every((t) => t.displayDelta === 0)).toBe(true);
  });

  // ---- regression: the two dead item hooks are wired ----
  it("Cartographer's Eye opens a free safe tile as soon as the board is seeded", () => {
    startRunWithSeed(999, 'sapper');
    equip('cartographers-eye', 'trinket');
    expect(get(runState)!.safeRevealsThisRoom).toBe(0);

    applyReveal(4, 4, RULES); // the test never calls noteReveals itself
    expect(get(runState)!.safeRevealsThisRoom).toBeGreaterThan(0);
  });

  it('no free room-start reveal without the trinket', () => {
    startRunWithSeed(999, 'sapper');
    applyReveal(4, 4, RULES);
    expect(get(runState)!.safeRevealsThisRoom).toBe(0);
  });

  it("Seer's Thread turns safe reveals into Focus", () => {
    startRunWithSeed(31337, 'sapper');
    const r = get(runState)!;
    r.focusCap = 100;
    r.focus = 0;
    for (let i = 0; i < 60; i++) noteReveals(1);
    expect(get(runState)!.focus).toBe(0); // control: no trinket, no focus

    equip('seers-thread', 'trinket');
    for (let i = 0; i < 60; i++) noteReveals(1);
    expect(get(runState)!.focus).toBeGreaterThan(0);
  });
});

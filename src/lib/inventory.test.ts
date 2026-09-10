import { describe, it, expect } from 'vitest';
import type { RunState } from './types';
import { createRun, enterFloor } from './run';
import { createRng } from './rng';
import { makeItem } from './items';
import {
  INVENTORY_CAP, addToInventory, equipFromInventory, unequip,
  dropFromInventory, resolvePickupAtCap,
} from './inventory';

let n = 0;
const item = (defId: string) => makeItem(defId, createRng(++n));
const mkRun = (): RunState => {
  const r = createRun(1, 'sapper', item('sappers-pick'), item('blast-plating'), 0);
  enterFloor(r);
  return r;
};

describe('addToInventory', () => {
  it('stores up to the cap then reports full', () => {
    const r = mkRun();
    for (let i = 0; i < INVENTORY_CAP; i++) expect(addToInventory(r, item('gravedigger'))).toBe('ok');
    expect(r.inventory.length).toBe(INVENTORY_CAP);
    expect(addToInventory(r, item('gravedigger'))).toBe('full');
    expect(r.inventory.length).toBe(INVENTORY_CAP);
  });
});

describe('equipFromInventory', () => {
  it('swaps the weapon slot and returns the old weapon to inventory', () => {
    const r = mkRun();
    const maul = item('iron-maul');
    addToInventory(r, maul);
    const oldWeapon = r.equipped.weapon!;
    expect(equipFromInventory(r, maul.id)).toBe(true);
    expect(r.equipped.weapon!.id).toBe(maul.id);
    expect(r.inventory.map((i) => i.id)).toContain(oldWeapon.id);
    expect(r.inventory.map((i) => i.id)).not.toContain(maul.id);
  });

  it('fills the first empty trinket slot, or the requested one', () => {
    const r = mkRun();
    const a = item('lucky-coin'); const b = item('focus-battery');
    addToInventory(r, a); addToInventory(r, b);
    expect(equipFromInventory(r, a.id)).toBe(true);
    expect(r.equipped.trinkets[0]!.id).toBe(a.id);
    expect(equipFromInventory(r, b.id, 1)).toBe(true);
    expect(r.equipped.trinkets[1]!.id).toBe(b.id);
  });

  it('returns false for an unknown id', () => {
    expect(equipFromInventory(mkRun(), 'ghost')).toBe(false);
  });
});

describe('unequip', () => {
  it('moves a slot item to inventory, or refuses when full', () => {
    const r = mkRun();
    expect(unequip(r, 'weapon')).toBe('ok');
    expect(r.equipped.weapon).toBeNull();
    expect(r.inventory.length).toBe(1);
    while (r.inventory.length < INVENTORY_CAP) addToInventory(r, item('gravedigger'));
    expect(unequip(r, 'armor')).toBe('full');
    expect(r.equipped.armor).not.toBeNull();
  });
});

describe('dropFromInventory & resolvePickupAtCap', () => {
  it('drops by id', () => {
    const r = mkRun();
    const g = item('gravedigger');
    addToInventory(r, g);
    expect(dropFromInventory(r, g.id)).toBe(true);
    expect(r.inventory.length).toBe(0);
  });

  it('discards the pickup when dropId is the incoming id', () => {
    const r = mkRun();
    while (r.inventory.length < INVENTORY_CAP) addToInventory(r, item('gravedigger'));
    const incoming = item('iron-maul');
    resolvePickupAtCap(r, incoming, incoming.id);
    expect(r.inventory.map((i) => i.id)).not.toContain(incoming.id);
    expect(r.inventory.length).toBe(INVENTORY_CAP);
  });

  it('drops the chosen item and stores the pickup', () => {
    const r = mkRun();
    const first = item('gravedigger');
    addToInventory(r, first);
    while (r.inventory.length < INVENTORY_CAP) addToInventory(r, item('gravedigger'));
    const incoming = item('iron-maul');
    resolvePickupAtCap(r, incoming, first.id);
    expect(r.inventory.map((i) => i.id)).not.toContain(first.id);
    expect(r.inventory.map((i) => i.id)).toContain(incoming.id);
    expect(r.inventory.length).toBe(INVENTORY_CAP);
  });
});

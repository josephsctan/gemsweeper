import type { Item, RunState, Slot } from './types';

export const INVENTORY_CAP = 8;

export function addToInventory(run: RunState, item: Item): 'ok' | 'full' {
  if (run.inventory.length >= INVENTORY_CAP) return 'full';
  run.inventory.push(item);
  return 'ok';
}

export function dropFromInventory(run: RunState, itemId: string): boolean {
  const i = run.inventory.findIndex((x) => x.id === itemId);
  if (i < 0) return false;
  run.inventory.splice(i, 1);
  return true;
}

export function equipFromInventory(run: RunState, itemId: string, trinketIndex?: 0 | 1): boolean {
  const idx = run.inventory.findIndex((x) => x.id === itemId);
  if (idx < 0) return false;
  const [item] = run.inventory.splice(idx, 1);
  if (!item) return false;

  let displaced: Item | null = null;
  if (item.slot === 'weapon') {
    displaced = run.equipped.weapon;
    run.equipped.weapon = item;
  } else if (item.slot === 'armor') {
    displaced = run.equipped.armor;
    run.equipped.armor = item;
  } else {
    const slot: 0 | 1 = trinketIndex
      ?? (run.equipped.trinkets[0] === null ? 0 : run.equipped.trinkets[1] === null ? 1 : 0);
    displaced = run.equipped.trinkets[slot];
    run.equipped.trinkets[slot] = item;
  }
  if (displaced) run.inventory.push(displaced); // net zero — always fits
  return true;
}

export function unequip(run: RunState, slot: Slot, trinketIndex?: 0 | 1): 'ok' | 'full' {
  if (run.inventory.length >= INVENTORY_CAP) return 'full';
  if (slot === 'weapon') {
    if (run.equipped.weapon) { run.inventory.push(run.equipped.weapon); run.equipped.weapon = null; }
  } else if (slot === 'armor') {
    if (run.equipped.armor) { run.inventory.push(run.equipped.armor); run.equipped.armor = null; }
  } else {
    const s: 0 | 1 = trinketIndex ?? 0;
    const it = run.equipped.trinkets[s];
    if (it) { run.inventory.push(it); run.equipped.trinkets[s] = null; }
  }
  return 'ok';
}

export function resolvePickupAtCap(run: RunState, incoming: Item, dropId: string): void {
  if (dropId === incoming.id) return; // discard the pickup
  if (dropFromInventory(run, dropId)) run.inventory.push(incoming);
}

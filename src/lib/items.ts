import type { Item, ItemDef, Rarity, RunState } from './types';
import type { Rng } from './rng';
import { ALL_ITEM_DEFS, getItemDef } from '../content/items';
import { equippedItems } from './stats';

let counter = 0;

export function makeItem(defId: string, rng: Rng): Item {
  const def = getItemDef(defId);
  counter += 1;
  return {
    ...def,
    id: `${defId}-${rng.int(0, 0xffffff).toString(36)}-${counter}`,
    statMods: def.statMods ? def.statMods.map((m) => ({ ...m })) : undefined,
    ruleFlags: def.ruleFlags ? { ...def.ruleFlags } : undefined,
    hooks: def.hooks ? [...def.hooks] : undefined,
  };
}

function rarityWeights(floorId: number, isBoss: boolean): Record<Rarity, number> {
  if (isBoss) return { common: 20, rare: 45, cursed: 35 };
  const depth = Math.max(0, floorId - 1);
  return { common: 60 - depth * 6, rare: 28 + depth * 3, cursed: 12 + depth * 3 };
}

export function rollRewards(floorId: number, isBoss: boolean, rng: Rng, count = 3): ItemDef[] {
  const weights = rarityWeights(floorId, isBoss);
  const pool = [...ALL_ITEM_DEFS];
  const out: ItemDef[] = [];
  while (out.length < count && pool.length > 0) {
    const targetRarity = rng.weighted<Rarity>([
      ['common', weights.common],
      ['rare', weights.rare],
      ['cursed', weights.cursed],
    ]);
    let idx = pool.findIndex((d) => d.rarity === targetRarity);
    if (idx < 0) idx = 0; // pool exhausted of that rarity — take anything
    out.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return out;
}

function hasFlag(run: RunState, flag: keyof NonNullable<ItemDef['ruleFlags']>): boolean {
  return equippedItems(run).some((i) => Boolean(i.ruleFlags?.[flag]));
}
function hasDef(run: RunState, defId: string): boolean {
  return equippedItems(run).some((i) => i.defId === defId);
}

export function onRoomStartRevealCount(run: RunState): number {
  return hasDef(run, 'cartographers-eye') ? 1 : 0;
}

export function onSafeRevealFocus(run: RunState, rng: Rng): number {
  if (!hasDef(run, 'seers-thread')) return 0;
  return rng.chance(0.12) ? 1 : 0;
}

export function postCombatHpCost(run: RunState): number {
  return hasDef(run, 'reaper-edge') ? 2 : 0;
}

export function onRoomClearHeal(run: RunState): number {
  return hasDef(run, 'quick-salve') ? 2 : 0;
}

export function hasLuckyCoin(run: RunState): boolean {
  return hasFlag(run, 'luckyCoin');
}

export { getItemDef, ALL_ITEM_DEFS };

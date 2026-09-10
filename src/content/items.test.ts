import { describe, it, expect } from 'vitest';
import { ALL_ITEM_DEFS, getItemDef } from './items';

describe('item content', () => {
  it('has at least 24 defs with unique ids and valid slots/rarities', () => {
    expect(ALL_ITEM_DEFS.length).toBeGreaterThanOrEqual(24);
    const ids = ALL_ITEM_DEFS.map((d) => d.defId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of ALL_ITEM_DEFS) {
      expect(['weapon', 'armor', 'trinket']).toContain(d.slot);
      expect(['common', 'rare', 'cursed']).toContain(d.rarity);
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.flavor.length).toBeGreaterThan(0);
    }
  });

  it('includes the class starting gear ids', () => {
    for (const id of ['sappers-pick', 'blast-plating', 'divining-rod', 'plain-robe']) {
      expect(getItemDef(id).defId).toBe(id);
    }
  });

  it('every cursed item has both an upside and a drawback', () => {
    for (const d of ALL_ITEM_DEFS.filter((x) => x.rarity === 'cursed')) {
      const mods = d.statMods ?? [];
      const flags = d.ruleFlags ?? {};
      const hasUpside = mods.some((m) => m.amount > 0) || 'strikeHitsAllPips' in flags || 'firstFightAutoWin' in flags || 'bloodpact' in flags;
      const hasDrawback = mods.some((m) => m.amount < 0) || 'noFlagging' in flags || 'numbersSometimesLie' in flags;
      expect(hasUpside && hasDrawback).toBe(true);
    }
  });

  it('getItemDef throws on an unknown id', () => {
    expect(() => getItemDef('nope')).toThrow();
  });
});

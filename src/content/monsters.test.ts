import { describe, it, expect } from 'vitest';
import { MONSTERS, getMonsterDef, MONSTER_TYPES } from './monsters';

describe('monsters', () => {
  it('defines all three types', () => {
    expect(MONSTER_TYPES).toEqual(['armored', 'fast', 'cursed']);
    for (const t of MONSTER_TYPES) {
      const d = getMonsterDef(t);
      expect(d.type).toBe(t);
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.flavor.length).toBeGreaterThan(0);
      expect(d.codexId).toBe(`monster:${t}`);
    }
  });

  it('MONSTERS record is keyed by type', () => {
    expect(Object.keys(MONSTERS).sort()).toEqual(['armored', 'cursed', 'fast']);
  });
});

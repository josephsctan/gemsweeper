import { describe, it, expect } from 'vitest';
import {
  PROLOGUE, getFloorIntro, getBossIntro, getCodexEntry, ENDINGS,
} from './narrative';
import { FLOORS } from './floors';
import { MONSTER_TYPES } from './monsters';

describe('narrative', () => {
  it('has a non-empty prologue', () => {
    expect(PROLOGUE.length).toBeGreaterThan(40);
  });

  it('provides a title/mood/mechanical-note intro for every floor', () => {
    for (const f of FLOORS) {
      const intro = getFloorIntro(f.id);
      expect(intro.title).toBe(f.name);
      expect(intro.mood.length).toBeGreaterThan(0);
      expect(intro.mechanicalNote.length).toBeGreaterThan(0);
    }
  });

  it('provides a boss intro line per floor', () => {
    for (const f of FLOORS) expect(getBossIntro(f.id).length).toBeGreaterThan(0);
  });

  it('provides a codex entry per monster type matching the monster def', () => {
    for (const t of MONSTER_TYPES) {
      const e = getCodexEntry(t);
      expect(e.codexId).toBe(`monster:${t}`);
      expect(e.flavor.length).toBeGreaterThan(0);
    }
  });

  it('has three ending variants', () => {
    expect(ENDINGS.win.length).toBeGreaterThan(0);
    expect(ENDINGS.diedOut.length).toBeGreaterThan(0);
    expect(ENDINGS.abandoned.length).toBeGreaterThan(0);
  });

  it('throws for an unknown floor id', () => {
    expect(() => getFloorIntro(9)).toThrow();
    expect(() => getBossIntro(9)).toThrow();
  });
});

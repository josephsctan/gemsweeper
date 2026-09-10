import { describe, it, expect } from 'vitest';
import { FLOORS, getFloor, FLOOR_COUNT } from './floors';

describe('floors', () => {
  it('has four floors with ids 1..4', () => {
    expect(FLOOR_COUNT).toBe(4);
    expect(FLOORS.map((f) => f.id)).toEqual([1, 2, 3, 4]);
  });

  it('board size is non-decreasing and matches the spec sizes', () => {
    expect(FLOORS.map((f) => [f.rows, f.cols])).toEqual([
      [8, 8], [10, 10], [12, 12], [14, 14],
    ]);
  });

  it('mine ratio rises across floors and stays sane', () => {
    for (const f of FLOORS) {
      expect(f.mineRatio).toBeGreaterThan(0.05);
      expect(f.mineRatio).toBeLessThan(0.35);
    }
    const ratios = FLOORS.map((f) => f.mineRatio);
    expect([...ratios].sort((a, b) => a - b)).toEqual(ratios);
  });

  it('each floor has a distinct hazard in spec order', () => {
    expect(FLOORS.map((f) => f.hazard)).toEqual(['rubble', 'water', 'ember', 'cursed']);
  });

  it('room count range is within 4..6', () => {
    for (const f of FLOORS) {
      expect(f.roomCountRange[0]).toBeGreaterThanOrEqual(4);
      expect(f.roomCountRange[1]).toBeLessThanOrEqual(6);
      expect(f.roomCountRange[0]).toBeLessThanOrEqual(f.roomCountRange[1]);
    }
  });

  it('monster type weights are all non-negative and sum > 0', () => {
    for (const f of FLOORS) {
      const w = f.monsterTypeWeights;
      const sum = w.armored + w.fast + w.cursed;
      expect(w.armored).toBeGreaterThanOrEqual(0);
      expect(w.fast).toBeGreaterThanOrEqual(0);
      expect(w.cursed).toBeGreaterThanOrEqual(0);
      expect(sum).toBeGreaterThan(0);
    }
  });

  it('boss pips are 4..6 and threat exceeds normal threat', () => {
    for (const f of FLOORS) {
      expect(f.bossPips).toBeGreaterThanOrEqual(4);
      expect(f.bossPips).toBeLessThanOrEqual(6);
      expect(f.bossThreat).toBeGreaterThan(f.monsterThreat);
      expect(f.bossRoundLimit).toBeGreaterThanOrEqual(4);
    }
  });

  it('getFloor throws on an unknown id', () => {
    expect(() => getFloor(0)).toThrow();
    expect(() => getFloor(5)).toThrow();
    expect(getFloor(2).name).toBe('The Flooded Vault');
  });
});

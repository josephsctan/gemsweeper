import { describe, it, expect } from 'vitest';
import { CLASSES, getClass, CLASS_IDS } from './classes';

describe('classes', () => {
  it('defines sapper and diviner with the spec start stats', () => {
    expect(CLASS_IDS).toEqual(['sapper', 'diviner']);
    expect(getClass('sapper').start).toEqual({ hp: 12, power: 4, guard: 3, focus: 3, focusCap: 3 });
    expect(getClass('diviner').start).toEqual({ hp: 9, power: 3, guard: 2, focus: 5, focusCap: 5 });
  });

  it('carries the right starting gear ids', () => {
    expect(getClass('sapper').startGear).toEqual({ weapon: 'sappers-pick', armor: 'blast-plating' });
    expect(getClass('diviner').startGear).toEqual({ weapon: 'divining-rod', armor: 'plain-robe' });
  });

  it('carries the signature ability config', () => {
    expect(getClass('sapper').ability).toEqual({
      id: 'probe', name: 'Probe', focusCost: 2, usableInCombat: false, oncePerRoom: true,
    });
    expect(getClass('diviner').ability).toEqual({
      id: 'scry', name: 'Scry', focusCost: 2, usableInCombat: true, oncePerRoom: false,
    });
  });

  it('every class has non-empty fantasy and playstyle copy', () => {
    for (const id of CLASS_IDS) {
      expect(getClass(id).fantasy.length).toBeGreaterThan(0);
      expect(getClass(id).playstyle.length).toBeGreaterThan(0);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { makeItem } from './items';
import { itemEffectText } from './itemText';

describe('itemEffectText', () => {
  it('summarises stat mods', () => {
    expect(itemEffectText(makeItem('iron-maul', createRng(1)))).toMatch(/\+3 Power/i);
  });
  it('summarises rule flags in plain language', () => {
    expect(itemEffectText(makeItem('gamblers-die', createRng(1)))).toMatch(/cannot flag/i);
    expect(itemEffectText(makeItem('divining-rod', createRng(1)))).toMatch(/scry/i);
  });
  it('falls back to a dash for an effectless item', () => {
    expect(itemEffectText(makeItem('plain-robe', createRng(1)))).toBe('—');
  });
});

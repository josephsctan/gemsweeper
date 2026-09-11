import { describe, it, expect } from 'vitest';
import { hazardGlyph, tileGlyph } from './icons';

describe('icons', () => {
  it('maps each hazard to a non-empty glyph', () => {
    for (const h of ['none', 'rubble', 'water', 'ember', 'cursed'] as const) {
      expect(typeof hazardGlyph(h)).toBe('string');
    }
    expect(hazardGlyph('ember')).not.toBe('');
  });
  it('maps tile kinds to glyphs', () => {
    expect(tileGlyph('mine')).not.toBe('');
    expect(tileGlyph('flag')).not.toBe('');
  });
});

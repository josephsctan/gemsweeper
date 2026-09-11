import { describe, it, expect, vi } from 'vitest';
import { sfx } from './sfx';

describe('sfx', () => {
  it('play is a no-op that never throws', () => {
    expect(() => sfx.play('reveal')).not.toThrow();
    expect(sfx.play('anything')).toBeUndefined();
  });
});

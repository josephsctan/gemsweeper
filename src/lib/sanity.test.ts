import { describe, it, expect } from 'vitest';
import { greet } from './sanity';

describe('sanity', () => {
  it('confirms the toolchain runs', () => {
    expect(greet('world')).toBe('hello world');
  });
});

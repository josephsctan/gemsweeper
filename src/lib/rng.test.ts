import { describe, it, expect } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('is deterministic: same seed => same stream', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds diverge', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next() stays in [0, 1)', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() respects inclusive bounds', () => {
    const r = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(r.int(3, 6));
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('int(n, n) always returns n', () => {
    const r = createRng(1);
    for (let i = 0; i < 20; i++) expect(r.int(5, 5)).toBe(5);
  });

  it('pick() returns an element and is deterministic', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(createRng(42).pick(items)).toBe(createRng(42).pick(items));
    expect(items).toContain(createRng(42).pick(items));
  });

  it('shuffle() is a permutation and does not mutate input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = createRng(5).shuffle(input);
    expect(out).not.toBe(input);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('weighted() honours weights (0-weight entries never chosen)', () => {
    const r = createRng(3);
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 3000; i++) {
      counts[r.weighted([['a', 1], ['b', 3], ['c', 0]]) as keyof typeof counts]++;
    }
    expect(counts.c).toBe(0);
    expect(counts.b).toBeGreaterThan(counts.a);
  });

  it('fork() yields an independent deterministic sub-stream', () => {
    const parent = createRng(10);
    const f1 = parent.fork(1).next();
    const f2 = createRng(10).fork(1).next();
    expect(f1).toBe(f2);
  });
});

export interface Rng {
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  weighted<T>(entries: ReadonlyArray<[T, number]>): T;
  fork(salt: number): Rng;
}

/** mulberry32 — small, fast, deterministic 32-bit PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number): Rng {
  const gen = mulberry32(seed);

  const rng: Rng = {
    next: gen,
    int(min, max) {
      if (max < min) [min, max] = [max, min];
      return min + Math.floor(gen() * (max - min + 1));
    },
    chance(p) {
      return gen() < p;
    },
    pick(items) {
      if (items.length === 0) throw new Error('pick() from empty array');
      return items[Math.floor(gen() * items.length)]!;
    },
    shuffle(items) {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(gen() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    weighted(entries) {
      const total = entries.reduce((s, [, w]) => s + Math.max(0, w), 0);
      if (total <= 0) throw new Error('weighted() needs a positive total weight');
      let roll = gen() * total;
      for (const [value, w] of entries) {
        roll -= Math.max(0, w);
        if (roll < 0) return value;
      }
      return entries[entries.length - 1]![0];
    },
    fork(salt) {
      return createRng((Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ (salt * 0xc2b2ae35)) >>> 0);
    },
  };
  return rng;
}

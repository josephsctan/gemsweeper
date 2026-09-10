import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { loadMeta, defaultMeta } from '../lib/storage';
import { meta, persistMeta, reloadMeta } from './metaStore';

describe('metaStore', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadMeta();
  });

  it('starts from loadMeta()', () => {
    expect(get(meta)).toEqual(defaultMeta());
  });

  it('persistMeta updates the store and writes through', () => {
    persistMeta((m) => ({ ...m, runsWon: 5 }));
    expect(get(meta).runsWon).toBe(5);
    expect(loadMeta().runsWon).toBe(5);
  });
});

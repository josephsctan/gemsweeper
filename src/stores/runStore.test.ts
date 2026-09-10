import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import type { Item } from '../lib/types';
import { createRun } from '../lib/run';
import { runState, checkpointStore, patchRun, setRun } from './runStore';

const wpn: Item = { id: 'w', defId: 'x', name: 'X', slot: 'weapon', rarity: 'common', flavor: '' };
const arm: Item = { id: 'a', defId: 'y', name: 'Y', slot: 'armor', rarity: 'common', flavor: '' };

describe('runStore', () => {
  it('setRun / patchRun update the store and notify', () => {
    setRun(createRun(1, 'sapper', wpn, arm, 0));
    let ticks = 0;
    const unsub = runState.subscribe(() => ticks++);
    const base = ticks;
    patchRun((r) => { r.hp = 5; });
    expect(get(runState)!.hp).toBe(5);
    expect(ticks).toBeGreaterThan(base);
    unsub();
    setRun(null);
    expect(get(runState)).toBeNull();
  });

  it('checkpointStore holds a checkpoint or null', () => {
    checkpointStore.set(null);
    expect(get(checkpointStore)).toBeNull();
  });
});

import { writable, type Writable } from 'svelte/store';
import type { Checkpoint, RunState } from '../lib/types';

export const runState: Writable<RunState | null> = writable(null);
export const checkpointStore: Writable<Checkpoint | null> = writable(null);

export function setRun(r: RunState | null): void {
  runState.set(r);
}

export function patchRun(fn: (r: RunState) => void): void {
  runState.update((r) => {
    if (r) fn(r);
    return r;
  });
}

import { writable, type Writable } from 'svelte/store';
import type { MetaSave } from '../lib/types';
import { loadMeta, saveMeta } from '../lib/storage';

export const meta: Writable<MetaSave> = writable(loadMeta());

export function persistMeta(fn: (m: MetaSave) => MetaSave): void {
  meta.update((m) => {
    const next = fn(m);
    saveMeta(next);
    return next;
  });
}

export function reloadMeta(): void {
  meta.set(loadMeta());
}

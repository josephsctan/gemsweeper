import type { MetaSave, RunSave, RunState } from './types';

export const META_KEY = 'gemsweeper:meta';
export const SAVE_KEY = 'gemsweeper:save';
export const META_VERSION = 1;
export const SAVE_VERSION = 1;

export function defaultMeta(): MetaSave {
  return {
    version: META_VERSION,
    runsStarted: 0,
    runsWon: 0,
    bestDepth: 0,
    fastestWinMs: null,
    monstersDefused: 0,
    codexUnlocks: [],
  };
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function loadMeta(): MetaSave {
  const m = read<MetaSave>(META_KEY);
  if (!m || m.version !== META_VERSION || !Array.isArray(m.codexUnlocks)) return defaultMeta();
  return { ...defaultMeta(), ...m, version: META_VERSION };
}

export function saveMeta(meta: MetaSave): void {
  write(META_KEY, { ...meta, version: META_VERSION });
}

export function loadRunSave(): RunSave | null {
  const s = read<RunSave>(SAVE_KEY);
  if (!s || s.version !== SAVE_VERSION) return null;
  return s;
}

export function writeRunSave(run: RunState): void {
  const save: RunSave = {
    version: SAVE_VERSION,
    seed: run.seed,
    classId: run.classId,
    floor: run.floor,
    roomIndex: 0,
    retriesLeft: run.retriesLeft,
    hp: run.hp,
    focus: run.focus,
    focusCap: run.focusCap,
    power: run.power,
    guard: run.guard,
    equipped: run.equipped,
    inventory: run.inventory,
    codexUnlocks: run.codexUnlocks,
  };
  write(SAVE_KEY, save);
}

export function clearRunSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasRunSave(): boolean {
  return loadRunSave() !== null;
}

export function recordRunStart(meta: MetaSave): MetaSave {
  return { ...meta, runsStarted: meta.runsStarted + 1 };
}

export function recordRunEnd(
  meta: MetaSave, run: RunState, outcome: 'win' | 'abandon', now: number,
): MetaSave {
  const next: MetaSave = {
    ...meta,
    monstersDefused: meta.monstersDefused + run.monstersDefused,
    bestDepth: Math.max(meta.bestDepth, run.deepestDepth),
  };
  if (outcome === 'win') {
    next.runsWon = meta.runsWon + 1;
    const elapsed = Math.max(0, now - run.startedAtMs);
    next.fastestWinMs = meta.fastestWinMs === null ? elapsed : Math.min(meta.fastestWinMs, elapsed);
  }
  return next;
}

export function unlockCodex(meta: MetaSave, codexId: string): MetaSave {
  if (meta.codexUnlocks.includes(codexId)) return meta;
  return { ...meta, codexUnlocks: [...meta.codexUnlocks, codexId] };
}

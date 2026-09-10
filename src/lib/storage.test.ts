import { describe, it, expect, beforeEach } from 'vitest';
import type { Item } from './types';
import { createRun, enterFloor } from './run';
import { createRng } from './rng';
import { makeItem } from './items';
import {
  META_KEY, SAVE_KEY, META_VERSION, SAVE_VERSION, defaultMeta,
  loadMeta, saveMeta, loadRunSave, writeRunSave, clearRunSave, hasRunSave,
  recordRunStart, recordRunEnd, unlockCodex,
} from './storage';

const wpn = () => makeItem('sappers-pick', createRng(1));
const arm = () => makeItem('blast-plating', createRng(2));

describe('storage', () => {
  beforeEach(() => localStorage.clear());

  it('loadMeta returns defaults when empty', () => {
    expect(loadMeta()).toEqual(defaultMeta());
  });

  it('saveMeta / loadMeta round-trip', () => {
    const m = { ...defaultMeta(), runsWon: 3, bestDepth: 12 };
    saveMeta(m);
    expect(loadMeta()).toEqual(m);
  });

  it('discards meta with a version mismatch', () => {
    localStorage.setItem(META_KEY, JSON.stringify({ ...defaultMeta(), version: META_VERSION + 1, runsWon: 9 }));
    expect(loadMeta()).toEqual(defaultMeta());
  });

  it('discards unparseable meta', () => {
    localStorage.setItem(META_KEY, '{not json');
    expect(loadMeta()).toEqual(defaultMeta());
  });

  it('writeRunSave stores only checkpoint fields at SAVE_VERSION', () => {
    const r = createRun(99, 'diviner', wpn(), arm(), 0);
    enterFloor(r);
    r.floor = 2;
    r.roomIndex = 3;       // must be written as 0 (checkpoint == floor start)
    r.hp = 5;
    writeRunSave(r);
    const s = loadRunSave()!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.seed).toBe(99);
    expect(s.classId).toBe('diviner');
    expect(s.floor).toBe(2);
    expect(s.roomIndex).toBe(0);
    expect(s.hp).toBe(5);
    expect(hasRunSave()).toBe(true);
  });

  it('clearRunSave removes it; loadRunSave tolerates version mismatch', () => {
    const r = createRun(1, 'sapper', wpn(), arm(), 0);
    enterFloor(r);
    writeRunSave(r);
    clearRunSave();
    expect(loadRunSave()).toBeNull();
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION + 1 }));
    expect(loadRunSave()).toBeNull();
    expect(hasRunSave()).toBe(false);
  });

  it('recordRunStart / recordRunEnd update lifetime numbers', () => {
    let m = recordRunStart(defaultMeta());
    expect(m.runsStarted).toBe(1);

    const r = createRun(1, 'sapper', wpn(), arm(), 0);
    enterFloor(r);
    r.monstersDefused = 7;
    r.deepestDepth = 15;
    r.startedAtMs = 1_000;

    m = recordRunEnd(m, r, 'win', 61_000);
    expect(m.runsWon).toBe(1);
    expect(m.fastestWinMs).toBe(60_000);
    expect(m.monstersDefused).toBe(7);
    expect(m.bestDepth).toBe(15);

    // a slower win does not lower fastestWinMs
    m = recordRunEnd(m, { ...r, startedAtMs: 0 }, 'win', 999_999);
    expect(m.fastestWinMs).toBe(60_000);

    // abandon banks depth + monsters but is not counted as a win
    m = recordRunEnd(m, { ...r, deepestDepth: 20, monstersDefused: 0 }, 'abandon', 0);
    expect(m.runsWon).toBe(2);
    expect(m.bestDepth).toBe(20);
  });

  it('unlockCodex adds once', () => {
    let m = unlockCodex(defaultMeta(), 'monster:fast');
    m = unlockCodex(m, 'monster:fast');
    m = unlockCodex(m, 'monster:armored');
    expect(m.codexUnlocks.sort()).toEqual(['monster:armored', 'monster:fast']);
  });
});

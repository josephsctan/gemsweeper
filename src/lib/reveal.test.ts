import { describe, it, expect } from 'vitest';
import type { Board, RuleFlags, TileState } from './types';
import { DEFAULT_RULE_FLAGS } from './types';
import { computeAdjacency } from './boardgen';
import {
  reveal, chord, toggleFlag, countTotalSafe, countRevealedSafe, isRoomClear,
  recoverEmbers, armEmbers, spreadWater,
} from './reveal';
import { createRng } from './rng';

const RULES: RuleFlags = { ...DEFAULT_RULE_FLAGS };

/** Build a board from an ASCII map. Chars: '.' safe, '*' mine, 'R' rubble(safe), 'C' cache(safe), 'E' ember(safe). */
function build(rows: string[], opts: { boss?: boolean } = {}): Board {
  const grid = rows.map((r) => r.split(''));
  const H = grid.length, W = grid[0]!.length;
  const tiles: TileState[][] = grid.map((row, r) =>
    row.map((ch, c) => ({
      r, c,
      isMine: ch === '*',
      isBossMine: false,
      isCache: ch === 'C',
      adjacent: 0, displayDelta: 0 as const,
      hazard: ch === 'R' ? 'rubble' : ch === 'E' ? 'ember' : 'none',
      revealed: false, flagged: false, defused: false,
      rubbleStage: 0 as 0 | 1 | 2, watered: false,
      emberRecoverAt: null, numberPeeked: false, scryVisibleUntil: null,
    })),
  );
  const hazard = rows.join('').includes('E') ? 'ember' : rows.join('').includes('R') ? 'rubble' : 'none';
  const board: Board = { rows: H, cols: W, tiles, minesPlaced: true, hazard, isBoss: !!opts.boss };
  computeAdjacency(board);
  return board;
}
const at = (b: Board, r: number, c: number) => b.tiles[r]![c]!;

describe('reveal', () => {
  it('reveals a single numbered tile without flooding', () => {
    const b = build([
      '*..',
      '...',
      '...',
    ]);
    const res = reveal(b, 0, 1, RULES); // adjacent === 1
    expect(at(b, 0, 1).revealed).toBe(true);
    expect(res.revealed).toEqual([{ r: 0, c: 1 }]);
    expect(at(b, 0, 2).revealed).toBe(false);
  });

  it('flood-fills the zero region and its numbered border', () => {
    const b = build([
      '*.....',
      '......',
      '......',
      '......',
    ]);
    const res = reveal(b, 3, 5, RULES);
    // every non-mine tile ends revealed on this wide-open board
    const covered = b.tiles.flat().filter((t) => !t.revealed && !t.isMine);
    expect(covered.length).toBe(0);
    expect(res.revealed.length).toBe(23);
  });

  it('does not reveal a flagged tile', () => {
    const b = build(['*..', '...', '...']);
    toggleFlag(b, 0, 1, RULES);
    const res = reveal(b, 0, 1, RULES);
    expect(res.revealed).toEqual([]);
    expect(at(b, 0, 1).revealed).toBe(false);
  });

  it('returns the mine coord and leaves the mine covered', () => {
    const b = build(['*..', '...', '...']);
    const res = reveal(b, 0, 0, RULES);
    expect(res.mines).toEqual([{ r: 0, c: 0 }]);
    expect(at(b, 0, 0).revealed).toBe(false);
  });

  it('collects cache tiles hit during a flood', () => {
    const b = build([
      '*.....',
      '...C..',
      '......',
    ]);
    const res = reveal(b, 2, 5, RULES);
    expect(res.caches).toContainEqual({ r: 1, c: 3 });
  });

  it('rubble needs two reveals; the first only advances the stage', () => {
    const b = build([
      '*.R..',
      '.....',
      '.....',
    ]);
    const r1 = reveal(b, 0, 2, RULES);
    expect(at(b, 0, 2).rubbleStage).toBe(1);
    expect(at(b, 0, 2).revealed).toBe(false);
    expect(r1.rubbleAdvanced).toEqual([{ r: 0, c: 2 }]);
    expect(r1.revealed).toEqual([]);
    const r2 = reveal(b, 0, 2, RULES);
    expect(at(b, 0, 2).rubbleStage).toBe(2);
    expect(at(b, 0, 2).revealed).toBe(true);
    // rubble at (0,2) is zero-adjacent, so clearing it floods; it must appear in `revealed`
    expect(r2.revealed).toContainEqual({ r: 0, c: 2 });
  });

  it('flood only advances rubble to stage 1, never past it', () => {
    const b = build([
      '*.....',
      '..R...',
      '......',
    ]);
    reveal(b, 2, 5, RULES);
    expect(at(b, 1, 2).rubbleStage).toBe(1);
    expect(at(b, 1, 2).revealed).toBe(false);
  });
});

describe('chord', () => {
  it('reveals unflagged neighbours when the flag count matches the number', () => {
    const b = build([
      '*1.',
      '...',
      '...',
    ]);
    reveal(b, 0, 1, RULES);
    toggleFlag(b, 0, 0, RULES);
    const res = chord(b, 0, 1, RULES);
    expect(at(b, 1, 0).revealed).toBe(true);
    expect(at(b, 1, 1).revealed).toBe(true);
    expect(res.mines).toEqual([]);
  });

  it('does nothing when flags do not satisfy the number', () => {
    const b = build(['*1.', '...', '...']);
    reveal(b, 0, 1, RULES);
    const res = chord(b, 0, 1, RULES);
    expect(res.revealed).toEqual([]);
  });

  it('surfaces a mine when the flags are wrong', () => {
    const b = build([
      '*1*',
      '.2.',
      '...',
    ]);
    reveal(b, 0, 1, RULES); // adjacent === 2 (mines at 0,0 and 0,2)
    toggleFlag(b, 0, 0, RULES); // correct flag
    toggleFlag(b, 1, 1, RULES); // wrong flag -> count matches the number but one is misplaced
    const res = chord(b, 0, 1, RULES);
    expect(res.mines.length).toBeGreaterThan(0);
  });

  it('chordWithoutFlags fires when every covered neighbour must be a mine', () => {
    const rules: RuleFlags = { ...DEFAULT_RULE_FLAGS, chordWithoutFlags: true };
    const b = build([
      '*1',
      '11',
    ]);
    reveal(b, 0, 1, rules);
    reveal(b, 1, 0, rules);
    reveal(b, 1, 1, rules);
    const res = chord(b, 0, 1, rules); // only covered neighbour is the mine at 0,0
    expect(res.mines).toEqual([{ r: 0, c: 0 }]);
  });

  it('excludes watered tiles from chord auto-reveal', () => {
    const b = build([
      '*1.',
      '...',
      '...',
    ]);
    reveal(b, 0, 1, RULES);
    toggleFlag(b, 0, 0, RULES);
    at(b, 1, 1).revealed = true;
    at(b, 1, 1).watered = true;
    at(b, 1, 1).revealed = false; // watered but still covered for the test
    const res = chord(b, 0, 1, RULES);
    expect(res.revealed).not.toContainEqual({ r: 1, c: 1 });
  });
});

describe('flags', () => {
  it('toggleFlag flips state and is blocked by noFlagging', () => {
    const b = build(['*..', '...', '...']);
    expect(toggleFlag(b, 0, 0, RULES)).toBe(true);
    expect(toggleFlag(b, 0, 0, RULES)).toBe(false);
    const noFlag: RuleFlags = { ...DEFAULT_RULE_FLAGS, noFlagging: true };
    expect(toggleFlag(b, 0, 1, noFlag)).toBe(false);
    expect(at(b, 0, 1).flagged).toBe(false);
  });

  it('revealNumberOnFlag peeks the covered number', () => {
    const rules: RuleFlags = { ...DEFAULT_RULE_FLAGS, revealNumberOnFlag: true };
    const b = build(['*..', '...', '...']);
    toggleFlag(b, 0, 1, rules);
    expect(at(b, 0, 1).numberPeeked).toBe(true);
    toggleFlag(b, 0, 1, rules);
    expect(at(b, 0, 1).numberPeeked).toBe(false);
  });
});

describe('room-clear counting', () => {
  it('counts rubble as two units of progress', () => {
    const b = build([
      '*.R',
      '...',
      '...',
    ]);
    expect(countTotalSafe(b)).toBe(8 + 1); // 8 non-mine tiles, rubble adds one extra
    reveal(b, 2, 0, RULES); // floods everything except rubble past stage 1
    expect(isRoomClear(b)).toBe(false);
    reveal(b, 0, 2, RULES); // rubble -> stage 2
    expect(countRevealedSafe(b)).toBe(countTotalSafe(b));
    expect(isRoomClear(b)).toBe(true);
  });

  it('a boss room is not clear until the boss mine is defused', () => {
    const b = build(['*1', '11'], { boss: true });
    at(b, 0, 0).isBossMine = true;
    reveal(b, 0, 1, RULES);
    reveal(b, 1, 0, RULES);
    reveal(b, 1, 1, RULES);
    expect(countRevealedSafe(b)).toBe(countTotalSafe(b));
    expect(isRoomClear(b)).toBe(false);
    at(b, 0, 0).defused = true;
    expect(isRoomClear(b)).toBe(true);
  });
});

describe('embers', () => {
  it('armEmbers sets a recover time only on ember tiles and only once', () => {
    const b = build(['*E.', '...', '...']);
    reveal(b, 0, 1, RULES);
    armEmbers(b, [{ r: 0, c: 1 }], 1000, 10_000, RULES);
    expect(at(b, 0, 1).emberRecoverAt).toBe(11_000);
    armEmbers(b, [{ r: 0, c: 1 }], 5000, 10_000, RULES);
    expect(at(b, 0, 1).emberRecoverAt).toBe(11_000); // unchanged
  });

  it('recoverEmbers re-covers a due, unflagged ember and reduces progress', () => {
    const b = build([
      '*E....',
      '......',
      '......',
    ]);
    reveal(b, 2, 5, RULES);
    armEmbers(b, b.tiles.flat().filter((t) => t.hazard === 'ember').map((t) => ({ r: t.r, c: t.c })), 0, 10_000, RULES);
    const before = countRevealedSafe(b);
    // make room NOT clear by leaving a covered tile
    at(b, 2, 4).revealed = false;
    const out = recoverEmbers(b, 20_000, RULES);
    expect(out).toContainEqual({ r: 0, c: 1 });
    expect(at(b, 0, 1).revealed).toBe(false);
    expect(countRevealedSafe(b)).toBeLessThan(before);
  });

  it('recoverEmbers does nothing once the room is clear', () => {
    const b = build(['*E', '11']);
    reveal(b, 1, 0, RULES);
    reveal(b, 1, 1, RULES);
    reveal(b, 0, 1, RULES);
    armEmbers(b, [{ r: 0, c: 1 }], 0, 1_000, RULES);
    const out = recoverEmbers(b, 999_999, RULES);
    expect(out).toEqual([]);
    expect(at(b, 0, 1).revealed).toBe(true);
  });

  it('immuneEmberRecover suppresses arming and recovery', () => {
    const rules: RuleFlags = { ...DEFAULT_RULE_FLAGS, immuneEmberRecover: true };
    const b = build(['*E.', '...', '...']);
    reveal(b, 0, 1, rules);
    armEmbers(b, [{ r: 0, c: 1 }], 0, 1_000, rules);
    expect(at(b, 0, 1).emberRecoverAt).toBeNull();
    expect(recoverEmbers(b, 999_999, rules)).toEqual([]);
  });
});

describe('spreadWater', () => {
  it('marks one revealed tile watered per call', () => {
    const b = build([
      '*.....',
      '......',
      '......',
    ]);
    reveal(b, 2, 5, RULES);
    const rng = createRng(1);
    const first = spreadWater(b, rng);
    expect(first).not.toBeNull();
    expect(at(b, first!.r, first!.c).watered).toBe(true);
    const second = spreadWater(b, rng);
    expect(second).not.toBeNull();
    // spreads adjacent to existing water
    const adj = Math.abs(second!.r - first!.r) <= 1 && Math.abs(second!.c - first!.c) <= 1;
    expect(adj).toBe(true);
  });

  it('returns null when there is no revealed dry tile', () => {
    const b = build(['*1', '11']);
    expect(spreadWater(b, createRng(1))).toBeNull();
  });
});

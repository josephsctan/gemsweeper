# Gemsweeper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Gemsweeper — a Minesweeper-core roguelike RPG as a static Svelte SPA with four themed floors, mine-tiles that resolve as short tactical fights, rule-bending equipment, floor checkpoints, and local stats/codex.

**Architecture:** Pure TypeScript logic modules (`rng`, `boardgen`, `reveal`, `combat`, `items`, `run`, `stats`, `inventory`, `abilities`, `storage`) with zero Svelte imports, each unit-tested in isolation. Static content lives in `src/content/*`. Svelte 5 stores (`runStore`, `boardStore`, `metaStore`, `uiStore`, `combatStore`) hold mutable state; thin components read stores and call logic modules. One `App.svelte` routes screens off `uiStore.screen`.

**Tech Stack:** Svelte 5, TypeScript 5, Vite 6, Vitest 2 (jsdom), `@testing-library/svelte` 5, `@testing-library/jest-dom` 6, `@testing-library/user-event` 14. Deployed static to GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-09-gemsweeper-design.md`

## Global Constraints

- **Framework:** Svelte 5 + TypeScript, built with Vite. No other UI framework.
- **No backend / no network:** all persistence is `localStorage` via `src/lib/storage.ts`. No `fetch`, no analytics, no external calls at runtime.
- **Logic modules are Svelte-free:** files under `src/lib/` (except `*.svelte`) and `src/content/` MUST NOT import from `svelte` or `svelte/store`. They take plain data in and return plain data out.
- **All randomness is seeded:** every random choice in a run goes through an `Rng` instance created from the run seed via `createRng`. Never call `Math.random()` in `src/lib/` or `src/content/`.
- **Rendering is DOM:** no `<canvas>`, no WebGL.
- **localStorage keys:** exactly `gemsweeper:meta` and `gemsweeper:save`. Both objects carry `version: number`. On version mismatch or parse failure, discard that key's data and continue.
- **Schema versions:** `META_VERSION = 1`, `SAVE_VERSION = 1` (constants in `src/lib/storage.ts`).
- **Inventory cap:** `INVENTORY_CAP = 8` (constant in `src/lib/inventory.ts`).
- **Retries per run:** `START_RETRIES = 2` (constant in `src/lib/run.ts`).
- **GitHub Pages base path:** Vite `base: '/gemsweeper/'`.
- **Test command:** `npm test` runs `vitest run`. `npm run check` runs `svelte-check`. Both MUST pass before any commit.
- **Commit style:** Conventional Commits (`feat:`, `test:`, `chore:`, `refactor:`). Commit at the end of every task.
- **Coordinates:** tiles are addressed `{ r, c }` (row, column), both 0-based. `r` is the outer array index in `board.tiles`.

---

## File Structure

**Config / entry**
- `package.json`, `tsconfig.json`, `svelte.config.js`, `vite.config.ts`, `index.html` — project setup.
- `src/main.ts` — mounts `App.svelte`.
- `src/app.css` — global styles, CSS custom properties (palette, spacing).
- `.github/workflows/deploy.yml` — GitHub Pages build + deploy.

**Types**
- `src/lib/types.ts` — every shared type/interface. No runtime code.

**Pure logic (`src/lib/`, Svelte-free)**
- `rng.ts` — `createRng(seed)` → `{ next, int, chance, pick, shuffle }`.
- `boardgen.ts` — `roomConfig()`, `createEmptyBoard()`, `placeMines()`.
- `reveal.ts` — `neighbors()`, `reveal()`, `chord()`, `toggleFlag()`, `countRevealedSafe()`, `countTotalSafe()`, `isRoomClear()`, `recoverEmbers()`, `spreadWater()`.
- `stats.ts` — `deriveStats()` (base + gear → effective stats + merged rule flags).
- `combat.ts` — `monsterForTile()`, `startCombat()`, `combatStep()`.
- `items.ts` — `makeItem()`, `runHook()`, `rollRewards()`.
- `inventory.ts` — `addToInventory()`, `equip()`, `unequip()`, `dropItem()`.
- `abilities.ts` — `canUseAbility()`, `useProbe()`, `useScry()`.
- `run.ts` — `createRun()`, `enterFloor()`, `snapshotCheckpoint()`, `restoreCheckpoint()`, `roomCleared()`, `advanceRoom()`, `applyDeath()`, run-state predicates, `depthOf()`.
- `storage.ts` — `loadMeta()`, `saveMeta()`, `loadRunSave()`, `writeRunSave()`, `clearRunSave()`, `recordRunEnd()`, `unlockCodex()`.
- `sfx.ts` — `sfx.play(name)` no-op stub.

**Content (`src/content/`, Svelte-free data)**
- `floors.ts` — 4 `FloorConfig` entries + `getFloor(id)`.
- `monsters.ts` — `MonsterDef` per type + `getMonsterDef(type)`.
- `classes.ts` — 2 `ClassDef` entries + `getClass(id)`.
- `items.ts` — ~24 `ItemDef` entries + `getItemDef(defId)` + `ALL_ITEM_DEFS`.
- `narrative.ts` — prologue, floor intros, boss intros, endings + accessors.

**Stores (`src/stores/`)**
- `uiStore.ts` — `{ screen, modal }` + `goto()`, `openModal()`, `closeModal()`.
- `runStore.ts` — `writable<RunState | null>` + typed helpers.
- `boardStore.ts` — `writable<Board | null>` + typed helpers.
- `combatStore.ts` — `writable<CombatState | null>` + context.
- `metaStore.ts` — `writable<MetaSave>` seeded from `loadMeta()`.

**Components (`src/components/`)**
- Screens: `MainMenu`, `ClassSelect`, `PrologueCard`, `FloorIntro`, `GameScreen`, `RewardScreen`, `DeathScreen`, `WinScreen`, `RunSummary`, `StatsScreen`, `CodexScreen`, `HowToPlay`.
- Board: `Board`, `Tile`.
- Overlays: `Hud`, `CombatModal`, `InventoryPanel`, `DropChoiceModal`.
- `icons/` — small SVG icon components.

**Tests** — co-located `*.test.ts` next to each module; component tests `*.test.ts` beside each `.svelte`. One `src/smoke.test.ts`.

---

## Task 1: Project scaffold and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `svelte.config.js`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.ts`, `src/App.svelte`, `src/app.css`, `src/vite-env.d.ts`
- Create: `src/lib/sanity.ts`
- Test: `src/lib/sanity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test` (vitest, jsdom) and `npm run check` (svelte-check); Vite dev/build with `base: '/gemsweeper/'`; `@testing-library/svelte` wired so later component tests work.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "gemsweeper",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/svelte": "^5.2.1",
    "@testing-library/user-event": "^14.5.2",
    "@tsconfig/svelte": "^5.0.4",
    "jsdom": "^25.0.0",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create the remaining config files**

`tsconfig.json`:

```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "sourceMap": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src/**/*.d.ts", "src/**/*.ts", "src/**/*.svelte"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"]
  },
  "include": ["vite.config.ts", "svelte.config.js"]
}
```

`svelte.config.js`:

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
export default { preprocess: vitePreprocess() };
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: '/gemsweeper/',
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gemsweeper</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`.gitignore`:

```
node_modules
dist
.DS_Store
*.local
```

- [ ] **Step 3: Create app entry + test setup**

`src/vite-env.d.ts`:

```ts
/// <reference types="svelte" />
/// <reference types="vite/client" />
```

`src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

`src/app.css`:

```css
:root {
  --bg: #14141b;
  --panel: #1e1e28;
  --ink: #e8e6df;
  --muted: #9a97a8;
  --accent: #c9a227;
  --danger: #b4432e;
  --safe: #3d7a5a;
  --tile: #2a2a36;
  --tile-covered: #34343f;
  --space: 8px;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); }
button { font: inherit; }
```

`src/main.ts`:

```ts
import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

const app = mount(App, { target: document.getElementById('app')! });
export default app;
```

`src/App.svelte`:

```svelte
<script lang="ts">
</script>

<main>
  <h1>Gemsweeper</h1>
  <p>Loading…</p>
</main>

<style>
  main { padding: 2rem; text-align: center; }
</style>
```

- [ ] **Step 4: Write the failing sanity test**

`src/lib/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { greet } from './sanity';

describe('sanity', () => {
  it('confirms the toolchain runs', () => {
    expect(greet('world')).toBe('hello world');
  });
});
```

- [ ] **Step 5: Run it, expect failure**

Run: `npm install && npm test`
Expected: FAIL — `Cannot find module './sanity'`.

- [ ] **Step 6: Implement `src/lib/sanity.ts`**

```ts
export function greet(name: string): string {
  return `hello ${name}`;
}
```

- [ ] **Step 7: Run tests and type check**

Run: `npm test && npm run check`
Expected: test PASS; `svelte-check` reports 0 errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Svelte + Vite + Vitest project"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/lib/types.ts`
- Test: `src/lib/types.test.ts`
- Delete: `src/lib/sanity.ts`, `src/lib/sanity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: every shared type used by later tasks. Key names later tasks rely on verbatim: `Coord`, `HazardType`, `MonsterType`, `TileState`, `Board`, `BoardConfig`, `FloorConfig`, `MonsterDef`, `MonsterInstance`, `CombatAction`, `CombatState`, `CombatContext`, `CombatStepResult`, `StatKey`, `Slot`, `Rarity`, `RuleFlags`, `StatMod`, `EffectHook`, `ItemDef`, `Item`, `Equipped`, `ClassId`, `ClassDef`, `RunState`, `DerivedStats`, `Checkpoint`, `MetaSave`, `RunSave`, `RevealResult`, `HookName`, `HookContext`.

- [ ] **Step 1: Write the failing test**

`src/lib/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { RunState, Board, ItemDef } from './types';
import { EMPTY_EQUIPPED, DEFAULT_RULE_FLAGS } from './types';

describe('types', () => {
  it('exposes an empty equipped loadout with three slot keys', () => {
    expect(EMPTY_EQUIPPED).toEqual({ weapon: null, armor: null, trinkets: [null, null] });
  });

  it('default rule flags are all off / zero', () => {
    expect(DEFAULT_RULE_FLAGS.noFlagging).toBe(false);
    expect(DEFAULT_RULE_FLAGS.scryFocusDiscount).toBe(0);
  });

  it('lets a well-formed RunState / Board / ItemDef literal type-check', () => {
    const item: ItemDef = {
      defId: 'x', name: 'X', slot: 'weapon', rarity: 'common', flavor: '',
      statMods: [], ruleFlags: {}, hooks: [],
    };
    const board: Board = { rows: 0, cols: 0, tiles: [], minesPlaced: false, hazard: 'none', isBoss: false };
    const run = { seed: 1, classId: 'sapper' } as Partial<RunState>;
    expect(item.defId).toBe('x');
    expect(board.rows).toBe(0);
    expect(run.seed).toBe(1);
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npm test -- types`
Expected: FAIL — `Cannot find module './types'`.

- [ ] **Step 3: Implement `src/lib/types.ts`**

```ts
// ---------- geometry ----------
export interface Coord { r: number; c: number; }

// ---------- tiles / board ----------
export type HazardType = 'none' | 'rubble' | 'water' | 'ember' | 'cursed';

export interface TileState {
  r: number;
  c: number;
  isMine: boolean;
  isBossMine: boolean;
  isCache: boolean;
  adjacent: number;        // true count of adjacent mines
  displayDelta: -1 | 0 | 1; // cursed lie applied to the shown number
  hazard: HazardType;
  // runtime
  revealed: boolean;
  flagged: boolean;
  defused: boolean;        // a mine that has been fought
  rubbleStage: 0 | 1 | 2;  // 0 untouched, 1 cleared once, 2 fully cleared (rubble only)
  watered: boolean;        // fully watered (water hazard)
  emberRecoverAt: number | null; // epoch ms when this ember re-covers
  numberPeeked: boolean;   // show adjacent number while still covered (Flagger's Charm)
  scryVisibleUntil: number | null; // epoch ms until which a mine here is shown (Scry)
}

export interface BoardConfig {
  rows: number;
  cols: number;
  mineCount: number;
  hazard: HazardType;
  hazardCount: number;
  cacheCount: number;
  isBoss: boolean;
}

export interface Board {
  rows: number;
  cols: number;
  tiles: TileState[][];
  minesPlaced: boolean;    // false until the first reveal seeds mines
  hazard: HazardType;
  isBoss: boolean;
}

export interface RevealResult {
  revealed: Coord[];        // safe tiles newly turned face-up
  mines: Coord[];           // mine tiles that need a fight, in encounter order
  caches: Coord[];          // cache tiles among `revealed`
  rubbleAdvanced: Coord[];  // rubble tiles advanced 0->1 (not yet counted as safe-revealed)
}

// ---------- floors ----------
export interface FloorConfig {
  id: number;               // 1..4
  name: string;
  rows: number;
  cols: number;
  mineRatio: number;        // fraction of non-reserved tiles that become mines
  hazard: HazardType;
  hazardRatio: number;      // fraction of non-mine tiles that get the hazard
  roomCountRange: [number, number];
  monsterThreat: number;
  monsterTypeWeights: Record<MonsterType, number>;
  bossThreat: number;
  bossPips: number;         // 4..6
  bossRoundLimit: number;
  emberRecoverMs: number;
}

// ---------- monsters / combat ----------
export type MonsterType = 'armored' | 'fast' | 'cursed';

export interface MonsterDef {
  type: MonsterType;
  name: string;
  codexId: string;
  flavor: string;
}

export interface MonsterInstance {
  type: MonsterType;
  threat: number;
  pips: number;
  maxPips: number;
  isBoss: boolean;
  debuffStat: StatKey | null; // pre-rolled -1 target for cursed-type monsters
}

export type CombatAction = 'strike' | 'block' | 'ability';
export type StatKey = 'hp' | 'power' | 'guard' | 'focus';

export interface CombatState {
  monster: MonsterInstance;
  round: number;            // 1-based; current round awaiting a player action
  roundLimit: number;
  lastPlayerAction: CombatAction | null;
  log: string[];
  resolution: 'ongoing' | 'win' | 'timeout';
  hpLoss: number;           // final HP cost, set on resolution
  appliedDebuff: StatKey | null; // cursed-monster room-scoped debuff to apply
}

export interface CombatContext {
  power: number;
  guard: number;
  focus: number;            // current focus available to spend
  classId: ClassId;
  rules: RuleFlags;
  isFirstFightThisRoom: boolean;
  sapperFirstMineHandled: boolean; // has the sapper's free mine already been used this room
}

export interface CombatStepResult {
  state: CombatState;
  focusSpent: number;
  focusGained: number;
  sapperFreeMineUsed: boolean; // caller should set run.sapperFirstMineHandled = true
}

// ---------- items ----------
export type Slot = 'weapon' | 'armor' | 'trinket';
export type Rarity = 'common' | 'rare' | 'cursed';

export type EffectHook =
  | 'onEquip' | 'onRoomStart' | 'onSafeReveal'
  | 'onMineReveal' | 'onCombatRound' | 'onRoomClear';

export interface StatMod {
  stat: 'power' | 'guard' | 'maxHp' | 'focusCap';
  amount: number;
}

export interface RuleFlags {
  firstMineFree: boolean;        // negate the first fight each room outright
  chordWithoutFlags: boolean;    // chord fires when covered-count === adjacent, too
  revealNumberOnFlag: boolean;   // flagging a tile peeks its adjacent number
  noFlagging: boolean;           // flagging disabled
  immuneEmberRecover: boolean;   // embers never re-cover
  numbersSometimesLie: boolean;  // some numbers get a +/-1 display delta on any floor
  strikeHitsAllPips: boolean;    // Strike removes every remaining pip
  firstFightAutoWin: boolean;    // first fight each room auto-resolves to win
  focusOnBlock: boolean;         // +1 focus whenever you Block
  luckyCoin: boolean;            // first cache each floor grants a second item
  bloodpact: boolean;            // +2 power while hp <= 50% maxHp
  scryFocusDiscount: number;     // subtract from Scry focus cost (min 0 cost)
}

export const DEFAULT_RULE_FLAGS: RuleFlags = {
  firstMineFree: false,
  chordWithoutFlags: false,
  revealNumberOnFlag: false,
  noFlagging: false,
  immuneEmberRecover: false,
  numbersSometimesLie: false,
  strikeHitsAllPips: false,
  firstFightAutoWin: false,
  focusOnBlock: false,
  luckyCoin: false,
  bloodpact: false,
  scryFocusDiscount: 0,
};

export interface ItemDef {
  defId: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  flavor: string;
  statMods?: StatMod[];
  ruleFlags?: Partial<RuleFlags>;
  hooks?: EffectHook[];      // which dynamic hooks items.ts should dispatch for this def
}

export interface Item extends ItemDef {
  id: string;               // unique instance id
}

export interface Equipped {
  weapon: Item | null;
  armor: Item | null;
  trinkets: [Item | null, Item | null];
}

export const EMPTY_EQUIPPED: Equipped = { weapon: null, armor: null, trinkets: [null, null] };

// ---------- classes ----------
export type ClassId = 'sapper' | 'diviner';

export interface ClassDef {
  id: ClassId;
  name: string;
  fantasy: string;
  playstyle: string;
  start: { hp: number; power: number; guard: number; focus: number; focusCap: number };
  startGear: { weapon: string; armor: string }; // ItemDef ids
  ability: {
    id: 'probe' | 'scry';
    name: string;
    focusCost: number;
    usableInCombat: boolean;
    oncePerRoom: boolean;
  };
}

// ---------- run ----------
export interface RunState {
  seed: number;
  classId: ClassId;
  floor: number;            // 1..4
  roomIndex: number;        // 0-based within the current floor
  roomsThisFloor: number;
  retriesLeft: number;
  hp: number;
  maxHp: number;            // base (class) max hp, before gear
  focus: number;
  focusCap: number;         // base (class) cap, before gear
  power: number;            // base (class) power, before gear
  guard: number;            // base (class) guard, before gear
  equipped: Equipped;
  inventory: Item[];
  codexUnlocks: string[];
  // per-room transient
  abilityUsedThisRoom: boolean;
  sapperFirstMineHandled: boolean;
  fightsThisRoom: number;
  safeRevealsThisRoom: number;
  roomDebuffs: StatKey[];   // cursed-monster -1s, cleared on room change
  // meta
  startedAtMs: number;
  monstersDefused: number;
  deepestDepth: number;     // max depthOf() reached this run
}

export interface DerivedStats {
  maxHp: number;
  power: number;
  guard: number;
  focusCap: number;
  rules: RuleFlags;
}

export interface Checkpoint {
  floor: number;
  hp: number;
  maxHp: number;
  focus: number;
  focusCap: number;
  power: number;
  guard: number;
  retriesLeft: number;
  equipped: Equipped;
  inventory: Item[];
  codexUnlocks: string[];
}

// ---------- persistence ----------
export interface MetaSave {
  version: number;
  runsStarted: number;
  runsWon: number;
  bestDepth: number;
  fastestWinMs: number | null;
  monstersDefused: number;
  codexUnlocks: string[];
}

export interface RunSave {
  version: number;
  seed: number;
  classId: ClassId;
  floor: number;
  roomIndex: number;
  retriesLeft: number;
  hp: number;
  focus: number;
  focusCap: number;
  power: number;
  guard: number;
  equipped: Equipped;
  inventory: Item[];
  codexUnlocks: string[];
}

// ---------- item hook dispatch ----------
export type HookName = EffectHook;

export interface HookContext {
  hook: HookName;
  run: RunState;
  board: Board | null;
  rng: import('./rng').Rng;
  combat?: CombatState;
  now: number;
}
```

- [ ] **Step 4: Run tests and type check**

Run: `npm test -- types && npm run check`
Expected: PASS; 0 type errors.

- [ ] **Step 5: Remove the sanity placeholder**

```bash
git rm src/lib/sanity.ts src/lib/sanity.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add shared type definitions"
```

---

## Task 3: Seeded RNG

**Files:**
- Create: `src/lib/rng.ts`
- Test: `src/lib/rng.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export interface Rng { next(): number; int(minInclusive: number, maxInclusive: number): number; chance(p: number): boolean; pick<T>(items: readonly T[]): T; shuffle<T>(items: readonly T[]): T[]; weighted<T>(entries: ReadonlyArray<[T, number]>): T; fork(salt: number): Rng; }`
  - `export function createRng(seed: number): Rng`

- [ ] **Step 1: Write the failing tests**

`src/lib/rng.test.ts`:

```ts
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
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 3000; i++) {
      counts[r.weighted([['a', 1], ['b', 3], ['c', 0]])]++;
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
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test -- rng`
Expected: FAIL — `Cannot find module './rng'`.

- [ ] **Step 3: Implement `src/lib/rng.ts`**

```ts
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
```

- [ ] **Step 4: Run tests and type check**

Run: `npm test -- rng && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rng.ts src/lib/rng.test.ts
git commit -m "feat: seeded mulberry32 rng helper"
```

---

## Task 4: Floor content

**Files:**
- Create: `src/content/floors.ts`
- Test: `src/content/floors.test.ts`

**Interfaces:**
- Consumes: `FloorConfig`, `MonsterType` from `src/lib/types.ts`.
- Produces:
  - `export const FLOORS: readonly FloorConfig[]` — exactly 4, ids 1..4.
  - `export function getFloor(id: number): FloorConfig` — throws on unknown id.
  - `export const FLOOR_COUNT = 4`.

- [ ] **Step 1: Write the failing tests**

`src/content/floors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { FLOORS, getFloor, FLOOR_COUNT } from './floors';

describe('floors', () => {
  it('has four floors with ids 1..4', () => {
    expect(FLOOR_COUNT).toBe(4);
    expect(FLOORS.map((f) => f.id)).toEqual([1, 2, 3, 4]);
  });

  it('board size is non-decreasing and matches the spec sizes', () => {
    expect(FLOORS.map((f) => [f.rows, f.cols])).toEqual([
      [8, 8], [10, 10], [12, 12], [14, 14],
    ]);
  });

  it('mine ratio rises across floors and stays sane', () => {
    for (const f of FLOORS) {
      expect(f.mineRatio).toBeGreaterThan(0.05);
      expect(f.mineRatio).toBeLessThan(0.35);
    }
    const ratios = FLOORS.map((f) => f.mineRatio);
    expect([...ratios].sort((a, b) => a - b)).toEqual(ratios);
  });

  it('each floor has a distinct hazard in spec order', () => {
    expect(FLOORS.map((f) => f.hazard)).toEqual(['rubble', 'water', 'ember', 'cursed']);
  });

  it('room count range is within 4..6', () => {
    for (const f of FLOORS) {
      expect(f.roomCountRange[0]).toBeGreaterThanOrEqual(4);
      expect(f.roomCountRange[1]).toBeLessThanOrEqual(6);
      expect(f.roomCountRange[0]).toBeLessThanOrEqual(f.roomCountRange[1]);
    }
  });

  it('monster type weights are all non-negative and sum > 0', () => {
    for (const f of FLOORS) {
      const w = f.monsterTypeWeights;
      const sum = w.armored + w.fast + w.cursed;
      expect(w.armored).toBeGreaterThanOrEqual(0);
      expect(w.fast).toBeGreaterThanOrEqual(0);
      expect(w.cursed).toBeGreaterThanOrEqual(0);
      expect(sum).toBeGreaterThan(0);
    }
  });

  it('boss pips are 4..6 and threat exceeds normal threat', () => {
    for (const f of FLOORS) {
      expect(f.bossPips).toBeGreaterThanOrEqual(4);
      expect(f.bossPips).toBeLessThanOrEqual(6);
      expect(f.bossThreat).toBeGreaterThan(f.monsterThreat);
      expect(f.bossRoundLimit).toBeGreaterThanOrEqual(4);
    }
  });

  it('getFloor throws on an unknown id', () => {
    expect(() => getFloor(0)).toThrow();
    expect(() => getFloor(5)).toThrow();
    expect(getFloor(2).name).toBe('The Flooded Vault');
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test -- floors`
Expected: FAIL — `Cannot find module './floors'`.

- [ ] **Step 3: Implement `src/content/floors.ts`**

```ts
import type { FloorConfig } from '../lib/types';

export const FLOOR_COUNT = 4;

export const FLOORS: readonly FloorConfig[] = [
  {
    id: 1,
    name: 'The Cellars',
    rows: 8,
    cols: 8,
    mineRatio: 0.12,
    hazard: 'rubble',
    hazardRatio: 0.10,
    roomCountRange: [4, 5],
    monsterThreat: 3,
    monsterTypeWeights: { armored: 2, fast: 2, cursed: 1 },
    bossThreat: 5,
    bossPips: 4,
    bossRoundLimit: 4,
    emberRecoverMs: 10_000,
  },
  {
    id: 2,
    name: 'The Flooded Vault',
    rows: 10,
    cols: 10,
    mineRatio: 0.15,
    hazard: 'water',
    hazardRatio: 0.08,
    roomCountRange: [4, 6],
    monsterThreat: 4,
    monsterTypeWeights: { armored: 2, fast: 3, cursed: 2 },
    bossThreat: 7,
    bossPips: 5,
    bossRoundLimit: 5,
    emberRecoverMs: 10_000,
  },
  {
    id: 3,
    name: 'The Ashworks',
    rows: 12,
    cols: 12,
    mineRatio: 0.18,
    hazard: 'ember',
    hazardRatio: 0.12,
    roomCountRange: [5, 6],
    monsterThreat: 5,
    monsterTypeWeights: { armored: 3, fast: 2, cursed: 3 },
    bossThreat: 9,
    bossPips: 5,
    bossRoundLimit: 5,
    emberRecoverMs: 9_000,
  },
  {
    id: 4,
    name: 'The Undercroft',
    rows: 14,
    cols: 14,
    mineRatio: 0.20,
    hazard: 'cursed',
    hazardRatio: 0.15,
    roomCountRange: [5, 6],
    monsterThreat: 6,
    monsterTypeWeights: { armored: 3, fast: 3, cursed: 4 },
    bossThreat: 12,
    bossPips: 6,
    bossRoundLimit: 6,
    emberRecoverMs: 8_000,
  },
];

export function getFloor(id: number): FloorConfig {
  const f = FLOORS.find((x) => x.id === id);
  if (!f) throw new Error(`unknown floor id: ${id}`);
  return f;
}
```

- [ ] **Step 4: Run tests and type check**

Run: `npm test -- floors && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/floors.ts src/content/floors.test.ts
git commit -m "feat: floor configuration content"
```

---

## Task 5: Monster content

**Files:**
- Create: `src/content/monsters.ts`
- Test: `src/content/monsters.test.ts`

**Interfaces:**
- Consumes: `MonsterDef`, `MonsterType` from `src/lib/types.ts`.
- Produces:
  - `export const MONSTERS: Record<MonsterType, MonsterDef>`
  - `export function getMonsterDef(type: MonsterType): MonsterDef`
  - `export const MONSTER_TYPES: readonly MonsterType[]` — `['armored', 'fast', 'cursed']`

- [ ] **Step 1: Write the failing tests**

`src/content/monsters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MONSTERS, getMonsterDef, MONSTER_TYPES } from './monsters';

describe('monsters', () => {
  it('defines all three types', () => {
    expect(MONSTER_TYPES).toEqual(['armored', 'fast', 'cursed']);
    for (const t of MONSTER_TYPES) {
      const d = getMonsterDef(t);
      expect(d.type).toBe(t);
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.flavor.length).toBeGreaterThan(0);
      expect(d.codexId).toBe(`monster:${t}`);
    }
  });

  it('MONSTERS record is keyed by type', () => {
    expect(Object.keys(MONSTERS).sort()).toEqual(['armored', 'cursed', 'fast']);
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test -- monsters`
Expected: FAIL — `Cannot find module './monsters'`.

- [ ] **Step 3: Implement `src/content/monsters.ts`**

```ts
import type { MonsterDef, MonsterType } from '../lib/types';

export const MONSTER_TYPES: readonly MonsterType[] = ['armored', 'fast', 'cursed'];

export const MONSTERS: Record<MonsterType, MonsterDef> = {
  armored: {
    type: 'armored',
    name: 'Slagshell',
    codexId: 'monster:armored',
    flavor: 'A crust of fused ore over something that used to breathe. Hitting it hard just hurts your hand — unless it has dropped its guard.',
  },
  fast: {
    type: 'fast',
    name: 'Flicker',
    codexId: 'monster:fast',
    flavor: 'It is already moving when you notice it. Blocking barely helps; the only safe fight is a short one.',
  },
  cursed: {
    type: 'cursed',
    name: 'Wane',
    codexId: 'monster:cursed',
    flavor: 'Touching its light leaves you diminished. The weakness fades when you leave the room — the memory of it does not.',
  },
};

export function getMonsterDef(type: MonsterType): MonsterDef {
  return MONSTERS[type];
}
```

- [ ] **Step 4: Run tests and type check**

Run: `npm test -- monsters && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/monsters.ts src/content/monsters.test.ts
git commit -m "feat: monster content"
```

---

## Task 6: Board generation

**Files:**
- Create: `src/lib/boardgen.ts`
- Test: `src/lib/boardgen.test.ts`

**Interfaces:**
- Consumes: `Board`, `BoardConfig`, `TileState`, `Coord`, `FloorConfig` from `types.ts`; `Rng` from `rng.ts`; `createRng` from `rng.ts`; `getFloor` from `content/floors.ts`.
- Produces:
  - `export function roomConfig(floor: FloorConfig, roomIndex: number, roomsThisFloor: number, rng: Rng): BoardConfig`
  - `export function createEmptyBoard(cfg: BoardConfig): Board`
  - `export function computeAdjacency(board: Board): void` — recomputes every tile's `adjacent` from `isMine`.
  - `export function neighbourCoords(board: Board, r: number, c: number): Coord[]`
  - `export function placeMines(board: Board, cfg: BoardConfig, first: Coord, rng: Rng): void` — mutates `board`; sets `minesPlaced = true`.
  - `export function prepareRoom(seed: number, floorId: number, roomIndex: number, roomsThisFloor: number): { board: Board; cfg: BoardConfig; rng: Rng }`
  - `export function generateRoom(seed: number, floorId: number, roomIndex: number, roomsThisFloor: number, first: Coord): Board` — test/orchestration convenience: `prepareRoom` then `placeMines`.
  - `export const MAX_PLACEMENT_ATTEMPTS = 60`

- [ ] **Step 1: Write the failing tests**

`src/lib/boardgen.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { getFloor } from '../content/floors';
import {
  roomConfig, createEmptyBoard, placeMines, generateRoom,
} from './boardgen';
import type { Board, Coord } from './types';

function minePositions(b: Board): string[] {
  const out: string[] = [];
  for (const row of b.tiles) for (const t of row) if (t.isMine) out.push(`${t.r},${t.c}`);
  return out.sort();
}
function tileAt(b: Board, r: number, c: number) { return b.tiles[r]![c]!; }
function neighborsOf(b: Board, r: number, c: number) {
  const out = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < b.rows && nc >= 0 && nc < b.cols) out.push(tileAt(b, nr, nc));
    }
  return out;
}

describe('roomConfig', () => {
  it('marks only the last room of the floor as the boss room', () => {
    expect(roomConfig(getFloor(1), 0, 5, createRng(1)).isBoss).toBe(false);
    expect(roomConfig(getFloor(1), 3, 5, createRng(1)).isBoss).toBe(false);
    expect(roomConfig(getFloor(1), 4, 5, createRng(1)).isBoss).toBe(true);
  });

  it('boss room forces exactly one cache; normal rooms have 0..2', () => {
    const boss = roomConfig(getFloor(2), 4, 5, createRng(7));
    expect(boss.isBoss).toBe(true);
    expect(boss.cacheCount).toBe(1);
    for (let s = 0; s < 30; s++) {
      const cfg = roomConfig(getFloor(2), 1, 5, createRng(s));
      expect(cfg.cacheCount).toBeGreaterThanOrEqual(0);
      expect(cfg.cacheCount).toBeLessThanOrEqual(2);
    }
  });

  it('board size comes from the floor', () => {
    const cfg = roomConfig(getFloor(3), 0, 5, createRng(1));
    expect([cfg.rows, cfg.cols]).toEqual([12, 12]);
    expect(cfg.mineCount).toBe(Math.round(12 * 12 * getFloor(3).mineRatio));
  });
});

describe('createEmptyBoard', () => {
  it('builds a fully covered grid with correct coords and no mines placed', () => {
    const cfg = roomConfig(getFloor(1), 0, 5, createRng(1));
    const b = createEmptyBoard(cfg);
    expect(b.rows).toBe(8);
    expect(b.tiles.length).toBe(8);
    expect(b.tiles[0]!.length).toBe(8);
    expect(b.minesPlaced).toBe(false);
    expect(tileAt(b, 3, 5).r).toBe(3);
    expect(tileAt(b, 3, 5).c).toBe(5);
    for (const row of b.tiles) for (const t of row) {
      expect(t.revealed).toBe(false);
      expect(t.isMine).toBe(false);
      expect(t.flagged).toBe(false);
    }
  });
});

describe('placeMines', () => {
  const first: Coord = { r: 3, c: 3 };

  it('places exactly cfg.mineCount mines and sets minesPlaced', () => {
    const cfg = roomConfig(getFloor(1), 0, 5, createRng(11));
    const b = createEmptyBoard(cfg);
    placeMines(b, cfg, first, createRng(11));
    expect(minePositions(b).length).toBe(cfg.mineCount);
    expect(b.minesPlaced).toBe(true);
  });

  it('never places a mine on the first tile or its 8 neighbours', () => {
    for (let s = 0; s < 25; s++) {
      const cfg = roomConfig(getFloor(4), 0, 5, createRng(s));
      const b = createEmptyBoard(cfg);
      placeMines(b, cfg, first, createRng(s));
      expect(tileAt(b, first.r, first.c).isMine).toBe(false);
      for (const n of neighborsOf(b, first.r, first.c)) expect(n.isMine).toBe(false);
    }
  });

  it('first tile has a true adjacent count of 0 (opens a zero region)', () => {
    for (let s = 0; s < 25; s++) {
      const cfg = roomConfig(getFloor(1), 0, 5, createRng(s));
      const b = createEmptyBoard(cfg);
      placeMines(b, cfg, first, createRng(s));
      expect(tileAt(b, first.r, first.c).adjacent).toBe(0);
    }
  });

  it('adjacency numbers equal the count of neighbouring mines', () => {
    const cfg = roomConfig(getFloor(2), 1, 5, createRng(3));
    const b = createEmptyBoard(cfg);
    placeMines(b, cfg, first, createRng(3));
    for (const row of b.tiles) for (const t of row) {
      if (t.isMine) continue;
      const actual = neighborsOf(b, t.r, t.c).filter((n) => n.isMine).length;
      expect(t.adjacent).toBe(actual);
    }
  });

  it('is deterministic for the same (seed, floor, room, first click)', () => {
    const a = generateRoom(999, 3, 2, 6, first);
    const b = generateRoom(999, 3, 2, 6, first);
    expect(minePositions(a)).toEqual(minePositions(b));
    expect(a.tiles.map((r) => r.map((t) => t.adjacent))).toEqual(
      b.tiles.map((r) => r.map((t) => t.adjacent)),
    );
  });

  it('boss room gets exactly one boss mine among its mines', () => {
    const b = generateRoom(5, 2, 4, 5, first); // room 4 of 5 => boss
    const bossMines = b.tiles.flat().filter((t) => t.isBossMine);
    expect(bossMines.length).toBe(1);
    expect(bossMines[0]!.isMine).toBe(true);
  });

  it('places cfg.cacheCount cache tiles, all on safe non-first tiles', () => {
    const cfg = roomConfig(getFloor(2), 1, 5, createRng(21));
    const b = createEmptyBoard(cfg);
    placeMines(b, cfg, first, createRng(21));
    const caches = b.tiles.flat().filter((t) => t.isCache);
    expect(caches.length).toBe(cfg.cacheCount);
    for (const t of caches) {
      expect(t.isMine).toBe(false);
      expect(t.r === first.r && t.c === first.c).toBe(false);
    }
  });

  it('hazard tiles use the floor hazard and sit only on safe tiles', () => {
    const b = generateRoom(8, 3, 1, 6, first); // ember floor
    const haz = b.tiles.flat().filter((t) => t.hazard !== 'none');
    expect(haz.length).toBeGreaterThan(0);
    for (const t of haz) {
      expect(t.hazard).toBe('ember');
      expect(t.isMine).toBe(false);
    }
  });

  it('createEmptyBoard + placeMines with mismatched cfg is a usage error we do not guard (docs only)', () => {
    // placeMines trusts the cfg passed to it; prepareRoom/generateRoom always pass the matching cfg.
    const cfg = roomConfig(getFloor(1), 0, 5, createRng(1));
    const b = createEmptyBoard(cfg);
    placeMines(b, cfg, first, createRng(1));
    expect(b.minesPlaced).toBe(true);
  });

  it('cursed floor sets displayDelta only on cursed-hazard tiles and keeps shown value >= 0', () => {
    const b1 = generateRoom(4, 4, 1, 6, first);
    const b2 = generateRoom(4, 4, 1, 6, first);
    for (let r = 0; r < b1.rows; r++) for (let c = 0; c < b1.cols; c++) {
      const t = b1.tiles[r]![c]!;
      if (t.hazard !== 'cursed') expect(t.displayDelta).toBe(0);
      if (t.displayDelta !== 0) expect(t.adjacent + t.displayDelta).toBeGreaterThanOrEqual(0);
      expect(t.displayDelta).toBe(b2.tiles[r]![c]!.displayDelta); // stable
    }
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test -- boardgen`
Expected: FAIL — `Cannot find module './boardgen'`.

- [ ] **Step 3: Implement `src/lib/boardgen.ts`**

```ts
import type { Board, BoardConfig, Coord, FloorConfig, TileState } from './types';
import { createRng, type Rng } from './rng';
import { getFloor } from '../content/floors';

export const MAX_PLACEMENT_ATTEMPTS = 60;

function newTile(r: number, c: number): TileState {
  return {
    r, c,
    isMine: false, isBossMine: false, isCache: false,
    adjacent: 0, displayDelta: 0, hazard: 'none',
    revealed: false, flagged: false, defused: false,
    rubbleStage: 0, watered: false,
    emberRecoverAt: null, numberPeeked: false, scryVisibleUntil: null,
  };
}

export function roomConfig(
  floor: FloorConfig,
  roomIndex: number,
  roomsThisFloor: number,
  rng: Rng,
): BoardConfig {
  const isBoss = roomIndex === roomsThisFloor - 1;
  const total = floor.rows * floor.cols;
  const mineCount = Math.round(total * floor.mineRatio);
  const hazardCount = Math.max(1, Math.round((total - mineCount) * floor.hazardRatio));
  const cacheCount = isBoss ? 1 : rng.int(0, 2);
  return {
    rows: floor.rows,
    cols: floor.cols,
    mineCount,
    hazard: floor.hazard,
    hazardCount,
    cacheCount,
    isBoss,
  };
}

export function createEmptyBoard(cfg: BoardConfig): Board {
  const tiles: TileState[][] = [];
  for (let r = 0; r < cfg.rows; r++) {
    const row: TileState[] = [];
    for (let c = 0; c < cfg.cols; c++) row.push(newTile(r, c));
    tiles.push(row);
  }
  return { rows: cfg.rows, cols: cfg.cols, tiles, minesPlaced: false, hazard: cfg.hazard, isBoss: cfg.isBoss };
}

function neighbours(board: Board, r: number, c: number): TileState[] {
  const out: TileState[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < board.rows && nc >= 0 && nc < board.cols) out.push(board.tiles[nr]![nc]!);
    }
  return out;
}

export function neighbourCoords(board: Board, r: number, c: number): Coord[] {
  return neighbours(board, r, c).map((t) => ({ r: t.r, c: t.c }));
}

function key(r: number, c: number): string { return `${r},${c}`; }

export function computeAdjacency(board: Board): void {
  for (const row of board.tiles)
    for (const t of row)
      t.adjacent = t.isMine ? 0 : neighbours(board, t.r, t.c).filter((n) => n.isMine).length;
}

/** Mutates `board`: places mines, boss mine, caches, hazards, adjacency, cursed lies. */
export function placeMines(board: Board, cfg: BoardConfig, first: Coord, rng: Rng): void {
  const reserved = new Set<string>([key(first.r, first.c)]);
  for (const n of neighbours(board, first.r, first.c)) reserved.add(key(n.r, n.c));

  const candidates: Coord[] = [];
  for (let r = 0; r < board.rows; r++)
    for (let c = 0; c < board.cols; c++)
      if (!reserved.has(key(r, c))) candidates.push({ r, c });

  const mineCount = Math.min(candidates.length, cfg.mineCount);

  let chosen: Coord[] = [];
  let accepted = false;
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    chosen = rng.shuffle(candidates).slice(0, mineCount);
    for (const { r, c } of chosen) board.tiles[r]![c]!.isMine = true;
    computeAdjacency(board);
    if (board.tiles[first.r]![first.c]!.adjacent === 0) { accepted = true; break; }
    for (const { r, c } of chosen) board.tiles[r]![c]!.isMine = false;
  }
  if (!accepted) {
    // fall back to the last shuffled set even though it left a non-zero first tile
    for (const { r, c } of chosen) board.tiles[r]![c]!.isMine = true;
    computeAdjacency(board);
  }

  board.minesPlaced = true;

  // boss mine
  if (cfg.isBoss && chosen.length > 0) {
    const bm = rng.pick(chosen);
    board.tiles[bm.r]![bm.c]!.isBossMine = true;
  }

  // safe tiles for caches + hazards (never the first tile)
  const safe: Coord[] = [];
  for (let r = 0; r < board.rows; r++)
    for (let c = 0; c < board.cols; c++) {
      if (board.tiles[r]![c]!.isMine) continue;
      if (r === first.r && c === first.c) continue;
      safe.push({ r, c });
    }
  const shuffledSafe = rng.shuffle(safe);
  let cursor = 0;

  const cacheN = Math.min(cfg.cacheCount, shuffledSafe.length);
  for (let i = 0; i < cacheN; i++) {
    const { r, c } = shuffledSafe[cursor++]!;
    board.tiles[r]![c]!.isCache = true;
  }

  const hazardN = Math.min(cfg.hazardCount, shuffledSafe.length - cursor);
  for (let i = 0; i < hazardN; i++) {
    const { r, c } = shuffledSafe[cursor++]!;
    const t = board.tiles[r]![c]!;
    t.hazard = cfg.hazard;
    if (cfg.hazard === 'cursed') {
      let delta: -1 | 1 = rng.chance(0.5) ? -1 : 1;
      if (t.adjacent + delta < 0) delta = 1;
      t.displayDelta = delta;
    }
  }
}

export function prepareRoom(
  seed: number,
  floorId: number,
  roomIndex: number,
  roomsThisFloor: number,
): { board: Board; cfg: BoardConfig; rng: Rng } {
  const rng = createRng(seed).fork(floorId * 1000 + roomIndex);
  const cfg = roomConfig(getFloor(floorId), roomIndex, roomsThisFloor, rng);
  const board = createEmptyBoard(cfg);
  return { board, cfg, rng };
}

export function generateRoom(
  seed: number,
  floorId: number,
  roomIndex: number,
  roomsThisFloor: number,
  first: Coord,
): Board {
  const { board, cfg, rng } = prepareRoom(seed, floorId, roomIndex, roomsThisFloor);
  placeMines(board, cfg, first, rng);
  return board;
}
```

> **Note:** `placeMines` trusts `cfg`; always obtain the board from `prepareRoom` so `cfg` and the empty board match. `boardStore` (Task 8) keeps `{ board, cfg, rng }` together for exactly this reason.

- [ ] **Step 4: Run tests and type check**

Run: `npm test -- boardgen && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/boardgen.ts src/lib/boardgen.test.ts
git commit -m "feat: seeded board generation"
```

---

## Task 7: Reveal, chord, flag, hazard resolution

**Files:**
- Create: `src/lib/reveal.ts`
- Test: `src/lib/reveal.test.ts`

**Interfaces:**
- Consumes: `Board`, `TileState`, `Coord`, `RevealResult`, `RuleFlags` from `types.ts`; `DEFAULT_RULE_FLAGS` from `types.ts`; `neighbourCoords`, `computeAdjacency` from `boardgen.ts`; `Rng` from `rng.ts`.
- Produces (all mutate `board` in place unless noted):
  - `export function reveal(board: Board, r: number, c: number, rules: RuleFlags): RevealResult`
  - `export function chord(board: Board, r: number, c: number, rules: RuleFlags): RevealResult`
  - `export function toggleFlag(board: Board, r: number, c: number, rules: RuleFlags): boolean` — returns whether the tile is flagged afterwards; `false` for a no-op.
  - `export function countTotalSafe(board: Board): number` — non-mine progress units (rubble counts 2, others 1).
  - `export function countRevealedSafe(board: Board): number` — progress so far (rubble stage 1 = 1, stage 2 = 2).
  - `export function isRoomClear(board: Board): boolean` — all safe progress made **and** (non-boss, or boss mine defused).
  - `export function armEmbers(board: Board, coords: Coord[], now: number, emberRecoverMs: number, rules: RuleFlags): void` — set `emberRecoverAt` on freshly revealed ember tiles.
  - `export function recoverEmbers(board: Board, now: number, rules: RuleFlags): Coord[]` — re-cover due embers (unless room already clear); returns re-covered coords.
  - `export function spreadWater(board: Board, rng: Rng): Coord | null` — mark one revealed tile watered (adjacent to existing water, or seeded from a random revealed tile); returns it or `null`.
  - `export function emptyRevealResult(): RevealResult`

- [ ] **Step 1: Write the failing tests**

`src/lib/reveal.test.ts`:

```ts
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
    expect(r2.revealed).toEqual([{ r: 0, c: 2 }]);
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
    reveal(b, 0, 1, RULES);
    toggleFlag(b, 1, 1, RULES); // wrong flag
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
```

> The ASCII `build()` helper ignores digit characters (`'1'`, `'2'`, …) — they are visual hints for the reader and parse as `hazard: 'none'`, non-mine, non-cache tiles. Adjacency is always recomputed from `'*'`.

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test -- reveal`
Expected: FAIL — `Cannot find module './reveal'`.

- [ ] **Step 3: Implement `src/lib/reveal.ts`**

```ts
import type { Board, Coord, RevealResult, RuleFlags, TileState } from './types';
import { neighbourCoords } from './boardgen';
import type { Rng } from './rng';

export function emptyRevealResult(): RevealResult {
  return { revealed: [], mines: [], caches: [], rubbleAdvanced: [] };
}

const at = (b: Board, r: number, c: number): TileState => b.tiles[r]![c]!;
const isFullyRevealed = (t: TileState): boolean => t.revealed;

function mergeResult(into: RevealResult, add: RevealResult): void {
  into.revealed.push(...add.revealed);
  into.mines.push(...add.mines);
  into.caches.push(...add.caches);
  into.rubbleAdvanced.push(...add.rubbleAdvanced);
}

function floodFrom(board: Board, start: Coord, res: RevealResult): void {
  const queue: Coord[] = [start];
  while (queue.length) {
    const { r, c } = queue.shift()!;
    for (const nc of neighbourCoords(board, r, c)) {
      const n = at(board, nc.r, nc.c);
      if (n.flagged || n.isMine || n.revealed) continue;
      if (n.hazard === 'rubble') {
        if (n.rubbleStage === 0) {
          n.rubbleStage = 1;
          res.rubbleAdvanced.push({ r: n.r, c: n.c });
        }
        continue; // never flood through / past rubble
      }
      n.revealed = true;
      res.revealed.push({ r: n.r, c: n.c });
      if (n.isCache) res.caches.push({ r: n.r, c: n.c });
      if (n.adjacent === 0) queue.push({ r: n.r, c: n.c });
    }
  }
}

export function reveal(board: Board, r: number, c: number, _rules: RuleFlags): RevealResult {
  const res = emptyRevealResult();
  const t = at(board, r, c);
  if (t.flagged) return res;

  if (t.hazard === 'rubble' && t.rubbleStage < 2) {
    if (t.rubbleStage === 0) {
      t.rubbleStage = 1;
      res.rubbleAdvanced.push({ r, c });
      return res;
    }
    // stage 1 -> 2: fully cleared
    t.rubbleStage = 2;
    t.revealed = true;
    res.revealed.push({ r, c });
    if (t.isCache) res.caches.push({ r, c });
    if (t.adjacent === 0) floodFrom(board, { r, c }, res);
    return res;
  }

  if (t.revealed) return res;

  if (t.isMine) {
    res.mines.push({ r, c });
    return res;
  }

  t.revealed = true;
  res.revealed.push({ r, c });
  if (t.isCache) res.caches.push({ r, c });
  if (t.adjacent === 0) floodFrom(board, { r, c }, res);
  return res;
}

export function chord(board: Board, r: number, c: number, rules: RuleFlags): RevealResult {
  const res = emptyRevealResult();
  const t = at(board, r, c);
  if (!t.revealed || t.adjacent === 0) return res;

  const ns = neighbourCoords(board, r, c).map((n) => at(board, n.r, n.c));
  const flagged = ns.filter((n) => n.flagged).length;
  const covered = ns.filter((n) => !isFullyRevealed(n) && !n.flagged).length + flagged;
  const satisfied = flagged === t.adjacent || (rules.chordWithoutFlags && covered === t.adjacent);
  if (!satisfied) return res;

  for (const n of ns) {
    if (n.flagged || isFullyRevealed(n)) continue;
    if (n.watered) continue; // watered tiles are excluded from chord auto-reveal
    mergeResult(res, reveal(board, n.r, n.c, rules));
  }
  return res;
}

export function toggleFlag(board: Board, r: number, c: number, rules: RuleFlags): boolean {
  if (rules.noFlagging) return false;
  const t = at(board, r, c);
  if (t.revealed) {
    if (t.hazard === 'ember') {
      t.flagged = !t.flagged;
      if (t.flagged) t.emberRecoverAt = null;
      return t.flagged;
    }
    return false;
  }
  t.flagged = !t.flagged;
  t.numberPeeked = t.flagged && rules.revealNumberOnFlag;
  return t.flagged;
}

export function countTotalSafe(board: Board): number {
  let total = 0;
  for (const row of board.tiles)
    for (const t of row) {
      if (t.isMine) continue;
      total += t.hazard === 'rubble' ? 2 : 1;
    }
  return total;
}

export function countRevealedSafe(board: Board): number {
  let done = 0;
  for (const row of board.tiles)
    for (const t of row) {
      if (t.isMine) continue;
      if (t.hazard === 'rubble') done += t.rubbleStage; // 0,1,2
      else if (t.revealed) done += 1;
    }
  return done;
}

export function isRoomClear(board: Board): boolean {
  if (countRevealedSafe(board) < countTotalSafe(board)) return false;
  if (!board.isBoss) return true;
  for (const row of board.tiles)
    for (const t of row)
      if (t.isBossMine && !t.defused) return false;
  return true;
}

export function armEmbers(
  board: Board, coords: Coord[], now: number, emberRecoverMs: number, rules: RuleFlags,
): void {
  if (rules.immuneEmberRecover) return;
  for (const { r, c } of coords) {
    const t = at(board, r, c);
    if (t.hazard === 'ember' && t.revealed && !t.flagged && t.emberRecoverAt === null) {
      t.emberRecoverAt = now + emberRecoverMs;
    }
  }
}

export function recoverEmbers(board: Board, now: number, rules: RuleFlags): Coord[] {
  if (rules.immuneEmberRecover) return [];
  if (isRoomClear(board)) return [];
  const out: Coord[] = [];
  for (const row of board.tiles)
    for (const t of row) {
      if (
        t.hazard === 'ember' && t.revealed && !t.flagged &&
        t.emberRecoverAt !== null && now >= t.emberRecoverAt
      ) {
        t.revealed = false;
        t.emberRecoverAt = null;
        out.push({ r: t.r, c: t.c });
      }
    }
  return out;
}

export function spreadWater(board: Board, rng: Rng): Coord | null {
  const dry: TileState[] = [];
  const wet: TileState[] = [];
  for (const row of board.tiles)
    for (const t of row) {
      if (!t.revealed || t.isMine) continue;
      (t.watered ? wet : dry).push(t);
    }
  if (dry.length === 0) return null;

  let pool = dry;
  if (wet.length > 0) {
    const adjToWater = dry.filter((t) =>
      neighbourCoords(board, t.r, t.c).some((n) => at(board, n.r, n.c).watered),
    );
    if (adjToWater.length > 0) pool = adjToWater;
  }
  const chosen = rng.pick(pool);
  chosen.watered = true;
  return { r: chosen.r, c: chosen.c };
}
```

- [ ] **Step 4: Run tests and type check**

Run: `npm test -- reveal && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reveal.ts src/lib/reveal.test.ts
git commit -m "feat: reveal, chord, flag, and hazard resolution"
```

---

## Task 8: Board store and interactive Board / Tile components

**Files:**
- Create: `src/stores/boardStore.ts`
- Create: `src/components/Tile.svelte`
- Create: `src/components/Board.svelte`
- Create: `src/components/GameScreen.svelte` (minimal shell — Task 20 fills the HUD/orchestration)
- Test: `src/stores/boardStore.test.ts`
- Test: `src/components/Board.test.ts`
- Modify: `src/App.svelte` (render `GameScreen` so the shell is reachable in dev)

**Interfaces:**
- Consumes: `prepareRoom`, `placeMines` from `boardgen.ts`; `reveal`, `chord`, `toggleFlag`, `isRoomClear`, `countRevealedSafe`, `countTotalSafe` from `reveal.ts`; `DEFAULT_RULE_FLAGS` from `types.ts`; `Board`, `BoardConfig`, `Coord`, `RevealResult`, `RuleFlags` from `types.ts`; `Rng` from `rng.ts`.
- Produces:
  - `src/stores/boardStore.ts`:
    - `export interface BoardSession { board: Board; cfg: BoardConfig; rng: Rng; }`
    - `export const boardSession: Writable<BoardSession | null>`
    - `export function loadRoom(seed: number, floorId: number, roomIndex: number, roomsThisFloor: number): void`
    - `export function clearRoom(): void`
    - `export function applyReveal(r: number, c: number, rules: RuleFlags): RevealResult` — handles first-click mine placement, mutates session board, returns the merged result.
    - `export function applyChord(r: number, c: number, rules: RuleFlags): RevealResult`
    - `export function applyFlag(r: number, c: number, rules: RuleFlags): boolean`
    - `export function bump(): void` — force a store notification after external board mutation (combat defuse, ember recover).
  - `Board.svelte` props: `{ rules?: RuleFlags; disabled?: boolean; targetingMode?: 'probe' | 'scry' | null; ontarget?: (r: number, c: number) => void; onrevealrequest?: (kind: 'reveal' | 'chord', r: number, c: number) => void }`. Left-click emits `onrevealrequest('reveal' | 'chord', r, c)` — `'chord'` when the clicked tile is already revealed with a number, `'reveal'` otherwise — leaving the actual reveal to the parent (`GameScreen` in Task 21, direct `applyReveal` in the Task 8 shell). Right-click flags internally via `applyFlag`. When `targetingMode` is set, a left-click emits `ontarget(r, c)` instead and flagging is suppressed. This is the component's **final shape**; Task 21 only adds a `GameScreen` that consumes it.
  - `Tile.svelte` props: `{ tile: TileState; disabled: boolean; onreveal: () => void; onflag: () => void }`.

- [ ] **Step 1: Write the failing store test**

`src/stores/boardStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { DEFAULT_RULE_FLAGS } from '../lib/types';
import { boardSession, loadRoom, clearRoom, applyReveal, applyFlag } from './boardStore';

const RULES = { ...DEFAULT_RULE_FLAGS };

describe('boardStore', () => {
  beforeEach(() => clearRoom());

  it('loadRoom populates a covered, un-mined session', () => {
    loadRoom(123, 1, 0, 5);
    const s = get(boardSession)!;
    expect(s).not.toBeNull();
    expect(s.board.minesPlaced).toBe(false);
    expect(s.board.rows).toBe(8);
    expect(s.board.tiles.flat().every((t) => !t.revealed)).toBe(true);
  });

  it('the first applyReveal places mines with that tile safe, then reveals', () => {
    loadRoom(123, 1, 0, 5);
    const res = applyReveal(4, 4, RULES);
    const s = get(boardSession)!;
    expect(s.board.minesPlaced).toBe(true);
    expect(s.board.tiles[4]![4]!.isMine).toBe(false);
    expect(s.board.tiles[4]![4]!.revealed).toBe(true);
    expect(res.revealed.length).toBeGreaterThan(0);
  });

  it('is deterministic: same seed/floor/room/first click => same mines', () => {
    loadRoom(77, 2, 1, 5);
    applyReveal(5, 5, RULES);
    const a = get(boardSession)!.board.tiles.flat().filter((t) => t.isMine).map((t) => `${t.r},${t.c}`).sort();
    clearRoom();
    loadRoom(77, 2, 1, 5);
    applyReveal(5, 5, RULES);
    const b = get(boardSession)!.board.tiles.flat().filter((t) => t.isMine).map((t) => `${t.r},${t.c}`).sort();
    expect(a).toEqual(b);
  });

  it('applyFlag toggles and notifies subscribers', () => {
    loadRoom(1, 1, 0, 5);
    let ticks = 0;
    const unsub = boardSession.subscribe(() => ticks++);
    const start = ticks;
    applyFlag(0, 0, RULES);
    expect(get(boardSession)!.board.tiles[0]![0]!.flagged).toBe(true);
    expect(ticks).toBeGreaterThan(start);
    unsub();
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npm test -- boardStore`
Expected: FAIL — `Cannot find module './boardStore'`.

- [ ] **Step 3: Implement `src/stores/boardStore.ts`**

```ts
import { writable, get, type Writable } from 'svelte/store';
import type { Board, BoardConfig, Coord, RevealResult, RuleFlags } from '../lib/types';
import type { Rng } from '../lib/rng';
import { prepareRoom, placeMines } from '../lib/boardgen';
import {
  reveal, chord, toggleFlag, emptyRevealResult,
} from '../lib/reveal';

export interface BoardSession {
  board: Board;
  cfg: BoardConfig;
  rng: Rng;
}

export const boardSession: Writable<BoardSession | null> = writable(null);

export function loadRoom(seed: number, floorId: number, roomIndex: number, roomsThisFloor: number): void {
  const { board, cfg, rng } = prepareRoom(seed, floorId, roomIndex, roomsThisFloor);
  boardSession.set({ board, cfg, rng });
}

export function clearRoom(): void {
  boardSession.set(null);
}

export function bump(): void {
  boardSession.update((s) => s);
}

export function applyReveal(r: number, c: number, rules: RuleFlags): RevealResult {
  const s = get(boardSession);
  if (!s) return emptyRevealResult();
  if (!s.board.minesPlaced) placeMines(s.board, s.cfg, { r, c }, s.rng);
  const res = reveal(s.board, r, c, rules);
  boardSession.update((x) => x);
  return res;
}

export function applyChord(r: number, c: number, rules: RuleFlags): RevealResult {
  const s = get(boardSession);
  if (!s) return emptyRevealResult();
  const res = chord(s.board, r, c, rules);
  boardSession.update((x) => x);
  return res;
}

export function applyFlag(r: number, c: number, rules: RuleFlags): boolean {
  const s = get(boardSession);
  if (!s) return false;
  const flagged = toggleFlag(s.board, r, c, rules);
  boardSession.update((x) => x);
  return flagged;
}

export type { Coord };
```

- [ ] **Step 4: Run the store test**

Run: `npm test -- boardStore`
Expected: PASS.

- [ ] **Step 5: Write the failing Board component test**

`src/components/Board.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import { DEFAULT_RULE_FLAGS } from '../lib/types';
import { boardSession, loadRoom, clearRoom, applyReveal } from '../stores/boardStore';
import Board from './Board.svelte';

const RULES = { ...DEFAULT_RULE_FLAGS };

function tileButton(r: number, c: number): HTMLElement {
  return screen.getByTestId
    ? screen.getByTestId(`tile-${r}-${c}`)
    : (document.querySelector(`[data-testid="tile-${r}-${c}"]`) as HTMLElement);
}

describe('Board.svelte', () => {
  beforeEach(() => {
    clearRoom();
    loadRoom(555, 1, 0, 5);
  });

  it('renders one button per tile', () => {
    render(Board, { props: { rules: RULES } });
    expect(document.querySelectorAll('[data-testid^="tile-"]').length).toBe(64);
  });

  it('left-click emits a reveal request for a covered tile', async () => {
    const onrevealrequest = vi.fn();
    render(Board, { props: { rules: RULES, onrevealrequest } });
    await userEvent.click(tileButton(4, 4));
    expect(onrevealrequest).toHaveBeenCalledWith('reveal', 4, 4);
  });

  it('left-click emits a chord request for an already-revealed number', async () => {
    applyReveal(4, 4, RULES); // places mines + opens a region through the store
    const numbered = get(boardSession)!.board.tiles.flat().find((t) => t.revealed && t.adjacent > 0)!;
    const onrevealrequest = vi.fn();
    render(Board, { props: { rules: RULES, onrevealrequest } });
    await userEvent.click(tileButton(numbered.r, numbered.c));
    expect(onrevealrequest).toHaveBeenCalledWith('chord', numbered.r, numbered.c);
  });

  it('right-click flags a covered tile internally', async () => {
    render(Board, { props: { rules: RULES } });
    await userEvent.pointer({ keys: '[MouseRight]', target: tileButton(0, 0) });
    expect(get(boardSession)!.board.tiles[0]![0]!.flagged).toBe(true);
  });

  it('in targeting mode a click emits ontarget instead of a reveal request', async () => {
    const ontarget = vi.fn();
    const onrevealrequest = vi.fn();
    render(Board, { props: { rules: RULES, targetingMode: 'probe', ontarget, onrevealrequest } });
    await userEvent.click(tileButton(2, 2));
    expect(ontarget).toHaveBeenCalledWith(2, 2);
    expect(onrevealrequest).not.toHaveBeenCalled();
  });

  it('does nothing on click when disabled', async () => {
    const onrevealrequest = vi.fn();
    render(Board, { props: { rules: RULES, disabled: true, onrevealrequest } });
    await userEvent.click(tileButton(2, 2));
    expect(onrevealrequest).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run it, expect failure**

Run: `npm test -- Board`
Expected: FAIL — `Cannot find module './Board.svelte'`.

- [ ] **Step 7: Implement the components**

`src/components/Tile.svelte`:

```svelte
<script lang="ts">
  import type { TileState } from '../lib/types';

  let { tile, disabled, onreveal, onflag }: {
    tile: TileState;
    disabled: boolean;
    onreveal: () => void;
    onflag: () => void;
  } = $props();

  function contextmenu(e: MouseEvent) {
    e.preventDefault();
    if (!disabled) onflag();
  }

  const face = $derived.by(() => {
    if (tile.hazard === 'rubble' && tile.rubbleStage === 1) return '▦';
    if (!tile.revealed) {
      if (tile.flagged) return '⚑';
      if (tile.numberPeeked || tile.scryVisibleUntil) {
        return tile.scryVisibleUntil && tile.isMine ? '◆' : String(Math.max(0, tile.adjacent + tile.displayDelta) || '');
      }
      return '';
    }
    if (tile.isMine) return tile.defused ? '☠' : '◆';
    const shown = Math.max(0, tile.adjacent + tile.displayDelta);
    return shown === 0 ? '' : String(shown);
  });
</script>

<button
  type="button"
  data-testid={`tile-${tile.r}-${tile.c}`}
  class="tile"
  class:revealed={tile.revealed || (tile.hazard === 'rubble' && tile.rubbleStage >= 1)}
  class:flag={tile.flagged}
  class:mine={tile.revealed && tile.isMine}
  class:watered={tile.watered}
  {disabled}
  onclick={() => !disabled && onreveal()}
  oncontextmenu={contextmenu}
>{face}</button>

<style>
  .tile {
    width: 28px; height: 28px; padding: 0;
    border: 1px solid #0c0c12;
    background: var(--tile-covered);
    color: var(--ink);
    font-weight: 700;
    cursor: pointer;
  }
  .tile.revealed { background: var(--tile); cursor: default; }
  .tile.flag { color: var(--accent); }
  .tile.mine { background: var(--danger); }
  .tile.watered { box-shadow: inset 0 0 0 2px #2f6f9f; }
  .tile:disabled { cursor: not-allowed; }
</style>
```

`src/components/Board.svelte` (final shape — Task 21 adds only a consuming `GameScreen`):

```svelte
<script lang="ts">
  import type { RuleFlags } from '../lib/types';
  import { DEFAULT_RULE_FLAGS } from '../lib/types';
  import { boardSession, applyFlag } from '../stores/boardStore';
  import Tile from './Tile.svelte';

  let {
    rules = DEFAULT_RULE_FLAGS,
    disabled = false,
    targetingMode = null,
    ontarget,
    onrevealrequest,
  }: {
    rules?: RuleFlags;
    disabled?: boolean;
    targetingMode?: 'probe' | 'scry' | null;
    ontarget?: (r: number, c: number) => void;
    onrevealrequest?: (kind: 'reveal' | 'chord', r: number, c: number) => void;
  } = $props();

  function handleReveal(r: number, c: number) {
    if (disabled) return;
    if (targetingMode) { ontarget?.(r, c); return; }
    const s = $boardSession;
    if (!s) return;
    const tile = s.board.tiles[r]![c]!;
    const kind = tile.revealed && tile.adjacent > 0 ? 'chord' : 'reveal';
    onrevealrequest?.(kind, r, c);
  }

  function handleFlag(r: number, c: number) {
    if (disabled || targetingMode) return;
    applyFlag(r, c, rules);
  }
</script>

{#if $boardSession}
  <div class="board" style={`grid-template-columns: repeat(${$boardSession.board.cols}, 28px)`}>
    {#each $boardSession.board.tiles as row (row[0].r)}
      {#each row as tile (tile.c)}
        <Tile
          {tile}
          disabled={disabled || (tile.revealed && !(tile.adjacent > 0) && !targetingMode)}
          onreveal={() => handleReveal(tile.r, tile.c)}
          onflag={() => handleFlag(tile.r, tile.c)}
        />
      {/each}
    {/each}
  </div>
{/if}

<style>
  .board {
    display: grid;
    gap: 1px;
    background: #0c0c12;
    padding: 1px;
    width: max-content;
    margin: 0 auto;
    user-select: none;
  }
</style>
```

`src/components/GameScreen.svelte` (minimal shell — Task 21 replaces it with the real flow):

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Board from './Board.svelte';
  import { loadRoom, applyReveal, applyChord } from '../stores/boardStore';
  import { DEFAULT_RULE_FLAGS } from '../lib/types';

  onMount(() => loadRoom(Math.floor(Math.random() * 100000), 1, 0, 5));

  function onReveal(kind: 'reveal' | 'chord', r: number, c: number) {
    if (kind === 'chord') applyChord(r, c, DEFAULT_RULE_FLAGS);
    else applyReveal(r, c, DEFAULT_RULE_FLAGS);
  }
</script>

<section class="game">
  <Board onrevealrequest={onReveal} />
</section>

<style>
  .game { padding: 2rem; }
</style>
```

- [ ] **Step 8: Wire `App.svelte` to the shell**

```svelte
<script lang="ts">
  import GameScreen from './components/GameScreen.svelte';
</script>

<GameScreen />
```

- [ ] **Step 9: Run tests and type check**

Run: `npm test && npm run check`
Expected: all PASS; 0 type errors. If `screen.getByTestId` is undefined in this testing-library version, the helper's `querySelector` fallback covers it — keep both branches.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: interactive board and tile components"
```

---

## Task 9: Class content

**Files:**
- Create: `src/content/classes.ts`
- Test: `src/content/classes.test.ts`

**Interfaces:**
- Consumes: `ClassDef`, `ClassId` from `types.ts`.
- Produces:
  - `export const CLASSES: Record<ClassId, ClassDef>`
  - `export function getClass(id: ClassId): ClassDef`
  - `export const CLASS_IDS: readonly ClassId[]` — `['sapper', 'diviner']`

- [ ] **Step 1: Write the failing tests**

`src/content/classes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CLASSES, getClass, CLASS_IDS } from './classes';

describe('classes', () => {
  it('defines sapper and diviner with the spec start stats', () => {
    expect(CLASS_IDS).toEqual(['sapper', 'diviner']);
    expect(getClass('sapper').start).toEqual({ hp: 12, power: 4, guard: 3, focus: 3, focusCap: 3 });
    expect(getClass('diviner').start).toEqual({ hp: 9, power: 3, guard: 2, focus: 5, focusCap: 5 });
  });

  it('carries the right starting gear ids', () => {
    expect(getClass('sapper').startGear).toEqual({ weapon: 'sappers-pick', armor: 'blast-plating' });
    expect(getClass('diviner').startGear).toEqual({ weapon: 'divining-rod', armor: 'plain-robe' });
  });

  it('carries the signature ability config', () => {
    expect(getClass('sapper').ability).toEqual({
      id: 'probe', name: 'Probe', focusCost: 2, usableInCombat: false, oncePerRoom: true,
    });
    expect(getClass('diviner').ability).toEqual({
      id: 'scry', name: 'Scry', focusCost: 2, usableInCombat: true, oncePerRoom: false,
    });
  });

  it('every class has non-empty fantasy and playstyle copy', () => {
    for (const id of CLASS_IDS) {
      expect(getClass(id).fantasy.length).toBeGreaterThan(0);
      expect(getClass(id).playstyle.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test -- classes`
Expected: FAIL — `Cannot find module './classes'`.

- [ ] **Step 3: Implement `src/content/classes.ts`**

```ts
import type { ClassDef, ClassId } from '../lib/types';

export const CLASS_IDS: readonly ClassId[] = ['sapper', 'diviner'];

export const CLASSES: Record<ClassId, ClassDef> = {
  sapper: {
    id: 'sapper',
    name: 'Sapper',
    fantasy: 'A grizzled demolitions expert who has walked out of more collapses than anyone should.',
    playstyle: 'Durable and forgiving — plays greedy.',
    start: { hp: 12, power: 4, guard: 3, focus: 3, focusCap: 3 },
    startGear: { weapon: 'sappers-pick', armor: 'blast-plating' },
    ability: { id: 'probe', name: 'Probe', focusCost: 2, usableInCombat: false, oncePerRoom: true },
  },
  diviner: {
    id: 'diviner',
    name: 'Diviner',
    fantasy: 'A nervy occult scholar who reads the dark the way others read a map.',
    playstyle: 'Fragile but information-rich — plays precise.',
    start: { hp: 9, power: 3, guard: 2, focus: 5, focusCap: 5 },
    startGear: { weapon: 'divining-rod', armor: 'plain-robe' },
    ability: { id: 'scry', name: 'Scry', focusCost: 2, usableInCombat: true, oncePerRoom: false },
  },
};

export function getClass(id: ClassId): ClassDef {
  return CLASSES[id];
}
```

- [ ] **Step 4: Run tests and type check**

Run: `npm test -- classes && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/classes.ts src/content/classes.test.ts
git commit -m "feat: class content"
```

---

## Task 10: Narrative content

**Files:**
- Create: `src/content/narrative.ts`
- Test: `src/content/narrative.test.ts`

**Interfaces:**
- Consumes: `MonsterType` from `types.ts`; `MONSTER_TYPES`, `getMonsterDef` from `content/monsters.ts`; `FLOORS` from `content/floors.ts`.
- Produces:
  - `export const PROLOGUE: string`
  - `export interface FloorIntro { title: string; mood: string; mechanicalNote: string; }`
  - `export function getFloorIntro(floorId: number): FloorIntro`
  - `export function getBossIntro(floorId: number): string`
  - `export interface CodexEntry { codexId: string; name: string; flavor: string; }`
  - `export function getCodexEntry(type: MonsterType): CodexEntry`
  - `export const ENDINGS: { win: string; diedOut: string; abandoned: string }`

- [ ] **Step 1: Write the failing tests**

`src/content/narrative.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  PROLOGUE, getFloorIntro, getBossIntro, getCodexEntry, ENDINGS,
} from './narrative';
import { FLOORS } from './floors';
import { MONSTER_TYPES } from './monsters';

describe('narrative', () => {
  it('has a non-empty prologue', () => {
    expect(PROLOGUE.length).toBeGreaterThan(40);
  });

  it('provides a title/mood/mechanical-note intro for every floor', () => {
    for (const f of FLOORS) {
      const intro = getFloorIntro(f.id);
      expect(intro.title).toBe(f.name);
      expect(intro.mood.length).toBeGreaterThan(0);
      expect(intro.mechanicalNote.length).toBeGreaterThan(0);
    }
  });

  it('provides a boss intro line per floor', () => {
    for (const f of FLOORS) expect(getBossIntro(f.id).length).toBeGreaterThan(0);
  });

  it('provides a codex entry per monster type matching the monster def', () => {
    for (const t of MONSTER_TYPES) {
      const e = getCodexEntry(t);
      expect(e.codexId).toBe(`monster:${t}`);
      expect(e.flavor.length).toBeGreaterThan(0);
    }
  });

  it('has three ending variants', () => {
    expect(ENDINGS.win.length).toBeGreaterThan(0);
    expect(ENDINGS.diedOut.length).toBeGreaterThan(0);
    expect(ENDINGS.abandoned.length).toBeGreaterThan(0);
  });

  it('throws for an unknown floor id', () => {
    expect(() => getFloorIntro(9)).toThrow();
    expect(() => getBossIntro(9)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test -- narrative`
Expected: FAIL — `Cannot find module './narrative'`.

- [ ] **Step 3: Implement `src/content/narrative.ts`**

```ts
import type { MonsterType } from '../lib/types';
import { getMonsterDef } from './monsters';

export const PROLOGUE =
  'They call it the Undercroft, and for a hundred years the town above has fed it and looked away. ' +
  'You are the one they hired to go down, find what is pulling the dark upward, and put it out. ' +
  'The stairs only go one way.';

export interface FloorIntro {
  title: string;
  mood: string;
  mechanicalNote: string;
}

const FLOOR_INTROS: Record<number, FloorIntro> = {
  1: {
    title: 'The Cellars',
    mood: 'Cold storage rooms and broken shelving. Something moved here recently; the dust has not settled.',
    mechanicalNote: 'Rubble tiles must be cleared twice before they count.',
  },
  2: {
    title: 'The Flooded Vault',
    mood: 'Black water stands ankle-deep and remembers every step you take.',
    mechanicalNote: 'Each mine you set off spreads the water — and watered ground will not chord.',
  },
  3: {
    title: 'The Ashworks',
    mood: 'Old forge-halls, still warm. Embers breathe in the dark and will not stay put.',
    mechanicalNote: 'Revealed ember tiles re-cover after a few seconds unless you flag them.',
  },
  4: {
    title: 'The Undercroft',
    mood: 'The source. The air here counts wrong, and so does everything in it.',
    mechanicalNote: 'Cursed tiles show a number that is off by one.',
  },
};

const BOSS_INTROS: Record<number, string> = {
  1: 'Something the size of a door unfolds from the far wall.',
  2: 'The water gathers itself upward into a shape that was once a person.',
  3: 'The largest furnace swings open and looks back at you.',
  4: 'The dark stops pretending to be a room.',
};

export function getFloorIntro(floorId: number): FloorIntro {
  const intro = FLOOR_INTROS[floorId];
  if (!intro) throw new Error(`no floor intro for ${floorId}`);
  return intro;
}

export function getBossIntro(floorId: number): string {
  const line = BOSS_INTROS[floorId];
  if (!line) throw new Error(`no boss intro for ${floorId}`);
  return line;
}

export interface CodexEntry {
  codexId: string;
  name: string;
  flavor: string;
}

export function getCodexEntry(type: MonsterType): CodexEntry {
  const d = getMonsterDef(type);
  return { codexId: d.codexId, name: d.name, flavor: d.flavor };
}

export const ENDINGS = {
  win: 'The pull stops. The stairs behind you are just stairs again. You climb.',
  diedOut: 'You have nothing left to spend and a long way still down. The dark keeps what it takes.',
  abandoned: 'You turn back while turning back is still a choice. The town will have to wait for someone braver.',
};
```

- [ ] **Step 4: Run tests and type check**

Run: `npm test -- narrative && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/narrative.ts src/content/narrative.test.ts
git commit -m "feat: narrative content"
```

---

## Task 11: Run progression logic and run store

**Files:**
- Create: `src/lib/run.ts`
- Create: `src/stores/runStore.ts`
- Test: `src/lib/run.test.ts`
- Test: `src/stores/runStore.test.ts`

**Interfaces:**
- Consumes: `RunState`, `Checkpoint`, `Item`, `ClassId`, `StatKey`, `EMPTY_EQUIPPED` from `types.ts`; `createRng` from `rng.ts`; `getClass` from `content/classes.ts`; `getFloor`, `FLOOR_COUNT` from `content/floors.ts`.
- Produces (`run.ts`):
  - `export const START_RETRIES = 2`
  - `export const ROOMS_PER_FLOOR_MAX = 6` (used by `depthOf`)
  - `export function depthOf(floor: number, roomIndex: number): number`
  - `export function createRun(seed: number, classId: ClassId, startWeapon: Item, startArmor: Item, now: number): RunState`
  - `export function enterFloor(run: RunState): void` — sets `roomIndex = 0`, redraws `roomsThisFloor` deterministically from `seed`+`floor`, resets per-room transient state.
  - `export function snapshotCheckpoint(run: RunState): Checkpoint`
  - `export function restoreCheckpoint(run: RunState, cp: Checkpoint): void`
  - `export function roomCleared(run: RunState, derivedFocusCap: number): void`
  - `export function advanceRoom(run: RunState): 'next-room' | 'next-floor' | 'run-complete'`
  - `export function applyDeath(run: RunState): 'retry' | 'game-over'`
  - `export function noteSafeReveals(run: RunState, count: number, derivedFocusCap: number): { focusGained: number }`
  - `export function recordMineDefused(run: RunState): void`
  - `export function applyRoomDebuff(run: RunState, stat: StatKey): void`
  - `export function applyHpLoss(run: RunState, amount: number): void`
  - `export function isDead(run: RunState): boolean`
  - `export function isBossRoom(run: RunState): boolean`
  - `export function isCheckpointRoom(run: RunState): boolean`
  - `export function isFinalBoss(run: RunState): boolean`
- Produces (`runStore.ts`):
  - `export const runState: Writable<RunState | null>`
  - `export const checkpointStore: Writable<Checkpoint | null>`
  - `export function patchRun(fn: (r: RunState) => void): void`
  - `export function setRun(r: RunState | null): void`

- [ ] **Step 1: Write the failing `run.ts` tests**

`src/lib/run.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Item, RunState } from './types';
import {
  createRun, enterFloor, snapshotCheckpoint, restoreCheckpoint, roomCleared,
  advanceRoom, applyDeath, noteSafeReveals, applyHpLoss, isDead,
  isBossRoom, isCheckpointRoom, isFinalBoss, depthOf, START_RETRIES,
} from './run';

const wpn: Item = { id: 'w1', defId: 'sappers-pick', name: 'Pick', slot: 'weapon', rarity: 'common', flavor: '' };
const arm: Item = { id: 'a1', defId: 'blast-plating', name: 'Plate', slot: 'armor', rarity: 'common', flavor: '' };
const mkRun = (): RunState => {
  const r = createRun(42, 'sapper', wpn, arm, 1_000);
  enterFloor(r);
  return r;
};

describe('createRun', () => {
  it('seeds base stats from the class and starts on floor 1 room 0', () => {
    const r = createRun(42, 'sapper', wpn, arm, 1_000);
    expect(r.floor).toBe(1);
    expect(r.roomIndex).toBe(0);
    expect(r.retriesLeft).toBe(START_RETRIES);
    expect([r.hp, r.maxHp, r.power, r.guard, r.focus, r.focusCap]).toEqual([12, 12, 4, 3, 3, 3]);
    expect(r.equipped.weapon).toBe(wpn);
    expect(r.equipped.armor).toBe(arm);
    expect(r.startedAtMs).toBe(1_000);
  });
});

describe('enterFloor', () => {
  it('draws a room count within the floor range and resets per-room state', () => {
    const r = mkRun();
    expect(r.roomsThisFloor).toBeGreaterThanOrEqual(4);
    expect(r.roomsThisFloor).toBeLessThanOrEqual(5); // floor 1 range [4,5]
    r.abilityUsedThisRoom = true;
    r.roomDebuffs = ['power'];
    enterFloor(r);
    expect(r.abilityUsedThisRoom).toBe(false);
    expect(r.roomDebuffs).toEqual([]);
  });

  it('is deterministic for the same seed + floor', () => {
    const a = mkRun().roomsThisFloor;
    const b = mkRun().roomsThisFloor;
    expect(a).toBe(b);
  });
});

describe('checkpoints', () => {
  it('snapshot then restore round-trips loadout and hp', () => {
    const r = mkRun();
    r.hp = 7;
    r.focus = 1;
    r.inventory = [wpn];
    const cp = snapshotCheckpoint(r);
    r.hp = 1;
    r.focus = 3;
    r.inventory = [];
    r.roomIndex = 2;
    restoreCheckpoint(r, cp);
    expect(r.hp).toBe(7);
    expect(r.focus).toBe(1);
    expect(r.inventory).toEqual([wpn]);
    expect(r.roomIndex).toBe(0);
  });

  it('snapshot is a deep copy — later mutation does not leak in', () => {
    const r = mkRun();
    const cp = snapshotCheckpoint(r);
    r.inventory.push(wpn);
    expect(cp.inventory).toEqual([]);
  });
});

describe('roomCleared', () => {
  it('adds one focus up to the derived cap and resets per-room flags', () => {
    const r = mkRun();
    r.focus = 1;
    r.abilityUsedThisRoom = true;
    r.fightsThisRoom = 2;
    roomCleared(r, 3);
    expect(r.focus).toBe(2);
    expect(r.abilityUsedThisRoom).toBe(false);
    expect(r.fightsThisRoom).toBe(0);
    r.focus = 3;
    roomCleared(r, 3);
    expect(r.focus).toBe(3); // capped
  });
});

describe('advanceRoom', () => {
  it('walks rooms, then floors, then completes', () => {
    const r = mkRun();
    r.roomsThisFloor = 4;
    expect(advanceRoom(r)).toBe('next-room'); // 0 -> 1
    expect(advanceRoom(r)).toBe('next-room'); // 1 -> 2
    expect(advanceRoom(r)).toBe('next-room'); // 2 -> 3
    expect(advanceRoom(r)).toBe('next-floor'); // 3 -> floor 2 room 0
    expect(r.floor).toBe(2);
    expect(r.roomIndex).toBe(0);
    r.floor = 4;
    r.roomsThisFloor = 4;
    r.roomIndex = 3;
    expect(advanceRoom(r)).toBe('run-complete');
  });
});

describe('death and retries', () => {
  it('applyDeath decrements retries then reports game-over', () => {
    const r = mkRun();
    expect(r.retriesLeft).toBe(2);
    expect(applyDeath(r)).toBe('retry');
    expect(applyDeath(r)).toBe('retry');
    expect(r.retriesLeft).toBe(0);
    expect(applyDeath(r)).toBe('game-over');
  });

  it('applyHpLoss floors at zero and isDead flips', () => {
    const r = mkRun();
    applyHpLoss(r, 100);
    expect(r.hp).toBe(0);
    expect(isDead(r)).toBe(true);
  });
});

describe('noteSafeReveals', () => {
  it('sapper gains no passive focus', () => {
    const r = mkRun(); // sapper
    expect(noteSafeReveals(r, 25, 3).focusGained).toBe(0);
  });

  it('diviner gains one focus per ten safe tiles, capped', () => {
    const r = createRun(1, 'diviner', wpn, arm, 0);
    enterFloor(r);
    r.focus = 0;
    expect(noteSafeReveals(r, 9, 9).focusGained).toBe(0);
    expect(noteSafeReveals(r, 1, 9).focusGained).toBe(1); // crossed 10
    expect(r.focus).toBe(1);
    expect(noteSafeReveals(r, 30, 9).focusGained).toBe(3);
    expect(r.focus).toBe(4);
  });
});

describe('room predicates', () => {
  it('identifies checkpoint, boss, and final-boss rooms', () => {
    const r = mkRun();
    r.roomsThisFloor = 5;
    r.roomIndex = 0;
    expect(isCheckpointRoom(r)).toBe(true);
    expect(isBossRoom(r)).toBe(false);
    r.roomIndex = 4;
    expect(isBossRoom(r)).toBe(true);
    expect(isFinalBoss(r)).toBe(false);
    r.floor = 4;
    expect(isFinalBoss(r)).toBe(true);
  });

  it('depthOf is monotonic across floors and rooms', () => {
    expect(depthOf(1, 0)).toBe(1);
    expect(depthOf(1, 4)).toBe(5);
    expect(depthOf(2, 0)).toBe(7);
    expect(depthOf(4, 5)).toBe(24);
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test -- run.test`
Expected: FAIL — `Cannot find module './run'`.

- [ ] **Step 3: Implement `src/lib/run.ts`**

```ts
import type { Checkpoint, ClassId, Item, RunState, StatKey, Equipped } from './types';
import { createRng } from './rng';
import { getClass } from '../content/classes';
import { getFloor, FLOOR_COUNT } from '../content/floors';

export const START_RETRIES = 2;
export const ROOMS_PER_FLOOR_MAX = 6;

export function depthOf(floor: number, roomIndex: number): number {
  return (floor - 1) * ROOMS_PER_FLOOR_MAX + roomIndex + 1;
}

function cloneItem(i: Item): Item {
  return { ...i, statMods: i.statMods ? [...i.statMods] : undefined, hooks: i.hooks ? [...i.hooks] : undefined, ruleFlags: i.ruleFlags ? { ...i.ruleFlags } : undefined };
}

function cloneEquipped(e: Equipped): Equipped {
  return {
    weapon: e.weapon ? cloneItem(e.weapon) : null,
    armor: e.armor ? cloneItem(e.armor) : null,
    trinkets: [e.trinkets[0] ? cloneItem(e.trinkets[0]) : null, e.trinkets[1] ? cloneItem(e.trinkets[1]) : null],
  };
}

function resetRoomState(run: RunState): void {
  run.abilityUsedThisRoom = false;
  run.sapperFirstMineHandled = false;
  run.fightsThisRoom = 0;
  run.safeRevealsThisRoom = 0;
  run.roomDebuffs = [];
}

export function createRun(
  seed: number, classId: ClassId, startWeapon: Item, startArmor: Item, now: number,
): RunState {
  const cls = getClass(classId);
  const run: RunState = {
    seed,
    classId,
    floor: 1,
    roomIndex: 0,
    roomsThisFloor: 0,
    retriesLeft: START_RETRIES,
    hp: cls.start.hp,
    maxHp: cls.start.hp,
    focus: cls.start.focus,
    focusCap: cls.start.focusCap,
    power: cls.start.power,
    guard: cls.start.guard,
    equipped: { weapon: startWeapon, armor: startArmor, trinkets: [null, null] },
    inventory: [],
    codexUnlocks: [],
    abilityUsedThisRoom: false,
    sapperFirstMineHandled: false,
    fightsThisRoom: 0,
    safeRevealsThisRoom: 0,
    roomDebuffs: [],
    startedAtMs: now,
    monstersDefused: 0,
    deepestDepth: depthOf(1, 0),
  };
  return run;
}

export function enterFloor(run: RunState): void {
  const floor = getFloor(run.floor);
  const rng = createRng(run.seed).fork(9000 + run.floor);
  run.roomIndex = 0;
  run.roomsThisFloor = rng.int(floor.roomCountRange[0], floor.roomCountRange[1]);
  run.deepestDepth = Math.max(run.deepestDepth, depthOf(run.floor, 0));
  resetRoomState(run);
}

export function snapshotCheckpoint(run: RunState): Checkpoint {
  return {
    floor: run.floor,
    hp: run.hp,
    maxHp: run.maxHp,
    focus: run.focus,
    focusCap: run.focusCap,
    power: run.power,
    guard: run.guard,
    retriesLeft: run.retriesLeft,
    equipped: cloneEquipped(run.equipped),
    inventory: run.inventory.map(cloneItem),
    codexUnlocks: [...run.codexUnlocks],
  };
}

export function restoreCheckpoint(run: RunState, cp: Checkpoint): void {
  run.floor = cp.floor;
  run.hp = cp.hp;
  run.maxHp = cp.maxHp;
  run.focus = cp.focus;
  run.focusCap = cp.focusCap;
  run.power = cp.power;
  run.guard = cp.guard;
  run.retriesLeft = cp.retriesLeft;
  run.equipped = cloneEquipped(cp.equipped);
  run.inventory = cp.inventory.map(cloneItem);
  run.codexUnlocks = [...cp.codexUnlocks];
  enterFloor(run);
}

export function roomCleared(run: RunState, derivedFocusCap: number): void {
  run.focus = Math.min(run.focus + 1, derivedFocusCap);
  run.deepestDepth = Math.max(run.deepestDepth, depthOf(run.floor, run.roomIndex));
  resetRoomState(run);
}

export function advanceRoom(run: RunState): 'next-room' | 'next-floor' | 'run-complete' {
  if (run.roomIndex < run.roomsThisFloor - 1) {
    run.roomIndex += 1;
    resetRoomState(run);
    return 'next-room';
  }
  if (run.floor < FLOOR_COUNT) {
    run.floor += 1;
    enterFloor(run);
    return 'next-floor';
  }
  return 'run-complete';
}

export function applyDeath(run: RunState): 'retry' | 'game-over' {
  if (run.retriesLeft > 0) {
    run.retriesLeft -= 1;
    return 'retry';
  }
  return 'game-over';
}

export function noteSafeReveals(
  run: RunState, count: number, derivedFocusCap: number,
): { focusGained: number } {
  const before = run.safeRevealsThisRoom;
  run.safeRevealsThisRoom = before + count;
  if (run.classId !== 'diviner') return { focusGained: 0 };
  const crossed = Math.floor(run.safeRevealsThisRoom / 10) - Math.floor(before / 10);
  if (crossed <= 0) return { focusGained: 0 };
  const applied = Math.min(crossed, Math.max(0, derivedFocusCap - run.focus));
  run.focus += applied;
  return { focusGained: applied };
}

export function recordMineDefused(run: RunState): void {
  run.monstersDefused += 1;
}

export function applyRoomDebuff(run: RunState, stat: StatKey): void {
  run.roomDebuffs.push(stat);
}

export function applyHpLoss(run: RunState, amount: number): void {
  run.hp = Math.max(0, run.hp - amount);
}

export function isDead(run: RunState): boolean {
  return run.hp <= 0;
}

export function isBossRoom(run: RunState): boolean {
  return run.roomIndex === run.roomsThisFloor - 1;
}

export function isCheckpointRoom(run: RunState): boolean {
  return run.roomIndex === 0;
}

export function isFinalBoss(run: RunState): boolean {
  return run.floor === FLOOR_COUNT && isBossRoom(run);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- run.test`
Expected: PASS.

- [ ] **Step 5: Write the failing `runStore.ts` test**

`src/stores/runStore.test.ts`:

```ts
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
```

- [ ] **Step 6: Implement `src/stores/runStore.ts`**

```ts
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
```

- [ ] **Step 7: Run tests and type check**

Run: `npm test -- run.test runStore && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/run.ts src/lib/run.test.ts src/stores/runStore.ts src/stores/runStore.test.ts
git commit -m "feat: run progression logic and run store"
```

---

## Task 12: Derived stats

**Files:**
- Create: `src/lib/stats.ts`
- Test: `src/lib/stats.test.ts`

**Interfaces:**
- Consumes: `RunState`, `DerivedStats`, `RuleFlags`, `Item`, `StatKey` from `types.ts`; `DEFAULT_RULE_FLAGS` from `types.ts`.
- Produces:
  - `export function deriveStats(run: RunState): DerivedStats` — pure; never mutates `run`.
  - `export function equippedItems(run: RunState): Item[]` — non-null weapon, armor, trinkets in slot order.

- [ ] **Step 1: Write the failing tests**

`src/lib/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Item, RunState } from './types';
import { createRun, enterFloor } from './run';
import { deriveStats, equippedItems } from './stats';

const item = (over: Partial<Item>): Item => ({
  id: Math.random().toString(36), defId: 'd', name: 'n', slot: 'trinket', rarity: 'common', flavor: '', ...over,
});
const baseRun = (): RunState => {
  const r = createRun(1, 'sapper',
    item({ slot: 'weapon', defId: 'sappers-pick' }),
    item({ slot: 'armor', defId: 'blast-plating' }), 0);
  enterFloor(r);
  // strip default gear effects for a clean baseline in most tests
  r.equipped = { weapon: null, armor: null, trinkets: [null, null] };
  return r;
};

describe('deriveStats', () => {
  it('with no gear returns the class base stats', () => {
    const d = deriveStats(baseRun());
    expect(d).toMatchObject({ maxHp: 12, power: 4, guard: 3, focusCap: 3 });
    expect(d.rules).toEqual({ ...deriveStats(baseRun()).rules });
  });

  it('adds stat mods from every equipped slot', () => {
    const r = baseRun();
    r.equipped.weapon = item({ slot: 'weapon', statMods: [{ stat: 'power', amount: 2 }] });
    r.equipped.armor = item({ slot: 'armor', statMods: [{ stat: 'guard', amount: 3 }] });
    r.equipped.trinkets[0] = item({ statMods: [{ stat: 'focusCap', amount: 2 }] });
    r.equipped.trinkets[1] = item({ statMods: [{ stat: 'maxHp', amount: 1 }] });
    const d = deriveStats(r);
    expect(d.power).toBe(6);
    expect(d.guard).toBe(6);
    expect(d.focusCap).toBe(5);
    expect(d.maxHp).toBe(13);
  });

  it('ORs boolean rule flags and sums scryFocusDiscount', () => {
    const r = baseRun();
    r.equipped.trinkets[0] = item({ ruleFlags: { chordWithoutFlags: true, scryFocusDiscount: 1 } });
    r.equipped.trinkets[1] = item({ ruleFlags: { noFlagging: true, scryFocusDiscount: 1 } });
    const d = deriveStats(r);
    expect(d.rules.chordWithoutFlags).toBe(true);
    expect(d.rules.noFlagging).toBe(true);
    expect(d.rules.scryFocusDiscount).toBe(2);
  });

  it('applies room debuffs as -1 per entry, clamped', () => {
    const r = baseRun();
    r.roomDebuffs = ['power', 'power', 'guard'];
    const d = deriveStats(r);
    expect(d.power).toBe(2);
    expect(d.guard).toBe(2);
  });

  it('bloodpact adds +2 power only at or below half HP', () => {
    const r = baseRun();
    r.equipped.trinkets[0] = item({ ruleFlags: { bloodpact: true } });
    r.hp = 12;
    expect(deriveStats(r).power).toBe(4);
    r.hp = 6;
    expect(deriveStats(r).power).toBe(6);
  });

  it('does not mutate the run', () => {
    const r = baseRun();
    r.roomDebuffs = ['power'];
    const before = JSON.stringify(r);
    deriveStats(r);
    expect(JSON.stringify(r)).toBe(before);
  });
});

describe('equippedItems', () => {
  it('returns only the filled slots in order', () => {
    const r = baseRun();
    const w = item({ slot: 'weapon' });
    r.equipped.weapon = w;
    r.equipped.trinkets[1] = item({});
    expect(equippedItems(r)[0]).toBe(w);
    expect(equippedItems(r).length).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test -- stats`
Expected: FAIL — `Cannot find module './stats'`.

- [ ] **Step 3: Implement `src/lib/stats.ts`**

```ts
import type { DerivedStats, Item, RuleFlags, RunState } from './types';
import { DEFAULT_RULE_FLAGS } from './types';

export function equippedItems(run: RunState): Item[] {
  const e = run.equipped;
  return [e.weapon, e.armor, e.trinkets[0], e.trinkets[1]].filter((x): x is Item => x !== null);
}

export function deriveStats(run: RunState): DerivedStats {
  let maxHp = run.maxHp;
  let power = run.power;
  let guard = run.guard;
  let focusCap = run.focusCap;
  const rules: RuleFlags = { ...DEFAULT_RULE_FLAGS };

  for (const it of equippedItems(run)) {
    for (const m of it.statMods ?? []) {
      if (m.stat === 'power') power += m.amount;
      else if (m.stat === 'guard') guard += m.amount;
      else if (m.stat === 'maxHp') maxHp += m.amount;
      else if (m.stat === 'focusCap') focusCap += m.amount;
    }
    const rf = it.ruleFlags ?? {};
    for (const [k, v] of Object.entries(rf)) {
      if (k === 'scryFocusDiscount') rules.scryFocusDiscount += (v as number) ?? 0;
      else if (v) (rules as unknown as Record<string, boolean>)[k] = true;
    }
  }

  for (const stat of run.roomDebuffs) {
    if (stat === 'power') power -= 1;
    else if (stat === 'guard') guard -= 1;
    else if (stat === 'focus') focusCap -= 1;
    else if (stat === 'hp') maxHp -= 1;
  }

  power = Math.max(0, power);
  guard = Math.max(0, guard);
  focusCap = Math.max(0, focusCap);
  maxHp = Math.max(1, maxHp);

  if (rules.bloodpact && run.hp <= maxHp / 2) power += 2;

  return { maxHp, power, guard, focusCap, rules };
}
```

- [ ] **Step 4: Run tests and type check**

Run: `npm test -- stats && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts src/lib/stats.test.ts
git commit -m "feat: derived stats from base + gear + debuffs"
```

---

## Task 13: Combat engine

**Files:**
- Create: `src/lib/combat.ts`
- Test: `src/lib/combat.test.ts`

**Interfaces:**
- Consumes: `MonsterInstance`, `MonsterType`, `CombatState`, `CombatAction`, `CombatContext`, `CombatStepResult`, `FloorConfig`, `StatKey` from `types.ts`; `Rng` from `rng.ts`.
- Produces:
  - `export const NORMAL_ROUND_LIMIT = 3`
  - `export function monsterForTile(floor: FloorConfig, isBoss: boolean, rng: Rng): MonsterInstance`
  - `export function roundLimitFor(floor: FloorConfig, isBoss: boolean): number`
  - `export function startCombat(monster: MonsterInstance, roundLimit: number): CombatState`
  - `export function autoResolveIfApplicable(state: CombatState, ctx: CombatContext): CombatState | null` — returns a `win` state when `firstFightAutoWin && isFirstFightThisRoom`, else `null`.
  - `export function combatStep(state: CombatState, action: CombatAction, ctx: CombatContext): CombatStepResult`

- [ ] **Step 1: Write the failing tests**

`src/lib/combat.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { CombatContext, MonsterInstance } from './types';
import { DEFAULT_RULE_FLAGS } from './types';
import { createRng } from './rng';
import { getFloor } from '../content/floors';
import {
  monsterForTile, roundLimitFor, startCombat, combatStep, autoResolveIfApplicable,
  NORMAL_ROUND_LIMIT,
} from './combat';

// Default to diviner so the plain "threat - guard" timeout math is not shifted by
// the sapper -1 passive. Sapper-specific tests pass classId: 'sapper' explicitly.
const ctx = (over: Partial<CombatContext> = {}): CombatContext => ({
  power: 4, guard: 3, focus: 5, classId: 'diviner',
  rules: { ...DEFAULT_RULE_FLAGS },
  isFirstFightThisRoom: false,
  sapperFirstMineHandled: true,
  ...over,
});
const mon = (over: Partial<MonsterInstance> = {}): MonsterInstance => ({
  type: 'fast', threat: 5, pips: 1, maxPips: 1, isBoss: false, debuffStat: null, ...over,
});

describe('monsterForTile', () => {
  it('normal monster: threat/pips from the floor, pips in 1..2', () => {
    const f = getFloor(2);
    for (let s = 0; s < 20; s++) {
      const m = monsterForTile(f, false, createRng(s));
      expect(m.threat).toBe(f.monsterThreat);
      expect(m.pips).toBeGreaterThanOrEqual(1);
      expect(m.pips).toBeLessThanOrEqual(2);
      expect(['armored', 'fast', 'cursed']).toContain(m.type);
    }
  });

  it('boss monster: boss threat and boss pips', () => {
    const f = getFloor(4);
    const m = monsterForTile(f, true, createRng(1));
    expect(m.threat).toBe(f.bossThreat);
    expect(m.pips).toBe(f.bossPips);
    expect(m.isBoss).toBe(true);
  });

  it('cursed-type monster carries a pre-rolled debuff stat', () => {
    // force cursed by using a floor-like config with only cursed weight
    const f = { ...getFloor(1), monsterTypeWeights: { armored: 0, fast: 0, cursed: 1 } };
    const m = monsterForTile(f, false, createRng(3));
    expect(m.type).toBe('cursed');
    expect(['power', 'guard', 'focus']).toContain(m.debuffStat);
  });

  it('roundLimitFor: normal is 3, boss is the floor value', () => {
    expect(roundLimitFor(getFloor(1), false)).toBe(NORMAL_ROUND_LIMIT);
    expect(roundLimitFor(getFloor(4), true)).toBe(getFloor(4).bossRoundLimit);
  });
});

describe('combatStep — basic', () => {
  it('a single strike that clears the last pip wins with no HP loss', () => {
    const s = startCombat(mon({ pips: 1 }), 3);
    const r = combatStep(s, 'strike', ctx({ power: 4 }));
    expect(r.state.resolution).toBe('win');
    expect(r.state.hpLoss).toBe(0);
  });

  it('running out of rounds is a timeout costing max(1, threat - guard)', () => {
    let s = startCombat(mon({ type: 'fast', pips: 2, threat: 5 }), 2);
    s = combatStep(s, 'block', ctx({ guard: 3 })).state;
    const r = combatStep(s, 'block', ctx({ guard: 3 }));
    expect(r.state.resolution).toBe('timeout');
    expect(r.state.hpLoss).toBe(2);
  });

  it('timeout HP loss never drops below 1', () => {
    let s = startCombat(mon({ type: 'fast', pips: 5, threat: 3 }), 1);
    const r = combatStep(s, 'block', ctx({ guard: 99 }));
    expect(r.state.resolution).toBe('timeout');
    expect(r.state.hpLoss).toBe(1);
  });
});

describe('combatStep — monster types', () => {
  it('armored halves a strike until a Block breaks its poise', () => {
    // power 4 => base strike 1; armored halves to 0
    let s = startCombat(mon({ type: 'armored', pips: 1 }), 3);
    s = combatStep(s, 'strike', ctx({ power: 4 })).state;
    expect(s.monster.pips).toBe(1); // no progress
    s = combatStep(s, 'block', ctx()).state;
    const r = combatStep(s, 'strike', ctx({ power: 4 })); // poise broken -> full 1
    expect(r.state.resolution).toBe('win');
  });

  it('fast: Block is wasted (no focus from focusOnBlock)', () => {
    const s = startCombat(mon({ type: 'fast', pips: 2 }), 3);
    const r = combatStep(s, 'block', ctx({ rules: { ...DEFAULT_RULE_FLAGS, focusOnBlock: true } }));
    expect(r.focusGained).toBe(0);
  });

  it('cursed: an unblocked round pre-loads the room debuff', () => {
    const s = startCombat(mon({ type: 'cursed', pips: 3, debuffStat: 'power' }), 3);
    const r = combatStep(s, 'strike', ctx());
    expect(r.state.appliedDebuff).toBe('power');
  });

  it('cursed: a blocked round does not apply the debuff', () => {
    const s = startCombat(mon({ type: 'cursed', pips: 3, debuffStat: 'guard' }), 3);
    const r = combatStep(s, 'block', ctx());
    expect(r.state.appliedDebuff).toBeNull();
  });
});

describe('combatStep — class and item effects', () => {
  it('sapper first mine each room: timeout costs 0 and reports the free mine used', () => {
    let s = startCombat(mon({ type: 'fast', pips: 3, threat: 6 }), 1);
    const r = combatStep(s, 'block', ctx({ classId: 'sapper', sapperFirstMineHandled: false, guard: 2 }));
    expect(r.state.resolution).toBe('timeout');
    expect(r.state.hpLoss).toBe(0);
    expect(r.sapperFreeMineUsed).toBe(true);
  });

  it('sapper passive: subsequent timeouts cost one less', () => {
    let s = startCombat(mon({ type: 'fast', pips: 3, threat: 6 }), 1);
    const r = combatStep(s, 'block', ctx({ classId: 'sapper', sapperFirstMineHandled: true, guard: 2 }));
    // base = max(1, 6 - 2) = 4; sapper -1 => 3
    expect(r.state.hpLoss).toBe(3);
  });

  it('firstFightAutoWin resolves before any action', () => {
    const s = startCombat(mon({ pips: 2 }), 3);
    const auto = autoResolveIfApplicable(s, ctx({
      isFirstFightThisRoom: true,
      rules: { ...DEFAULT_RULE_FLAGS, firstFightAutoWin: true },
    }));
    expect(auto?.resolution).toBe('win');
    expect(autoResolveIfApplicable(s, ctx({ isFirstFightThisRoom: false }))).toBeNull();
  });

  it('strikeHitsAllPips clears a boss in one strike', () => {
    const s = startCombat(mon({ isBoss: true, pips: 6, maxPips: 6 }), 6);
    const r = combatStep(s, 'strike', ctx({
      rules: { ...DEFAULT_RULE_FLAGS, strikeHitsAllPips: true },
    }));
    expect(r.state.resolution).toBe('win');
  });

  it('diviner ability removes one pip and spends focus (2 minus discount)', () => {
    const s = startCombat(mon({ type: 'fast', pips: 2 }), 3);
    const r = combatStep(s, 'ability', ctx({
      classId: 'diviner', focus: 5,
      rules: { ...DEFAULT_RULE_FLAGS, scryFocusDiscount: 1 },
    }));
    expect(r.focusSpent).toBe(1);
    expect(r.state.monster.pips).toBe(1);
  });

  it('focusOnBlock grants 1 focus against a non-fast monster', () => {
    const s = startCombat(mon({ type: 'armored', pips: 3 }), 3);
    const r = combatStep(s, 'block', ctx({ rules: { ...DEFAULT_RULE_FLAGS, focusOnBlock: true } }));
    expect(r.focusGained).toBe(1);
  });

  it('a resolved fight ignores further steps', () => {
    let s = startCombat(mon({ pips: 1 }), 3);
    s = combatStep(s, 'strike', ctx()).state;
    const again = combatStep(s, 'strike', ctx());
    expect(again.state).toEqual(s);
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test -- combat.test`
Expected: FAIL — `Cannot find module './combat'`.

- [ ] **Step 3: Implement `src/lib/combat.ts`**

```ts
import type {
  CombatAction, CombatContext, CombatState, CombatStepResult,
  FloorConfig, MonsterInstance, MonsterType, StatKey,
} from './types';
import type { Rng } from './rng';

export const NORMAL_ROUND_LIMIT = 3;
const DEBUFF_STATS: StatKey[] = ['power', 'guard', 'focus'];

export function monsterForTile(floor: FloorConfig, isBoss: boolean, rng: Rng): MonsterInstance {
  const w = floor.monsterTypeWeights;
  const type = rng.weighted<MonsterType>([
    ['armored', w.armored],
    ['fast', w.fast],
    ['cursed', w.cursed],
  ]);
  const pips = isBoss ? floor.bossPips : rng.int(1, 2);
  return {
    type,
    threat: isBoss ? floor.bossThreat : floor.monsterThreat,
    pips,
    maxPips: pips,
    isBoss,
    debuffStat: type === 'cursed' ? rng.pick(DEBUFF_STATS) : null,
  };
}

export function roundLimitFor(floor: FloorConfig, isBoss: boolean): number {
  return isBoss ? floor.bossRoundLimit : NORMAL_ROUND_LIMIT;
}

export function startCombat(monster: MonsterInstance, roundLimit: number): CombatState {
  return {
    monster: { ...monster },
    round: 1,
    roundLimit,
    lastPlayerAction: null,
    log: [],
    resolution: 'ongoing',
    hpLoss: 0,
    appliedDebuff: null,
  };
}

export function autoResolveIfApplicable(state: CombatState, ctx: CombatContext): CombatState | null {
  if (ctx.rules.firstFightAutoWin && ctx.isFirstFightThisRoom) {
    return { ...state, monster: { ...state.monster, pips: 0 }, resolution: 'win', hpLoss: 0, log: ['auto-won'] };
  }
  return null;
}

function baseStrike(power: number, rules: CombatContext['rules']): number {
  if (rules.strikeHitsAllPips) return Number.POSITIVE_INFINITY;
  return power >= 8 ? 2 : 1;
}

function timeoutLoss(state: CombatState, ctx: CombatContext): { loss: number; freeMine: boolean } {
  if (ctx.rules.firstMineFree && ctx.isFirstFightThisRoom) return { loss: 0, freeMine: false };
  if (ctx.classId === 'sapper' && !ctx.sapperFirstMineHandled) return { loss: 0, freeMine: true };
  let loss = Math.max(1, state.monster.threat - ctx.guard);
  if (ctx.classId === 'sapper') loss = Math.max(1, loss - 1);
  return { loss, freeMine: false };
}

export function combatStep(
  state: CombatState, action: CombatAction, ctx: CombatContext,
): CombatStepResult {
  if (state.resolution !== 'ongoing') {
    return { state, focusSpent: 0, focusGained: 0, sapperFreeMineUsed: false };
  }

  const next: CombatState = {
    ...state,
    monster: { ...state.monster },
    log: [...state.log],
  };
  let focusSpent = 0;
  let focusGained = 0;
  let sapperFreeMineUsed = false;

  const poiseBroken = state.lastPlayerAction === 'block';

  if (action === 'strike') {
    let dmg = baseStrike(ctx.power, ctx.rules);
    if (next.monster.type === 'armored' && !poiseBroken && Number.isFinite(dmg)) {
      dmg = Math.floor(dmg / 2);
    }
    next.monster.pips = Math.max(0, next.monster.pips - dmg);
    next.log.push(`strike -${Number.isFinite(dmg) ? dmg : 'all'}`);
  } else if (action === 'block') {
    if (ctx.rules.focusOnBlock && next.monster.type !== 'fast') {
      focusGained = 1;
      next.log.push('block (+1 focus)');
    } else {
      next.log.push('block');
    }
  } else if (action === 'ability') {
    if (ctx.classId === 'diviner') {
      focusSpent = Math.max(0, 2 - ctx.rules.scryFocusDiscount);
      next.monster.pips = Math.max(0, next.monster.pips - 1);
      next.log.push('scry -1');
    } else {
      // sapper has no in-combat ability; treat as a wasted round
      next.log.push('no ability');
    }
  }

  // cursed monster loads its debuff on the first unblocked round
  if (next.monster.type === 'cursed' && action !== 'block' && next.appliedDebuff === null && next.monster.debuffStat) {
    next.appliedDebuff = next.monster.debuffStat;
  }

  next.lastPlayerAction = action;

  if (next.monster.pips <= 0) {
    next.resolution = 'win';
    next.hpLoss = 0;
  } else if (next.round >= next.roundLimit) {
    next.resolution = 'timeout';
    const { loss, freeMine } = timeoutLoss(next, ctx);
    next.hpLoss = loss;
    sapperFreeMineUsed = freeMine;
  } else {
    next.round += 1;
  }

  return { state: next, focusSpent, focusGained, sapperFreeMineUsed };
}
```

> **Note on `combatStep` immutability:** it returns a fresh `state` object (shallow-cloned with a cloned `monster` and `log`); it never mutates the input. Callers must use `result.state`, as the tests do.

- [ ] **Step 4: Run tests and type check**

Run: `npm test -- combat.test && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/combat.ts src/lib/combat.test.ts
git commit -m "feat: mine-hit combat engine"
```

---

## Task 14: Combat store and CombatModal

**Files:**
- Create: `src/stores/combatStore.ts`
- Create: `src/components/CombatModal.svelte`
- Test: `src/stores/combatStore.test.ts`
- Test: `src/components/CombatModal.test.ts`

**Interfaces:**
- Consumes: `startCombat`, `combatStep`, `autoResolveIfApplicable` from `combat.ts`; `CombatState`, `CombatContext`, `CombatAction`, `MonsterInstance` from `types.ts`; `getMonsterDef` from `content/monsters.ts`.
- Produces:
  - `src/stores/combatStore.ts`:
    - `export interface CombatSession { state: CombatState; ctx: CombatContext; focusSpent: number; focusGained: number; sapperFreeMineUsed: boolean; }`
    - `export const combatSession: Writable<CombatSession | null>`
    - `export function beginCombat(monster: MonsterInstance, roundLimit: number, ctx: CombatContext): void`
    - `export function act(action: CombatAction): void` — no-op if not ongoing; accumulates focus/flags.
    - `export function endCombat(): CombatSession | null` — returns the final session and clears the store.
    - `export function scryCost(ctx: CombatContext): number`
  - `CombatModal.svelte` props: `{ ondone: (session: CombatSession) => void }`. Renders monster name/type/threat, a pip track, Strike/Block/Scry buttons, round `n / limit`, and a live `power/guard/focus` readout. On resolution it swaps the buttons for an outcome line + a **Continue** button that calls `ondone(endCombat()!)`.

- [ ] **Step 1: Write the failing store test**

`src/stores/combatStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { CombatContext, MonsterInstance } from '../lib/types';
import { DEFAULT_RULE_FLAGS } from '../lib/types';
import { combatSession, beginCombat, act, endCombat, scryCost } from './combatStore';

const ctx: CombatContext = {
  power: 4, guard: 3, focus: 5, classId: 'diviner',
  rules: { ...DEFAULT_RULE_FLAGS }, isFirstFightThisRoom: false, sapperFirstMineHandled: true,
};
const mon = (o: Partial<MonsterInstance> = {}): MonsterInstance => ({
  type: 'fast', threat: 5, pips: 1, maxPips: 1, isBoss: false, debuffStat: null, ...o,
});

describe('combatStore', () => {
  beforeEach(() => { endCombat(); });

  it('beginCombat sets an ongoing session', () => {
    beginCombat(mon({ pips: 2 }), 3, ctx);
    expect(get(combatSession)!.state.resolution).toBe('ongoing');
    expect(get(combatSession)!.state.monster.pips).toBe(2);
  });

  it('beginCombat honours firstFightAutoWin', () => {
    beginCombat(mon({ pips: 2 }), 3, { ...ctx, isFirstFightThisRoom: true, rules: { ...DEFAULT_RULE_FLAGS, firstFightAutoWin: true } });
    expect(get(combatSession)!.state.resolution).toBe('win');
  });

  it('act advances rounds and accumulates focus spend', () => {
    beginCombat(mon({ type: 'fast', pips: 3 }), 5, ctx);
    act('ability'); // scry -1, spend 2
    act('ability'); // scry -1, spend 2
    const s = get(combatSession)!;
    expect(s.state.monster.pips).toBe(1);
    expect(s.focusSpent).toBe(4);
  });

  it('act is a no-op once resolved; endCombat returns and clears', () => {
    beginCombat(mon({ pips: 1 }), 3, ctx);
    act('strike');
    expect(get(combatSession)!.state.resolution).toBe('win');
    act('strike'); // ignored
    const final = endCombat();
    expect(final!.state.resolution).toBe('win');
    expect(get(combatSession)).toBeNull();
  });

  it('scryCost applies the discount and floors at 0', () => {
    expect(scryCost(ctx)).toBe(2);
    expect(scryCost({ ...ctx, rules: { ...DEFAULT_RULE_FLAGS, scryFocusDiscount: 3 } })).toBe(0);
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npm test -- combatStore`
Expected: FAIL — `Cannot find module './combatStore'`.

- [ ] **Step 3: Implement `src/stores/combatStore.ts`**

```ts
import { writable, get, type Writable } from 'svelte/store';
import type { CombatAction, CombatContext, MonsterInstance } from '../lib/types';
import { startCombat, combatStep, autoResolveIfApplicable } from '../lib/combat';
import type { CombatState } from '../lib/types';

export interface CombatSession {
  state: CombatState;
  ctx: CombatContext;
  focusSpent: number;
  focusGained: number;
  sapperFreeMineUsed: boolean;
}

export const combatSession: Writable<CombatSession | null> = writable(null);

export function scryCost(ctx: CombatContext): number {
  return Math.max(0, 2 - ctx.rules.scryFocusDiscount);
}

export function beginCombat(monster: MonsterInstance, roundLimit: number, ctx: CombatContext): void {
  const initial = startCombat(monster, roundLimit);
  const auto = autoResolveIfApplicable(initial, ctx);
  combatSession.set({
    state: auto ?? initial,
    ctx,
    focusSpent: 0,
    focusGained: 0,
    sapperFreeMineUsed: false,
  });
}

export function act(action: CombatAction): void {
  const s = get(combatSession);
  if (!s || s.state.resolution !== 'ongoing') return;
  const r = combatStep(s.state, action, s.ctx);
  combatSession.set({
    state: r.state,
    ctx: s.ctx,
    focusSpent: s.focusSpent + r.focusSpent,
    focusGained: s.focusGained + r.focusGained,
    sapperFreeMineUsed: s.sapperFreeMineUsed || r.sapperFreeMineUsed,
  });
}

export function endCombat(): CombatSession | null {
  const s = get(combatSession);
  combatSession.set(null);
  return s;
}
```

- [ ] **Step 4: Run the store test**

Run: `npm test -- combatStore`
Expected: PASS.

- [ ] **Step 5: Write the failing modal test**

`src/components/CombatModal.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { CombatContext } from '../lib/types';
import { DEFAULT_RULE_FLAGS } from '../lib/types';
import { beginCombat, endCombat } from '../stores/combatStore';
import CombatModal from './CombatModal.svelte';

const ctx: CombatContext = {
  power: 4, guard: 3, focus: 5, classId: 'diviner',
  rules: { ...DEFAULT_RULE_FLAGS }, isFirstFightThisRoom: false, sapperFirstMineHandled: true,
};

describe('CombatModal.svelte', () => {
  beforeEach(() => { endCombat(); });

  it('shows monster info and round counter, and resolves via Strike', async () => {
    beginCombat({ type: 'fast', threat: 5, pips: 1, maxPips: 1, isBoss: false, debuffStat: null }, 3, ctx);
    const ondone = vi.fn();
    render(CombatModal, { props: { ondone } });
    expect(screen.getByText(/round 1 \/ 3/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /strike/i }));
    expect(screen.getByText(/defused|victory|won/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(ondone).toHaveBeenCalledOnce();
    expect(ondone.mock.calls[0][0].state.resolution).toBe('win');
  });

  it('disables the Scry button for a sapper', async () => {
    beginCombat({ type: 'fast', threat: 5, pips: 2, maxPips: 2, isBoss: false, debuffStat: null }, 3,
      { ...ctx, classId: 'sapper' });
    render(CombatModal, { props: { ondone: vi.fn() } });
    expect(screen.getByRole('button', { name: /scry/i })).toBeDisabled();
  });

  it('disables Scry when the diviner cannot afford it', async () => {
    beginCombat({ type: 'fast', threat: 5, pips: 2, maxPips: 2, isBoss: false, debuffStat: null }, 3,
      { ...ctx, focus: 1 });
    render(CombatModal, { props: { ondone: vi.fn() } });
    expect(screen.getByRole('button', { name: /scry/i })).toBeDisabled();
  });
});
```

- [ ] **Step 6: Run it, expect failure**

Run: `npm test -- CombatModal`
Expected: FAIL — `Cannot find module './CombatModal.svelte'`.

- [ ] **Step 7: Implement `src/components/CombatModal.svelte`**

```svelte
<script lang="ts">
  import { combatSession, act, endCombat, scryCost, type CombatSession } from '../stores/combatStore';
  import { getMonsterDef } from '../content/monsters';

  let { ondone }: { ondone: (session: CombatSession) => void } = $props();

  const session = $derived($combatSession);
  const monster = $derived(session?.state.monster ?? null);
  const def = $derived(monster ? getMonsterDef(monster.type) : null);

  const abilityDisabled = $derived.by(() => {
    if (!session) return true;
    if (session.state.resolution !== 'ongoing') return true;
    if (session.ctx.classId === 'sapper') return true;
    return session.ctx.focus - session.focusSpent < scryCost(session.ctx);
  });

  function outcomeText(): string {
    if (!session) return '';
    if (session.state.resolution === 'win') return 'Monster defused.';
    if (session.state.resolution === 'timeout') {
      return session.state.hpLoss === 0
        ? 'It slips loose — but you take no hit.'
        : `It slips loose. You take ${session.state.hpLoss} damage.`;
    }
    return '';
  }

  function done() {
    ondone(endCombat()!);
  }
</script>

{#if session && monster && def}
  <div class="scrim" role="dialog" aria-modal="true" aria-label="Combat">
    <div class="modal">
      <header>
        <strong>{def.name}</strong>
        <span class="type">{monster.type}{monster.isBoss ? ' · BOSS' : ''}</span>
        <span class="threat">threat {monster.threat}</span>
      </header>

      <div class="pips" aria-label={`${monster.pips} of ${monster.maxPips} pips left`}>
        {#each Array(monster.maxPips) as _, i (i)}
          <span class="pip" class:spent={i >= monster.pips}></span>
        {/each}
      </div>

      <p class="round">round {session.state.round} / {session.state.roundLimit}</p>

      {#if session.state.resolution === 'ongoing'}
        <div class="actions">
          <button type="button" onclick={() => act('strike')}>Strike</button>
          <button type="button" onclick={() => act('block')}>Block</button>
          <button type="button" onclick={() => act('ability')} disabled={abilityDisabled}>
            Scry ({scryCost(session.ctx)})
          </button>
        </div>
      {:else}
        <p class="outcome">{outcomeText()}</p>
        <button type="button" onclick={done}>Continue</button>
      {/if}

      <footer class="readout">
        power {session.ctx.power} · guard {session.ctx.guard} ·
        focus {session.ctx.focus - session.focusSpent}
      </footer>
    </div>
  </div>
{/if}

<style>
  .scrim { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: grid; place-items: center; z-index: 50; }
  .modal { background: var(--panel); padding: 1.25rem; border-radius: 8px; width: min(420px, 92vw); }
  header { display: flex; gap: .5rem; align-items: baseline; }
  .type { color: var(--muted); text-transform: capitalize; }
  .threat { margin-left: auto; color: var(--muted); }
  .pips { display: flex; gap: 6px; margin: .75rem 0; }
  .pip { width: 22px; height: 22px; border-radius: 50%; background: var(--danger); }
  .pip.spent { background: #333; }
  .round { color: var(--muted); }
  .actions { display: flex; gap: .5rem; }
  .actions button, .outcome + button { padding: .5rem .9rem; }
  .readout { margin-top: .75rem; color: var(--muted); font-size: .85em; }
</style>
```

- [ ] **Step 8: Run tests and type check**

Run: `npm test -- CombatModal combatStore && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: combat store and combat modal"
```

---

## Task 15: Item content and effect resolution

**Files:**
- Create: `src/content/items.ts`
- Create: `src/lib/items.ts`
- Test: `src/content/items.test.ts`
- Test: `src/lib/items.test.ts`

**Interfaces:**
- Consumes: `ItemDef`, `Item`, `RunState`, `Rarity` from `types.ts`; `Rng` from `rng.ts`; `equippedItems` from `stats.ts`.
- Produces (`content/items.ts`):
  - `export const ALL_ITEM_DEFS: readonly ItemDef[]` (25 entries)
  - `export function getItemDef(defId: string): ItemDef` — throws on unknown.
- Produces (`lib/items.ts`):
  - `export function makeItem(defId: string, rng: Rng): Item` — fresh instance id, deep-copied arrays.
  - `export function rollRewards(floorId: number, isBoss: boolean, rng: Rng, count?: number): ItemDef[]` — `count` defaults to 3; returns distinct defs; boss and deeper floors weight toward `rare`/`cursed`.
  - `export function onRoomStartRevealCount(run: RunState): number` — count of random safe tiles to auto-reveal (Cartographer's Eye).
  - `export function onSafeRevealFocus(run: RunState, rng: Rng): number` — focus to grant this reveal (Seer's Thread).
  - `export function postCombatHpCost(run: RunState): number` — flat HP paid after each fight (Reaper Edge).
  - `export function onRoomClearHeal(run: RunState): number` — HP healed on room clear (Quick Salve).
  - `export function hasLuckyCoin(run: RunState): boolean`

- [ ] **Step 1: Write the failing content test**

`src/content/items.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ALL_ITEM_DEFS, getItemDef } from './items';

describe('item content', () => {
  it('has at least 24 defs with unique ids and valid slots/rarities', () => {
    expect(ALL_ITEM_DEFS.length).toBeGreaterThanOrEqual(24);
    const ids = ALL_ITEM_DEFS.map((d) => d.defId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of ALL_ITEM_DEFS) {
      expect(['weapon', 'armor', 'trinket']).toContain(d.slot);
      expect(['common', 'rare', 'cursed']).toContain(d.rarity);
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.flavor.length).toBeGreaterThan(0);
    }
  });

  it('includes the class starting gear ids', () => {
    for (const id of ['sappers-pick', 'blast-plating', 'divining-rod', 'plain-robe']) {
      expect(getItemDef(id).defId).toBe(id);
    }
  });

  it('every cursed item has both an upside and a drawback', () => {
    for (const d of ALL_ITEM_DEFS.filter((x) => x.rarity === 'cursed')) {
      const mods = d.statMods ?? [];
      const flags = d.ruleFlags ?? {};
      const hasUpside = mods.some((m) => m.amount > 0) || 'strikeHitsAllPips' in flags || 'firstFightAutoWin' in flags || 'bloodpact' in flags;
      const hasDrawback = mods.some((m) => m.amount < 0) || 'noFlagging' in flags || 'numbersSometimesLie' in flags;
      expect(hasUpside && hasDrawback).toBe(true);
    }
  });

  it('getItemDef throws on an unknown id', () => {
    expect(() => getItemDef('nope')).toThrow();
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npm test -- content/items`
Expected: FAIL — `Cannot find module './items'`.

- [ ] **Step 3: Implement `src/content/items.ts`**

```ts
import type { ItemDef } from '../lib/types';

export const ALL_ITEM_DEFS: readonly ItemDef[] = [
  // ---- weapons ----
  { defId: 'sappers-pick', name: "Sapper's Pick", slot: 'weapon', rarity: 'common',
    flavor: 'Heavy where it counts.', statMods: [{ stat: 'power', amount: 2 }] },
  { defId: 'divining-rod', name: 'Divining Rod', slot: 'weapon', rarity: 'common',
    flavor: 'It twitches toward trouble.', ruleFlags: { scryFocusDiscount: 1 } },
  { defId: 'gravedigger', name: 'Gravedigger', slot: 'weapon', rarity: 'common',
    flavor: 'Blunt, honest work.', statMods: [{ stat: 'power', amount: 1 }] },
  { defId: 'iron-maul', name: 'Iron Maul', slot: 'weapon', rarity: 'rare',
    flavor: 'Swung, not aimed.', statMods: [{ stat: 'power', amount: 3 }] },
  { defId: 'whisper-knife', name: 'Whisper Knife', slot: 'weapon', rarity: 'rare',
    flavor: 'Rewards a patient guard.', statMods: [{ stat: 'power', amount: 1 }], ruleFlags: { focusOnBlock: true } },
  { defId: 'reaper-edge', name: 'Reaper Edge', slot: 'weapon', rarity: 'cursed',
    flavor: 'It finishes fights and takes its cut.', ruleFlags: { strikeHitsAllPips: true },
    statMods: [{ stat: 'maxHp', amount: -1 }], hooks: ['onCombatRound'] },

  // ---- armor ----
  { defId: 'blast-plating', name: 'Blast Plating', slot: 'armor', rarity: 'common',
    flavor: 'Built for the worst day.', statMods: [{ stat: 'guard', amount: 3 }] },
  { defId: 'plain-robe', name: 'Plain Robe', slot: 'armor', rarity: 'common',
    flavor: 'It is, at least, yours.' },
  { defId: 'scale-vest', name: 'Scale Vest', slot: 'armor', rarity: 'common',
    flavor: 'Old scales, still stubborn.', statMods: [{ stat: 'guard', amount: 2 }] },
  { defId: 'ember-cloak', name: 'Ember Cloak', slot: 'armor', rarity: 'rare',
    flavor: 'The heat forgets you.', statMods: [{ stat: 'guard', amount: 1 }], ruleFlags: { immuneEmberRecover: true } },
  { defId: 'padded-plate', name: 'Padded Plate', slot: 'armor', rarity: 'rare',
    flavor: 'The first blow always lands soft.', statMods: [{ stat: 'guard', amount: 1 }], ruleFlags: { firstMineFree: true } },
  { defId: 'wardweave', name: 'Wardweave', slot: 'armor', rarity: 'rare',
    flavor: 'Threads that drink the dark.', statMods: [{ stat: 'guard', amount: 1 }], ruleFlags: { focusOnBlock: true } },
  { defId: 'cursed-aegis', name: 'Cursed Aegis', slot: 'armor', rarity: 'cursed',
    flavor: 'It eats the first monster and lies to you about the rest.',
    ruleFlags: { firstFightAutoWin: true, numbersSometimesLie: true } },

  // ---- trinkets ----
  { defId: 'flaggers-charm', name: "Flagger's Charm", slot: 'trinket', rarity: 'common',
    flavor: 'Marks tell you their secrets.', ruleFlags: { revealNumberOnFlag: true } },
  { defId: 'focus-battery', name: 'Focus Battery', slot: 'trinket', rarity: 'common',
    flavor: 'Holds more than it should.', statMods: [{ stat: 'focusCap', amount: 2 }] },
  { defId: 'steady-hand', name: 'Steady Hand', slot: 'trinket', rarity: 'common',
    flavor: 'No need to plant a flag you already trust.', ruleFlags: { chordWithoutFlags: true } },
  { defId: 'emberward-totem', name: 'Emberward Totem', slot: 'trinket', rarity: 'common',
    flavor: 'A small cold spot in your pocket.', ruleFlags: { immuneEmberRecover: true } },
  { defId: 'focusing-lens', name: 'Focusing Lens', slot: 'trinket', rarity: 'common',
    flavor: 'Sharpens more than sight.', statMods: [{ stat: 'focusCap', amount: 1 }, { stat: 'power', amount: 1 }] },
  { defId: 'vital-charm', name: 'Vital Charm', slot: 'trinket', rarity: 'common',
    flavor: 'A steadier heartbeat.', statMods: [{ stat: 'maxHp', amount: 3 }] },
  { defId: 'lucky-coin', name: 'Lucky Coin', slot: 'trinket', rarity: 'rare',
    flavor: 'The first find of each floor comes doubled.', ruleFlags: { luckyCoin: true } },
  { defId: 'cartographers-eye', name: "Cartographer's Eye", slot: 'trinket', rarity: 'rare',
    flavor: 'One tile always draws itself first.', hooks: ['onRoomStart'] },
  { defId: 'seers-thread', name: "Seer's Thread", slot: 'trinket', rarity: 'rare',
    flavor: 'Every safe step feeds it.', statMods: [{ stat: 'focusCap', amount: 1 }], hooks: ['onSafeReveal'] },
  { defId: 'quick-salve', name: 'Quick Salve', slot: 'trinket', rarity: 'rare',
    flavor: 'Patch up between rooms.', hooks: ['onRoomClear'] },
  { defId: 'bloodpact-ring', name: 'Bloodpact Ring', slot: 'trinket', rarity: 'cursed',
    flavor: 'Strongest when you can least afford it.', statMods: [{ stat: 'maxHp', amount: -2 }], ruleFlags: { bloodpact: true } },
  { defId: 'gamblers-die', name: "Gambler's Die", slot: 'trinket', rarity: 'cursed',
    flavor: 'All edge, no caution — you cannot flag.', statMods: [{ stat: 'power', amount: 3 }], ruleFlags: { noFlagging: true } },
];

const BY_ID = new Map(ALL_ITEM_DEFS.map((d) => [d.defId, d]));

export function getItemDef(defId: string): ItemDef {
  const d = BY_ID.get(defId);
  if (!d) throw new Error(`unknown item def: ${defId}`);
  return d;
}
```

- [ ] **Step 4: Run the content test**

Run: `npm test -- content/items`
Expected: PASS.

- [ ] **Step 5: Write the failing `lib/items.ts` test**

`src/lib/items.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Item, RunState } from './types';
import { createRun, enterFloor } from './run';
import { createRng } from './rng';
import {
  makeItem, rollRewards, onRoomStartRevealCount, onSafeRevealFocus,
  postCombatHpCost, onRoomClearHeal, hasLuckyCoin,
} from './items';

function runWith(trinket?: string): RunState {
  const r = createRun(1, 'sapper',
    makeItem('sappers-pick', createRng(1)),
    makeItem('blast-plating', createRng(2)), 0);
  enterFloor(r);
  if (trinket) r.equipped.trinkets[0] = makeItem(trinket, createRng(9));
  return r;
}

describe('makeItem', () => {
  it('copies the def and assigns a unique instance id', () => {
    const a = makeItem('iron-maul', createRng(1));
    const b = makeItem('iron-maul', createRng(2));
    expect(a.defId).toBe('iron-maul');
    expect(a.name).toBe('Iron Maul');
    expect(a.id).not.toBe(b.id);
    a.statMods![0]!.amount = 99;
    expect(makeItem('iron-maul', createRng(3)).statMods![0]!.amount).toBe(3); // def untouched
  });
});

describe('rollRewards', () => {
  it('returns the requested number of distinct defs', () => {
    const defs = rollRewards(1, false, createRng(5), 3);
    expect(defs.length).toBe(3);
    expect(new Set(defs.map((d) => d.defId)).size).toBe(3);
  });

  it('boss draws lean richer than floor-1 normal draws', () => {
    const score = (rarity: string) => (rarity === 'cursed' ? 2 : rarity === 'rare' ? 1 : 0);
    let normal = 0, boss = 0;
    for (let s = 0; s < 200; s++) {
      normal += rollRewards(1, false, createRng(s), 3).reduce((a, d) => a + score(d.rarity), 0);
      boss += rollRewards(1, true, createRng(s), 3).reduce((a, d) => a + score(d.rarity), 0);
    }
    expect(boss).toBeGreaterThan(normal);
  });
});

describe('equipped-item hooks', () => {
  it('Cartographer\'s Eye asks for one room-start reveal', () => {
    expect(onRoomStartRevealCount(runWith())).toBe(0);
    expect(onRoomStartRevealCount(runWith('cartographers-eye'))).toBe(1);
  });

  it('Seer\'s Thread sometimes grants focus on a safe reveal', () => {
    const r = runWith('seers-thread');
    let gained = 0;
    const rng = createRng(3);
    for (let i = 0; i < 100; i++) gained += onSafeRevealFocus(r, rng);
    expect(gained).toBeGreaterThan(0);
    expect(onSafeRevealFocus(runWith(), createRng(1))).toBe(0);
  });

  it('Reaper Edge charges 2 HP after each fight', () => {
    const r = runWith();
    r.equipped.weapon = makeItem('reaper-edge', createRng(1));
    expect(postCombatHpCost(r)).toBe(2);
    expect(postCombatHpCost(runWith())).toBe(0);
  });

  it('Quick Salve heals 2 on room clear', () => {
    expect(onRoomClearHeal(runWith('quick-salve'))).toBe(2);
    expect(onRoomClearHeal(runWith())).toBe(0);
  });

  it('hasLuckyCoin reflects the equipped trinket', () => {
    expect(hasLuckyCoin(runWith('lucky-coin'))).toBe(true);
    expect(hasLuckyCoin(runWith())).toBe(false);
  });
});
```

- [ ] **Step 6: Run it, expect failure**

Run: `npm test -- lib/items`
Expected: FAIL — `Cannot find module './items'`.

- [ ] **Step 7: Implement `src/lib/items.ts`**

```ts
import type { Item, ItemDef, Rarity, RunState } from './types';
import type { Rng } from './rng';
import { ALL_ITEM_DEFS, getItemDef } from '../content/items';
import { equippedItems } from './stats';

let counter = 0;

export function makeItem(defId: string, rng: Rng): Item {
  const def = getItemDef(defId);
  counter += 1;
  return {
    ...def,
    id: `${defId}-${rng.int(0, 0xffffff).toString(36)}-${counter}`,
    statMods: def.statMods ? def.statMods.map((m) => ({ ...m })) : undefined,
    ruleFlags: def.ruleFlags ? { ...def.ruleFlags } : undefined,
    hooks: def.hooks ? [...def.hooks] : undefined,
  };
}

function rarityWeights(floorId: number, isBoss: boolean): Record<Rarity, number> {
  if (isBoss) return { common: 20, rare: 45, cursed: 35 };
  const depth = Math.max(0, floorId - 1);
  return { common: 60 - depth * 6, rare: 28 + depth * 3, cursed: 12 + depth * 3 };
}

export function rollRewards(floorId: number, isBoss: boolean, rng: Rng, count = 3): ItemDef[] {
  const weights = rarityWeights(floorId, isBoss);
  const pool = [...ALL_ITEM_DEFS];
  const out: ItemDef[] = [];
  while (out.length < count && pool.length > 0) {
    const targetRarity = rng.weighted<Rarity>([
      ['common', weights.common],
      ['rare', weights.rare],
      ['cursed', weights.cursed],
    ]);
    let idx = pool.findIndex((d) => d.rarity === targetRarity);
    if (idx < 0) idx = 0; // pool exhausted of that rarity — take anything
    out.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return out;
}

function hasFlag(run: RunState, flag: keyof NonNullable<ItemDef['ruleFlags']>): boolean {
  return equippedItems(run).some((i) => Boolean(i.ruleFlags?.[flag]));
}
function hasDef(run: RunState, defId: string): boolean {
  return equippedItems(run).some((i) => i.defId === defId);
}

export function onRoomStartRevealCount(run: RunState): number {
  return hasDef(run, 'cartographers-eye') ? 1 : 0;
}

export function onSafeRevealFocus(run: RunState, rng: Rng): number {
  if (!hasDef(run, 'seers-thread')) return 0;
  return rng.chance(0.12) ? 1 : 0;
}

export function postCombatHpCost(run: RunState): number {
  return hasDef(run, 'reaper-edge') ? 2 : 0;
}

export function onRoomClearHeal(run: RunState): number {
  return hasDef(run, 'quick-salve') ? 2 : 0;
}

export function hasLuckyCoin(run: RunState): boolean {
  return hasFlag(run, 'luckyCoin');
}

export { getItemDef, ALL_ITEM_DEFS };
```

- [ ] **Step 8: Run tests and type check**

Run: `npm test -- items && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 9: Commit**

```bash
git add src/content/items.ts src/lib/items.ts src/content/items.test.ts src/lib/items.test.ts
git commit -m "feat: item content and equipped-item effect resolution"
```

---

## Task 16: Inventory logic, InventoryPanel, DropChoiceModal

**Files:**
- Create: `src/lib/inventory.ts`
- Create: `src/lib/itemText.ts` (shared effect-summary helper for UI)
- Create: `src/components/InventoryPanel.svelte`
- Create: `src/components/DropChoiceModal.svelte`
- Test: `src/lib/inventory.test.ts`
- Test: `src/lib/itemText.test.ts`
- Test: `src/components/InventoryPanel.test.ts`

**Interfaces:**
- Consumes: `RunState`, `Item`, `Slot` from `types.ts`; `createRun`, `enterFloor` from `run.ts`; `makeItem` from `items.ts`; `patchRun`, `runState` from `runStore.ts`; `deriveStats` from `stats.ts`.
- Produces (`inventory.ts`):
  - `export const INVENTORY_CAP = 8`
  - `export function addToInventory(run: RunState, item: Item): 'ok' | 'full'`
  - `export function equipFromInventory(run: RunState, itemId: string, trinketIndex?: 0 | 1): boolean`
  - `export function unequip(run: RunState, slot: Slot, trinketIndex?: 0 | 1): 'ok' | 'full'`
  - `export function dropFromInventory(run: RunState, itemId: string): boolean`
  - `export function resolvePickupAtCap(run: RunState, incoming: Item, dropId: string): void` — `dropId === incoming.id` discards the pickup; otherwise drops that inventory item and stores `incoming`.
- Produces (`itemText.ts`):
  - `export function itemEffectText(item: Item): string`
- Produces components:
  - `InventoryPanel.svelte` props `{ open: boolean; onclose: () => void }` — slide-over; equipped slot strip with **Unequip**, inventory grid with **Equip** / **Drop**, each showing `itemEffectText`.
  - `DropChoiceModal.svelte` props `{ incoming: Item; onresolve: (dropId: string) => void }` — lists inventory items + the incoming item as buttons.

- [ ] **Step 1: Write the failing `inventory.ts` tests**

`src/lib/inventory.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { RunState } from './types';
import { createRun, enterFloor } from './run';
import { createRng } from './rng';
import { makeItem } from './items';
import {
  INVENTORY_CAP, addToInventory, equipFromInventory, unequip,
  dropFromInventory, resolvePickupAtCap,
} from './inventory';

let n = 0;
const item = (defId: string) => makeItem(defId, createRng(++n));
const mkRun = (): RunState => {
  const r = createRun(1, 'sapper', item('sappers-pick'), item('blast-plating'), 0);
  enterFloor(r);
  return r;
};

describe('addToInventory', () => {
  it('stores up to the cap then reports full', () => {
    const r = mkRun();
    for (let i = 0; i < INVENTORY_CAP; i++) expect(addToInventory(r, item('gravedigger'))).toBe('ok');
    expect(r.inventory.length).toBe(INVENTORY_CAP);
    expect(addToInventory(r, item('gravedigger'))).toBe('full');
    expect(r.inventory.length).toBe(INVENTORY_CAP);
  });
});

describe('equipFromInventory', () => {
  it('swaps the weapon slot and returns the old weapon to inventory', () => {
    const r = mkRun();
    const maul = item('iron-maul');
    addToInventory(r, maul);
    const oldWeapon = r.equipped.weapon!;
    expect(equipFromInventory(r, maul.id)).toBe(true);
    expect(r.equipped.weapon!.id).toBe(maul.id);
    expect(r.inventory.map((i) => i.id)).toContain(oldWeapon.id);
    expect(r.inventory.map((i) => i.id)).not.toContain(maul.id);
  });

  it('fills the first empty trinket slot, or the requested one', () => {
    const r = mkRun();
    const a = item('lucky-coin'); const b = item('focus-battery');
    addToInventory(r, a); addToInventory(r, b);
    expect(equipFromInventory(r, a.id)).toBe(true);
    expect(r.equipped.trinkets[0]!.id).toBe(a.id);
    expect(equipFromInventory(r, b.id, 1)).toBe(true);
    expect(r.equipped.trinkets[1]!.id).toBe(b.id);
  });

  it('returns false for an unknown id', () => {
    expect(equipFromInventory(mkRun(), 'ghost')).toBe(false);
  });
});

describe('unequip', () => {
  it('moves a slot item to inventory, or refuses when full', () => {
    const r = mkRun();
    expect(unequip(r, 'weapon')).toBe('ok');
    expect(r.equipped.weapon).toBeNull();
    expect(r.inventory.length).toBe(1);
    while (r.inventory.length < INVENTORY_CAP) addToInventory(r, item('gravedigger'));
    expect(unequip(r, 'armor')).toBe('full');
    expect(r.equipped.armor).not.toBeNull();
  });
});

describe('dropFromInventory & resolvePickupAtCap', () => {
  it('drops by id', () => {
    const r = mkRun();
    const g = item('gravedigger');
    addToInventory(r, g);
    expect(dropFromInventory(r, g.id)).toBe(true);
    expect(r.inventory.length).toBe(0);
  });

  it('discards the pickup when dropId is the incoming id', () => {
    const r = mkRun();
    while (r.inventory.length < INVENTORY_CAP) addToInventory(r, item('gravedigger'));
    const incoming = item('iron-maul');
    resolvePickupAtCap(r, incoming, incoming.id);
    expect(r.inventory.map((i) => i.id)).not.toContain(incoming.id);
    expect(r.inventory.length).toBe(INVENTORY_CAP);
  });

  it('drops the chosen item and stores the pickup', () => {
    const r = mkRun();
    const first = item('gravedigger');
    addToInventory(r, first);
    while (r.inventory.length < INVENTORY_CAP) addToInventory(r, item('gravedigger'));
    const incoming = item('iron-maul');
    resolvePickupAtCap(r, incoming, first.id);
    expect(r.inventory.map((i) => i.id)).not.toContain(first.id);
    expect(r.inventory.map((i) => i.id)).toContain(incoming.id);
    expect(r.inventory.length).toBe(INVENTORY_CAP);
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npm test -- inventory`
Expected: FAIL — `Cannot find module './inventory'`.

- [ ] **Step 3: Implement `src/lib/inventory.ts`**

```ts
import type { Item, RunState, Slot } from './types';

export const INVENTORY_CAP = 8;

export function addToInventory(run: RunState, item: Item): 'ok' | 'full' {
  if (run.inventory.length >= INVENTORY_CAP) return 'full';
  run.inventory.push(item);
  return 'ok';
}

export function dropFromInventory(run: RunState, itemId: string): boolean {
  const i = run.inventory.findIndex((x) => x.id === itemId);
  if (i < 0) return false;
  run.inventory.splice(i, 1);
  return true;
}

export function equipFromInventory(run: RunState, itemId: string, trinketIndex?: 0 | 1): boolean {
  const idx = run.inventory.findIndex((x) => x.id === itemId);
  if (idx < 0) return false;
  const [item] = run.inventory.splice(idx, 1);
  if (!item) return false;

  let displaced: Item | null = null;
  if (item.slot === 'weapon') {
    displaced = run.equipped.weapon;
    run.equipped.weapon = item;
  } else if (item.slot === 'armor') {
    displaced = run.equipped.armor;
    run.equipped.armor = item;
  } else {
    const slot: 0 | 1 = trinketIndex ?? (run.equipped.trinkets[0] === null ? 0 : run.equipped.trinkets[1] === null ? 1 : 0);
    displaced = run.equipped.trinkets[slot];
    run.equipped.trinkets[slot] = item;
  }
  if (displaced) run.inventory.push(displaced); // net zero — always fits
  return true;
}

export function unequip(run: RunState, slot: Slot, trinketIndex?: 0 | 1): 'ok' | 'full' {
  if (run.inventory.length >= INVENTORY_CAP) return 'full';
  if (slot === 'weapon') {
    if (run.equipped.weapon) { run.inventory.push(run.equipped.weapon); run.equipped.weapon = null; }
  } else if (slot === 'armor') {
    if (run.equipped.armor) { run.inventory.push(run.equipped.armor); run.equipped.armor = null; }
  } else {
    const s: 0 | 1 = trinketIndex ?? 0;
    const it = run.equipped.trinkets[s];
    if (it) { run.inventory.push(it); run.equipped.trinkets[s] = null; }
  }
  return 'ok';
}

export function resolvePickupAtCap(run: RunState, incoming: Item, dropId: string): void {
  if (dropId === incoming.id) return; // discard the pickup
  if (dropFromInventory(run, dropId)) run.inventory.push(incoming);
}
```

- [ ] **Step 4: Run the inventory test**

Run: `npm test -- inventory`
Expected: PASS.

- [ ] **Step 5: Write the failing `itemText.ts` test**

`src/lib/itemText.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { makeItem } from './items';
import { itemEffectText } from './itemText';

describe('itemEffectText', () => {
  it('summarises stat mods', () => {
    expect(itemEffectText(makeItem('iron-maul', createRng(1)))).toMatch(/\+3 Power/i);
  });
  it('summarises rule flags in plain language', () => {
    expect(itemEffectText(makeItem('gamblers-die', createRng(1)))).toMatch(/cannot flag/i);
    expect(itemEffectText(makeItem('divining-rod', createRng(1)))).toMatch(/scry/i);
  });
  it('falls back to a dash for an effectless item', () => {
    expect(itemEffectText(makeItem('plain-robe', createRng(1)))).toBe('—');
  });
});
```

- [ ] **Step 6: Implement `src/lib/itemText.ts`**

```ts
import type { Item } from './types';

const FLAG_TEXT: Record<string, string> = {
  firstMineFree: 'first fight each room costs no HP',
  chordWithoutFlags: 'chord without planting flags',
  revealNumberOnFlag: 'flagging peeks the number',
  noFlagging: 'you cannot flag',
  immuneEmberRecover: 'embers never re-cover',
  numbersSometimesLie: 'some numbers lie',
  strikeHitsAllPips: 'Strike hits every pip',
  firstFightAutoWin: 'first fight each room auto-wins',
  focusOnBlock: '+1 Focus when you Block',
  luckyCoin: 'first cache each floor is doubled',
  bloodpact: '+2 Power at half HP or below',
};
const STAT_LABEL: Record<string, string> = {
  power: 'Power', guard: 'Guard', maxHp: 'Max HP', focusCap: 'Focus cap',
};

export function itemEffectText(item: Item): string {
  const parts: string[] = [];
  for (const m of item.statMods ?? []) {
    parts.push(`${m.amount >= 0 ? '+' : ''}${m.amount} ${STAT_LABEL[m.stat] ?? m.stat}`);
  }
  for (const [k, v] of Object.entries(item.ruleFlags ?? {})) {
    if (k === 'scryFocusDiscount') { if ((v as number) > 0) parts.push(`Scry costs ${v} less Focus`); }
    else if (v) parts.push(FLAG_TEXT[k] ?? k);
  }
  return parts.length ? parts.join('; ') : '—';
}
```

- [ ] **Step 7: Write the failing InventoryPanel test**

`src/components/InventoryPanel.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import { createRun, enterFloor } from '../lib/run';
import { createRng } from '../lib/rng';
import { makeItem } from '../lib/items';
import { addToInventory } from '../lib/inventory';
import { runState, setRun } from '../stores/runStore';
import InventoryPanel from './InventoryPanel.svelte';

let n = 0;
const item = (d: string) => makeItem(d, createRng(++n));

describe('InventoryPanel.svelte', () => {
  beforeEach(() => {
    const r = createRun(1, 'sapper', item('sappers-pick'), item('blast-plating'), 0);
    enterFloor(r);
    addToInventory(r, item('iron-maul'));
    setRun(r);
  });

  it('lists inventory items with their effect text and equips on click', async () => {
    render(InventoryPanel, { props: { open: true, onclose: vi.fn() } });
    expect(screen.getByText('Iron Maul')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /equip iron maul/i }));
    expect(get(runState)!.equipped.weapon!.defId).toBe('iron-maul');
  });

  it('unequips a slot back to inventory', async () => {
    render(InventoryPanel, { props: { open: true, onclose: vi.fn() } });
    await userEvent.click(screen.getByRole('button', { name: /unequip weapon/i }));
    expect(get(runState)!.equipped.weapon).toBeNull();
  });

  it('drops an inventory item', async () => {
    render(InventoryPanel, { props: { open: true, onclose: vi.fn() } });
    await userEvent.click(screen.getByRole('button', { name: /drop iron maul/i }));
    expect(get(runState)!.inventory.find((i) => i.defId === 'iron-maul')).toBeUndefined();
  });
});
```

- [ ] **Step 8: Implement the two components**

`src/components/DropChoiceModal.svelte`:

```svelte
<script lang="ts">
  import type { Item } from '../lib/types';
  import { itemEffectText } from '../lib/itemText';

  let { incoming, onresolve }: { incoming: Item; onresolve: (dropId: string) => void } = $props();
  import { runState } from '../stores/runStore';
  const inv = $derived($runState?.inventory ?? []);
</script>

<div class="scrim" role="dialog" aria-modal="true" aria-label="Inventory full">
  <div class="modal">
    <p>Inventory is full. Drop something to take <strong>{incoming.name}</strong>, or discard the find.</p>
    <ul>
      {#each inv as it (it.id)}
        <li>
          <button type="button" onclick={() => onresolve(it.id)}>
            Drop {it.name} <span class="fx">{itemEffectText(it)}</span>
          </button>
        </li>
      {/each}
      <li>
        <button type="button" class="discard" onclick={() => onresolve(incoming.id)}>
          Discard {incoming.name}
        </button>
      </li>
    </ul>
  </div>
</div>

<style>
  .scrim { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: grid; place-items: center; z-index: 60; }
  .modal { background: var(--panel); padding: 1.25rem; border-radius: 8px; width: min(460px, 92vw); }
  ul { list-style: none; padding: 0; display: grid; gap: .35rem; }
  button { width: 100%; text-align: left; padding: .5rem .75rem; }
  .fx { color: var(--muted); font-size: .85em; display: block; }
  .discard { color: var(--danger); }
</style>
```

`src/components/InventoryPanel.svelte`:

```svelte
<script lang="ts">
  import type { Slot } from '../lib/types';
  import { runState, patchRun } from '../stores/runStore';
  import { equipFromInventory, unequip, dropFromInventory } from '../lib/inventory';
  import { itemEffectText } from '../lib/itemText';
  import { deriveStats } from '../lib/stats';

  let { open, onclose }: { open: boolean; onclose: () => void } = $props();

  const run = $derived($runState);
  const derived = $derived(run ? deriveStats(run) : null);

  const slots = $derived.by(() => {
    if (!run) return [];
    return [
      { key: 'weapon' as Slot, idx: undefined, item: run.equipped.weapon },
      { key: 'armor' as Slot, idx: undefined, item: run.equipped.armor },
      { key: 'trinket' as Slot, idx: 0 as 0 | 1, item: run.equipped.trinkets[0] },
      { key: 'trinket' as Slot, idx: 1 as 0 | 1, item: run.equipped.trinkets[1] },
    ];
  });

  function doEquip(id: string) { patchRun((r) => equipFromInventory(r, id)); }
  function doUnequip(slot: Slot, idx?: 0 | 1) { patchRun((r) => { unequip(r, slot, idx); }); }
  function doDrop(id: string) { patchRun((r) => { dropFromInventory(r, id); }); }
</script>

{#if open && run && derived}
  <aside class="panel" aria-label="Inventory">
    <header>
      <h2>Loadout</h2>
      <button type="button" onclick={onclose}>Close</button>
    </header>

    <p class="stats">
      HP {run.hp}/{derived.maxHp} · Power {derived.power} · Guard {derived.guard} ·
      Focus {run.focus}/{derived.focusCap}
    </p>

    <ul class="equipped">
      {#each slots as s (s.key + String(s.idx))}
        <li>
          <span class="slot">{s.key}{s.idx !== undefined ? ` ${s.idx + 1}` : ''}</span>
          {#if s.item}
            <span class="name">{s.item.name}</span>
            <span class="fx">{itemEffectText(s.item)}</span>
            <button type="button" onclick={() => doUnequip(s.key, s.idx)}
              aria-label={`Unequip ${s.key}${s.idx !== undefined ? ' ' + (s.idx + 1) : ''}`}>Unequip</button>
          {:else}
            <span class="empty">— empty —</span>
          {/if}
        </li>
      {/each}
    </ul>

    <h3>Carried ({run.inventory.length}/8)</h3>
    <ul class="carried">
      {#each run.inventory as it (it.id)}
        <li>
          <span class="name">{it.name}</span>
          <span class="fx">{itemEffectText(it)}</span>
          <button type="button" onclick={() => doEquip(it.id)} aria-label={`Equip ${it.name}`}>Equip</button>
          <button type="button" onclick={() => doDrop(it.id)} aria-label={`Drop ${it.name}`}>Drop</button>
        </li>
      {/each}
      {#if run.inventory.length === 0}<li class="empty">nothing carried</li>{/if}
    </ul>
  </aside>
{/if}

<style>
  .panel {
    position: fixed; top: 0; right: 0; height: 100vh; width: min(360px, 92vw);
    background: var(--panel); padding: 1rem; overflow-y: auto; z-index: 40;
    box-shadow: -8px 0 24px rgba(0,0,0,.4);
  }
  header { display: flex; justify-content: space-between; align-items: center; }
  .stats { color: var(--muted); font-size: .85em; }
  ul { list-style: none; padding: 0; display: grid; gap: .5rem; }
  li { background: #00000030; padding: .5rem; border-radius: 6px; }
  .slot { text-transform: capitalize; color: var(--accent); font-size: .8em; display: block; }
  .fx { color: var(--muted); font-size: .8em; display: block; margin: .15rem 0 .35rem; }
  .empty { color: var(--muted); }
</style>
```

- [ ] **Step 9: Run tests and type check**

Run: `npm test -- inventory itemText InventoryPanel && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: inventory logic, inventory panel, drop-choice modal"
```

---

## Task 17: Class abilities (Probe, Scry)

**Files:**
- Create: `src/lib/abilities.ts`
- Test: `src/lib/abilities.test.ts`

**Interfaces:**
- Consumes: `RunState`, `Board`, `Coord`, `DerivedStats`, `RevealResult`, `RuleFlags` from `types.ts`; `getClass` from `content/classes.ts`; `reveal`, `toggleFlag` from `reveal.ts`.
- Produces:
  - `export const SCRY_DURATION_MS = 6000`
  - `export function abilityCost(run: RunState, derived: DerivedStats): number`
  - `export function canUseAbility(run: RunState, derived: DerivedStats, inCombat: boolean): { ok: boolean; reason?: string }`
  - `export function useProbe(run: RunState, board: Board, coord: Coord, rules: RuleFlags): { spentFocus: number; hitMine: boolean; result: RevealResult }` — mutates `board` and `run` (focus, `abilityUsedThisRoom`).
  - `export function useScry(run: RunState, board: Board, center: Coord, now: number, cost?: number, durationMs?: number): { spentFocus: number; coords: Coord[] }` — mutates `board` (`scryVisibleUntil` on mines in the 3×3) and `run` (focus). `cost` defaults to 2; callers pass `abilityCost(run, derived)` so the discount applies consistently.

- [ ] **Step 1: Write the failing tests**

`src/lib/abilities.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { DerivedStats, RunState } from './types';
import { DEFAULT_RULE_FLAGS } from './types';
import { createRun, enterFloor } from './run';
import { createRng } from './rng';
import { makeItem } from './items';
import { generateRoom } from './boardgen';
import { abilityCost, canUseAbility, useProbe, useScry, SCRY_DURATION_MS } from './abilities';

const derived = (over: Partial<DerivedStats> = {}): DerivedStats => ({
  maxHp: 12, power: 4, guard: 3, focusCap: 5,
  rules: { ...DEFAULT_RULE_FLAGS }, ...over,
});
const mkRun = (cls: 'sapper' | 'diviner'): RunState => {
  const r = createRun(7, cls, makeItem('sappers-pick', createRng(1)), makeItem('plain-robe', createRng(2)), 0);
  enterFloor(r);
  r.focus = 5;
  return r;
};

describe('abilityCost / canUseAbility', () => {
  it('probe costs 2 and is blocked in combat and after use', () => {
    const r = mkRun('sapper');
    expect(abilityCost(r, derived())).toBe(2);
    expect(canUseAbility(r, derived(), false).ok).toBe(true);
    expect(canUseAbility(r, derived(), true).ok).toBe(false); // not usable in combat
    r.abilityUsedThisRoom = true;
    expect(canUseAbility(r, derived(), false).ok).toBe(false);
  });

  it('scry costs 2 minus the discount and is allowed in combat', () => {
    const r = mkRun('diviner');
    expect(abilityCost(r, derived({ rules: { ...DEFAULT_RULE_FLAGS, scryFocusDiscount: 1 } }))).toBe(1);
    expect(canUseAbility(r, derived(), true).ok).toBe(true);
  });

  it('blocks when focus is short', () => {
    const r = mkRun('diviner');
    r.focus = 1;
    expect(canUseAbility(r, derived(), false).ok).toBe(false);
  });
});

describe('useProbe', () => {
  it('reveals a safe tile, spends focus, and marks the ability used', () => {
    const r = mkRun('sapper');
    const board = generateRoom(7, 1, 0, 5, { r: 4, c: 4 });
    const safe = board.tiles.flat().find((t) => !t.isMine && !t.revealed && t.hazard === 'none')!;
    const out = useProbe(r, board, { r: safe.r, c: safe.c }, { ...DEFAULT_RULE_FLAGS });
    expect(out.hitMine).toBe(false);
    expect(board.tiles[safe.r]![safe.c]!.revealed).toBe(true);
    expect(r.focus).toBe(3);
    expect(r.abilityUsedThisRoom).toBe(true);
  });

  it('flags a mine instead of fighting it', () => {
    const r = mkRun('sapper');
    const board = generateRoom(7, 1, 0, 5, { r: 4, c: 4 });
    const mine = board.tiles.flat().find((t) => t.isMine)!;
    const out = useProbe(r, board, { r: mine.r, c: mine.c }, { ...DEFAULT_RULE_FLAGS });
    expect(out.hitMine).toBe(true);
    expect(out.result.mines).toEqual([]);
    expect(board.tiles[mine.r]![mine.c]!.flagged).toBe(true);
    expect(board.tiles[mine.r]![mine.c]!.revealed).toBe(false);
  });
});

describe('useScry', () => {
  it('marks mines in the 3x3 visible until a deadline and spends focus', () => {
    const r = mkRun('diviner');
    const board = generateRoom(7, 4, 1, 6, { r: 6, c: 6 });
    // find a 3x3 window containing at least one mine
    let center = { r: 1, c: 1 };
    outer: for (let rr = 1; rr < board.rows - 1; rr++)
      for (let cc = 1; cc < board.cols - 1; cc++) {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++)
          if (board.tiles[rr + dr]![cc + dc]!.isMine) { center = { r: rr, c: cc }; break outer; }
      }
    const out = useScry(r, board, center, 1000);
    expect(out.spentFocus).toBe(2);
    expect(r.focus).toBe(3);
    const marked = out.coords.every((c) => board.tiles[c.r]![c.c]!.scryVisibleUntil === 1000 + SCRY_DURATION_MS);
    expect(marked).toBe(true);
    expect(out.coords.length).toBeGreaterThan(0);
  });

  it('clamps to the board edges without throwing', () => {
    const r = mkRun('diviner');
    const board = generateRoom(7, 1, 0, 5, { r: 4, c: 4 });
    expect(() => useScry(r, board, { r: 0, c: 0 }, 0)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test -- abilities`
Expected: FAIL — `Cannot find module './abilities'`.

- [ ] **Step 3: Implement `src/lib/abilities.ts`**

```ts
import type { Board, Coord, DerivedStats, RevealResult, RuleFlags, RunState } from './types';
import { getClass } from '../content/classes';
import { reveal, toggleFlag, emptyRevealResult } from './reveal';

export const SCRY_DURATION_MS = 6000;

export function abilityCost(run: RunState, derived: DerivedStats): number {
  const ab = getClass(run.classId).ability;
  if (ab.id === 'scry') return Math.max(0, ab.focusCost - derived.rules.scryFocusDiscount);
  return ab.focusCost;
}

export function canUseAbility(
  run: RunState, derived: DerivedStats, inCombat: boolean,
): { ok: boolean; reason?: string } {
  const ab = getClass(run.classId).ability;
  if (inCombat && !ab.usableInCombat) return { ok: false, reason: 'not usable in combat' };
  if (ab.oncePerRoom && run.abilityUsedThisRoom) return { ok: false, reason: 'already used this room' };
  if (run.focus < abilityCost(run, derived)) return { ok: false, reason: 'not enough Focus' };
  return { ok: true };
}

export function useProbe(
  run: RunState, board: Board, coord: Coord, rules: RuleFlags,
): { spentFocus: number; hitMine: boolean; result: RevealResult } {
  const ab = getClass(run.classId).ability;
  const cost = ab.focusCost;
  const t = board.tiles[coord.r]![coord.c]!;
  let hitMine = false;
  let result: RevealResult = emptyRevealResult();

  if (t.isMine) {
    hitMine = true;
    if (!t.flagged) toggleFlag(board, coord.r, coord.c, rules);
  } else {
    result = reveal(board, coord.r, coord.c, rules);
  }

  run.focus = Math.max(0, run.focus - cost);
  run.abilityUsedThisRoom = true;
  return { spentFocus: cost, hitMine, result };
}

export function useScry(
  run: RunState, board: Board, center: Coord, now: number,
  cost: number = 2, durationMs: number = SCRY_DURATION_MS,
): { spentFocus: number; coords: Coord[] } {
  const coords: Coord[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const r = center.r + dr, c = center.c + dc;
      if (r < 0 || r >= board.rows || c < 0 || c >= board.cols) continue;
      const t = board.tiles[r]![c]!;
      if (t.isMine) {
        t.scryVisibleUntil = now + durationMs;
        coords.push({ r, c });
      }
    }
  run.focus = Math.max(0, run.focus - cost);
  return { spentFocus: cost, coords };
}
```

- [ ] **Step 4: Run tests and type check**

Run: `npm test -- abilities && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/abilities.ts src/lib/abilities.test.ts
git commit -m "feat: probe and scry class abilities"
```

---

## Task 18: UI store, screen router, and entry screens

**Files:**
- Create: `src/stores/uiStore.ts`
- Create: `src/components/MainMenu.svelte`
- Create: `src/components/HowToPlay.svelte`
- Create: `src/components/PrologueCard.svelte`
- Create: `src/components/FloorIntro.svelte`
- Create: `src/components/ClassSelect.svelte`
- Rewrite: `src/App.svelte` (screen router)
- Test: `src/stores/uiStore.test.ts`
- Test: `src/components/MainMenu.test.ts`
- Test: `src/components/ClassSelect.test.ts`

**Interfaces:**
- Consumes: `ClassId` from `types.ts`; `CLASSES`, `CLASS_IDS`, `getClass` from `content/classes.ts`; `PROLOGUE`, `getFloorIntro` from `content/narrative.ts`; `runState` from `runStore.ts` (for FloorIntro's current floor).
- Produces (`uiStore.ts`):
  - `export type Screen = 'menu' | 'class-select' | 'prologue' | 'floor-intro' | 'game' | 'reward' | 'death' | 'win' | 'summary' | 'stats' | 'codex' | 'how-to-play'`
  - `export type ModalName = 'inventory' | 'drop-choice'`
  - `export interface UiState { screen: Screen; modal: ModalName | null; selectedClass: ClassId | null }`
  - `export const ui: Writable<UiState>`
  - `export function goto(screen: Screen): void`
  - `export function openModal(m: ModalName): void`
  - `export function closeModal(): void`
  - `export function chooseClass(id: ClassId): void` — sets `selectedClass` and goes to `prologue`.
- Produces components:
  - `MainMenu.svelte` props `{ hasSave?: boolean; oncontinue?: () => void }` — New Run → `goto('class-select')`; Continue (only if `hasSave`) → `oncontinue?.()`; Stats/Codex/How to Play → `goto(...)`.
  - `HowToPlay.svelte` — static rules text + a Back button (`goto('menu')`).
  - `PrologueCard.svelte` — `PROLOGUE` text + Continue (`goto('floor-intro')`).
  - `FloorIntro.svelte` props `{ floorId?: number; oncontinue?: () => void }` — title/mood/mechanical note from `getFloorIntro`; Continue calls `oncontinue` if given else `goto('game')`. `floorId` defaults to `$runState?.floor ?? 1`.
  - `ClassSelect.svelte` — a card per `CLASS_IDS` (name, fantasy, stats, playstyle); Confirm → `chooseClass(id)`.

- [ ] **Step 1: Write the failing uiStore test**

`src/stores/uiStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { ui, goto, openModal, closeModal, chooseClass } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => ui.set({ screen: 'menu', modal: null, selectedClass: null }));

  it('goto changes the screen and clears any modal', () => {
    openModal('inventory');
    goto('game');
    expect(get(ui).screen).toBe('game');
    expect(get(ui).modal).toBeNull();
  });

  it('openModal / closeModal toggle the modal', () => {
    openModal('drop-choice');
    expect(get(ui).modal).toBe('drop-choice');
    closeModal();
    expect(get(ui).modal).toBeNull();
  });

  it('chooseClass records the class and advances to prologue', () => {
    chooseClass('diviner');
    expect(get(ui).selectedClass).toBe('diviner');
    expect(get(ui).screen).toBe('prologue');
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npm test -- uiStore`
Expected: FAIL — `Cannot find module './uiStore'`.

- [ ] **Step 3: Implement `src/stores/uiStore.ts`**

```ts
import { writable, type Writable } from 'svelte/store';
import type { ClassId } from '../lib/types';

export type Screen =
  | 'menu' | 'class-select' | 'prologue' | 'floor-intro' | 'game'
  | 'reward' | 'death' | 'win' | 'summary' | 'stats' | 'codex' | 'how-to-play';

export type ModalName = 'inventory' | 'drop-choice';

export interface UiState {
  screen: Screen;
  modal: ModalName | null;
  selectedClass: ClassId | null;
}

export const ui: Writable<UiState> = writable({ screen: 'menu', modal: null, selectedClass: null });

export function goto(screen: Screen): void {
  ui.update((s) => ({ ...s, screen, modal: null }));
}

export function openModal(m: ModalName): void {
  ui.update((s) => ({ ...s, modal: m }));
}

export function closeModal(): void {
  ui.update((s) => ({ ...s, modal: null }));
}

export function chooseClass(id: ClassId): void {
  ui.update((s) => ({ ...s, selectedClass: id, screen: 'prologue', modal: null }));
}
```

- [ ] **Step 4: Write the failing component tests**

`src/components/MainMenu.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import { ui } from '../stores/uiStore';
import MainMenu from './MainMenu.svelte';

describe('MainMenu.svelte', () => {
  beforeEach(() => ui.set({ screen: 'menu', modal: null, selectedClass: null }));

  it('New Run routes to class select', async () => {
    render(MainMenu, { props: {} });
    await userEvent.click(screen.getByRole('button', { name: /new run/i }));
    expect(get(ui).screen).toBe('class-select');
  });

  it('hides Continue without a save and shows it with one', async () => {
    const oncontinue = vi.fn();
    const { rerender } = render(MainMenu, { props: { hasSave: false, oncontinue } });
    expect(screen.queryByRole('button', { name: /continue/i })).toBeNull();
    await rerender({ hasSave: true, oncontinue });
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(oncontinue).toHaveBeenCalled();
  });
});
```

`src/components/ClassSelect.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import { ui } from '../stores/uiStore';
import ClassSelect from './ClassSelect.svelte';

describe('ClassSelect.svelte', () => {
  beforeEach(() => ui.set({ screen: 'class-select', modal: null, selectedClass: null }));

  it('shows both classes and confirms a choice', async () => {
    render(ClassSelect, { props: {} });
    expect(screen.getByText('Sapper')).toBeInTheDocument();
    expect(screen.getByText('Diviner')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /choose diviner/i }));
    expect(get(ui).selectedClass).toBe('diviner');
    expect(get(ui).screen).toBe('prologue');
  });
});
```

- [ ] **Step 5: Implement the components**

`src/components/MainMenu.svelte`:

```svelte
<script lang="ts">
  import { goto } from '../stores/uiStore';
  let { hasSave = false, oncontinue }: { hasSave?: boolean; oncontinue?: () => void } = $props();
</script>

<section class="menu">
  <h1>Gemsweeper</h1>
  <p class="tag">Minesweeper at its core. Something much worse underneath.</p>
  <div class="buttons">
    <button type="button" onclick={() => goto('class-select')}>New Run</button>
    {#if hasSave}
      <button type="button" onclick={() => oncontinue?.()}>Continue</button>
    {/if}
    <button type="button" onclick={() => goto('stats')}>Stats</button>
    <button type="button" onclick={() => goto('codex')}>Codex</button>
    <button type="button" onclick={() => goto('how-to-play')}>How to Play</button>
  </div>
</section>

<style>
  .menu { max-width: 480px; margin: 12vh auto; text-align: center; }
  .tag { color: var(--muted); }
  .buttons { display: grid; gap: .6rem; margin-top: 2rem; }
  .buttons button { padding: .7rem 1rem; font-size: 1rem; }
</style>
```

`src/components/HowToPlay.svelte`:

```svelte
<script lang="ts">
  import { goto } from '../stores/uiStore';
</script>

<section class="how">
  <h2>How to Play</h2>
  <ul>
    <li>Left-click reveals a tile. Numbers count adjacent monsters.</li>
    <li>Right-click flags. Click a satisfied number to chord its neighbours.</li>
    <li>Reveal a monster and you fight it: <strong>Strike</strong>, <strong>Block</strong>, or your class ability across up to three rounds. Losing the fight costs HP — it never ends the run outright.</li>
    <li>Clear every safe tile to finish a room. Pick one reward, or skip it for a small heal.</li>
    <li>Four floors, each with its own hazard. The last room of a floor is a boss. Two retries per run, then it's over.</li>
  </ul>
  <button type="button" onclick={() => goto('menu')}>Back</button>
</section>

<style>
  .how { max-width: 560px; margin: 8vh auto; }
  li { margin: .5rem 0; }
</style>
```

`src/components/PrologueCard.svelte`:

```svelte
<script lang="ts">
  import { goto } from '../stores/uiStore';
  import { PROLOGUE } from '../content/narrative';
</script>

<section class="card">
  <p>{PROLOGUE}</p>
  <button type="button" onclick={() => goto('floor-intro')}>Descend</button>
</section>

<style>
  .card { max-width: 520px; margin: 14vh auto; text-align: center; }
  p { font-size: 1.1rem; line-height: 1.6; }
  button { margin-top: 2rem; padding: .7rem 1.4rem; }
</style>
```

`src/components/FloorIntro.svelte`:

```svelte
<script lang="ts">
  import { goto } from '../stores/uiStore';
  import { runState } from '../stores/runStore';
  import { getFloorIntro } from '../content/narrative';

  let { floorId, oncontinue }: { floorId?: number; oncontinue?: () => void } = $props();
  const id = $derived(floorId ?? $runState?.floor ?? 1);
  const intro = $derived(getFloorIntro(id));
</script>

<section class="intro">
  <h2>{intro.title}</h2>
  <p class="mood">{intro.mood}</p>
  <p class="note">{intro.mechanicalNote}</p>
  <button type="button" onclick={() => (oncontinue ? oncontinue() : goto('game'))}>Enter</button>
</section>

<style>
  .intro { max-width: 520px; margin: 12vh auto; text-align: center; }
  .mood { font-size: 1.05rem; line-height: 1.6; }
  .note { color: var(--accent); }
  button { margin-top: 1.5rem; padding: .6rem 1.2rem; }
</style>
```

`src/components/ClassSelect.svelte`:

```svelte
<script lang="ts">
  import { CLASS_IDS, getClass } from '../content/classes';
  import { chooseClass } from '../stores/uiStore';
</script>

<section class="pick">
  <h2>Choose your delver</h2>
  <div class="cards">
    {#each CLASS_IDS as id (id)}
      {@const c = getClass(id)}
      <article class="card">
        <h3>{c.name}</h3>
        <p class="fantasy">{c.fantasy}</p>
        <p class="stats">HP {c.start.hp} · Power {c.start.power} · Guard {c.start.guard} · Focus {c.start.focus}/{c.start.focusCap}</p>
        <p class="ability"><strong>{c.ability.name}</strong> — {c.playstyle}</p>
        <button type="button" onclick={() => chooseClass(id)}>Choose {c.name}</button>
      </article>
    {/each}
  </div>
</section>

<style>
  .pick { max-width: 720px; margin: 8vh auto; text-align: center; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem; }
  .card { background: var(--panel); padding: 1rem; border-radius: 8px; }
  .fantasy { color: var(--muted); }
  .ability { margin-top: .5rem; }
  button { margin-top: 1rem; padding: .6rem 1rem; }
  @media (max-width: 640px) { .cards { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 6: Rewrite `src/App.svelte` as the router**

```svelte
<script lang="ts">
  import { ui } from './stores/uiStore';
  import MainMenu from './components/MainMenu.svelte';
  import HowToPlay from './components/HowToPlay.svelte';
  import PrologueCard from './components/PrologueCard.svelte';
  import FloorIntro from './components/FloorIntro.svelte';
  import ClassSelect from './components/ClassSelect.svelte';
  import GameScreen from './components/GameScreen.svelte';

  const screen = $derived($ui.screen);
</script>

{#if screen === 'how-to-play'}
  <HowToPlay />
{:else if screen === 'class-select'}
  <ClassSelect />
{:else if screen === 'prologue'}
  <PrologueCard />
{:else if screen === 'floor-intro'}
  <FloorIntro />
{:else if screen === 'game'}
  <GameScreen />
{:else}
  <MainMenu />
{/if}
```

> Screens `reward`, `death`, `win`, `summary`, `stats`, `codex` fall through to `MainMenu` for now; Task 19 adds their branches.

- [ ] **Step 7: Run tests and type check**

Run: `npm test && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: ui store, screen router, and entry screens"
```

---

## Task 19: Persistence layer and meta store

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/stores/metaStore.ts`
- Test: `src/lib/storage.test.ts`
- Test: `src/stores/metaStore.test.ts`

**Interfaces:**
- Consumes: `MetaSave`, `RunSave`, `RunState`, `Item` from `types.ts`; `depthOf` from `run.ts`.
- Produces (`storage.ts`):
  - `export const META_KEY = 'gemsweeper:meta'`, `export const SAVE_KEY = 'gemsweeper:save'`
  - `export const META_VERSION = 1`, `export const SAVE_VERSION = 1`
  - `export function defaultMeta(): MetaSave`
  - `export function loadMeta(): MetaSave` — bad/missing/old data → `defaultMeta()`.
  - `export function saveMeta(meta: MetaSave): void`
  - `export function loadRunSave(): RunSave | null`
  - `export function writeRunSave(run: RunState): void`
  - `export function clearRunSave(): void`
  - `export function hasRunSave(): boolean`
  - `export function recordRunStart(meta: MetaSave): MetaSave` — pure; `runsStarted + 1`.
  - `export function recordRunEnd(meta: MetaSave, run: RunState, outcome: 'win' | 'abandon', now: number): MetaSave` — pure; updates wins, fastest, monsters, bestDepth.
  - `export function unlockCodex(meta: MetaSave, codexId: string): MetaSave` — pure; idempotent add.
- Produces (`metaStore.ts`):
  - `export const meta: Writable<MetaSave>` seeded from `loadMeta()`.
  - `export function persistMeta(fn: (m: MetaSave) => MetaSave): void` — apply, set, `saveMeta`.
  - `export function reloadMeta(): void` — `set(loadMeta())`.

- [ ] **Step 1: Write the failing storage test**

`src/lib/storage.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it, expect failure**

Run: `npm test -- storage`
Expected: FAIL — `Cannot find module './storage'`.

- [ ] **Step 3: Implement `src/lib/storage.ts`**

```ts
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
```

- [ ] **Step 4: Run the storage test**

Run: `npm test -- storage`
Expected: PASS.

- [ ] **Step 5: Write the failing metaStore test**

`src/stores/metaStore.test.ts`:

```ts
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
```

- [ ] **Step 6: Implement `src/stores/metaStore.ts`**

```ts
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
```

- [ ] **Step 7: Run tests and type check**

Run: `npm test -- storage metaStore && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/storage.ts src/stores/metaStore.ts src/lib/storage.test.ts src/stores/metaStore.test.ts
git commit -m "feat: localStorage persistence and meta store"
```

---

## Task 20: HUD and outcome screens

**Files:**
- Create: `src/components/Hud.svelte`
- Create: `src/components/RewardScreen.svelte`
- Create: `src/components/DeathScreen.svelte`
- Create: `src/components/WinScreen.svelte`
- Create: `src/components/RunSummary.svelte`
- Create: `src/components/StatsScreen.svelte`
- Create: `src/components/CodexScreen.svelte`
- Modify: `src/App.svelte` (add `stats` and `codex` branches)
- Test: `src/components/Hud.test.ts`
- Test: `src/components/RewardScreen.test.ts`
- Test: `src/components/DeathScreen.test.ts`
- Test: `src/components/CodexScreen.test.ts`

**Interfaces:**
- Consumes: `runState` from `runStore.ts`; `deriveStats` from `stats.ts`; `meta` from `metaStore.ts`; `ItemDef`, `RunState` from `types.ts`; `getItemDef` from `content/items.ts`; `itemEffectText` from `itemText.ts`; `MONSTER_TYPES` from `content/monsters.ts`; `getCodexEntry`, `ENDINGS` from `content/narrative.ts`; `depthOf` from `run.ts`; `getFloor` from `content/floors.ts`; `goto` from `uiStore.ts`.
- Produces:
  - `Hud.svelte` props `{ abilityLabel: string; abilityEnabled: boolean; onuseAbility: () => void; onopenInventory: () => void }`.
  - `RewardScreen.svelte` props `{ offers: ItemDef[]; onpick: (defId: string) => void; onskip: () => void }`.
  - `DeathScreen.svelte` props `{ retriesLeft: number; onretry: () => void; onabandon: () => void }`.
  - `WinScreen.svelte` props `{ oncontinue: () => void }`.
  - `RunSummary.svelte` props `{ run: RunState; outcome: 'win' | 'died-out' | 'abandoned'; onmenu: () => void }`.
  - `StatsScreen.svelte` — no props; Back → `goto('menu')`.
  - `CodexScreen.svelte` — no props; Back → `goto('menu')`.

- [ ] **Step 1: Write the failing tests**

`src/components/Hud.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRun, enterFloor } from '../lib/run';
import { createRng } from '../lib/rng';
import { makeItem } from '../lib/items';
import { setRun } from '../stores/runStore';
import Hud from './Hud.svelte';

describe('Hud.svelte', () => {
  beforeEach(() => {
    const r = createRun(1, 'sapper', makeItem('sappers-pick', createRng(1)), makeItem('blast-plating', createRng(2)), 0);
    enterFloor(r);
    setRun(r);
  });

  it('shows HP and fires the ability + inventory callbacks', async () => {
    const onuseAbility = vi.fn();
    const onopenInventory = vi.fn();
    render(Hud, { props: { abilityLabel: 'Probe (2)', abilityEnabled: true, onuseAbility, onopenInventory } });
    expect(screen.getByText(/HP/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /probe/i }));
    await userEvent.click(screen.getByRole('button', { name: /loadout|inventory/i }));
    expect(onuseAbility).toHaveBeenCalled();
    expect(onopenInventory).toHaveBeenCalled();
  });

  it('disables the ability button when abilityEnabled is false', () => {
    render(Hud, { props: { abilityLabel: 'Probe (2)', abilityEnabled: false, onuseAbility: vi.fn(), onopenInventory: vi.fn() } });
    expect(screen.getByRole('button', { name: /probe/i })).toBeDisabled();
  });
});
```

`src/components/RewardScreen.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { getItemDef } from '../content/items';
import RewardScreen from './RewardScreen.svelte';

const offers = [getItemDef('iron-maul'), getItemDef('focus-battery'), getItemDef('ember-cloak')];

describe('RewardScreen.svelte', () => {
  it('offers three items and reports the pick', async () => {
    const onpick = vi.fn(); const onskip = vi.fn();
    render(RewardScreen, { props: { offers, onpick, onskip } });
    expect(screen.getByText('Iron Maul')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /take iron maul/i }));
    expect(onpick).toHaveBeenCalledWith('iron-maul');
  });

  it('supports skipping for a heal', async () => {
    const onskip = vi.fn();
    render(RewardScreen, { props: { offers, onpick: vi.fn(), onskip } });
    await userEvent.click(screen.getByRole('button', { name: /skip for a heal/i }));
    expect(onskip).toHaveBeenCalled();
  });
});
```

`src/components/DeathScreen.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import DeathScreen from './DeathScreen.svelte';

describe('DeathScreen.svelte', () => {
  it('offers a retry when retries remain', async () => {
    const onretry = vi.fn();
    render(DeathScreen, { props: { retriesLeft: 2, onretry, onabandon: vi.fn() } });
    expect(screen.getByText(/2 left/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onretry).toHaveBeenCalled();
  });

  it('hides retry at zero and only offers abandon', () => {
    render(DeathScreen, { props: { retriesLeft: 0, onretry: vi.fn(), onabandon: vi.fn() } });
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.getByRole('button', { name: /abandon/i })).toBeInTheDocument();
  });
});
```

`src/components/CodexScreen.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { persistMeta, reloadMeta } from '../stores/metaStore';
import CodexScreen from './CodexScreen.svelte';

describe('CodexScreen.svelte', () => {
  beforeEach(() => { localStorage.clear(); reloadMeta(); });

  it('shows locked entries until unlocked', async () => {
    render(CodexScreen, { props: {} });
    expect(screen.getAllByText(/locked/i).length).toBeGreaterThan(0);
  });

  it('reveals flavor for an unlocked monster', async () => {
    persistMeta((m) => ({ ...m, codexUnlocks: ['monster:fast'] }));
    render(CodexScreen, { props: {} });
    expect(screen.getByText(/Flicker/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them, expect failure**

Run: `npm test -- Hud RewardScreen DeathScreen CodexScreen`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the components**

`src/components/Hud.svelte`:

```svelte
<script lang="ts">
  import { runState } from '../stores/runStore';
  import { deriveStats } from '../lib/stats';
  import { getFloor } from '../content/floors';

  let { abilityLabel, abilityEnabled, onuseAbility, onopenInventory }: {
    abilityLabel: string; abilityEnabled: boolean;
    onuseAbility: () => void; onopenInventory: () => void;
  } = $props();

  const run = $derived($runState);
  const d = $derived(run ? deriveStats(run) : null);
  const floorName = $derived(run ? getFloor(run.floor).name : '');
</script>

{#if run && d}
  <div class="hud">
    <div class="stat">HP <b>{run.hp}</b>/{d.maxHp}</div>
    <div class="stat">Focus <b>{run.focus}</b>/{d.focusCap}</div>
    <div class="stat">Power <b>{d.power}</b></div>
    <div class="stat">Guard <b>{d.guard}</b></div>
    <div class="loc">{floorName} — room {run.roomIndex + 1}/{run.roomsThisFloor}</div>
    <div class="retries" aria-label={`${run.retriesLeft} retries left`}>
      {#each Array(3) as _, i (i)}<span class="dot" class:used={i >= run.retriesLeft}></span>{/each}
    </div>
    <button type="button" onclick={onuseAbility} disabled={!abilityEnabled}>{abilityLabel}</button>
    <button type="button" onclick={onopenInventory}>Loadout</button>
  </div>
{/if}

<style>
  .hud { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; padding: .5rem 1rem; background: var(--panel); }
  .stat b { color: var(--accent); }
  .loc { color: var(--muted); }
  .retries { display: flex; gap: 4px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--safe); }
  .dot.used { background: #444; }
  .hud button { margin-left: auto; padding: .35rem .7rem; }
  .hud button + button { margin-left: .4rem; }
</style>
```

`src/components/RewardScreen.svelte`:

```svelte
<script lang="ts">
  import type { ItemDef } from '../lib/types';
  import { itemEffectText } from '../lib/itemText';

  let { offers, onpick, onskip }: {
    offers: ItemDef[]; onpick: (defId: string) => void; onskip: () => void;
  } = $props();
</script>

<section class="reward">
  <h2>Salvage</h2>
  <div class="cards">
    {#each offers as o (o.defId)}
      <article class="card" data-rarity={o.rarity}>
        <h3>{o.name}</h3>
        <p class="rarity">{o.rarity} {o.slot}</p>
        <p class="fx">{itemEffectText({ ...o, id: o.defId })}</p>
        <p class="flavor">{o.flavor}</p>
        <button type="button" onclick={() => onpick(o.defId)}>Take {o.name}</button>
      </article>
    {/each}
  </div>
  <button type="button" class="skip" onclick={onskip}>Skip for a heal</button>
</section>

<style>
  .reward { max-width: 760px; margin: 6vh auto; text-align: center; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0; }
  .card { background: var(--panel); padding: 1rem; border-radius: 8px; }
  .card[data-rarity='rare'] { outline: 1px solid #3f7fbf; }
  .card[data-rarity='cursed'] { outline: 1px solid var(--danger); }
  .rarity { color: var(--muted); text-transform: capitalize; }
  .fx { color: var(--accent); }
  .flavor { color: var(--muted); font-style: italic; font-size: .9em; }
  .skip { padding: .5rem 1rem; }
  @media (max-width: 680px) { .cards { grid-template-columns: 1fr; } }
</style>
```

`src/components/DeathScreen.svelte`:

```svelte
<script lang="ts">
  let { retriesLeft, onretry, onabandon }: {
    retriesLeft: number; onretry: () => void; onabandon: () => void;
  } = $props();
</script>

<section class="death">
  <h2>Down</h2>
  <p>The dark takes what it takes.</p>
  <div class="buttons">
    {#if retriesLeft > 0}
      <button type="button" onclick={onretry}>Retry from checkpoint ({retriesLeft} left)</button>
    {/if}
    <button type="button" onclick={onabandon}>Abandon run</button>
  </div>
</section>

<style>
  .death { max-width: 460px; margin: 16vh auto; text-align: center; }
  .buttons { display: grid; gap: .6rem; margin-top: 1.5rem; }
  .buttons button { padding: .7rem 1rem; }
</style>
```

`src/components/WinScreen.svelte`:

```svelte
<script lang="ts">
  import { ENDINGS } from '../content/narrative';
  let { oncontinue }: { oncontinue: () => void } = $props();
</script>

<section class="win">
  <h2>Out</h2>
  <p>{ENDINGS.win}</p>
  <button type="button" onclick={oncontinue}>See the tally</button>
</section>

<style>
  .win { max-width: 480px; margin: 14vh auto; text-align: center; }
  p { font-size: 1.1rem; line-height: 1.6; }
  button { margin-top: 1.5rem; padding: .7rem 1.2rem; }
</style>
```

`src/components/RunSummary.svelte`:

```svelte
<script lang="ts">
  import type { RunState } from '../lib/types';
  import { depthOf } from '../lib/run';
  import { ENDINGS } from '../content/narrative';
  import { itemEffectText } from '../lib/itemText';

  let { run, outcome, onmenu }: {
    run: RunState; outcome: 'win' | 'died-out' | 'abandoned'; onmenu: () => void;
  } = $props();

  const ending = $derived(
    outcome === 'win' ? ENDINGS.win : outcome === 'died-out' ? ENDINGS.diedOut : ENDINGS.abandoned,
  );
  const minutes = $derived(Math.max(0, Math.round((Date.now() - run.startedAtMs) / 60000)));
  const equipped = $derived([run.equipped.weapon, run.equipped.armor, run.equipped.trinkets[0], run.equipped.trinkets[1]].filter(Boolean));
</script>

<section class="summary">
  <h2>{outcome === 'win' ? 'Run complete' : 'Run over'}</h2>
  <p class="ending">{ending}</p>
  <dl>
    <div><dt>Depth reached</dt><dd>{run.deepestDepth} (floor {run.floor})</dd></div>
    <div><dt>Time</dt><dd>~{minutes} min</dd></div>
    <div><dt>Monsters defused</dt><dd>{run.monstersDefused}</dd></div>
  </dl>
  <h3>Final loadout</h3>
  <ul>
    {#each equipped as it (it!.id)}<li>{it!.name} — <span class="fx">{itemEffectText(it!)}</span></li>{/each}
  </ul>
  <button type="button" onclick={onmenu}>Back to menu</button>
</section>

<style>
  .summary { max-width: 560px; margin: 6vh auto; }
  .ending { color: var(--muted); font-style: italic; }
  dl div { display: flex; justify-content: space-between; border-bottom: 1px solid #2a2a36; padding: .35rem 0; }
  dt { color: var(--muted); }
  ul { list-style: none; padding: 0; }
  .fx { color: var(--muted); font-size: .9em; }
  button { margin-top: 1.5rem; padding: .6rem 1.2rem; }
</style>
```

`src/components/StatsScreen.svelte`:

```svelte
<script lang="ts">
  import { meta } from '../stores/metaStore';
  import { goto } from '../stores/uiStore';
  const m = $derived($meta);
</script>

<section class="stats">
  <h2>Lifetime</h2>
  <dl>
    <div><dt>Runs started</dt><dd>{m.runsStarted}</dd></div>
    <div><dt>Runs won</dt><dd>{m.runsWon}</dd></div>
    <div><dt>Best depth</dt><dd>{m.bestDepth}</dd></div>
    <div><dt>Fastest win</dt><dd>{m.fastestWinMs === null ? '—' : Math.round(m.fastestWinMs / 1000) + 's'}</dd></div>
    <div><dt>Monsters defused</dt><dd>{m.monstersDefused}</dd></div>
    <div><dt>Codex entries</dt><dd>{m.codexUnlocks.length} / 3</dd></div>
  </dl>
  <button type="button" onclick={() => goto('menu')}>Back</button>
</section>

<style>
  .stats { max-width: 480px; margin: 8vh auto; }
  dl div { display: flex; justify-content: space-between; border-bottom: 1px solid #2a2a36; padding: .4rem 0; }
  dt { color: var(--muted); }
  button { margin-top: 1.5rem; padding: .6rem 1.2rem; }
</style>
```

`src/components/CodexScreen.svelte`:

```svelte
<script lang="ts">
  import { meta } from '../stores/metaStore';
  import { goto } from '../stores/uiStore';
  import { MONSTER_TYPES } from '../content/monsters';
  import { getCodexEntry } from '../content/narrative';

  const unlocked = $derived(new Set($meta.codexUnlocks));
</script>

<section class="codex">
  <h2>Codex</h2>
  <ul>
    {#each MONSTER_TYPES as t (t)}
      {@const e = getCodexEntry(t)}
      <li>
        {#if unlocked.has(e.codexId)}
          <h3>{e.name}</h3>
          <p>{e.flavor}</p>
        {:else}
          <h3 class="locked">▢ Locked</h3>
          <p class="locked">Defeat one to learn its nature.</p>
        {/if}
      </li>
    {/each}
  </ul>
  <button type="button" onclick={() => goto('menu')}>Back</button>
</section>

<style>
  .codex { max-width: 560px; margin: 8vh auto; }
  li { background: var(--panel); padding: .75rem 1rem; border-radius: 6px; margin-bottom: .5rem; }
  .locked { color: var(--muted); }
  button { margin-top: 1rem; padding: .6rem 1.2rem; }
</style>
```

- [ ] **Step 4: Extend `src/App.svelte`**

Add these branches before the `{:else}`:

```svelte
{:else if screen === 'stats'}
  <StatsScreen />
{:else if screen === 'codex'}
  <CodexScreen />
```

And the imports:

```svelte
  import StatsScreen from './components/StatsScreen.svelte';
  import CodexScreen from './components/CodexScreen.svelte';
```

- [ ] **Step 5: Run tests and type check**

Run: `npm test && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: hud and outcome screens"
```

---

## Task 21: Game-flow coordinator and full GameScreen wiring

**Files:**
- Create: `src/stores/gameFlow.ts` (coordinator — may import stores; still no `Math.random` outside allowed spots — see note)
- Rewrite: `src/components/GameScreen.svelte`
- Modify: `src/components/Board.svelte` (add optional targeting mode)
- Modify: `src/components/MainMenu.svelte` usage in `App.svelte` (pass `hasSave` / `oncontinue`)
- Test: `src/stores/gameFlow.test.ts`

**Interfaces:**
- Consumes: everything built so far. Notable: `prepareRoom` via `boardStore.loadRoom`; `boardSession`, `applyReveal`, `applyChord`, `applyFlag`, `bump` from `boardStore`; `monsterForTile`, `roundLimitFor` from `combat.ts`; `beginCombat`, `endCombat`, `combatSession` from `combatStore`; `deriveStats` from `stats.ts`; `run.ts` progression fns; `abilities.ts`; `items.ts`; `inventory.ts`; `storage.ts`; `metaStore`; `uiStore`.
- Produces (`gameFlow.ts`):
  - `export type Phase = 'loading' | 'playing' | 'combat' | 'reward' | 'floor-cleared' | 'dead' | 'won' | 'summary'`
  - `export const phase: Writable<Phase>`
  - `export const rewardOffers: Writable<ItemDef[]>`
  - `export const pendingPickup: Writable<Item | null>`
  - `export const targeting: Writable<'probe' | 'scry' | null>`
  - `export const lastOutcome: Writable<'win' | 'died-out' | 'abandoned'>`
  - `export const SKIP_HEAL_HP = 3`
  - `export function startNewRun(classId: ClassId): void`
  - `export function continueSavedRun(): boolean`
  - `export function handleCaches(coords: Coord[]): void`
  - `export function handleMines(coords: Coord[]): void`
  - `export function resolveCombat(): void` — reads `endCombat()` internally.
  - `export function handleBoardClear(): void`
  - `export function pickReward(defId: string): void`
  - `export function skipReward(): void`
  - `export function resolvePickup(dropId: string): void`
  - `export function continueToNextFloor(): void`
  - `export function beginTargeting(kind: 'probe' | 'scry'): void`
  - `export function handleTarget(r: number, c: number): void`
  - `export function retry(): void`
  - `export function abandon(): void`
  - `export function toWonSummary(): void` — advance the win screen to the run summary.
  - `export function noteReveals(count: number): void` — feed safe-reveal counts to the diviner passive (called from `GameScreen`'s reveal handler).
  - `export function tickTimers(): void` — call on an interval from GameScreen: ember re-cover + scry-expiry repaint.
  - `export function toMenu(): void`
  - `export function abilityView(): { label: string; enabled: boolean }` — for the HUD button.
  - `export function startRunWithSeed(seed: number, classId: ClassId): void` — the seeded core of `startNewRun` (also used by the Task 22 smoke test).

> **`Math.random` note:** the run seed is chosen once in `startNewRun` via `Math.floor(Math.random() * 2 ** 31)`. This file is under `src/stores/`, which the Global Constraints allow. Everything downstream of the seed is deterministic.

- [ ] **Step 1: Write the failing coordinator test**

`src/stores/gameFlow.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { DEFAULT_RULE_FLAGS } from '../lib/types';
import { boardSession, applyReveal } from './boardStore';
import { runState, checkpointStore } from './runStore';
import { combatSession, act } from './combatStore';
import { reloadMeta, meta } from './metaStore';
import {
  phase, rewardOffers, lastOutcome, startNewRun, handleMines, resolveCombat,
  skipReward, retry, abandon, toMenu,
} from './gameFlow';

const RULES = { ...DEFAULT_RULE_FLAGS };
const firstMine = () => get(boardSession)!.board.tiles.flat().find((t) => t.isMine)!;

describe('gameFlow', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadMeta();
    toMenu();
  });

  it('startNewRun creates a run, loads a room, and enters play', () => {
    startNewRun('sapper');
    expect(get(phase)).toBe('playing');
    expect(get(runState)).not.toBeNull();
    expect(get(boardSession)).not.toBeNull();
    expect(get(meta).runsStarted).toBe(1);
    expect(get(checkpointStore)).not.toBeNull();
  });

  it('a mine hit opens combat; resolving a won fight defuses the tile and banks the kill', () => {
    startNewRun('sapper');
    applyReveal(4, 4, RULES); // first reveal places mines
    const mine = firstMine();
    handleMines([{ r: mine.r, c: mine.c }]);
    expect(get(phase)).toBe('combat');
    for (let i = 0; i < 8 && get(combatSession)?.state.resolution === 'ongoing'; i++) act('strike');
    resolveCombat();
    const board = get(boardSession)!.board;
    expect(board.tiles[mine.r]![mine.c]!.defused).toBe(true);
    expect(get(runState)!.monstersDefused).toBeGreaterThanOrEqual(1);
  });

  it('skipReward heals and advances the room', () => {
    startNewRun('sapper');
    rewardOffers.set([]);
    phase.set('reward');
    get(runState)!.hp = 1;
    skipReward();
    expect(get(runState)!.hp).toBeGreaterThan(1);
    expect(['playing', 'floor-cleared', 'summary']).toContain(get(phase));
  });

  it('retry after running out sends the run to the summary as died-out', () => {
    startNewRun('sapper');
    get(runState)!.retriesLeft = 0;
    get(runState)!.hp = 0;
    phase.set('dead');
    retry();
    expect(get(phase)).toBe('summary');
    expect(get(lastOutcome)).toBe('died-out');
  });

  it('abandon records the run end and clears the save', () => {
    startNewRun('sapper');
    abandon();
    expect(get(phase)).toBe('summary');
    expect(get(lastOutcome)).toBe('abandoned');
    expect(localStorage.getItem('gemsweeper:save')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npm test -- gameFlow`
Expected: FAIL — `Cannot find module './gameFlow'`.

- [ ] **Step 3: Implement `src/stores/gameFlow.ts`**

```ts
import { writable, get, type Writable } from 'svelte/store';
import type { ClassId, Coord, ItemDef, Item } from '../lib/types';
import { boardSession, loadRoom, clearRoom, applyReveal, bump } from './boardStore';
import { runState, checkpointStore, setRun, patchRun } from './runStore';
import { beginCombat, endCombat } from './combatStore';
import { meta, persistMeta, reloadMeta } from './metaStore';
import { goto, closeModal, openModal, ui } from './uiStore';
import { getClass } from '../content/classes';
import { getFloor } from '../content/floors';
import { getMonsterDef } from '../content/monsters';
import { createRng } from '../lib/rng';
import {
  createRun, enterFloor, snapshotCheckpoint, restoreCheckpoint, roomCleared,
  advanceRoom, applyDeath, applyHpLoss, isDead, recordMineDefused, applyRoomDebuff,
  noteSafeReveals, isBossRoom,
} from '../lib/run';
import { deriveStats } from '../lib/stats';
import { monsterForTile, roundLimitFor } from '../lib/combat';
import { isRoomClear, recoverEmbers, spreadWater } from '../lib/reveal';
import {
  makeItem, rollRewards, onRoomStartRevealCount, onRoomClearHeal, postCombatHpCost,
} from '../lib/items';
import { addToInventory, resolvePickupAtCap } from '../lib/inventory';
import { abilityCost, canUseAbility, useProbe, useScry } from '../lib/abilities';
import {
  loadRunSave, writeRunSave, clearRunSave, recordRunStart, recordRunEnd,
} from '../lib/storage';

export type Phase =
  | 'loading' | 'playing' | 'combat' | 'reward' | 'floor-cleared' | 'dead' | 'won' | 'summary';

export const phase: Writable<Phase> = writable('loading');
export const rewardOffers: Writable<ItemDef[]> = writable([]);
export const pendingPickup: Writable<Item | null> = writable(null);
export const targeting: Writable<'probe' | 'scry' | null> = writable(null);
export const lastOutcome: Writable<'win' | 'died-out' | 'abandoned'> = writable('win');

export const SKIP_HEAL_HP = 3;

let mineQueue: Coord[] = [];
let firstCacheDoneThisFloor = false;

// ---- helpers ----
function run() { return get(runState)!; }
function board() { return get(boardSession)!.board; }
function rewardRng() {
  const r = run();
  return createRng(r.seed).fork(40000 + r.floor * 100 + r.roomIndex);
}
function combatRngFor(c: Coord) {
  const r = run();
  return createRng(r.seed).fork(70000 + r.floor * 1000 + r.roomIndex * 100 + c.r * 14 + c.c);
}
function buildCtx() {
  const r = run();
  const d = deriveStats(r);
  return {
    power: d.power, guard: d.guard, focus: r.focus, classId: r.classId, rules: d.rules,
    isFirstFightThisRoom: r.fightsThisRoom === 0,
    sapperFirstMineHandled: r.sapperFirstMineHandled,
  };
}

function beginRoom() {
  const r = run();
  loadRoom(r.seed, r.floor, r.roomIndex, r.roomsThisFloor);
  mineQueue = [];
  phase.set('playing');
}

// Cartographer's Eye etc. — fire after mines exist (first reveal).
function afterFirstClick() {
  const r = run();
  const n = onRoomStartRevealCount(r);
  if (n <= 0) return;
  const rng = createRng(r.seed).fork(50000 + r.floor * 100 + r.roomIndex);
  const b = board();
  const candidates = b.tiles.flat().filter((t) => !t.isMine && !t.revealed && t.hazard === 'none');
  for (let i = 0; i < n && candidates.length; i++) {
    const t = rng.pick(candidates);
    applyReveal(t.r, t.c, deriveStats(r).rules);
  }
}

// ---- lifecycle ----
export function startRunWithSeed(seed: number, classId: ClassId): void {
  const cls = getClass(classId);
  const weapon = makeItem(cls.startGear.weapon, createRng(seed).fork(1));
  const armor = makeItem(cls.startGear.armor, createRng(seed).fork(2));
  const r = createRun(seed, classId, weapon, armor, Date.now());
  enterFloor(r);
  setRun(r);
  checkpointStore.set(snapshotCheckpoint(r));
  persistMeta(recordRunStart);
  writeRunSave(r);
  firstCacheDoneThisFloor = false;
  beginRoom();
  goto('game');
}

export function startNewRun(classId: ClassId): void {
  startRunWithSeed(Math.floor(Math.random() * 2 ** 31), classId);
}

export function continueSavedRun(): boolean {
  const s = loadRunSave();
  if (!s) return false;
  const r = createRun(s.seed, s.classId, s.equipped.weapon!, s.equipped.armor!, Date.now());
  r.floor = s.floor;
  r.retriesLeft = s.retriesLeft;
  r.hp = s.hp;
  r.maxHp = getClass(s.classId).start.hp;
  r.focus = s.focus;
  r.focusCap = s.focusCap;
  r.power = s.power;
  r.guard = s.guard;
  r.equipped = s.equipped;
  r.inventory = s.inventory;
  r.codexUnlocks = s.codexUnlocks;
  enterFloor(r);
  setRun(r);
  checkpointStore.set(snapshotCheckpoint(r));
  firstCacheDoneThisFloor = false;
  beginRoom();
  goto('game');
  return true;
}

// ---- board callbacks (wired in GameScreen) ----
export function noteReveals(count: number): void {
  if (count <= 0) return;
  const r = run();
  const cap = deriveStats(r).focusCap;
  noteSafeReveals(r, count, cap);
  patchRun(() => {});
}

export function handleCaches(coords: Coord[]): void {
  const r = run();
  const rng = rewardRng();
  let grants = coords.length;
  if (!firstCacheDoneThisFloor && deriveStats(r).rules.luckyCoin && grants > 0) {
    grants += 1;
    firstCacheDoneThisFloor = true;
  } else if (grants > 0) {
    firstCacheDoneThisFloor = true;
  }
  for (let i = 0; i < grants; i++) {
    const def = rollRewards(r.floor, false, rng, 1)[0]!;
    const item = makeItem(def.defId, rng);
    if (addToInventory(r, item) === 'full') {
      pendingPickup.set(item);
      openModal('drop-choice');
      break;
    }
  }
  patchRun(() => {});
}

export function handleMines(coords: Coord[]): void {
  if (coords.length === 0) return;
  mineQueue = [...coords];
  phase.set('combat');
  startNextFight();
}

function startNextFight() {
  const c = mineQueue[0]!;
  const r = run();
  const tile = board().tiles[c.r]![c.c]!;
  const monster = monsterForTile(getFloor(r.floor), tile.isBossMine, combatRngFor(c));
  beginCombat(monster, roundLimitFor(getFloor(r.floor), tile.isBossMine), buildCtx());
}

export function resolveCombat(): void {
  const session = endCombat();
  if (!session) return;
  const r = run();
  const c = mineQueue.shift()!;
  const b = board();
  const tile = b.tiles[c.r]![c.c]!;
  const d = deriveStats(r);

  r.focus = Math.max(0, Math.min(d.focusCap, r.focus - session.focusSpent + session.focusGained));
  if (session.sapperFreeMineUsed) r.sapperFirstMineHandled = true;
  applyHpLoss(r, session.state.hpLoss + postCombatHpCost(r));
  if (session.state.appliedDebuff) applyRoomDebuff(r, session.state.appliedDebuff);

  tile.defused = true;
  tile.revealed = true;
  tile.flagged = false;
  recordMineDefused(r);
  r.fightsThisRoom += 1;

  const codexId = getMonsterDef(session.state.monster.type).codexId;
  if (!r.codexUnlocks.includes(codexId)) {
    r.codexUnlocks.push(codexId);
    persistMeta((m) => (m.codexUnlocks.includes(codexId) ? m : { ...m, codexUnlocks: [...m.codexUnlocks, codexId] }));
  }

  if (getFloor(r.floor).hazard === 'water') {
    spreadWater(b, createRng(r.seed).fork(60000 + r.floor * 100 + r.roomIndex + r.fightsThisRoom));
  }

  bump();
  patchRun(() => {});

  if (mineQueue.length > 0) {
    startNextFight();
    return;
  }
  if (isDead(r)) {
    phase.set('dead');
    return;
  }
  phase.set('playing');
  if (isRoomClear(b)) handleBoardClear();
}

export function handleBoardClear(): void {
  if (get(phase) !== 'playing') return;
  const r = run();
  const heal = onRoomClearHeal(r);
  if (heal > 0) r.hp = Math.min(deriveStats(r).maxHp, r.hp + heal);
  rewardOffers.set(rollRewards(r.floor, isBossRoom(r), rewardRng(), 3));
  patchRun(() => {});
  phase.set('reward');
}

// ---- rewards ----
export function pickReward(defId: string): void {
  const r = run();
  const item = makeItem(defId, rewardRng());
  if (addToInventory(r, item) === 'full') {
    pendingPickup.set(item);
    openModal('drop-choice');
    return;
  }
  patchRun(() => {});
  finishRoom();
}

export function skipReward(): void {
  const r = run();
  const d = deriveStats(r);
  r.hp = Math.min(d.maxHp, r.hp + SKIP_HEAL_HP);
  r.focus = Math.min(d.focusCap, r.focus + 1);
  patchRun(() => {});
  finishRoom();
}

export function resolvePickup(dropId: string): void {
  const r = run();
  const inc = get(pendingPickup);
  if (inc) resolvePickupAtCap(r, inc, dropId);
  pendingPickup.set(null);
  closeModal();
  patchRun(() => {});
  finishRoom();
}

function finishRoom() {
  const r = run();
  roomCleared(r, deriveStats(r).focusCap);
  const step = advanceRoom(r);
  patchRun(() => {});
  if (step === 'run-complete') {
    endRun('win');
  } else if (step === 'next-floor') {
    firstCacheDoneThisFloor = false;
    checkpointStore.set(snapshotCheckpoint(r));
    writeRunSave(r);
    phase.set('floor-cleared');
  } else {
    beginRoom();
  }
}

export function continueToNextFloor(): void {
  beginRoom();
}

// ---- abilities ----
export function abilityView(): { label: string; enabled: boolean } {
  const r = get(runState);
  if (!r) return { label: '', enabled: false };
  const d = deriveStats(r);
  const ab = getClass(r.classId).ability;
  const inCombat = get(phase) === 'combat';
  const label = `${ab.name} (${abilityCost(r, d)})`;
  if (inCombat) return { label, enabled: false }; // in-combat ability is driven from CombatModal
  return { label, enabled: canUseAbility(r, d, false).ok && get(targeting) === null };
}

export function beginTargeting(kind: 'probe' | 'scry'): void {
  const r = get(runState);
  if (!r) return;
  if (!canUseAbility(r, deriveStats(r), false).ok) return;
  targeting.set(kind);
}

export function handleTarget(rr: number, cc: number): void {
  const kind = get(targeting);
  if (!kind) return;
  const r = run();
  const d = deriveStats(r);
  if (kind === 'probe') {
    const res = useProbe(r, board(), { r: rr, c: cc }, d.rules);
    if (res.result.revealed.length) noteReveals(res.result.revealed.length);
    if (res.result.caches.length) handleCaches(res.result.caches);
  } else {
    useScry(r, board(), { r: rr, c: cc }, Date.now(), abilityCost(r, d));
  }
  targeting.set(null);
  bump();
  patchRun(() => {});
  if (isRoomClear(board())) handleBoardClear();
}

// ---- death / end ----
export function retry(): void {
  const r = run();
  const outcome = applyDeath(r);
  if (outcome === 'retry') {
    const cp = get(checkpointStore)!;
    restoreCheckpoint(r, cp);
    setRun(r);
    firstCacheDoneThisFloor = false;
    beginRoom();
  } else {
    endRun('died-out');
  }
}

export function abandon(): void {
  endRun('abandoned');
}

function endRun(outcome: 'win' | 'died-out' | 'abandoned') {
  const r = run();
  lastOutcome.set(outcome);
  persistMeta((m) => recordRunEnd(m, r, outcome === 'win' ? 'win' : 'abandon', Date.now()));
  clearRunSave();
  phase.set(outcome === 'win' ? 'won' : 'summary');
}

export function toWonSummary(): void {
  phase.set('summary');
}

export function toMenu(): void {
  setRun(null);
  clearRoom();
  endCombat();
  reloadMeta();
  ui.update((s) => ({ ...s, selectedClass: null }));
  goto('menu');
  phase.set('loading');
}

// ---- timers ----
export function tickTimers(): void {
  const s = get(boardSession);
  const r = get(runState);
  if (!s || !r || get(phase) !== 'playing') return;
  const rules = deriveStats(r).rules;
  const recovered = recoverEmbers(s.board, Date.now(), rules);
  const anyScry = s.board.tiles.flat().some((t) => t.scryVisibleUntil && t.scryVisibleUntil > Date.now() - 1000);
  if (recovered.length || anyScry) bump();
}
```

> `armEmbers` is called from `GameScreen`'s reveal handler (Step 4), not here — `gameFlow` only handles the re-cover side via `tickTimers`.

- [ ] **Step 4: Rewrite `src/components/GameScreen.svelte`**

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { ui, closeModal, openModal } from '../stores/uiStore';
  import { runState } from '../stores/runStore';
  import { boardSession, applyReveal, applyChord, applyFlag } from '../stores/boardStore';
  import { deriveStats } from '../lib/stats';
  import { getFloor } from '../content/floors';
  import { getClass } from '../content/classes';
  import { armEmbers, isRoomClear } from '../lib/reveal';
  import {
    phase, rewardOffers, pendingPickup, targeting, lastOutcome,
    startNewRun, handleCaches, handleMines, resolveCombat, handleBoardClear,
    pickReward, skipReward, resolvePickup, continueToNextFloor, beginTargeting,
    handleTarget, retry, abandon, toMenu, toWonSummary, abilityView, noteReveals, tickTimers,
  } from '../stores/gameFlow';
  import Board from './Board.svelte';
  import Hud from './Hud.svelte';
  import CombatModal from './CombatModal.svelte';
  import InventoryPanel from './InventoryPanel.svelte';
  import DropChoiceModal from './DropChoiceModal.svelte';
  import RewardScreen from './RewardScreen.svelte';
  import DeathScreen from './DeathScreen.svelte';
  import WinScreen from './WinScreen.svelte';
  import RunSummary from './RunSummary.svelte';
  import FloorIntro from './FloorIntro.svelte';

  const run = $derived($runState);
  const rules = $derived(run ? deriveStats(run).rules : null);
  const ab = $derived(abilityView());

  let timer: ReturnType<typeof setInterval>;
  onMount(() => {
    if ($phase === 'loading') {
      const cls = $ui.selectedClass;
      if (cls) startNewRun(cls);
      else toMenu();
    }
    timer = setInterval(tickTimers, 500);
  });
  onDestroy(() => clearInterval(timer));

  function onReveal(kind: 'reveal' | 'chord', r: number, c: number) {
    if (!rules || !run) return;
    const res = kind === 'chord' ? applyChord(r, c, rules) : applyReveal(r, c, rules);
    armEmbers($boardSession!.board, res.revealed, Date.now(), getFloor(run.floor).emberRecoverMs, rules);
    if (res.revealed.length) noteReveals(res.revealed.length);
    if (res.caches.length) handleCaches(res.caches);
    if (res.mines.length) handleMines(res.mines);
    else if (isRoomClear($boardSession!.board)) handleBoardClear();
  }
</script>

{#if $phase === 'playing' || $phase === 'combat'}
  {#if run}
    <Hud
      abilityLabel={ab.label}
      abilityEnabled={ab.enabled}
      onuseAbility={() => beginTargeting(getClass(run.classId).ability.id === 'probe' ? 'probe' : 'scry')}
      onopenInventory={() => openModal('inventory')}
    />
  {/if}

  <div class="stage" class:targeting={$targeting !== null}>
    <Board
      rules={rules ?? undefined}
      disabled={$phase === 'combat'}
      targetingMode={$targeting}
      ontarget={(r, c) => handleTarget(r, c)}
      onrevealrequest={(kind, r, c) => onReveal(kind, r, c)}
    />
  </div>

  {#if $phase === 'combat'}
    <CombatModal ondone={() => resolveCombat()} />
  {/if}
  {#if $ui.modal === 'inventory'}
    <InventoryPanel open onclose={() => closeModal()} />
  {/if}
  {#if $ui.modal === 'drop-choice' && $pendingPickup}
    <DropChoiceModal incoming={$pendingPickup} onresolve={(id) => resolvePickup(id)} />
  {/if}
{:else if $phase === 'reward'}
  <RewardScreen offers={$rewardOffers} onpick={(d) => pickReward(d)} onskip={() => skipReward()} />
{:else if $phase === 'floor-cleared' && run}
  <FloorIntro floorId={run.floor} oncontinue={() => continueToNextFloor()} />
{:else if $phase === 'dead' && run}
  <DeathScreen retriesLeft={run.retriesLeft} onretry={() => retry()} onabandon={() => abandon()} />
{:else if $phase === 'won'}
  <WinScreen oncontinue={() => toWonSummary()} />
{:else if $phase === 'summary' && run}
  <RunSummary run={run} outcome={$lastOutcome} onmenu={() => toMenu()} />
{/if}

<style>
  .stage { padding: 1.5rem; display: flex; justify-content: center; }
  .stage.targeting :global(.tile:not(:disabled)) { outline: 1px dashed var(--accent); cursor: crosshair; }
</style>
```

- [ ] **Step 5: `Board.svelte` needs no change**

`Board.svelte` was built in its final shape in Task 8 (`onrevealrequest` / `ontarget` / `targetingMode`). The new `GameScreen` in Step 4 consumes exactly that interface. Confirm `npm test -- Board` still passes (it should be untouched).

- [ ] **Step 6: Wire Continue on the menu — update `App.svelte`**

```svelte
  import { hasRunSave } from './lib/storage';
  import { continueSavedRun } from './stores/gameFlow';
  // ...
{:else}
  <MainMenu hasSave={hasRunSave()} oncontinue={() => continueSavedRun()} />
{/if}
```

- [ ] **Step 7: Run the full suite and type check**

Run: `npm test && npm run check`
Expected: all PASS; 0 type errors.

- [ ] **Step 8: Manual smoke in the browser**

Run: `npm run dev`, open the app, start a Sapper run, and confirm: first click opens a region; revealing a monster opens the combat modal; winning/losing a fight returns to the board; clearing a room shows three rewards; skipping heals; the HUD ability button enters a targeting mode.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: game-flow coordinator wiring the full room loop"
```

---

## Task 22: Smoke integration test

**Files:**
- Create: `src/smoke.test.ts`

**Interfaces:**
- Consumes `startRunWithSeed` (already exported by `gameFlow.ts` in Task 21) plus the board/combat/run stores and `loadRunSave`.

- [ ] **Step 1: Write the smoke test**

`src/smoke.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { DEFAULT_RULE_FLAGS } from './lib/types';
import { deriveStats } from './lib/stats';
import { isBossRoom } from './lib/run';
import { SAVE_VERSION, loadRunSave } from './lib/storage';
import { boardSession, applyReveal } from './stores/boardStore';
import { runState } from './stores/runStore';
import { combatSession, act } from './stores/combatStore';
import { reloadMeta } from './stores/metaStore';
import {
  phase, startRunWithSeed, handleMines, handleCaches, handleBoardClear,
  resolveCombat, skipReward, toMenu,
} from './stores/gameFlow';
import { isRoomClear } from './lib/reveal';

function fightOut() {
  for (let i = 0; i < 12 && get(combatSession)?.state.resolution === 'ongoing'; i++) act('strike');
  resolveCombat();
}

function playRoomToClear() {
  const rules = { ...DEFAULT_RULE_FLAGS, ...deriveStats(get(runState)!).rules };
  let safety = 0;
  while (get(phase) === 'playing' && safety++ < 400) {
    const b = get(boardSession)!.board;
    let acted = false;
    for (const t of b.tiles.flat()) {
      if (t.isMine) continue;
      const needs = t.hazard === 'rubble' ? t.rubbleStage < 2 : !t.revealed;
      if (!needs) continue;
      const res = applyReveal(t.r, t.c, rules);
      if (res.caches.length) handleCaches(res.caches);
      acted = true;
      break;
    }
    const b2 = get(boardSession)!.board;
    if (get(phase) === 'playing' && isBossRoom(get(runState)!)) {
      const boss = b2.tiles.flat().find((t) => t.isBossMine && !t.defused);
      if (boss && !b2.tiles.flat().some((t) => !t.isMine && (t.hazard === 'rubble' ? t.rubbleStage < 2 : !t.revealed))) {
        handleMines([{ r: boss.r, c: boss.c }]);
      }
    }
    if (get(phase) === 'combat') fightOut();
    if (get(phase) === 'playing' && isRoomClear(get(boardSession)!.board)) handleBoardClear();
    if (!acted && get(phase) === 'playing') break;
  }
  if (get(phase) === 'reward') skipReward();
}

describe('smoke: a seeded run through floor 1', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadMeta();
    toMenu();
  });

  it('clears every room of floor 1 and writes a valid checkpoint save', () => {
    startRunWithSeed(12345, 'sapper');
    let safety = 0;
    while (!['floor-cleared', 'summary', 'dead'].includes(get(phase)) && safety++ < 20) {
      playRoomToClear();
    }
    expect(get(phase)).toBe('floor-cleared');

    const save = loadRunSave()!;
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.seed).toBe(12345);
    expect(save.classId).toBe('sapper');
    expect(save.floor).toBe(2);
    expect(save.roomIndex).toBe(0);
    expect(save.retriesLeft).toBe(2);
    expect(Array.isArray(save.inventory)).toBe(true);
    expect(save.equipped.weapon).not.toBeNull();
    expect(save.equipped.armor).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it (and the full suite)**

Run: `npm test`
Expected: all PASS, including `smoke`. If the smoke loop stalls, raise the `safety` bounds or check that `handleBoardClear` is being reached for non-boss rooms.

- [ ] **Step 3: Type check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: seeded floor-1 smoke integration test"
```

---

## Task 23: Polish, icons, sound stub, and GitHub Pages deploy

**Files:**
- Create: `src/lib/sfx.ts`
- Create: `src/lib/icons.ts`
- Modify: `src/components/Tile.svelte` (flip/shake animations, hazard glyphs from `icons.ts`)
- Modify: `src/app.css` (keyframes, layout polish)
- Modify: `src/components/GameScreen.svelte` (shake class on mine hit)
- Create: `.github/workflows/deploy.yml`
- Create: `public/.nojekyll`
- Modify: `README.md`
- Test: `src/lib/sfx.test.ts`, `src/lib/icons.test.ts`

**Interfaces:**
- `sfx.ts`: `export const sfx = { play(name: string): void }` — no-op that never throws; safe to call from anywhere.
- `icons.ts`: `export function hazardGlyph(h: HazardType): string`, `export function tileGlyph(kind: 'mine' | 'defused' | 'flag' | 'cache'): string` — returns short unicode/emoji tokens (no SVG files needed for v1; the "curated set" is this glyph table plus CSS).

- [ ] **Step 1: Write the failing helper tests**

`src/lib/sfx.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { sfx } from './sfx';

describe('sfx', () => {
  it('play is a no-op that never throws', () => {
    expect(() => sfx.play('reveal')).not.toThrow();
    expect(sfx.play('anything')).toBeUndefined();
  });
});
```

`src/lib/icons.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hazardGlyph, tileGlyph } from './icons';

describe('icons', () => {
  it('maps each hazard to a non-empty glyph', () => {
    for (const h of ['none', 'rubble', 'water', 'ember', 'cursed'] as const) {
      expect(typeof hazardGlyph(h)).toBe('string');
    }
    expect(hazardGlyph('ember')).not.toBe('');
  });
  it('maps tile kinds to glyphs', () => {
    expect(tileGlyph('mine')).not.toBe('');
    expect(tileGlyph('flag')).not.toBe('');
  });
});
```

- [ ] **Step 2: Implement `src/lib/sfx.ts` and `src/lib/icons.ts`**

```ts
// src/lib/sfx.ts
export const sfx = {
  play(_name: string): void {
    // v1 ships silent; this hook is where audio would attach.
  },
};
```

```ts
// src/lib/icons.ts
import type { HazardType } from './types';

export function hazardGlyph(h: HazardType): string {
  switch (h) {
    case 'rubble': return '▦';
    case 'water': return '≈';
    case 'ember': return '✷';
    case 'cursed': return '?';
    default: return '';
  }
}

export function tileGlyph(kind: 'mine' | 'defused' | 'flag' | 'cache'): string {
  switch (kind) {
    case 'mine': return '◆';
    case 'defused': return '☠';
    case 'flag': return '⚑';
    case 'cache': return '❖';
  }
}
```

- [ ] **Step 3: Run helper tests**

Run: `npm test -- sfx icons`
Expected: PASS.

- [ ] **Step 4: Polish `Tile.svelte`**

Update the `face` derivation to use `icons.ts` (`tileGlyph`/`hazardGlyph`) instead of inline literals, and add animation classes:

```svelte
<button
  ...
  class:just-revealed={tile.revealed}
>
```

Add to the component `<style>`:

```css
.tile.just-revealed { animation: flip 140ms ease-out; }
@keyframes flip { from { transform: rotateX(90deg); } to { transform: rotateX(0); } }
```

And in `src/app.css` add a board-shake used by GameScreen:

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
.shake { animation: shake 200ms ease-in-out; }
```

In `GameScreen.svelte`, toggle a `shake` class on `.stage` for ~200ms when `onReveal` produces `res.mines.length`. Call `sfx.play('mine')` / `sfx.play('reveal')` / `sfx.play('clear')` at the matching points (no-ops for now).

- [ ] **Step 5: GitHub Pages deploy workflow**

`public/.nojekyll` — empty file.

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 6: Update `README.md`**

```markdown
# gemsweeper

Minesweeper at its core, wrapped in a small roguelike RPG: four themed floors,
monsters where the mines are, gear that rewrites the rules, floor checkpoints,
two retries. Static Svelte SPA, no backend, saves in `localStorage`.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # vitest
npm run check    # svelte-check
npm run build    # static build into dist/
```

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. Set Pages source to "GitHub Actions" in repo
settings. The app is served from `/gemsweeper/` (see `vite.config.ts` `base`).

## Design docs

- Spec: `docs/superpowers/specs/2026-09-09-gemsweeper-design.md`
- Plan: `docs/superpowers/plans/2026-09-10-gemsweeper.md`
```

- [ ] **Step 7: Full verification**

Run: `npm test && npm run check && npm run build`
Expected: all tests PASS; 0 type errors; `dist/` produced with `index.html` referencing `/gemsweeper/` asset paths.

- [ ] **Step 8: Manual playtest pass**

`npm run preview` and play at least one full run per class. Sanity-check each floor's hazard, a boss fight, a death + checkpoint retry, an inventory-full drop choice, and the run summary + stats screen. Note balance problems as issues/`content/*` tweaks — do not block the commit on tuning.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: polish, glyph set, sound stub, and Pages deploy workflow"
```

---

## Self-Review (completed by plan author)

**Spec coverage**

| Spec section | Task(s) |
|---|---|
| 3 Tech stack / structure | 1, 2, and every task's file layout |
| 4.1 Run shape, retries | 11, 21 |
| 4.2 Floors + hazards | 4 (config), 6 (gen), 7 (hazard behaviour), 18 (intro copy) |
| 4.3 Rooms, boss mine, caches | 6, 11, 21 |
| 4.4 Reward screen | 15 (roll), 20 (screen), 21 (wiring) |
| 5.1–5.2 Minesweeper + generation | 6, 7, 8 |
| 5.3 No no-guess guarantee | 6 (documented, first-click-safe only) |
| 5.4 Hazard interactions | 7 (rubble/water/ember/cursed), 21 (water spread, ember timers) |
| 5.5 Room-clear tracking | 7 (`countRevealedSafe`/`countTotalSafe`/`isRoomClear`) |
| 6.1 Stats | 2, 11, 12 |
| 6.2 Combat | 13, 14, 21 |
| 6.3 Item hooks in combat | 13 (`strikeHitsAllPips`, `firstFightAutoWin`, `focusOnBlock`), 15, 21 (`postCombatHpCost`) |
| 7.1 Classes + abilities | 9, 17, 21 |
| 7.2 Equipment slots + cap | 16 |
| 7.3 Item model + `modifyRules` | 2 (`RuleFlags`), 12 (merge + read sites), 15 (defs) |
| 7.4 Rarity + boss reward | 15 (`rollRewards`) |
| 7.5 Starter pool (~24) | 15 (25 defs) |
| 8.1 `gemsweeper:meta` | 19 |
| 8.2 `gemsweeper:save` (checkpoint only) | 19 (`writeRunSave`), 21 (called at floor entry only) |
| 9 Screens + navigation | 8, 14, 16, 18, 20, 21 |
| 10 Narrative layer | 10 (content), 18/20 (surfaced), 21 (codex unlock on kill) |
| 11 Testing strategy | every task is TDD; 22 is the smoke test |
| 12 Build sequence | task order mirrors it |
| 13 Tuning constants | isolated in `content/floors.ts`, `content/items.ts`, `combat.ts`, `gameFlow.ts` |

**Placeholder scan:** no `TBD`/`TODO`/"handle edge cases" left; every code step has literal code; the two earlier "bait" notes were removed and replaced with correct code.

**Type consistency:** `RevealResult`, `CombatContext`, `CombatStepResult` (with `sapperFreeMineUsed`), `MonsterInstance` (with `debuffStat`), `DerivedStats`, `Checkpoint`, `RunState`, `RunSave`, `MetaSave` are defined once in Task 2 and referenced verbatim thereafter. `placeMines(board, cfg, first, rng)` is consistent across Tasks 6, 8, 21, 22. `deriveStats(run)` returns `{ maxHp, power, guard, focusCap, rules }` everywhere. `Board.svelte`'s props (`onrevealrequest` / `ontarget` / `targetingMode`) are its final shape from Task 8; Task 21 only adds a consumer. Every `gameFlow` export referenced by `GameScreen` (Task 21 Step 4) — including `startRunWithSeed`, `toWonSummary`, `noteReveals` — is in the Task 21 interface list.

**Known follow-ups (not blockers, safe to defer):**
- Mid-combat gear swaps don't refresh `CombatContext` (captured at `beginCombat`). Acceptable for v1.
- `continueSavedRun` loses `startedAtMs`; the summary's minute count is approximate after a resume.
- Balance constants are first-pass guesses; Task 23 Step 8 is where they get tuned.

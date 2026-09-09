# Gemsweeper — Design Spec

**Date:** 2026-09-09
**Status:** Approved for planning
**Type:** New project (architectural)

---

## 1. Summary

Gemsweeper is a single-page browser game with classic Minesweeper deduction at
its core, wrapped in a light roguelike RPG. The player picks a class and
descends a four-floor dungeon. Each room is a Minesweeper board; mines are
monsters. Revealing a mine triggers a short tactical fight resolved with the
character's stats and equipped gear rather than ending the game. Rooms yield
powered items that bend the rules of the board and combat. A run is a
25–45 minute session with floor checkpoints and a hard cap of two retries.

The game is a personal portfolio piece: static SPA, no backend, deployed to
GitHub Pages, saves in `localStorage`. Scope is deliberately tight and
finishable. There is **no meta-progression grind** — every run is the same
difficulty, and replay value comes from procedural boards, item synergies, and
floor variety. Lifetime stats and a monster codex are tracked locally.

---

## 2. Goals and non-goals

### Goals

- Preserve real Minesweeper deduction (numbers, flags, chording) unchanged.
- Layer an RPG identity on top: class fantasy, stats, gear, atmosphere.
- Every mine hit is a small decision, not a coin flip, and resolves in
  at most three clicks.
- A run is self-contained, reproducible from a seed, and completable in one
  sitting.
- Content is additive: new items and monsters are data entries, not new
  systems.
- Ship a polished, well-tested static site suitable for a portfolio.

### Non-goals

- No accounts, backend, server, or online leaderboard.
- No meta-progression: no unlock currency, no upgrade tree, no power creep
  between runs. (Explicitly deferred; may be revisited in a future version.)
- No dialogue trees or branching narrative choices.
- No canvas/WebGL rendering. The board is DOM.
- No no-guess solvability guarantee (see 5.3).
- No mobile-first design work for v1 (should be *usable* on a tablet, not
  optimized for phones).

---

## 3. Tech stack and project structure

- **Svelte + TypeScript + Vite.** Static build, deployed to GitHub Pages.
- **State:** Svelte stores, split by concern:
  - `runStore` — current run: seed, classId, floor, roomIndex, retriesLeft,
    HP, focus, focusCap, Power, Guard, equipped slots, inventory,
    codexUnlocks.
  - `boardStore` — the current room's grid and per-room transient state
    (revealed set, flagged set, hazard timers, room-scoped stat debuffs).
  - `metaStore` — lifetime stats and codex unlock set; the in-memory mirror
    of `gemsweeper:meta`.
  - `uiStore` — which screen is active and which modal (if any) is open.
- **Pure logic modules** (no Svelte imports, unit-tested in isolation):
  - `rng.ts` — seeded PRNG (mulberry32). All randomness in a run flows
    through a single seeded generator so runs are reproducible.
  - `boardgen.ts` — grid construction from `(seed, floor, roomIndex)`.
  - `reveal.ts` — flood fill for zero regions, chord resolution, neighbour
    math.
  - `combat.ts` — the mine-hit fight state machine.
  - `items.ts` — item data and effect resolution at named hook points.
  - `run.ts` — room → floor → checkpoint → run-end progression and retry
    accounting.
  - `content/` — static data: `items.ts`, `monsters.ts`, `floors.ts`,
    `classes.ts`, `narrative.ts`.
- **Components are thin** and read from stores / call logic modules:
  `App.svelte` (screen router), `MainMenu.svelte`, `ClassSelect.svelte`,
  `PrologueCard.svelte`, `FloorIntro.svelte`, `GameScreen.svelte`,
  `Board.svelte`, `Tile.svelte`,
  `Hud.svelte`, `CombatModal.svelte`, `InventoryPanel.svelte`,
  `RewardScreen.svelte`, `DeathScreen.svelte`, `WinScreen.svelte`,
  `RunSummary.svelte`, `StatsScreen.svelte`, `CodexScreen.svelte`,
  `HowToPlay.svelte`.
- **Persistence layer:** `storage.ts` wraps `localStorage` with namespaced
  keys, JSON (de)serialization, and version checks.

### Presentation

- CSS + a curated SVG icon set (~30 icons: tile states, monster types, item
  slots, hazards, HUD glyphs).
- CSS animations for feel: tile flip on reveal, board shake on mine hit,
  pip depletion in combat, slide-over for inventory.
- A sound hook layer is stubbed (`sfx.play(name)`) but v1 may ship with
  minimal or no audio; it must not block other work.

---

## 4. Run structure

### 4.1 Shape of a run

- **4 floors**, each themed, with escalating board size and mine density and
  its own hazard tile and monster set.
- Each floor is **4–6 rooms**. The **first room of a floor is the
  checkpoint** — the save snapshot is written on entering it. The **last room
  of a floor is a boss room**.
- Clearing the last floor's boss room = **run win**.
- **Retries:** a run starts with **2 retries** (3 attempts total). On death
  the player may retry from the current floor's checkpoint or abandon. At
  0 retries the only option is abandon. Abandon and win both record stats and
  clear the save.

### 4.2 Floors

| # | Name | Board | Density | Hazard tile |
|---|------|-------|---------|-------------|
| 1 | The Cellars | 8×8 | low | **Rubble** — must be cleared twice; the first reveal shows a rubble glyph, not a number. |
| 2 | The Flooded Vault | 10×10 | low-mid | **Water** — each time the player takes a mine hit, water spreads to one random revealed tile adjacent to existing water; fully watered tiles cost 1 Focus to re-enter path logic (flavor: slows chording — see 5.4). |
| 3 | The Ashworks | 12×12 | mid | **Ember** — re-covers itself ~10s after being revealed unless flagged; re-covered embers must be revealed again. |
| 4 | The Undercroft | 14×14 | high | **Cursed** — displayed number is off by ±1 (consistent per tile for the room). |

Exact density values are tuning constants in `content/floors.ts`, expressed
as target mine ratio per floor. Board sizes are fixed per floor.

### 4.3 Rooms

- Room count per floor is drawn from the seed within the 4–6 range.
- Non-boss rooms clear when **all non-mine tiles are revealed**.
- Boss rooms clear when all non-mine tiles are revealed **and** the Boss Mine
  is defused. The Boss Mine is a single special mine tile; revealing it starts
  a longer fight (4–6 pips, see 6).
- **Cache tiles:** 0–2 per room (seeded), a special safe tile that grants an
  item immediately on reveal. Boss rooms guarantee one higher-rarity reward on
  clear in addition to any cache tiles.

### 4.4 Reward screen

After each room clears, the player is offered **3 items** (drawn from the pool,
weighted toward the current floor and rarity table) and may:

- pick 1, or
- **skip for a heal**: restore a small fixed amount of HP and 1 Focus.

---

## 5. Board and Minesweeper mechanics

### 5.1 Core interactions (unchanged from classic)

- **Left click** — reveal a tile.
- **Right click** — toggle flag.
- **Chord** — clicking a satisfied number (flag count around it equals its
  value) reveals its unflagged neighbours.
- Numbers show the count of adjacent mines (monsters) in the 8-neighbourhood.

### 5.2 Board generation (`boardgen.ts`)

Input: `(seed, floor, roomIndex)`, plus room type (normal / boss) and hazard
type from `content/floors.ts`.

1. Compute board dimensions and mine count from floor config.
2. Reserve the first-click neighbourhood: mines are only placed after the
   first reveal, excluding the clicked tile and its 8 neighbours.
3. Place mines uniformly at random (seeded) in the remaining tiles.
4. Place the Boss Mine (boss rooms only) as one designated mine tile.
5. Place cache tiles among safe tiles (seeded count 0–2, or 1 for boss).
6. Assign hazard tiles among non-mine tiles per floor rules and density.
7. Compute adjacency numbers. For **Cursed** floors, precompute the ±1 lie
   per tile (seeded, fixed for the room).

Guarantees: **first click is always safe** and opens **at least one zero
region** (regenerate mine placement up to a bounded number of attempts to
satisfy this; if unsatisfiable within the cap, accept the closest result).

### 5.3 Solvability

The generator does **not** guarantee a no-guess solution. Forced guesses are
acceptable tension because a wrong guess triggers a fight, not instant death.
This is a deliberate scope decision.

### 5.4 Hazard interactions with reveal/chord

- **Rubble:** a rubble tile's first reveal sets it to "cleared once" (shows a
  rubble glyph). It does not contribute to room-clear until revealed a second
  time, at which point it behaves as a normal revealed tile and shows its
  number. Chording never auto-clears a rubble tile past its first state.
- **Water:** spreading is driven by `combat`/`run` on mine hits, not by
  reveal. A "fully watered" revealed tile is excluded from chord auto-reveal
  (the player must click it directly), representing the slog. It still counts
  toward room-clear once revealed.
- **Ember:** on reveal, schedule a re-cover timer (~10s, tuning constant).
  Flagging the tile cancels the timer. On timer expiry, if still unflagged and
  not part of a completed room, the tile returns to covered and is removed
  from the revealed set; room-clear tracking updates accordingly.
- **Cursed:** purely a display transform on the number; deduction logic and
  win conditions use the true adjacency count. The player sees the lie.

### 5.5 Room-clear tracking

`boardStore` maintains `revealedSafeCount` and `totalSafeCount`
(safe = non-mine, counting rubble tiles as needing two reveals). Room clears
when `revealedSafeCount === totalSafeCount` (and Boss Mine defused for boss
rooms). Ember re-covers decrement `revealedSafeCount`.

---

## 6. Stats and combat

### 6.1 Character stats

- **HP** — run-level health, persists across rooms within a floor. 0 HP =
  death.
- **Power** — offensive weight in combat.
- **Guard** — reduces HP lost from combat outcomes.
- **Focus** — resource for class abilities and some item effects.
  - `focusCap` starts at 3 (class- and item-modifiable).
  - Gained: +1 per room cleared; class passives and items add more.
  - Not separately refilled on retry — the player resumes with the checkpoint
    loadout's values (see 8.2).

Starting stat values are per class (7.1). There is **no leveling**; stat
growth comes only from equipped gear and (temporary, room-scoped) debuffs.

### 6.2 The mine-hit fight (`combat.ts`)

Triggered when a mine tile is revealed (including via chord or Probe
resolution rules — Probe auto-flags instead, see 7.1). Opens `CombatModal`
and pauses board input.

**Monster:**

- **Threat** — scales with floor (tuning constant per floor).
- **Type** — `armored | fast | cursed` (distinct from the Cursed hazard).
- **Pips** — 1–2 for normal monsters, 4–6 for a Boss Mine.

**Structure:** the fight runs a fixed **round limit** (3 for normal, higher
for bosses — tuning constant). Each round the player picks one action:

- **Strike** — reduce monster pips by an amount derived from Power.
- **Block** — negate all incoming damage this round; deal none.
- **Ability** — the class ability, if the Focus cost is affordable and the
  ability is usable in combat (7.1).

The monster acts each round based on type:

- **Armored** — Strike deals half unless the player's previous action was
  Block (poise break carries one round).
- **Fast** — acts before the player; Block only partially mitigates.
- **Cursed** — on dealing damage, applies a lingering **−1 to a random stat**
  until the end of the current room (room-scoped debuff, tracked in
  `boardStore`).

**Resolution:**

- **Win** — monster pips reach 0 within the round limit: tile defused, no HP
  loss.
- **Timeout / loss** — round limit reached with pips remaining: player takes
  `max(1, Threat − Guard)` HP; tile is **still defused** (the player is never
  stuck on a tile).
- After resolution: apply item `onCombatRound` / post-fight effects, close
  modal, resume board, record the monster type for the codex (first kill
  unlocks its entry).

### 6.3 Item hooks in combat

Items may register effects at `onMineReveal` (before the fight),
`onCombatRound` (each round), and post-fight. Examples: "first fight each
room is auto-won", "Strike hits all pips", "gain 1 Focus when you Block".

---

## 7. Classes, abilities, equipment

### 7.1 Classes

Both classes are available from the start; the player chooses at run start on
`ClassSelect`.

| | **Sapper** | **Diviner** |
|---|---|---|
| Fantasy | Grizzled demolitions expert | Nervy occult scholar |
| Start stats | HP 12, Power 4, Guard 3, Focus 3 (cap 3) | HP 9, Power 3, Guard 2, Focus 5 (cap 5) |
| Start gear | Sapper's Pick (Weapon), Blast Plating (Armor) | Divining Rod (Weapon), Plain Robe (Armor) |
| Signature ability | **Probe** — cost 2 Focus. Safely reveal one chosen tile; if it was a mine, auto-flag it instead of fighting. Once per room. **Not usable in combat.** | **Scry** — cost 2 Focus. Reveal all mines in a chosen 3×3 for 6 seconds. Usable any time, including in combat. |
| Ability in combat | Unavailable. Instead a passive: **−1 HP loss from combat outcomes** (stacks with Guard, min 1 still applies). | Scry in combat instead auto-resolves one pip on the target monster. |
| Passive | The **first mine hit each room deals no HP loss** (the fight still happens; a timeout that room costs 0). | **+1 Focus per 10 safe tiles revealed** this room. |

Balance intent: Sapper is durable and forgiving and plays greedy; Diviner is
fragile but information-rich and plays precise.

### 7.2 Equipment slots

- **Weapon** ×1, **Armor** ×1, **Trinket** ×2.
- Equipping/unequipping is free and allowed at any time, including mid-room
  and between combat rounds.
- **Inventory** holds unequipped items, cap **8**. Picking up at cap forces a
  drop choice (modal). No stacking; each item is a distinct object with its
  own id.

### 7.3 Item model

```ts
type Slot = 'weapon' | 'armor' | 'trinket';
type Rarity = 'common' | 'rare' | 'cursed';

interface Item {
  id: string;          // unique instance id
  defId: string;       // content definition id
  name: string;
  slot: Slot;
  rarity: Rarity;
  flavor: string;
  effects: Effect[];
}
```

`Effect` is a tagged union resolved by `items.ts` at named hook points:

- `onEquip` / `onUnequip` — additive stat modifiers (Power, Guard, HP max,
  focusCap).
- `onRoomStart` — e.g. reveal a random safe tile.
- `onSafeReveal` — e.g. chance to gain Focus.
- `onMineReveal` — e.g. negate this fight.
- `onCombatRound` — e.g. Strike hits all pips.
- `onRoomClear` — e.g. bonus heal.
- `modifyRules` — static boolean/number flags read by board and combat code:
  `firstMineFree`, `chordWithoutFlags`, `revealShowsNumberOnFlag`,
  `noFlagging`, `immuneEmberRecover`, `numbersSometimesLie`, etc.

Adding an item is a new `content/items.ts` entry plus, occasionally, one new
`modifyRules` flag consumed at a single site.

### 7.4 Rarity and rewards

- **Common / Rare / Cursed.** Cursed items are strong with a real drawback
  (e.g. "+3 Power, but you cannot flag").
- Reward draws are weighted by the current floor and a rarity table (tuning
  constants). Boss rooms guarantee one higher-rarity item.

### 7.5 Starter item pool (v1 target ~24)

Representative set (final list and numbers in `content/items.ts`):

- **Weapons:** Sapper's Pick (+2 Power); Divining Rod (Scry costs −1 Focus);
  Reaper Edge (Strike hits all pips; −2 HP per fight).
- **Armor:** Blast Plating (+3 Guard); Ember Cloak (immune to ember
  re-cover); Plain Robe (no effect, starter); Cursed Aegis (negate first mine
  each room; numbers sometimes lie).
- **Trinkets:** Flagger's Charm (flagging a tile reveals its number);
  Focus Battery (+2 focusCap); Lucky Coin (first cache tile each floor is
  free — grants a second item); Cartographer's Eye (reveal a random safe tile
  at room start); Bloodpact Ring (+2 Power while at ≤50% HP).

---

## 8. Persistence

`localStorage`, via `storage.ts`, two namespaced keys. Both carry a `version`
integer; on mismatch the affected data is discarded (acceptable for a hobby
project).

### 8.1 `gemsweeper:meta` — lifetime data

```ts
interface MetaSave {
  version: number;
  runsStarted: number;
  runsWon: number;
  bestDepth: number;        // deepest floor/room reached
  fastestWinMs: number | null;
  monstersDefused: number;
  codexUnlocks: string[];   // monster type ids seen defeated
}
```

Written on run end (win / abandon) and whenever a codex entry first unlocks.

### 8.2 `gemsweeper:save` — single in-progress run

```ts
interface RunSave {
  version: number;
  seed: number;
  classId: 'sapper' | 'diviner';
  floor: number;            // 1..4
  roomIndex: number;        // room within floor at last checkpoint (always the floor's first room)
  retriesLeft: number;
  hp: number;
  focus: number;
  focusCap: number;
  power: number;
  guard: number;
  equipped: { weapon: Item | null; armor: Item | null; trinkets: [Item | null, Item | null] };
  inventory: Item[];
  codexUnlocks: string[];
}
```

- Written **only at each floor checkpoint** (entering the first room of a
  floor), not on every move.
- **Board state is not saved.** Re-entering a floor regenerates its rooms
  from `(seed, floor, roomIndex)`. A death sends the player back to the floor
  checkpoint with exactly the loadout recorded there.
- Cleared on run end (win / abandon).
- `Continue` on the main menu is shown only when a valid `gemsweeper:save`
  exists.

---

## 9. Screens and navigation

`uiStore` holds `screen` and optional `modal`. `App.svelte` routes on
`screen`.

- **Main Menu** — New Run, Continue (conditional), Stats, Codex, How to Play.
- **Class Select** — two class cards (stats, starting gear, one-line
  playstyle), Confirm.
- **Prologue Card** — one-paragraph framing, shown once at run start.
- **Floor Intro** — floor title, 2–3 sentences of mood, one mechanical note.
  Shown before each floor.
- **Game Screen** — `Board` centre; `Hud` (HP, Focus, Power, Guard, retries
  left, floor/room pips, ability button, equipped-slot strip that opens the
  Inventory Panel).
- **Combat Modal** — monster icon/type/threat, pip track, three action
  buttons, round counter, live stat readout.
- **Inventory Panel** — slide-over: equipped slots + inventory grid,
  click-to-equip, effect tooltips, drop button.
- **Reward Screen** — 3 item cards + "Skip for heal".
- **Drop Choice Modal** — shown when picking up at inventory cap.
- **Death Screen** — "Retry from floor checkpoint (N left)" or "Abandon run";
  at 0 retries only "Abandon".
- **Win Screen** → **Run Summary** — depth, time, monsters defused, final
  loadout; writes stats; returns to menu.
- **Stats Screen** — lifetime numbers from `MetaSave`.
- **Codex Screen** — unlocked monster entries with flavor; locked entries
  shown as silhouettes.
- **How to Play** — static rules reference.

---

## 10. Narrative / role-play layer

All narrative is static data in `content/narrative.ts`. No branching, no
dialogue trees.

- **Prologue:** one paragraph establishing the delve.
- **Floor intro cards:** title + 2–3 sentences of mood + one mechanical
  note per floor.
- **Item flavor text:** one line on every item.
- **Monster codex:** an entry per monster type, unlocked on first defeat,
  viewable from the Codex screen.
- **Boss intro line:** one per boss room.
- **Ending cards:** ~3 short variants keyed to outcome — win, died-out
  (0 retries), abandoned.

The role-play is carried by class identity, atmosphere text, the codex, and
the build the player expresses through gear — not by plot mechanics.

---

## 11. Testing strategy

- **Vitest unit tests** on every pure module:
  - `rng` — determinism, same seed → same stream.
  - `boardgen` — mine count matches floor config; first click and its
    neighbourhood always safe; at least one zero region; same
    `(seed, floor, roomIndex)` → identical board; hazard counts within
    expected range; cursed ±1 stable per tile.
  - `reveal` — flood fill on zero regions; chord reveals exactly the
    unflagged neighbours of a satisfied number; correct behaviour at edges
    and corners; rubble two-state handling; watered tiles excluded from
    chord.
  - `combat` — each monster type's rule; win, timeout, and Guard math
    (`max(1, Threat − Guard)`); Sapper first-mine-free; Focus spend and
    affordability; boss pip/round values.
  - `items` — each effect fires at its hook; every `modifyRules` flag is
    actually read at its consuming site; stat mods apply and revert on
    equip/unequip.
  - `run` — room → floor → checkpoint → run-end transitions; retry
    decrement; run-win and died-out conditions; save written only at
    checkpoints.
- **Component tests** (Svelte Testing Library):
  - `Board` — reveal, flag, chord via DOM events.
  - `CombatModal` — action flow and resolution display.
  - `InventoryPanel` — equip, unequip, drop, cap-triggered drop modal.
- **One smoke integration test:** run a seeded game, script inputs through
  floor 1, assert the checkpoint `RunSave` shape and values.
- Manual playtest pass per floor for feel and balance. No e2e framework in
  v1.

---

## 12. Build sequence

For the implementation plan to expand:

1. `rng`
2. `boardgen`
3. `reveal`
4. `Board` / `Tile` components + `GameScreen` shell (playable single board)
5. `run` — room/floor loop, checkpoints, retries
6. `combat` + `CombatModal`
7. `items` + effect resolution + `content/items.ts`
8. Equipment slots + `InventoryPanel` + drop flow
9. Classes + abilities (`content/classes.ts`, Probe, Scry)
10. Remaining screens + `App` router + `uiStore`
11. Narrative content + Codex + Stats
12. `storage.ts` persistence wiring (meta + save)
13. Polish: animation, SVG icon set, sound hook stubs, balance tuning

---

## 13. Open tuning constants (not blockers)

Collected in `content/*` for iteration during playtest:

- Per-floor mine density ratios and hazard counts.
- Per-floor monster Threat values and type distribution.
- Combat round limits (normal / boss) and Strike/Power damage curve.
- Focus gain rates and ability costs.
- Reward rarity table and floor weighting.
- Ember re-cover delay; skip-for-heal amount.
- Room-count range per floor (within 4–6).

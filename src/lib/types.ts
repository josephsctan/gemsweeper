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
  rng: any;
  combat?: CombatState;
  now: number;
}

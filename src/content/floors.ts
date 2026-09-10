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

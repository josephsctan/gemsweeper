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

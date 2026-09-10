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

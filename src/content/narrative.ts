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

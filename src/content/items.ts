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

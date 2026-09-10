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
    if (k === 'scryFocusDiscount') {
      if ((v as number) > 0) parts.push(`Scry costs ${v} less Focus`);
    } else if (v) {
      parts.push(FLAG_TEXT[k] ?? k);
    }
  }
  return parts.length ? parts.join('; ') : '—';
}

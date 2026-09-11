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

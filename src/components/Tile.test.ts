import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { TileState } from '../lib/types';
import { tileGlyph } from '../lib/icons';
import { SCRY_DURATION_MS } from '../lib/abilities';
import Tile from './Tile.svelte';

function mineTile(over: Partial<TileState> = {}): TileState {
  return {
    r: 2, c: 3,
    isMine: true, isBossMine: false, isCache: false,
    adjacent: 0, displayDelta: 0, hazard: 'none',
    revealed: false, flagged: false, defused: false,
    rubbleStage: 0, watered: false,
    emberRecoverAt: null, numberPeeked: false, scryVisibleUntil: null,
    ...over,
  };
}

const face = () => screen.getByTestId('tile-2-3').textContent;

describe('Tile.svelte scry window', () => {
  afterEach(() => vi.useRealTimers());

  it('shows a scried mine while the window is open and hides it once it expires', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const tile = mineTile({ scryVisibleUntil: Date.now() + SCRY_DURATION_MS });

    const { rerender } = render(Tile, {
      props: { tile, disabled: false, onreveal: () => {}, onflag: () => {} },
    });
    expect(face()).toBe(tileGlyph('mine'));

    // still inside the 6s window
    vi.setSystemTime(1_000_000 + SCRY_DURATION_MS - 1);
    await rerender({ tile: { ...tile } }); // a board bump re-evaluates the face
    expect(face()).toBe(tileGlyph('mine'));

    // past the deadline: the tile goes back to being an unknown covered tile
    vi.setSystemTime(1_000_000 + SCRY_DURATION_MS + 1);
    await rerender({ tile: { ...tile } });
    expect(face()).toBe('');
  });

  it('a flag still wins over a live scry reveal', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);
    const tile = mineTile({ flagged: true, scryVisibleUntil: Date.now() + SCRY_DURATION_MS });
    render(Tile, { props: { tile, disabled: false, onreveal: () => {}, onflag: () => {} } });
    expect(face()).toBe(tileGlyph('flag'));
  });
});

<script lang="ts">
  import type { TileState } from '../lib/types';
  import { hazardGlyph, tileGlyph } from '../lib/icons';

  let { tile, disabled, onreveal, onflag }: {
    tile: TileState;
    disabled: boolean;
    onreveal: () => void;
    onflag: () => void;
  } = $props();

  function contextmenu(e: MouseEvent) {
    e.preventDefault();
    if (!disabled) onflag();
  }

  function click() {
    if (!disabled) onreveal();
  }

  // Scry's window is time-bounded: re-checked on every board bump (GameScreen's
  // 500ms tickTimers keeps bumping while any scry is live), so the reveal fades.
  const scryLive = $derived(!!tile.scryVisibleUntil && tile.scryVisibleUntil > Date.now());

  const face = $derived.by(() => {
    if (tile.hazard === 'rubble' && tile.rubbleStage === 1) return hazardGlyph('rubble');
    if (!tile.revealed) {
      if (tile.flagged) return tileGlyph('flag');
      if (tile.numberPeeked || scryLive) {
        return scryLive && tile.isMine
          ? tileGlyph('mine')
          : String(Math.max(0, tile.adjacent + tile.displayDelta) || '');
      }
      return '';
    }
    if (tile.isMine) return tile.defused ? tileGlyph('defused') : tileGlyph('mine');
    const shown = Math.max(0, tile.adjacent + tile.displayDelta);
    return shown === 0 ? '' : String(shown);
  });

  // Classic Minesweeper color-codes each adjacency count (1=blue, 2=green,
  // 3=red, ...) — null whenever `face` isn't a plain digit (blank, flag,
  // mine glyph, rubble glyph), so those keep the tile's default ink color.
  const shownNumber = $derived.by(() => {
    const n = Number(face);
    return face !== '' && Number.isInteger(n) && n >= 1 ? n : null;
  });

  // Same two-tone checkerboard the covered/revealed regions use in classic
  // implementations — a quiet depth cue with zero extra state.
  const alt = $derived((tile.r + tile.c) % 2 === 1);
</script>

<button
  type="button"
  data-testid={`tile-${tile.r}-${tile.c}`}
  class="tile"
  class:alt
  class:revealed={tile.revealed || (tile.hazard === 'rubble' && tile.rubbleStage >= 1)}
  class:flag={tile.flagged}
  class:mine={tile.revealed && tile.isMine}
  class:watered={tile.watered}
  class:just-revealed={tile.revealed}
  style:color={shownNumber ? `var(--num-${shownNumber})` : undefined}
  {disabled}
  onclick={click}
  oncontextmenu={contextmenu}
>{face}</button>

<style>
  .tile {
    width: 28px; height: 28px; padding: 0;
    border: 1px solid #0c0c12;
    border-radius: 4px;
    background: var(--tile-covered);
    color: var(--ink);
    font-weight: 700;
    cursor: pointer;
  }
  .tile.alt { background: var(--tile-covered-alt); }
  .tile.revealed { background: var(--tile); cursor: default; }
  .tile.revealed.alt { background: var(--tile-alt); }
  .tile.flag { color: var(--flag); }
  .tile.mine { background: var(--danger); }
  .tile.watered { box-shadow: inset 0 0 0 2px #2f6f9f; }
  .tile:disabled { cursor: not-allowed; }
  .tile.just-revealed { animation: flip 140ms ease-out; }
  @keyframes flip {
    from { transform: rotateX(90deg); }
    to { transform: rotateX(0); }
  }
</style>

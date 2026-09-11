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

  const face = $derived.by(() => {
    if (tile.hazard === 'rubble' && tile.rubbleStage === 1) return hazardGlyph('rubble');
    if (!tile.revealed) {
      if (tile.flagged) return tileGlyph('flag');
      if (tile.numberPeeked || tile.scryVisibleUntil) {
        return tile.scryVisibleUntil && tile.isMine
          ? tileGlyph('mine')
          : String(Math.max(0, tile.adjacent + tile.displayDelta) || '');
      }
      return '';
    }
    if (tile.isMine) return tile.defused ? tileGlyph('defused') : tileGlyph('mine');
    const shown = Math.max(0, tile.adjacent + tile.displayDelta);
    return shown === 0 ? '' : String(shown);
  });
</script>

<button
  type="button"
  data-testid={`tile-${tile.r}-${tile.c}`}
  class="tile"
  class:revealed={tile.revealed || (tile.hazard === 'rubble' && tile.rubbleStage >= 1)}
  class:flag={tile.flagged}
  class:mine={tile.revealed && tile.isMine}
  class:watered={tile.watered}
  class:just-revealed={tile.revealed}
  {disabled}
  onclick={click}
  oncontextmenu={contextmenu}
>{face}</button>

<style>
  .tile {
    width: 28px; height: 28px; padding: 0;
    border: 1px solid #0c0c12;
    background: var(--tile-covered);
    color: var(--ink);
    font-weight: 700;
    cursor: pointer;
  }
  .tile.revealed { background: var(--tile); cursor: default; }
  .tile.flag { color: var(--accent); }
  .tile.mine { background: var(--danger); }
  .tile.watered { box-shadow: inset 0 0 0 2px #2f6f9f; }
  .tile:disabled { cursor: not-allowed; }
  .tile.just-revealed { animation: flip 140ms ease-out; }
  @keyframes flip {
    from { transform: rotateX(90deg); }
    to { transform: rotateX(0); }
  }
</style>

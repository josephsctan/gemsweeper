<script lang="ts">
  import type { RuleFlags } from '../lib/types';
  import { DEFAULT_RULE_FLAGS } from '../lib/types';
  import { boardSession, applyFlag } from '../stores/boardStore';
  import Tile from './Tile.svelte';

  let {
    rules = DEFAULT_RULE_FLAGS,
    disabled = false,
    targetingMode = null,
    ontarget,
    onrevealrequest,
  }: {
    rules?: RuleFlags;
    disabled?: boolean;
    targetingMode?: 'probe' | 'scry' | null;
    ontarget?: (r: number, c: number) => void;
    onrevealrequest?: (kind: 'reveal' | 'chord', r: number, c: number) => void;
  } = $props();

  function handleReveal(r: number, c: number) {
    if (disabled) return;
    if (targetingMode) {
      ontarget?.(r, c);
      return;
    }
    const s = $boardSession;
    if (!s) return;
    const tile = s.board.tiles[r]![c]!;
    const kind = tile.revealed && tile.adjacent > 0 ? 'chord' : 'reveal';
    onrevealrequest?.(kind, r, c);
  }

  function handleFlag(r: number, c: number) {
    if (disabled || targetingMode) return;
    applyFlag(r, c, rules);
  }
</script>

{#if $boardSession}
  <div
    class="board"
    style={`grid-template-columns: repeat(${$boardSession.board.cols}, 28px)`}
  >
    {#each $boardSession.board.tiles as row, ri (ri)}
      {#each row as tile (tile.c)}
        <Tile
          {tile}
          disabled={disabled || (tile.revealed && !(tile.adjacent > 0) && !targetingMode)}
          onreveal={() => handleReveal(tile.r, tile.c)}
          onflag={() => handleFlag(tile.r, tile.c)}
        />
      {/each}
    {/each}
  </div>
{/if}

<style>
  .board {
    display: grid;
    gap: 1px;
    background: #0c0c12;
    padding: 1px;
    width: max-content;
    margin: 0 auto;
    user-select: none;
  }
</style>

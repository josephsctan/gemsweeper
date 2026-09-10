<script lang="ts">
  import { onMount } from 'svelte';
  import Board from './Board.svelte';
  import { loadRoom, applyReveal, applyChord } from '../stores/boardStore';
  import { DEFAULT_RULE_FLAGS } from '../lib/types';

  onMount(() => loadRoom(Math.floor(Math.random() * 100000), 1, 0, 5));

  function onReveal(kind: 'reveal' | 'chord', r: number, c: number) {
    if (kind === 'chord') applyChord(r, c, DEFAULT_RULE_FLAGS);
    else applyReveal(r, c, DEFAULT_RULE_FLAGS);
  }
</script>

<section class="game">
  <Board onrevealrequest={onReveal} />
</section>

<style>
  .game { padding: 2rem; }
</style>

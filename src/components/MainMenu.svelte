<script lang="ts">
  import { goto } from '../stores/uiStore';
  let { hasSave = false, oncontinue }: { hasSave?: boolean; oncontinue?: () => void } = $props();
</script>

<section class="menu">
  <h1>Gemsweeper</h1>
  <p class="tag">Minesweeper at its core. Something much worse underneath.</p>
  <div class="buttons">
    <button type="button" onclick={() => goto('class-select')}>New Run</button>
    {#if hasSave}
      <button type="button" onclick={() => oncontinue?.()}>Continue</button>
    {/if}
    <button type="button" onclick={() => goto('stats')}>Stats</button>
    <button type="button" onclick={() => goto('codex')}>Codex</button>
    <button type="button" onclick={() => goto('how-to-play')}>How to Play</button>
  </div>
</section>

<style>
  .menu { max-width: 480px; margin: 12vh auto; text-align: center; }
  .tag { color: var(--muted); }
  .buttons { display: grid; gap: .6rem; margin-top: 2rem; }
  .buttons button { padding: .7rem 1rem; font-size: 1rem; }
</style>

<script lang="ts">
  import { meta } from '../stores/metaStore';
  import { goto } from '../stores/uiStore';
  const m = $derived($meta);
</script>

<section class="stats">
  <h2>Lifetime</h2>
  <dl>
    <div><dt>Runs started</dt><dd>{m.runsStarted}</dd></div>
    <div><dt>Runs won</dt><dd>{m.runsWon}</dd></div>
    <div><dt>Best depth</dt><dd>{m.bestDepth}</dd></div>
    <div><dt>Fastest win</dt><dd>{m.fastestWinMs === null ? '—' : Math.round(m.fastestWinMs / 1000) + 's'}</dd></div>
    <div><dt>Monsters defused</dt><dd>{m.monstersDefused}</dd></div>
    <div><dt>Codex entries</dt><dd>{m.codexUnlocks.length} / 3</dd></div>
  </dl>
  <button type="button" onclick={() => goto('menu')}>Back</button>
</section>

<style>
  .stats { max-width: 480px; margin: 8vh auto; }
  dl div { display: flex; justify-content: space-between; border-bottom: 1px solid #2a2a36; padding: .4rem 0; }
  dt { color: var(--muted); }
  button { margin-top: 1.5rem; padding: .6rem 1.2rem; }
</style>
